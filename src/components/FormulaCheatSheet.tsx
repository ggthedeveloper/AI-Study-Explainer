import React, { useState } from 'react';
import {
  Calculator,
  Search,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Bookmark,
  Layers,
  ArrowRight,
  Loader2,
  Atom,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormulaCheatSheetData, FormulaCategory, FormulaDetail } from '../types';
import { SAMPLE_FORMULA_TOPICS } from '../utils/sampleData';
import { createFormulaCheatSheetPDF } from '../utils/pdfGenerator';

interface FormulaCheatSheetProps {
  initialCheatSheet?: FormulaCheatSheetData;
  initialTopic?: string;
}

export const FormulaCheatSheet: React.FC<FormulaCheatSheetProps> = ({
  initialCheatSheet,
  initialTopic,
}) => {
  const [topic, setTopic] = useState(initialTopic || '');
  const [cheatSheetData, setCheatSheetData] = useState<FormulaCheatSheetData | null>(
    initialCheatSheet || null
  );

  React.useEffect(() => {
    if (initialTopic && !cheatSheetData) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter within generated formulas
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWorkedExamples, setExpandedWorkedExamples] = useState<Record<string, boolean>>({});
  const [copiedFormulaId, setCopiedFormulaId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleGenerate = async (overrideTopic?: string) => {
    const targetTopic = overrideTopic || topic;
    if (!targetTopic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/formula-cheatsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data: FormulaCheatSheetData = await response.json();
      setCheatSheetData(data);
      setSearchQuery('');
      setExpandedWorkedExamples({});
    } catch (err: any) {
      console.error('Error fetching formula cheat sheet:', err);
      setError(err?.message || 'Failed to generate formula cheat sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkedExample = (formulaId: string) => {
    setExpandedWorkedExamples((prev) => ({
      ...prev,
      [formulaId]: !prev[formulaId],
    }));
  };

  const copyFormulaText = (formula: FormulaDetail) => {
    const textToCopy = `${formula.name}: ${formula.plainText || formula.latex}\nVariables:\n${formula.variables
      .map((v) => `• ${v.symbol} = ${v.meaning} (${v.unit || 'unit'})`)
      .join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedFormulaId(formula.id);
    setTimeout(() => setCopiedFormulaId(null), 2000);
  };

  const copyEntireCheatSheet = () => {
    if (!cheatSheetData) return;

    let md = `# ${cheatSheetData.topic} — Formula & Equation Cheat Sheet\n`;
    md += `**Subject Area:** ${cheatSheetData.subjectCategory}\n\n`;
    md += `## Overview\n${cheatSheetData.overview}\n\n`;

    cheatSheetData.categories.forEach((cat) => {
      md += `## ${cat.categoryName}\n`;
      if (cat.description) md += `*${cat.description}*\n\n`;

      cat.formulas.forEach((f) => {
        md += `### ${f.name}\n`;
        md += `\`\`\`\n${f.plainText || f.latex}\n\`\`\`\n`;
        md += `${f.description}\n\n`;
        md += `**Variables:**\n`;
        f.variables.forEach((v) => {
          md += `- **${v.symbol}**: ${v.meaning} ${v.unit ? `[${v.unit}]` : ''}\n`;
        });
        md += `\n**When to use:** ${f.whenToUse}\n\n`;
        if (f.workedExample) {
          md += `**Worked Example:**\n`;
          md += `*Problem:* ${f.workedExample.problem}\n`;
          md += `*Given:* ${f.workedExample.given}\n`;
          f.workedExample.solutionSteps.forEach((s) => (md += `- ${s}\n`));
          md += `*Final Answer:* ${f.workedExample.finalAnswer}\n\n`;
        }
        if (f.commonPitfalls) {
          md += `> ⚠️ **Common Pitfall:** ${f.commonPitfalls}\n\n`;
        }
        md += `---\n\n`;
      });
    });

    if (cheatSheetData.constantsAndUnits?.length) {
      md += `## Standard Constants & Reference Values\n`;
      cheatSheetData.constantsAndUnits.forEach((c) => {
        md += `- **${c.name}** (${c.symbol}): ${c.value} ${c.unit || ''}\n`;
      });
      md += `\n`;
    }

    if (cheatSheetData.quickCalculationTips?.length) {
      md += `## High-Yield Exam Calculation Tips\n`;
      cheatSheetData.quickCalculationTips.forEach((t, i) => {
        md += `${i + 1}. ${t}\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!cheatSheetData) return;
    setIsDownloadingPdf(true);
    try {
      createFormulaCheatSheetPDF(cheatSheetData);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Filter formulas based on search query
  const filteredCategories = cheatSheetData?.categories
    .map((cat) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return cat;

      const matchingFormulas = cat.formulas.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.plainText.toLowerCase().includes(q) ||
          (f.latex && f.latex.toLowerCase().includes(q)) ||
          f.description.toLowerCase().includes(q) ||
          f.whenToUse.toLowerCase().includes(q) ||
          f.variables.some((v) => v.symbol.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q))
      );

      return {
        ...cat,
        formulas: matchingFormulas,
      };
    })
    .filter((cat) => cat.formulas.length > 0);

  const totalFormulaCount =
    cheatSheetData?.categories.reduce((acc, c) => acc + c.formulas.length, 0) || 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Top Generator Input Section - Clean, Open */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Formula Cheat Sheet
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
            <div className="relative flex-1">
              <input
                id="cheatsheet-topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Kinematics & Newton's Laws, Organic Chemistry Reaction Rates..."
                className="w-full h-11 px-3.5 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-sm focus:outline-none"
                disabled={loading}
              />
              {topic && (
                <button
                  type="button"
                  onClick={() => setTopic('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              id="generate-cheatsheet-btn"
              type="submit"
              disabled={loading || !topic.trim()}
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Sheet</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Subject Suggestions */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="text-slate-400 dark:text-slate-500">Popular:</span>
            {SAMPLE_FORMULA_TOPICS.map((item, idx) => (
              <React.Fragment key={item.topic}>
                <button
                  type="button"
                  onClick={() => {
                    setTopic(item.topic);
                    handleGenerate(item.topic);
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
                >
                  {item.topic}
                </button>
                {idx < SAMPLE_FORMULA_TOPICS.length - 1 && (
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs underline font-semibold text-rose-700 dark:text-rose-300 ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <div className="pt-8 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Generating High-Yield Formula Sheet...
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Extracting governing laws, defining variables with SI units, and detailing exam triggers for "{topic}".
            </p>
          </div>
        </div>
      )}

      {/* Cheat Sheet Content View */}
      {!loading && cheatSheetData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Document Header & Actions */}
          <div className="pb-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {cheatSheetData.subjectCategory}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {totalFormulaCount} Key Equations
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {cheatSheetData.topic}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="download-cheatsheet-pdf-btn"
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  title="Download High-Resolution Formula Cheat Sheet PDF"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    downloadSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Building PDF…</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Downloaded ✓</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  id="copy-cheatsheet-md-btn"
                  type="button"
                  onClick={copyEntireCheatSheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  id="regenerate-cheatsheet-btn"
                  type="button"
                  onClick={() => handleGenerate()}
                  title="Regenerate Formula Sheet"
                  className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {cheatSheetData.overview}
            </p>

            {/* In-sheet filter input */}
            <div className="relative max-w-sm pt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 mt-0.5" />
              <input
                id="search-formula-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter equations, variables (e.g. F, m, Δx)..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mt-0.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Categories & Formula Cards */}
          {filteredCategories && filteredCategories.length > 0 ? (
            <div className="space-y-6">
              {filteredCategories.map((category, catIdx) => (
                <div key={category.categoryName} className="space-y-3.5">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                        {catIdx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {category.categoryName}
                        </h4>
                        {category.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {category.formulas.length} {category.formulas.length === 1 ? 'equation' : 'equations'}
                    </span>
                  </div>

                  {/* Formula Grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {category.formulas.map((formula) => {
                      const isExampleOpen = expandedWorkedExamples[formula.id];
                      const isCopied = copiedFormulaId === formula.id;

                      return (
                        <div
                          key={formula.id}
                          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                        >
                          <div className="space-y-3">
                            {/* Card Top: Title & Copy Button */}
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                                {formula.name}
                              </h5>
                              <button
                                type="button"
                                onClick={() => copyFormulaText(formula)}
                                title="Copy formula text and variable definitions"
                                className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Formula Equation Banner */}
                            <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between font-mono font-bold text-indigo-950 dark:text-indigo-200 text-sm tracking-wide">
                              <span className="select-all">{formula.plainText || formula.latex}</span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {formula.description}
                            </p>

                            {/* Variable Meanings & SI Units Table */}
                            {formula.variables && formula.variables.length > 0 && (
                              <div className="rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 p-2.5 space-y-1.5 text-xs">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Variable Definitions & Units
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                  {formula.variables.map((v) => (
                                    <div
                                      key={v.symbol}
                                      className="flex items-baseline justify-between gap-2 text-xs py-0.5 border-b border-slate-200/40 dark:border-slate-700/60 last:border-0"
                                    >
                                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                                        {v.symbol}
                                      </span>
                                      <span className="text-slate-700 dark:text-slate-300 flex-1 text-right sm:text-left sm:pl-2 text-[11px] sm:text-xs">
                                        {v.meaning}
                                      </span>
                                      {v.unit && (
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 shrink-0">
                                          {v.unit}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* When to Use Trigger */}
                            {formula.whenToUse && (
                              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                                <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-emerald-950 dark:text-emerald-200">When to use: </span>
                                  <span>{formula.whenToUse}</span>
                                </div>
                              </div>
                            )}

                            {/* Exam Pitfall Warning */}
                            {formula.commonPitfalls && (
                              <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-950 dark:text-amber-200">Watch out: </span>
                                  <span>{formula.commonPitfalls}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Worked Example Accordion Trigger */}
                          {formula.workedExample && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => toggleWorkedExample(formula.id)}
                                className="w-full flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Calculator className="w-3.5 h-3.5" />
                                  <span>Worked Calculation Example</span>
                                </span>
                                {isExampleOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {isExampleOpen && (
                                <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Problem: </span>
                                    <span className="text-slate-700 dark:text-slate-300">{formula.workedExample.problem}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Given: </span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {formula.workedExample.given}
                                    </span>
                                  </div>
                                  <div className="space-y-1 pt-1">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Steps:</span>
                                    {formula.workedExample.solutionSteps.map((step, sIdx) => (
                                      <div key={sIdx} className="flex items-baseline gap-1.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                                        <span>{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Final Answer:</span>
                                    <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      {formula.workedExample.finalAnswer}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No matching equations found for "{searchQuery}"</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try searching for a different variable symbol or concept.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Constants & Reference Values Section */}
          {cheatSheetData.constantsAndUnits && cheatSheetData.constantsAndUnits.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Standard Constants & Reference Values
                </h4>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {cheatSheetData.constantsAndUnits.map((item) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.name}</div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-xs">{item.symbol}</span>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{item.value}</span>
                    </div>
                    {item.unit && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.unit}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-Yield Exam Calculation Tips */}
          {cheatSheetData.quickCalculationTips && cheatSheetData.quickCalculationTips.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  High-Yield Exam Calculation Tips
                </h4>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {cheatSheetData.quickCalculationTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Clean Empty State */}
      {!loading && !cheatSheetData && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Search a subject for formulas
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Generate governing equations, variable definitions, SI units, and worked calculations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
