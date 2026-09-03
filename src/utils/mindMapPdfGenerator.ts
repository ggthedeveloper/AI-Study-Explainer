import { jsPDF } from 'jspdf';
import { MindMapData } from '../types';

interface BranchColorConfig {
  primary: [number, number, number];
  light: [number, number, number];
  border: [number, number, number];
  text: [number, number, number];
}

const PDF_COLOR_MAP: Record<string, BranchColorConfig> = {
  indigo: {
    primary: [79, 70, 229],
    light: [238, 242, 255],
    border: [199, 210, 254],
    text: [49, 46, 129],
  },
  emerald: {
    primary: [16, 185, 129],
    light: [236, 253, 245],
    border: [167, 243, 208],
    text: [6, 78, 59],
  },
  amber: {
    primary: [245, 158, 11],
    light: [254, 252, 232],
    border: [253, 230, 138],
    text: [120, 53, 15],
  },
  rose: {
    primary: [244, 63, 94],
    light: [255, 241, 242],
    border: [254, 205, 211],
    text: [136, 19, 55],
  },
  cyan: {
    primary: [6, 182, 212],
    light: [236, 254, 255],
    border: [165, 243, 252],
    text: [22, 78, 99],
  },
  violet: {
    primary: [139, 92, 246],
    light: [245, 243, 255],
    border: [221, 214, 254],
    text: [76, 29, 149],
  },
  orange: {
    primary: [249, 115, 22],
    light: [255, 247, 237],
    border: [254, 215, 170],
    text: [124, 45, 18],
  },
  teal: {
    primary: [20, 184, 166],
    light: [240, 253, 250],
    border: [153, 246, 228],
    text: [19, 78, 74],
  },
  blue: {
    primary: [59, 130, 246],
    light: [239, 246, 255],
    border: [191, 219, 254],
    text: [30, 58, 138],
  },
};

interface BranchComputedLayout {
  id: string;
  title: string;
  summary: string;
  colorName: string;
  side: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
  subtopics: Array<{
    id: string;
    title: string;
    description: string;
    keyDetail: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Generates an impeccably arranged, high-resolution vector PDF of the Mind Map.
 * Uses a balanced bilateral hierarchical tree layout that guarantees zero overlap,
 * ample padding, wrapped text inside bounding cards, and dynamic canvas scaling.
 */
export function exportMindMapToPDF(mindMap: MindMapData): void {
  const cleanTitle = mindMap.centralConcept || mindMap.topic || 'Mind Map';
  const cleanSummary = mindMap.coreSummary || 'Structured Concept Mind Map';

  const branches = mindMap.branches && mindMap.branches.length > 0 ? mindMap.branches : [];
  const totalBranches = branches.length;

  // Distribute branches evenly across Left and Right hemispheres
  const leftBranches = branches.filter((_, idx) => idx % 2 === 0);
  const rightBranches = branches.filter((_, idx) => idx % 2 !== 0);

  // Geometric layout constants (in millimeters)
  const centerNodeWidth = 92;
  const centerNodeHeight = 36;
  const branchWidth = 62;
  const subtopicWidth = 56;
  const subtopicMinHeight = 16;

  const horizontalCenterGap = 36; // Distance from center node to branch nodes
  const horizontalBranchGap = 28; // Distance from branch to subtopic nodes

  // Temporary jsPDF instance for text metrics & split calculation
  const calcDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  calcDoc.setFont('helvetica', 'normal');

  // Helper to compute node heights with wrapped text
  const computeSubtopicLayout = (
    sub: { id: string; title: string; description: string; keyDetail: string }
  ) => {
    calcDoc.setFont('helvetica', 'bold');
    calcDoc.setFontSize(8);
    const titleLines = calcDoc.splitTextToSize(sub.title, subtopicWidth - 6);

    calcDoc.setFont('helvetica', 'normal');
    calcDoc.setFontSize(7);
    const descLines = calcDoc.splitTextToSize(sub.description, subtopicWidth - 6);

    const calcH = 6 + (titleLines.length * 3.4) + (descLines.length * 2.8) + (sub.keyDetail ? 4.5 : 0) + 3;
    const height = Math.max(subtopicMinHeight, calcH);

    return { height, titleLines, descLines };
  };

  const computeBranchLayout = (branch: any, side: 'left' | 'right') => {
    calcDoc.setFont('helvetica', 'bold');
    calcDoc.setFontSize(9);
    const titleLines = calcDoc.splitTextToSize(branch.title, branchWidth - 8);

    calcDoc.setFont('helvetica', 'normal');
    calcDoc.setFontSize(7.5);
    const summaryLines = calcDoc.splitTextToSize(branch.summary, branchWidth - 8);

    const branchH = Math.max(20, 6 + (titleLines.length * 3.8) + (summaryLines.length * 3.0) + 4);

    const subtopicsComputed = (branch.subtopics || []).map((sub: any) => {
      const { height } = computeSubtopicLayout(sub);
      return {
        id: sub.id,
        title: sub.title,
        description: sub.description,
        keyDetail: sub.keyDetail,
        height,
      };
    });

    const subtopicsTotalH = subtopicsComputed.reduce((acc: number, s: any) => acc + s.height + 6, -6);
    const totalClusterHeight = Math.max(branchH, subtopicsTotalH > 0 ? subtopicsTotalH : branchH);

    return {
      id: branch.id,
      title: branch.title,
      summary: branch.summary,
      colorName: branch.color || 'indigo',
      side,
      width: branchWidth,
      height: branchH,
      totalClusterHeight,
      subtopicsData: subtopicsComputed,
    };
  };

  const leftLayouts = leftBranches.map((b) => computeBranchLayout(b, 'left'));
  const rightLayouts = rightBranches.map((b) => computeBranchLayout(b, 'right'));

  // Calculate cluster vertical spans
  const clusterGap = 16;
  const totalLeftH = leftLayouts.reduce((acc, b) => acc + b.totalClusterHeight + clusterGap, -clusterGap);
  const totalRightH = rightLayouts.reduce((acc, b) => acc + b.totalClusterHeight + clusterGap, -clusterGap);

  const maxColumnH = Math.max(totalLeftH, totalRightH, centerNodeHeight + 60);

  // Dynamic canvas bounding dimensions
  const totalWidthNeeded =
    (subtopicWidth + horizontalBranchGap + branchWidth + horizontalCenterGap) * 2 +
    centerNodeWidth +
    80; // Margins

  const totalHeightNeeded = maxColumnH + 90; // Top header & bottom margins

  // Determine standard paper format: A3 Landscape (420 x 297 mm) or larger custom
  const docWidth = Math.max(420, totalWidthNeeded);
  const docHeight = Math.max(297, totalHeightNeeded);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [docWidth, docHeight],
  });

  const centerX = docWidth / 2;
  const centerY = docHeight / 2 + 8;

  // Header Banner at top
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, docWidth, 20, 'F');

  // Decorative Accent line
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 19.2, docWidth, 0.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('AI STUDY EXPLAINER • HIGH-RESOLUTION KNOWLEDGE MIND MAP', 16, 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  const genDate = new Date(mindMap.generatedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(
    `Topic: ${cleanTitle}   •   ${totalBranches} Conceptual Branches   •   ${genDate}`,
    16,
    15
  );

  // Background subtle grid
  doc.setDrawColor(241, 245, 249);
  for (let x = 20; x < docWidth; x += 25) {
    doc.line(x, 24, x, docHeight - 12);
  }
  for (let y = 25; y < docHeight - 10; y += 25) {
    doc.line(16, y, docWidth - 16, y);
  }

  // ==========================================
  // 1. POSITIONING BRANCHES & SUBTOPICS
  // ==========================================
  const computedBranches: BranchComputedLayout[] = [];

  // Left Column Position Calculations
  let currentLeftY = centerY - totalLeftH / 2;
  leftLayouts.forEach((item) => {
    const branchX = centerX - centerNodeWidth / 2 - horizontalCenterGap - branchWidth;
    const branchCenterY = currentLeftY + item.totalClusterHeight / 2;
    const branchY = branchCenterY - item.height / 2;

    const subX = branchX - horizontalBranchGap - subtopicWidth;
    let currentSubY = branchCenterY - (item.subtopicsData.reduce((acc, s) => acc + s.height + 6, -6) / 2);

    const subtopics = item.subtopicsData.map((s) => {
      const subObj = {
        id: s.id,
        title: s.title,
        description: s.description,
        keyDetail: s.keyDetail,
        x: subX,
        y: currentSubY,
        width: subtopicWidth,
        height: s.height,
      };
      currentSubY += s.height + 6;
      return subObj;
    });

    computedBranches.push({
      id: item.id,
      title: item.title,
      summary: item.summary,
      colorName: item.colorName,
      side: 'left',
      x: branchX,
      y: branchY,
      width: branchWidth,
      height: item.height,
      subtopics,
    });

    currentLeftY += item.totalClusterHeight + clusterGap;
  });

  // Right Column Position Calculations
  let currentRightY = centerY - totalRightH / 2;
  rightLayouts.forEach((item) => {
    const branchX = centerX + centerNodeWidth / 2 + horizontalCenterGap;
    const branchCenterY = currentRightY + item.totalClusterHeight / 2;
    const branchY = branchCenterY - item.height / 2;

    const subX = branchX + branchWidth + horizontalBranchGap;
    let currentSubY = branchCenterY - (item.subtopicsData.reduce((acc, s) => acc + s.height + 6, -6) / 2);

    const subtopics = item.subtopicsData.map((s) => {
      const subObj = {
        id: s.id,
        title: s.title,
        description: s.description,
        keyDetail: s.keyDetail,
        x: subX,
        y: currentSubY,
        width: subtopicWidth,
        height: s.height,
      };
      currentSubY += s.height + 6;
      return subObj;
    });

    computedBranches.push({
      id: item.id,
      title: item.title,
      summary: item.summary,
      colorName: item.colorName,
      side: 'right',
      x: branchX,
      y: branchY,
      width: branchWidth,
      height: item.height,
      subtopics,
    });

    currentRightY += item.totalClusterHeight + clusterGap;
  });

  // ==========================================
  // 2. DRAW CONNECTING ARCS / BEZIER CURVES
  // ==========================================
  computedBranches.forEach((b) => {
    const colorScheme = PDF_COLOR_MAP[b.colorName] || PDF_COLOR_MAP.indigo;

    // Line from Center Node to Branch
    const centerConnectX = b.side === 'left' ? centerX - centerNodeWidth / 2 : centerX + centerNodeWidth / 2;
    const centerConnectY = centerY;

    const branchConnectX = b.side === 'left' ? b.x + b.width : b.x;
    const branchConnectY = b.y + b.height / 2;

    // Draw Smooth Connecting Curve
    doc.setDrawColor(colorScheme.primary[0], colorScheme.primary[1], colorScheme.primary[2]);
    doc.setLineWidth(0.8);

    const midX = (centerConnectX + branchConnectX) / 2;
    // Approximate cubic bezier curve with line segments for crisp vector output
    doc.lines(
      [
        [midX - centerConnectX, 0],
        [branchConnectX - midX, branchConnectY - centerConnectY],
      ],
      centerConnectX,
      centerConnectY
    );

    // Connector Endpoint Circles
    doc.setFillColor(colorScheme.primary[0], colorScheme.primary[1], colorScheme.primary[2]);
    doc.circle(centerConnectX, centerConnectY, 1.2, 'F');
    doc.circle(branchConnectX, branchConnectY, 1.2, 'F');

    // Lines from Branch to Subtopics
    b.subtopics.forEach((sub) => {
      const bSubConnectX = b.side === 'left' ? b.x : b.x + b.width;
      const bSubConnectY = b.y + b.height / 2;

      const subConnectX = b.side === 'left' ? sub.x + sub.width : sub.x;
      const subConnectY = sub.y + sub.height / 2;

      doc.setDrawColor(colorScheme.border[0], colorScheme.border[1], colorScheme.border[2]);
      doc.setLineWidth(0.5);

      const subMidX = (bSubConnectX + subConnectX) / 2;
      doc.lines(
        [
          [subMidX - bSubConnectX, 0],
          [subConnectX - subMidX, subConnectY - bSubConnectY],
        ],
        bSubConnectX,
        bSubConnectY
      );

      doc.setFillColor(colorScheme.primary[0], colorScheme.primary[1], colorScheme.primary[2]);
      doc.circle(subConnectX, subConnectY, 0.8, 'F');
    });
  });

  // ==========================================
  // 3. DRAW SUBTOPIC NODES
  // ==========================================
  computedBranches.forEach((b) => {
    const colorScheme = PDF_COLOR_MAP[b.colorName] || PDF_COLOR_MAP.indigo;

    b.subtopics.forEach((sub) => {
      // Subtopic Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(colorScheme.border[0], colorScheme.border[1], colorScheme.border[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(sub.x, sub.y, sub.width, sub.height, 2, 2, 'FD');

      // Top color indicator bar
      doc.setFillColor(colorScheme.primary[0], colorScheme.primary[1], colorScheme.primary[2]);
      doc.roundedRect(sub.x, sub.y, sub.width, 1.5, 1, 1, 'F');

      let subTextY = sub.y + 4.8;

      // Subtopic Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(sub.title, sub.width - 6);
      doc.text(titleLines, sub.x + 3, subTextY);
      subTextY += titleLines.length * 3.4;

      // Subtopic Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const descLines = doc.splitTextToSize(sub.description, sub.width - 6);
      doc.text(descLines, sub.x + 3, subTextY);
      subTextY += descLines.length * 2.8;

      // Key Detail Pill
      if (sub.keyDetail) {
        doc.setFillColor(colorScheme.light[0], colorScheme.light[1], colorScheme.light[2]);
        doc.roundedRect(sub.x + 3, subTextY, sub.width - 6, 3.8, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(colorScheme.text[0], colorScheme.text[1], colorScheme.text[2]);
        const keyLines = doc.splitTextToSize(sub.keyDetail, sub.width - 8);
        doc.text(keyLines[0] || sub.keyDetail, sub.x + 4, subTextY + 2.7);
      }
    });
  });

  // ==========================================
  // 4. DRAW BRANCH NODES
  // ==========================================
  computedBranches.forEach((b) => {
    const colorScheme = PDF_COLOR_MAP[b.colorName] || PDF_COLOR_MAP.indigo;

    // Card background
    doc.setFillColor(colorScheme.light[0], colorScheme.light[1], colorScheme.light[2]);
    doc.setDrawColor(colorScheme.border[0], colorScheme.border[1], colorScheme.border[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(b.x, b.y, b.width, b.height, 3, 3, 'FD');

    // Left accent bar
    doc.setFillColor(colorScheme.primary[0], colorScheme.primary[1], colorScheme.primary[2]);
    doc.roundedRect(b.x, b.y, 2.5, b.height, 1, 1, 'F');

    let branchTextY = b.y + 5.5;

    // Branch Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colorScheme.text[0], colorScheme.text[1], colorScheme.text[2]);
    const bTitleLines = doc.splitTextToSize(b.title, b.width - 7);
    doc.text(bTitleLines, b.x + 5, branchTextY);
    branchTextY += bTitleLines.length * 3.8;

    // Branch Summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const bSummaryLines = doc.splitTextToSize(b.summary, b.width - 7);
    doc.text(bSummaryLines, b.x + 5, branchTextY);
  });

  // ==========================================
  // 5. DRAW CENTRAL CONCEPT CORE NODE
  // ==========================================
  const centerNodeX = centerX - centerNodeWidth / 2;
  const centerNodeY = centerY - centerNodeHeight / 2;

  // Outer glowing halo effect
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.roundedRect(centerNodeX - 4, centerNodeY - 4, centerNodeWidth + 8, centerNodeHeight + 8, 6, 6, 'F');

  // Main Card Body
  doc.setFillColor(30, 27, 75); // indigo-950
  doc.setDrawColor(99, 102, 241); // indigo-500
  doc.setLineWidth(0.8);
  doc.roundedRect(centerNodeX, centerNodeY, centerNodeWidth, centerNodeHeight, 4, 4, 'FD');

  // Center Badge
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.roundedRect(centerNodeX + 6, centerNodeY + 4, centerNodeWidth - 12, 5, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CENTRAL CONCEPT • CORE KNOWLEDGE ROOT', centerX, centerNodeY + 7.5, { align: 'center' });

  // Center Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const cTitleLines = doc.splitTextToSize(cleanTitle, centerNodeWidth - 10);
  doc.text(cTitleLines.slice(0, 2), centerX, centerNodeY + 15, { align: 'center' });

  // Center Summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  const cSummaryLines = doc.splitTextToSize(cleanSummary, centerNodeWidth - 10);
  doc.text(cSummaryLines.slice(0, 2), centerX, centerNodeY + 23, { align: 'center' });

  // ==========================================
  // 6. FOOTER & WATERMARK
  // ==========================================
  doc.setDrawColor(226, 232, 240);
  doc.line(16, docHeight - 8, docWidth - 16, docHeight - 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated with AI Study Explainer • Vector Knowledge Graph', 16, docHeight - 4);
  doc.text(`Page 1 of 1 • Balanced Radial Tree Layout`, docWidth - 16, docHeight - 4, { align: 'right' });

  // Save & Download
  const safeFilename = `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_MindMap.pdf`;
  doc.save(safeFilename);
}
