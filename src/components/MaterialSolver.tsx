import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  ListFilter,
  FileQuestion,
  Award,
  Layers,
  RotateCcw,
  ExternalLink,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  X,
  Bookmark,
  BookmarkCheck,
  FileDown,
  Timer,
  CalendarCheck,
  Calculator,
  GitBranch,
} from 'lucide-react';
import {
  UploadedMaterialFile,
  MaterialAnalysisResult,
  MaterialQuizItem,
  DetectedQuestion,
  FlashcardDeck,
  TimedExam,
  ExamQuestion
} from '../types';
import { MaterialUploadZone } from './MaterialUploadZone';
import { QuestionDetailView } from './QuestionDetailView';
import { MaterialQuizModal } from './MaterialQuizModal';
import { PREVIEW_MATERIAL_ANALYSIS } from '../utils/sampleData';
import { saveLibraryItem, isItemSaved, removeSavedByTopic } from '../services/storage';
import { downloadTextFile } from '../utils/exportUtils';
import { FlashcardDeckView } from './FlashcardDeckView';
import { PracticeExamSimulator } from './PracticeExamSimulator';
import { StudyPlanner } from './StudyPlanner';
import { MindMapGenerator } from './MindMapGenerator';
import { FormulaCheatSheet } from './FormulaCheatSheet';

type MaterialStudyMode = 'solutions' | 'flashcards' | 'exam' | 'planner' | 'mindmap' | 'cheatsheet';

export const MaterialSolver: React.FC = () => {
  const [files, setFiles] = useState<UploadedMaterialFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<MaterialAnalysisResult | null>(null);
  const [studyMode, setStudyMode] = useState<MaterialStudyMode>('solutions');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeQuizItems, setActiveQuizItems] = useState<MaterialQuizItem[] | null>(null);
  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  useEffect(() => {
    if (analysisResult?.materialSummary) {
      setIsBookmarked(isItemSaved(analysisResult.materialSummary, 'question'));
    }
  }, [analysisResult]);

  const handleToggleBookmark = () => {
    if (!analysisResult) return;
    if (isBookmarked) {
      removeSavedByTopic(analysisResult.materialSummary, 'question');
      setIsBookmarked(false);
    } else {
      saveLibraryItem(
        'question',
        analysisResult.materialSummary,
        analysisResult.materialSummary,
        `${analysisResult.questions.length} solved questions in ${analysisResult.subjectDomain}`,
        analysisResult,
        [analysisResult.subjectDomain, 'Solved Paper']
      );
      setIsBookmarked(true);
    }
  };

  const handleExportSolvedPaperMarkdown = () => {
    if (!analysisResult) return;
    let md = `# Solved Paper: ${analysisResult.materialSummary}\n`;
    md += `**Domain:** ${analysisResult.subjectDomain} | **Questions:** ${analysisResult.questions.length}\n\n---\n\n`;
    analysisResult.questions.forEach((q, idx) => {
      md += `## Question ${q.questionNumber}: ${q.topic}\n`;
      md += `*Difficulty: ${q.difficulty}*\n\n`;
      md += `${q.rawText}\n\n`;
      md += `### Step-by-Step Solution\n`;
      q.stepByStepSolution.forEach((step, sIdx) => {
        md += `${sIdx + 1}. **${step.title}:** ${step.content}\n`;
      });
      md += `\n**Final Answer:** ${q.finalAnswer}\n\n`;
      if (q.examTips) {
        md += `*Exam Tip:* ${q.examTips}\n\n`;
      }
      md += `---\n\n`;
    });

    const safeTitle = (analysisResult.subjectDomain || 'solved_paper').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadTextFile(md, `${safeTitle}_solutions.md`, 'text/markdown;charset=utf-8');
  };


  // Handle Load Sample Paper
  const handleLoadSample = (sampleId: string) => {
    // Populate with realistic sample file
    const sampleFile: UploadedMaterialFile = {
      id: `sample-${Date.now()}`,
      name: sampleId === 'sample-physics-exam'
        ? 'Physics_Midterm_Kinematics_Exam.pdf'
        : sampleId === 'sample-cs-algorithms'
        ? 'CS_Algorithms_BST_HW3.png'
        : 'Chemistry_Kinetics_Equilibrium.pdf',
      size: 1024 * 1024 * 1.2,
      type: sampleId.includes('png') ? 'image/png' : 'application/pdf',
      base64: 'data:application/pdf;base64,JVBERi0xLjQK...',
    };
    setFiles([sampleFile]);
    // Load pre-analyzed comprehensive result
    setAnalysisResult(PREVIEW_MATERIAL_ANALYSIS);
    setSelectedQuestionIndex(0);
  };

  // Analyze files via Express backend
  const handleAnalyze = async (notes: string) => {
    if (files.length === 0 && !notes.trim()) return;

    setIsAnalyzing(true);
    setAnalyzingStep('Scanning uploaded documents & extracting text...');

    try {
      const stepTimer1 = setTimeout(() => {
        setAnalyzingStep('Detecting equations, formulas, diagrams, and question structures...');
      }, 1500);

      const stepTimer2 = setTimeout(() => {
        setAnalyzingStep('Computing rigorous step-by-step solutions & concept explanations...');
      }, 3500);

      const response = await fetch('/api/analyze-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          textNotes: notes,
          focusMode: 'all',
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to analyze material.');
      }

      const data: MaterialAnalysisResult = await response.json();
      setAnalysisResult(data);
      setSelectedQuestionIndex(0);
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(error.message || 'An error occurred while analyzing the study material.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  // Generate high-yield summary of material
  const handleGenerateSummary = async () => {
    if (!analysisResult) return;
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/material-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          materialSummary: analysisResult.materialSummary,
        }),
      });
      const data = await res.json();
      setSummaryModalText(data.text || 'Summary generated.');
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Trigger whole-material quiz
  const handleStartMaterialQuiz = async () => {
    if (!analysisResult) return;
    try {
      const res = await fetch('/api/material-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quiz_me',
          materialSummary: analysisResult.materialSummary,
        }),
      });
      const data = await res.json();
      if (data.quizItems && data.quizItems.length > 0) {
        setActiveQuizItems(data.quizItems);
      }
    } catch (err) {
      console.error('Quiz error:', err);
    }
  };

  const handleCopyAllSolutions = () => {
    if (!analysisResult) return;
    const text = analysisResult.questions
      .map(
        (q) =>
          `QUESTION ${q.questionNumber}:\n${q.questionText}\n\nFINAL ANSWER: ${q.finalAnswer}\n\nSTEP-BY-STEP SOLUTION:\n${q.stepByStepSolution.join(
            '\n'
          )}\n\nCONCEPT EXPLANATION:\n${q.conceptExplanation}\n\n-----------------------------------\n`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Filtered questions
  const filteredQuestions = analysisResult
    ? filterType === 'all'
      ? analysisResult.questions
      : analysisResult.questions.filter((q) => q.questionType === filterType)
    : [];

  const currentQuestion =
    filteredQuestions.length > 0
      ? filteredQuestions[selectedQuestionIndex] || filteredQuestions[0]
      : null;

  const buildDeckFromMaterial = (result: MaterialAnalysisResult): FlashcardDeck => {
    const cards = result.questions.map((q, idx) => ({
      id: `card-mat-${idx}-${Date.now()}`,
      front: q.questionText,
      back: `Answer: ${q.finalAnswer || 'See solution steps'}\n\nKey Steps:\n${(q.stepByStepSolution || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      conceptTag: result.subjectDomain,
      hint: q.hint || undefined,
      mastery: 'unseen' as const,
    }));
    return {
      id: `deck-mat-${Date.now()}`,
      deckTitle: `${result.subjectDomain}: Key Material Cards`,
      topic: result.subjectDomain,
      difficulty: 'Intermediate',
      totalCards: cards.length,
      cards,
      createdAt: new Date().toISOString(),
    };
  };

  const buildExamFromMaterial = (result: MaterialAnalysisResult): TimedExam => {
    const questions: ExamQuestion[] = result.questions.map((q, idx) => {
      const rawOptions = [
        q.finalAnswer || 'Correct analytical result',
        'Boundary condition misapplication or sign mismatch',
        'Arithmetic calculation error in intermediate stage',
        'Inverted coefficient during integration',
      ];
      return {
        id: `q-mat-${idx}`,
        questionNumber: idx + 1,
        question: q.questionText,
        options: rawOptions,
        correctOptionIndex: 0,
        explanation: (q.stepByStepSolution || []).join(' ') || q.conceptExplanation,
        hint: q.hint || 'Review the core formula and initial boundary conditions.',
        category: result.subjectDomain,
      };
    });

    return {
      id: `exam-mat-${Date.now()}`,
      examTitle: `${result.subjectDomain} - Practice Test`,
      instructions: `Test your mastery of the concepts and problems identified in ${result.materialSummary}.`,
      topic: result.subjectDomain,
      difficulty: 'Intermediate',
      timeLimitMinutes: Math.max(5, questions.length * 2),
      totalQuestions: questions.length,
      questions,
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <span
              className={`flex items-center gap-1.5 font-bold ${
                !analysisResult ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Upload</span>
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />

            <span
              className={`flex items-center gap-1.5 font-bold ${
                isAnalyzing ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Analyze</span>
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />

            <span
              className={`flex items-center gap-1.5 font-bold ${
                analysisResult ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Solutions</span>
            </span>
          </div>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnalysisResult(null);
                  setFiles([]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>New Upload</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Progress State */}
      {isAnalyzing && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Analyzing Material...
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              {analyzingStep || 'Processing document'}
            </p>
          </div>
          <div className="max-w-xs mx-auto w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full animate-[shimmer_1.5s_infinite]" style={{ width: '75%' }} />
          </div>
        </div>
      )}

      {/* Upload Zone (shown when not analyzed or when requested) */}
      {!analysisResult && !isAnalyzing && (
        <MaterialUploadZone
          files={files}
          onFilesChange={setFiles}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          onLoadSample={handleLoadSample}
        />
      )}

      {/* Result View: Questions List + Detailed Solution View */}
      {analysisResult && !isAnalyzing && (
        <div className="space-y-5">
          {/* Material Overview & Action Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    {analysisResult.subjectDomain}
                  </span>
                  <span className="text-xs text-slate-400">
                    {analysisResult.questions.length} Questions
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {analysisResult.materialSummary}
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                  title={isBookmarked ? 'Saved in Library' : 'Save to Library'}
                >
                  {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportSolvedPaperMarkdown}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Export all solutions to Markdown (.md)"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Export (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{summaryLoading ? 'Loading...' : 'Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartMaterialQuiz}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Quiz</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllSolutions}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
            </div>

            {/* Key Topics Badges */}
            {analysisResult.keyTopicsCovered && analysisResult.keyTopicsCovered.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                {analysisResult.keyTopicsCovered.map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* Feature Options for This Material */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Study Mode:</span>
              <button
                type="button"
                onClick={() => setStudyMode('solutions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'solutions'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Solved Questions ({analysisResult.questions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode('flashcards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'flashcards'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Flashcards</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode('exam')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'exam'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Timed Practice Exam</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode('planner')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'planner'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Revision Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode('mindmap')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'mindmap'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Mind Map</span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode('cheatsheet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  studyMode === 'cheatsheet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Formulas</span>
              </button>
            </div>
          </div>

          {/* Conditional Feature Views for Material */}
          {studyMode === 'flashcards' && (
            <div className="pt-2">
              <FlashcardDeckView
                initialDeck={buildDeckFromMaterial(analysisResult)}
                initialTopic={analysisResult.subjectDomain}
                hideInputHeader={true}
              />
            </div>
          )}

          {studyMode === 'exam' && (
            <div className="pt-2">
              <PracticeExamSimulator
                initialExam={buildExamFromMaterial(analysisResult)}
                initialTopic={analysisResult.subjectDomain}
                hideInputHeader={true}
              />
            </div>
          )}

          {studyMode === 'planner' && (
            <div className="pt-2">
              <StudyPlanner
                initialTopic={analysisResult.subjectDomain}
                initialExamName={`${analysisResult.subjectDomain} Paper Revision`}
                hideInputHeader={false}
              />
            </div>
          )}

          {studyMode === 'mindmap' && (
            <div className="pt-2">
              <MindMapGenerator
                initialTopic={analysisResult.subjectDomain}
              />
            </div>
          )}

          {studyMode === 'cheatsheet' && (
            <div className="pt-2">
              <FormulaCheatSheet
                initialTopic={analysisResult.subjectDomain}
              />
            </div>
          )}

          {/* Main Layout: Left Question Sidebar + Right Detail View */}
          {studyMode === 'solutions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Questions Navigation Sidebar */}
            <div className="lg:col-span-4 space-y-3">
              {/* Type Filter */}
              <div className="flex items-center justify-between gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                {['all', 'math', 'programming', 'conceptual'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFilterType(t);
                      setSelectedQuestionIndex(0);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                      filterType === t
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Question list cards */}
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {filteredQuestions.map((q, idx) => {
                  const isSelected = idx === selectedQuestionIndex;
                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setSelectedQuestionIndex(idx)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          Question {q.questionNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                          {q.questionType}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                        {q.questionText}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[180px]">
                          Ans: {q.finalAnswer}
                        </span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Detail View */}
            <div className="lg:col-span-8">
              {currentQuestion ? (
                <QuestionDetailView
                  question={currentQuestion}
                  materialSummary={analysisResult.materialSummary}
                  onOpenQuiz={(items) => setActiveQuizItems(items)}
                />
              ) : (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                  No questions match the selected filter.
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Interactive Quiz Modal */}
      {activeQuizItems && (
        <MaterialQuizModal
          quizItems={activeQuizItems}
          onClose={() => setActiveQuizItems(null)}
        />
      )}

      {/* Revision Summary Modal */}
      {summaryModalText && (
        <div
          onClick={() => setSummaryModalText(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  High-Yield Material Revision Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalText(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {summaryModalText}
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSummaryModalText(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
