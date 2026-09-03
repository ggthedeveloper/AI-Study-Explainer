import { jsPDF } from 'jspdf';
import { StructuredStudyNotes, StudyExplanation, FormulaCheatSheetData } from '../types';

/**
 * Generates a clean, professional, publication-quality PDF Study Notes document
 * suitable for university exam preparation and revision.
 */
export function createStudyNotesPDF(notes: StructuredStudyNotes): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 16;
  const rightMargin = 16;
  const topMargin = 22;
  const bottomMargin = 18;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 178mm

  let currentY = topMargin;

  // Helper to ensure enough space on page or trigger page break
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  // Section Header Renderer
  const renderSectionHeader = (numberStr: string, titleStr: string) => {
    ensureSpace(14);
    currentY += 4;

    // Header accent background strip
    doc.setFillColor(243, 244, 246); // slate-100
    doc.roundedRect(leftMargin, currentY - 3.5, contentWidth, 7.5, 1.5, 1.5, 'F');

    // Section Number Badge
    doc.setFillColor(67, 56, 202); // indigo-700
    doc.roundedRect(leftMargin + 1, currentY - 2.5, 6.5, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(numberStr, leftMargin + 4.25, currentY + 1.2, { align: 'center' });

    // Section Title
    doc.setTextColor(30, 27, 75); // indigo-950
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(titleStr.toUpperCase(), leftMargin + 10, currentY + 1.2);

    currentY += 7.5;
  };

  // Helper for multi-line wrapped text
  const renderParagraph = (text: string, fontSize = 9.5, color = [51, 65, 85], fontStyle: 'normal' | 'bold' | 'italic' = 'normal') => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    const textHeight = lines.length * (fontSize * 0.42);
    ensureSpace(textHeight + 2);
    doc.text(lines, leftMargin, currentY);
    currentY += textHeight + 2.5;
  };

  // ==========================================
  // 1. COVER / TITLE BANNER (Page 1 Top)
  // ==========================================
  // Header Banner Box
  doc.setFillColor(30, 27, 75); // Deep Indigo
  doc.roundedRect(leftMargin, currentY, contentWidth, 28, 3, 3, 'F');

  // Eyebrow label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('UNIVERSITY EXAM PREPARATION • HIGH-YIELD STUDY NOTES', leftMargin + 6, currentY + 7);

  // Topic Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(notes.topicTitle, contentWidth - 12);
  doc.text(titleLines.slice(0, 2), leftMargin + 6, currentY + 15);

  // Difficulty & Date metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255); // indigo-100
  const dateStr = new Date(notes.generatedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`Difficulty: ${notes.difficulty} Level   •   Generated: ${dateStr}`, leftMargin + 6, currentY + 23.5);

  currentY += 33;

  // ==========================================
  // SECTION 1: SHORT INTRODUCTION
  // ==========================================
  if (notes.shortIntroduction) {
    renderSectionHeader('1', 'Short Introduction');
    renderParagraph(notes.shortIntroduction, 9.5, [51, 65, 85]);
  }

  // ==========================================
  // SECTION 2: KEY CONCEPTS
  // ==========================================
  if (notes.keyConcepts && notes.keyConcepts.length > 0) {
    renderSectionHeader('2', 'Key Concepts');
    notes.keyConcepts.forEach((concept, idx) => {
      const fullPointText = `${idx + 1}. ${concept.title}: ${concept.explanation}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      
      const wrappedLines = doc.splitTextToSize(fullPointText, contentWidth - 6);
      const neededH = (wrappedLines.length * 4.4) + 2;
      ensureSpace(neededH);

      // Bullet dot indicator
      doc.setFillColor(79, 70, 229);
      doc.circle(leftMargin + 2, currentY - 1, 1, 'F');

      // First line / combined text
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedLines, leftMargin + 5, currentY);
      currentY += (wrappedLines.length * 4.4) + 2;
    });
    currentY += 1;
  }

  // ==========================================
  // SECTION 3: DETAILED EXPLANATION
  // ==========================================
  if (notes.detailedExplanation) {
    renderSectionHeader('3', 'Detailed Explanation');
    const paragraphs = notes.detailedExplanation.split('\n\n').filter(Boolean);
    paragraphs.forEach((p) => {
      renderParagraph(p.trim(), 9.5, [51, 65, 85]);
    });
  }

  // ==========================================
  // SECTION 4: IMPORTANT DEFINITIONS
  // ==========================================
  if (notes.importantDefinitions && notes.importantDefinitions.length > 0) {
    renderSectionHeader('4', 'Important Definitions');
    notes.importantDefinitions.forEach((def) => {
      const defText = def.definition;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const defLines = doc.splitTextToSize(defText, contentWidth - 10);
      const boxHeight = (defLines.length * 4) + 9;

      ensureSpace(boxHeight + 2);

      // Definition card box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(leftMargin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

      // Left vertical accent bar
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(leftMargin, currentY, 2.5, boxHeight, 1, 1, 'F');

      // Term Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 27, 75);
      doc.text(def.term, leftMargin + 6, currentY + 4.5);

      // Definition Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(defLines, leftMargin + 6, currentY + 8.5);

      currentY += boxHeight + 2.5;
    });
  }

  // ==========================================
  // SECTION 5: FORMULAS / EQUATIONS (if applicable)
  // ==========================================
  if (notes.formulasAndEquations && notes.formulasAndEquations.length > 0) {
    renderSectionHeader('5', 'Formulas, Equations & Governing Laws');
    notes.formulasAndEquations.forEach((eq) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const expLines = doc.splitTextToSize(eq.explanation, contentWidth - 12);
      const cardHeight = 12 + (expLines.length * 4);

      ensureSpace(cardHeight + 2);

      // Card Box
      doc.setFillColor(245, 243, 255); // indigo-50
      doc.setDrawColor(199, 210, 254); // indigo-200
      doc.roundedRect(leftMargin, currentY, contentWidth, cardHeight, 1.5, 1.5, 'FD');

      // Formula Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(49, 46, 129);
      doc.text(eq.name, leftMargin + 5, currentY + 4.5);

      // Formula Equation String
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(67, 56, 202);
      doc.text(eq.formula, leftMargin + 5, currentY + 9);

      // Explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(expLines, leftMargin + 5, currentY + 13.5);

      currentY += cardHeight + 2.5;
    });
  }

  // ==========================================
  // SECTION 6: CONCRETE EXAMPLES & SCENARIOS
  // ==========================================
  if (notes.examples && notes.examples.length > 0) {
    renderSectionHeader('6', 'Examples & Practical Scenarios');
    notes.examples.forEach((ex) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const scenLines = doc.splitTextToSize(`Scenario: ${ex.scenario}`, contentWidth - 10);
      const walkLines = doc.splitTextToSize(`Analysis: ${ex.walkthrough}`, contentWidth - 10);
      const totalH = 7 + (scenLines.length * 4) + (walkLines.length * 4) + 4;

      ensureSpace(totalH + 2);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(leftMargin, currentY, contentWidth, totalH, 1.5, 1.5, 'FD');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(ex.title, leftMargin + 5, currentY + 4.5);

      let textY = currentY + 9;
      // Scenario
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(scenLines, leftMargin + 5, textY);
      textY += (scenLines.length * 4) + 1;

      // Analysis / Walkthrough
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(walkLines, leftMargin + 5, textY);

      currentY += totalH + 2.5;
    });
  }

  // ==========================================
  // SECTION 7: STEP-BY-STEP EXPLANATION
  // ==========================================
  if (notes.stepByStepExplanation && notes.stepByStepExplanation.length > 0) {
    renderSectionHeader('7', 'Step-by-Step Breakdown');
    notes.stepByStepExplanation.forEach((step) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const detailLines = doc.splitTextToSize(step.details, contentWidth - 18);
      const stepH = Math.max(7, detailLines.length * 4) + 3;

      ensureSpace(stepH + 2);

      // Step Number Badge
      doc.setFillColor(67, 56, 202);
      doc.roundedRect(leftMargin + 1, currentY, 12, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`Step ${step.step}`, leftMargin + 7, currentY + 3.5, { align: 'center' });

      // Title & Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 27, 75);
      doc.text(step.title, leftMargin + 16, currentY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(detailLines, leftMargin + 16, currentY + 7.5);

      currentY += stepH + 2.5;
    });
  }

  // ==========================================
  // SECTION 8: IMPORTANT POINTS / TAKEAWAYS
  // ==========================================
  if (notes.importantPointsAndTakeaways && notes.importantPointsAndTakeaways.length > 0) {
    renderSectionHeader('8', 'Important Points & Takeaways');
    notes.importantPointsAndTakeaways.forEach((point) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const pointLines = doc.splitTextToSize(point, contentWidth - 8);
      const itemH = (pointLines.length * 4.2) + 2;

      ensureSpace(itemH);

      // Checkmark bullet dot
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.circle(leftMargin + 2.5, currentY - 1, 1.2, 'F');

      doc.setTextColor(51, 65, 85);
      doc.text(pointLines, leftMargin + 6, currentY);
      currentY += itemH;
    });
    currentY += 1;
  }

  // ==========================================
  // SECTION 9: QUICK REVISION SUMMARY
  // ==========================================
  if (notes.quickRevisionSummary && notes.quickRevisionSummary.length > 0) {
    renderSectionHeader('9', 'Quick Revision Summary');

    // Estimate box height
    let totalLinesCount = 0;
    const splitItems = notes.quickRevisionSummary.map((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 10);
      totalLinesCount += lines.length;
      return lines;
    });

    const summaryBoxHeight = (totalLinesCount * 4.2) + 8;
    ensureSpace(summaryBoxHeight + 4);

    // Amber Exam Ready Callout Box
    doc.setFillColor(254, 252, 232); // yellow-50
    doc.setDrawColor(250, 204, 21); // yellow-400
    doc.roundedRect(leftMargin, currentY, contentWidth, summaryBoxHeight, 2, 2, 'FD');

    // Box Header Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(161, 98, 7); // yellow-700
    doc.text('⚡ RAPID EXAM REVISION CHECKLIST', leftMargin + 5, currentY + 4.5);

    let summaryTextY = currentY + 9;
    splitItems.forEach((lines) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(69, 26, 3); // amber-950
      doc.text(lines, leftMargin + 5, summaryTextY);
      summaryTextY += (lines.length * 4.2);
    });

    currentY += summaryBoxHeight + 4;
  }

  // ==========================================
  // MULTI-PAGE FOOTER & RUNNING HEADER PASS
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (Pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400

      // Truncated topic name left
      const maxHeaderTopic = notes.topicTitle.length > 40 ? `${notes.topicTitle.substring(0, 38)}...` : notes.topicTitle;
      doc.text(maxHeaderTopic, leftMargin, 12);
      doc.text('AI Study Explainer • Exam Notes', pageWidth - rightMargin, 12, { align: 'right' });

      // Thin header divider rule
      doc.setDrawColor(226, 232, 240);
      doc.line(leftMargin, 14, pageWidth - rightMargin, 14);
    }

    // Running Footer (All Pages)
    doc.setDrawColor(226, 232, 240);
    doc.line(leftMargin, pageHeight - 12, pageWidth - rightMargin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('University Examination & Concept Preparation Notes', leftMargin, pageHeight - 7.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - rightMargin, pageHeight - 7.5, { align: 'right' });
  }

  // Trigger browser download
  const safeFilename = `${notes.topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Study_Notes.pdf`;
  doc.save(safeFilename);
}

/**
 * Builds structured study notes client-side fallback directly from StudyExplanation
 * if network is unavailable, ensuring instant generation.
 */
export function buildNotesFromExplanation(explanation: StudyExplanation): StructuredStudyNotes {
  return {
    topicTitle: explanation.topic,
    difficulty: explanation.difficulty,
    shortIntroduction: `This comprehensive study guide provides an in-depth conceptual breakdown of ${explanation.topic}, designed for rigorous university exam preparation and mastery.`,
    keyConcepts: explanation.keyPoints.map((pt, idx) => ({
      title: `Core Concept ${idx + 1}`,
      explanation: pt,
    })),
    detailedExplanation: explanation.simpleExplanation,
    importantDefinitions: [
      {
        term: explanation.topic,
        definition: explanation.simpleExplanation.split('.')[0] + '.',
      },
      {
        term: 'Key Mechanism',
        definition: explanation.keyPoints[0] || 'Foundational operating principle of the subject.',
      },
    ],
    formulasAndEquations: [
      {
        name: `${explanation.topic} Governing Principle`,
        formula: 'Fundamental Relational Concept',
        explanation: 'Core theoretical law and interaction model described in the lecture curriculum.',
      },
    ],
    examples: [
      {
        title: 'Standard Application Scenario',
        scenario: explanation.example,
        walkthrough: `In this scenario, ${explanation.topic} operates through systematic steps as evidenced by real-world observation.`,
      },
    ],
    stepByStepExplanation: explanation.keyPoints.map((pt, idx) => ({
      step: idx + 1,
      title: `Phase ${idx + 1}`,
      details: pt,
    })),
    importantPointsAndTakeaways: explanation.keyPoints,
    quickRevisionSummary: [
      `Master the core definition of ${explanation.topic}.`,
      `Remember the key analogy: "${explanation.easyAnalogy}"`,
      ...explanation.keyPoints.slice(0, 2),
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates an ultra-clean, publication-grade Formula & Equation Cheat Sheet PDF
 * with equation highlight cards, variable definitions, and worked calculation examples.
 */
export function createFormulaCheatSheetPDF(sheet: FormulaCheatSheetData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 16;
  const rightMargin = 16;
  const topMargin = 22;
  const bottomMargin = 18;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 178mm

  let currentY = topMargin;

  // Helper to ensure enough space on page or trigger page break
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  // Section Header Renderer
  const renderSectionHeader = (titleStr: string, subtitleStr?: string) => {
    ensureSpace(subtitleStr ? 16 : 12);
    currentY += 3;

    // Header bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(leftMargin, currentY - 3, contentWidth, subtitleStr ? 11 : 8, 1.5, 1.5, 'F');

    // Section accent strip
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(leftMargin + 1, currentY - 2, 3, subtitleStr ? 9 : 6, 0.8, 0.8, 'F');

    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(titleStr.toUpperCase(), leftMargin + 7, currentY + 2);

    if (subtitleStr) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(subtitleStr, leftMargin + 7, currentY + 6.5);
      currentY += 12;
    } else {
      currentY += 9;
    }
  };

  // ==========================================
  // 1. COVER / BANNER HEADER
  // ==========================================
  doc.setFillColor(30, 27, 75); // Deep Indigo
  doc.roundedRect(leftMargin, currentY, contentWidth, 28, 3, 3, 'F');

  // Eyebrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text(`EXAM REVISION CHEAT SHEET • ${sheet.subjectCategory.toUpperCase()}`, leftMargin + 6, currentY + 7);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(`${sheet.topic} — Formula & Equation Sheet`, contentWidth - 12);
  doc.text(titleLines.slice(0, 2), leftMargin + 6, currentY + 14.5);

  // Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  const dateStr = new Date(sheet.generatedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(
    `Total Categories: ${sheet.categories.length}   •   Formulas: ${sheet.categories.reduce(
      (acc, c) => acc + c.formulas.length,
      0
    )}   •   Generated: ${dateStr}`,
    leftMargin + 6,
    currentY + 23.5
  );

  currentY += 33;

  // Overview
  if (sheet.overview) {
    ensureSpace(18);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    const overviewLines = doc.splitTextToSize(sheet.overview, contentWidth - 8);
    const overviewH = overviewLines.length * 4.2 + 8;
    doc.roundedRect(leftMargin, currentY, contentWidth, overviewH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(67, 56, 202);
    doc.text('TOPIC FOUNDATIONS & CONTEXT', leftMargin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(overviewLines, leftMargin + 4, currentY + 10.5);

    currentY += overviewH + 4;
  }

  // ==========================================
  // 2. FORMULA CATEGORIES
  // ==========================================
  sheet.categories.forEach((cat) => {
    renderSectionHeader(cat.categoryName, cat.description);

    cat.formulas.forEach((form) => {
      // Calculate height required for this formula card
      const descLines = doc.splitTextToSize(form.description, contentWidth - 10);
      const varLinesCount = form.variables.length;
      const whenLines = doc.splitTextToSize(`When to use: ${form.whenToUse}`, contentWidth - 12);
      
      let exampleH = 0;
      if (form.workedExample) {
        exampleH = 22 + form.workedExample.solutionSteps.length * 4.2;
      }
      let pitfallH = 0;
      if (form.commonPitfalls) {
        pitfallH = 10;
      }

      const totalCardH = 22 + descLines.length * 4.2 + varLinesCount * 4.5 + whenLines.length * 4.2 + exampleH + pitfallH + 6;

      ensureSpace(Math.min(totalCardH, 80)); // Allow split across pages if unusually long

      // Formula Card Container
      const cardStartY = currentY;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(leftMargin, cardStartY, contentWidth, totalCardH, 2.5, 2.5, 'FD');

      // Top Formula Banner (Name + Equation Bar)
      doc.setFillColor(245, 247, 255);
      doc.roundedRect(leftMargin + 2, cardStartY + 2, contentWidth - 4, 13, 2, 2, 'F');

      // Formula Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 27, 75);
      doc.text(form.name, leftMargin + 5, cardStartY + 7);

      // Equation text box (Bold Monospace / Plaintext)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(67, 56, 202); // indigo-700
      doc.text(form.plainText || form.latex || '', leftMargin + 5, cardStartY + 12.5);

      let cardInnerY = cardStartY + 18;

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(descLines, leftMargin + 4, cardInnerY);
      cardInnerY += descLines.length * 4.2 + 2;

      // Variable Table
      if (form.variables.length > 0) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(leftMargin + 3, cardInnerY - 2, contentWidth - 6, varLinesCount * 4.5 + 4, 1.5, 1.5, 'F');

        form.variables.forEach((v) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(67, 56, 202);
          doc.text(`${v.symbol}:`, leftMargin + 5, cardInnerY + 2);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const varMeaning = v.unit ? `${v.meaning} [${v.unit}]` : v.meaning;
          doc.text(varMeaning, leftMargin + 18, cardInnerY + 2);
          cardInnerY += 4.5;
        });
        cardInnerY += 2;
      }

      // When to use banner
      doc.setFillColor(240, 253, 244); // light emerald
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.2);
      const whenH = whenLines.length * 4.2 + 4;
      doc.roundedRect(leftMargin + 3, cardInnerY, contentWidth - 6, whenH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52); // emerald-800
      doc.text(whenLines, leftMargin + 5, cardInnerY + 4);
      cardInnerY += whenH + 2.5;

      // Worked Example
      if (form.workedExample) {
        const ex = form.workedExample;
        doc.setFillColor(254, 249, 195); // amber-50
        doc.setDrawColor(253, 230, 138);
        doc.setLineWidth(0.2);
        const exCardH = 14 + ex.solutionSteps.length * 4.2;
        doc.roundedRect(leftMargin + 3, cardInnerY, contentWidth - 6, exCardH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14); // amber-800
        doc.text(`WORKED EXAMPLE: ${ex.problem}`, leftMargin + 5, cardInnerY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 53, 15);
        let stepY = cardInnerY + 8;
        ex.solutionSteps.forEach((st) => {
          doc.text(`• ${st}`, leftMargin + 6, stepY);
          stepY += 4.2;
        });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text(`Final: ${ex.finalAnswer}`, leftMargin + 6, stepY);

        cardInnerY += exCardH + 2.5;
      }

      // Pitfall warning
      if (form.commonPitfalls) {
        doc.setFillColor(254, 242, 242); // rose-50
        doc.setDrawColor(254, 202, 202);
        doc.setLineWidth(0.2);
        doc.roundedRect(leftMargin + 3, cardInnerY, contentWidth - 6, 8, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(153, 27, 27);
        const pitfallLines = doc.splitTextToSize(`Watch Out: ${form.commonPitfalls}`, contentWidth - 12);
        doc.text(pitfallLines.slice(0, 1), leftMargin + 5, cardInnerY + 4.5);

        cardInnerY += 9;
      }

      currentY = cardStartY + totalCardH + 4;
    });
  });

  // ==========================================
  // 3. CONSTANTS & STANDARD UNITS REFERENCE
  // ==========================================
  if (sheet.constantsAndUnits && sheet.constantsAndUnits.length > 0) {
    renderSectionHeader('Standard Constants & Reference Values');

    sheet.constantsAndUnits.forEach((c) => {
      ensureSpace(8);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(leftMargin, currentY - 2, contentWidth, 7, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 27, 75);
      doc.text(c.name, leftMargin + 4, currentY + 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(c.symbol, leftMargin + 70, currentY + 2.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`${c.value} ${c.unit || ''}`, leftMargin + 90, currentY + 2.5);

      currentY += 8;
    });
    currentY += 3;
  }

  // ==========================================
  // 4. QUICK CALCULATION & EXAM TIPS
  // ==========================================
  if (sheet.quickCalculationTips && sheet.quickCalculationTips.length > 0) {
    renderSectionHeader('High-Yield Exam Calculation Tips');

    sheet.quickCalculationTips.forEach((tip, idx) => {
      const tipLines = doc.splitTextToSize(`${idx + 1}. ${tip}`, contentWidth - 8);
      const tipH = tipLines.length * 4.2 + 2;
      ensureSpace(tipH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(tipLines, leftMargin + 4, currentY);
      currentY += tipH;
    });
  }

  // ==========================================
  // PAGE NUMBERS & RUNNING HEADERS
  // ==========================================
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${sheet.topic} — Formula Cheat Sheet`, leftMargin, 12);
      doc.text(sheet.subjectCategory, pageWidth - rightMargin, 12, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, 14, pageWidth - rightMargin, 14);
    }

    // Running Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, pageHeight - 11, pageWidth - rightMargin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Formula & Equation Cheat Sheet • High-Yield Revision', leftMargin, pageHeight - 6.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - rightMargin, pageHeight - 6.5, { align: 'right' });
  }

  // Trigger download
  const safeFilename = `${sheet.topic.replace(/[^a-zA-Z0-9_-]/g, '_')}_Formula_CheatSheet.pdf`;
  doc.save(safeFilename);
}

