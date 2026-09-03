import React, { useState, useRef, useMemo } from 'react';
import { MindMapData, MindMapBranch, MindMapSubtopic } from '../types';
import { getThemeColor } from '../utils/themeColors';
import { exportMindMapToPDF } from '../utils/mindMapPdfGenerator';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layers,
  ListTree,
  ChevronRight,
  Info,
  Download,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MindMapViewProps {
  data: MindMapData;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const MindMapView: React.FC<MindMapViewProps> = ({
  data,
  onRegenerate,
  isRegenerating,
}) => {
  const [viewMode, setViewMode] = useState<'canvas' | 'outline'>('canvas');
  const [zoom, setZoom] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'branch' | 'subtopic';
    branch: MindMapBranch;
    subtopic?: MindMapSubtopic;
  } | null>(null);
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [copiedOutline, setCopiedOutline] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (isDownloadingPdf || !data) return;
    setIsDownloadingPdf(true);
    setDownloadSuccess(false);

    try {
      // Small tick to ensure browser renders loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      exportMindMapToPDF(data);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export Mind Map to PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const toggleBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedBranches((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.6, prev + delta), 1.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const copyAsMarkdown = () => {
    let md = `# ${data.centralConcept} - Mind Map\n\n`;
    md += `**Core Summary**: ${data.coreSummary}\n\n`;
    data.branches.forEach((branch, bIdx) => {
      md += `## ${bIdx + 1}. ${branch.title}\n`;
      md += `*${branch.summary}*\n\n`;
      branch.subtopics.forEach((sub, sIdx) => {
        md += `  - **${sub.title}**: ${sub.description} *(Key: ${sub.keyDetail})*\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedOutline(true);
    setTimeout(() => setCopiedOutline(false), 2000);
  };

  // Layout calculation for Radial Canvas
  const layout = useMemo(() => {
    const width = 1100;
    const height = 820;
    const centerX = width / 2;
    const centerY = height / 2;
    const branches = data.branches;
    const totalBranches = branches.length;

    // Radius from center to branches
    const branchRadiusX = 280;
    const branchRadiusY = 220;

    return branches.map((branch, index) => {
      // Distribute evenly around the circle
      const angle = (index * 2 * Math.PI) / totalBranches - Math.PI / 2;
      const bx = centerX + branchRadiusX * Math.cos(angle);
      const by = centerY + branchRadiusY * Math.sin(angle);

      // Subtopics spread outwards from branch position
      const isRightSide = bx >= centerX;
      const subtopics = branch.subtopics.map((sub, sIdx) => {
        const subCount = branch.subtopics.length;
        const spreadOffset = (sIdx - (subCount - 1) / 2) * 54;
        const sx = isRightSide ? bx + 180 : bx - 180;
        const sy = by + spreadOffset;
        return {
          ...sub,
          x: sx,
          y: sy,
        };
      });

      return {
        ...branch,
        x: bx,
        y: by,
        isRightSide,
        subtopicsWithPos: subtopics,
      };
    });
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Mind Map Top Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-semibold">
            <button
              id="viewmode-canvas-btn"
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Map</span>
            </button>
            <button
              id="viewmode-outline-btn"
              type="button"
              onClick={() => setViewMode('outline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'outline'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Concept Tree</span>
            </button>
          </div>

          <span className="hidden sm:inline-block text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            {data.branches.length} Branches • {data.branches.reduce((acc, b) => acc + b.subtopics.length, 0)} Subtopics
          </span>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'canvas' && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                title="Zoom out"
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono px-1 font-semibold w-10 text-center text-slate-700 dark:text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                title="Zoom in"
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset zoom"
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            id="download-mindmap-pdf-btn"
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            title="Download Mind Map as high-resolution PDF"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Mind Map…</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Downloaded ✓</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            id="copy-outline-btn"
            type="button"
            onClick={copyAsMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {copiedOutline ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedOutline ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="regenerate-mindmap-btn"
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            title="Regenerate Mind Map"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>


      {/* VIEW MODE 1: VISUAL CANVAS */}
      {viewMode === 'canvas' && (
        <div
          ref={containerRef}
          className="relative bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl overflow-auto min-h-[620px] select-none flex items-center justify-center p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Interactive Zoom Stage */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
              width: '1100px',
              height: '820px',
              position: 'relative',
            }}
            className="shrink-0"
          >
            {/* SVG Connector Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1100 820"
            >
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="550" cy="410" r="160" fill="url(#centerGlow)" />

              {layout.map((b) => {
                const theme = getThemeColor(b.color);
                const isCollapsed = collapsedBranches[b.id];

                // Path from Center (550, 410) to Branch (b.x, b.y)
                const cX = 550;
                const cY = 410;
                const midX = (cX + b.x) / 2;
                const pathMain = `M ${cX} ${cY} Q ${midX} ${cY}, ${b.x} ${b.y}`;

                return (
                  <g key={`lines-${b.id}`}>
                    {/* Center to Branch Curve */}
                    <path
                      d={pathMain}
                      fill="none"
                      stroke={theme.stroke}
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      opacity="0.85"
                    />

                    {/* Branch to Subtopics */}
                    {!isCollapsed &&
                      b.subtopicsWithPos.map((sub) => {
                        const subMidX = (b.x + sub.x) / 2;
                        const pathSub = `M ${b.x} ${b.y} C ${subMidX} ${b.y}, ${subMidX} ${sub.y}, ${sub.x} ${sub.y}`;
                        return (
                          <path
                            key={`line-sub-${sub.id}`}
                            d={pathSub}
                            fill="none"
                            stroke={theme.stroke}
                            strokeWidth="1.5"
                            opacity="0.6"
                          />
                        );
                      })}
                  </g>
                );
              })}
            </svg>

            {/* Central Main Concept Node */}
            <div
              style={{
                position: 'absolute',
                left: '550px',
                top: '410px',
                transform: 'translate(-50%, -50%)',
              }}
              className="z-20 w-64 p-5 rounded-3xl bg-gradient-to-br from-indigo-600/95 via-indigo-700/95 to-violet-800/95 backdrop-blur-xl text-white text-center shadow-2xl ring-4 ring-indigo-400/30 border border-white/40"
            >
              <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-200">
                Core Topic
              </span>
              <h3 className="text-base font-extrabold tracking-tight mt-0.5 mb-1.5 leading-snug">
                {data.centralConcept}
              </h3>
              <p className="text-[11px] text-indigo-100/90 leading-tight line-clamp-3">
                {data.coreSummary}
              </p>
            </div>

            {/* Major Branches & Subtopic Nodes */}
            {layout.map((b) => {
              const theme = getThemeColor(b.color);
              const isCollapsed = collapsedBranches[b.id];

              return (
                <div key={b.id}>
                  {/* Branch Node */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${b.x}px`,
                      top: `${b.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() =>
                      setSelectedItem({
                        type: 'branch',
                        branch: b,
                      })
                    }
                    className="z-10 group cursor-pointer"
                  >
                    <div
                      className="w-56 p-3.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border hover:scale-[1.03] transition-all shadow-xl text-left"
                      style={{
                        borderColor: theme.stroke,
                        boxShadow: `0 8px 24px ${theme.glow}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                          style={{
                            backgroundColor: `${theme.stroke}25`,
                            color: theme.stroke,
                          }}
                        >
                          Branch
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleBranch(b.id, e)}
                          className="text-slate-400 hover:text-white p-1 rounded text-xs cursor-pointer"
                          title={isCollapsed ? 'Expand subtopics' : 'Collapse subtopics'}
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isCollapsed ? '' : 'rotate-90'
                            }`}
                          />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug mb-1 group-hover:text-indigo-300 transition-colors">
                        {b.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-tight line-clamp-2">
                        {b.summary}
                      </p>

                      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{b.subtopics.length} subtopics</span>
                        <span className="text-indigo-400 font-medium">Click to view &rarr;</span>
                      </div>
                    </div>
                  </div>

                  {/* Subtopics Nodes */}
                  {!isCollapsed &&
                    b.subtopicsWithPos.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          position: 'absolute',
                          left: `${sub.x}px`,
                          top: `${sub.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() =>
                          setSelectedItem({
                            type: 'subtopic',
                            branch: b,
                            subtopic: sub,
                          })
                        }
                        className="z-10 group cursor-pointer"
                      >
                        <div
                          className="w-48 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-lg hover:bg-slate-800/90 border border-white/15 hover:border-white/30 hover:scale-105 transition-all shadow-lg text-left"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: theme.stroke }}
                            />
                            <h5 className="text-xs font-semibold text-white truncate">
                              {sub.title}
                            </h5>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-tight line-clamp-2 mb-1">
                            {sub.description}
                          </p>
                          {sub.keyDetail && (
                            <span
                              className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded text-slate-300 bg-slate-800/80 border border-slate-700/80"
                            >
                              💡 {sub.keyDetail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>

          {/* Quick Help Tip */}
          <div className="absolute bottom-3 left-4 text-[11px] text-slate-300 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-lg">
            💡 <span className="text-white font-medium">Click any branch or subtopic</span> to inspect full study notes
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CONCEPT TREE / OUTLINE VIEW */}
      {viewMode === 'outline' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-5">
          {/* Main Concept Header */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Central Concept
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 mb-1">
                {data.centralConcept}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {data.coreSummary}
              </p>
            </div>
          </div>

          {/* Branches Accordion / Tree */}
          <div className="space-y-3">
            {data.branches.map((branch, bIdx) => {
              const theme = getThemeColor(branch.color);
              const isCollapsed = collapsedBranches[branch.id];

              return (
                <div
                  key={branch.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs"
                >
                  {/* Branch Header */}
                  <div
                    onClick={(e) => toggleBranch(branch.id, e)}
                    className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-700 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200/60 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: theme.stroke }}
                      >
                        {bIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {branch.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {branch.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${theme.stroke}15`,
                          color: theme.stroke,
                        }}
                      >
                        {branch.subtopics.length} subtopics
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                          isCollapsed ? '' : 'rotate-90'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Subtopic Items */}
                  {!isCollapsed && (
                    <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {branch.subtopics.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() =>
                            setSelectedItem({
                              type: 'subtopic',
                              branch,
                              subtopic: sub,
                            })
                          }
                          className="p-3 rounded-lg bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: theme.stroke }}
                              />
                              <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {sub.title}
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {sub.description}
                            </p>
                          </div>
                          {sub.keyDetail && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 dark:text-slate-500 font-medium">Takeaway:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {sub.keyDetail}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Slide-over / Modal for Selected Node */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-white/80 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-7 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
                    style={{
                      backgroundColor: getThemeColor(selectedItem.branch.color).stroke,
                    }}
                  >
                    {selectedItem.type === 'branch' ? <Layers className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {selectedItem.type === 'branch' ? 'Major Branch' : `Subtopic of ${selectedItem.branch.title}`}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedItem.subtopic ? selectedItem.subtopic.title : selectedItem.branch.title}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <h5 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                    Description & Context
                  </h5>
                  <p className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-white/80 dark:border-slate-700/80 leading-relaxed text-slate-800 dark:text-slate-200 backdrop-blur-xs">
                    {selectedItem.subtopic ? selectedItem.subtopic.description : selectedItem.branch.summary}
                  </p>
                </div>

                {selectedItem.subtopic?.keyDetail && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Key Takeaway
                    </h5>
                    <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 font-medium text-xs sm:text-sm backdrop-blur-xs">
                      🔑 {selectedItem.subtopic.keyDetail}
                    </div>
                  </div>
                )}

                {selectedItem.type === 'branch' && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-2">
                      Contains {selectedItem.branch.subtopics.length} Subtopics
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedItem.branch.subtopics.map((st) => (
                        <div
                          key={st.id}
                          className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-white/80 dark:border-slate-700/80 text-xs backdrop-blur-xs"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{st.title}: </span>
                          <span className="text-slate-600 dark:text-slate-300">{st.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Footer */}
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-300/60 dark:shadow-none transition-all cursor-pointer"
                >
                  Close Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
