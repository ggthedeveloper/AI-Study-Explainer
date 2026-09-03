import React, { useState, useEffect } from 'react';
import { StudyExplanation, DifficultyLevel, StructuredStudyNotes, MindMapData } from '../types';
import { SAMPLE_STUDY_TOPICS } from '../utils/sampleData';
import { PracticeQuiz } from './PracticeQuiz';
import { createStudyNotesPDF, buildNotesFromExplanation } from '../utils/pdfGenerator';
import { exportMindMapToPDF } from '../utils/mindMapPdfGenerator';
import { exportExplanationToMarkdown } from '../utils/exportUtils';
import { saveLibraryItem, isItemSaved, removeSavedByTopic } from '../services/storage';
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  KeyRound,
  FlaskConical,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  ChevronDown,
  GraduationCap,
  FileText,
  Download,
  CheckCircle2,
  GitBranch,
  Bookmark,
  BookmarkCheck,
  FileDown,
  Layers,
  Timer,
  CalendarCheck,
  Calculator,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FlashcardDeckView } from './FlashcardDeckView';
import { PracticeExamSimulator } from './PracticeExamSimulator';
import { StudyPlanner } from './StudyPlanner';
import { MindMapGenerator } from './MindMapGenerator';
import { FormulaCheatSheet } from './FormulaCheatSheet';

export type TopicStudySubTab = 'guide' | 'flashcards' | 'exam' | 'planner' | 'mindmap' | 'cheatsheet';

interface StudyExplainerProps {
  initialExplanation?: StudyExplanation | null;
  initialSubTab?: TopicStudySubTab;
  initialTopic?: string;
  onOpenFlashcardsForTopic?: (topic: string) => void;
}

export const StudyExplainer: React.FC<StudyExplainerProps> = ({
  initialExplanation = null,
  initialSubTab = 'guide',
  initialTopic,
  onOpenFlashcardsForTopic,
}) => {
  const [topic, setTopic] = useState<string>(initialTopic || initialExplanation?.topic || '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialExplanation?.difficulty || 'Beginner');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<StudyExplanation | null>(initialExplanation);
  const [activeStudyTab, setActiveStudyTab] = useState<TopicStudySubTab>(initialSubTab);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [expandingLoading, setExpandingLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveStudyTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialExplanation) {
      setExplanation(initialExplanation);
      setTopic(initialExplanation.topic);
      setDifficulty(initialExplanation.difficulty);
    }
  }, [initialExplanation]);

  // Sync bookmark status when explanation changes
  useEffect(() => {
    if (explanation?.topic) {
      setIsBookmarked(isItemSaved(explanation.topic, 'explanation'));
    }
  }, [explanation]);

  const handleToggleBookmark = () => {
    if (!explanation) return;
    if (isBookmarked) {
      removeSavedByTopic(explanation.topic, 'explanation');
      setIsBookmarked(false);
    } else {
      saveLibraryItem(
        'explanation',
        explanation.topic,
        explanation.topic,
        explanation.simpleExplanation,
        explanation,
        [explanation.topic, explanation.difficulty]
      );
      setIsBookmarked(true);
    }
  };


  // PDF Notes State
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Mind Map PDF Download State
  const [mindMapPdfLoading, setMindMapPdfLoading] = useState<boolean>(false);
  const [mindMapPdfSuccess, setMindMapPdfSuccess] = useState<boolean>(false);
  const [mindMapPdfError, setMindMapPdfError] = useState<string | null>(null);

  // Practice Questions Bank State
  const [practiceQuestionsLoading, setPracticeQuestionsLoading] = useState<boolean>(false);

  // Fetch full 15-20 practice questions bank for the topic
  const fetchPracticeQuestions = async (targetTopic: string, targetDiff: DifficultyLevel, contextText: string) => {
    try {
      setPracticeQuestionsLoading(true);
      const res = await fetch('/api/practice-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          difficulty: targetDiff,
          context: contextText,
        }),
      });

      if (res.ok) {
        const qData = await res.json();
        if (Array.isArray(qData.questions) && qData.questions.length > 0) {
          setExplanation((prev) => (prev ? { ...prev, practiceQuestions: qData.questions } : prev));
        }
      }
    } catch (qErr) {
      console.warn('Could not fetch expanded practice questions bank:', qErr);
    } finally {
      setPracticeQuestionsLoading(false);
    }
  };

  // Clean up speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchDetailedBreakdown = async (
    targetTopic: string,
    targetDiff: DifficultyLevel,
    contextText: string
  ) => {
    try {
      setExpandingLoading(true);
      const res = await fetch('/api/expand-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          difficulty: targetDiff,
          context: contextText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.detailedBreakdown) {
          setExplanation((prev) => (prev ? { ...prev, detailedBreakdown: data.detailedBreakdown } : prev));
        }
      }
    } catch (expErr) {
      console.warn('Could not fetch detailed breakdown:', expErr);
    } finally {
      setExpandingLoading(false);
    }
  };

  const handleToggleExpand = () => {
    if (!explanation) return;
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && !explanation.detailedBreakdown) {
      const contextSummary = `${explanation.simpleExplanation} Key points: ${explanation.keyPoints.join('. ')}. Example: ${explanation.example}`;
      fetchDetailedBreakdown(explanation.topic, explanation.difficulty, contextSummary);
    }
  };

  const handleExplain = async (
    overrideTopic?: string,
    overrideDifficulty?: DifficultyLevel,
    autoExpand?: boolean
  ) => {
    const targetTopic = (overrideTopic !== undefined ? overrideTopic : topic).trim();
    const targetDiff = overrideDifficulty || difficulty;

    if (!targetTopic) {
      setError('Please enter a topic or question to explain.');
      return;
    }

    setLoading(true);
    setError(null);
    setPdfSuccess(false);
    setPdfError(null);
    if (autoExpand !== undefined) {
      setIsExpanded(autoExpand);
    }

    // Stop speaking if active
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: targetTopic,
          difficulty: targetDiff,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data: StudyExplanation = await response.json();
      setExplanation(data);
      if (overrideTopic) setTopic(overrideTopic);
      if (overrideDifficulty) setDifficulty(overrideDifficulty);

      // If user requested expand and detailedBreakdown wasn't returned, fetch it immediately
      if (autoExpand && !data.detailedBreakdown) {
        const contextSummary = `${data.simpleExplanation} Key points: ${data.keyPoints.join('. ')}. Example: ${data.example}`;
        fetchDetailedBreakdown(data.topic, data.difficulty, contextSummary);
      }

      // Proactively fetch full 15-20 question bank if not already populated with 10+ questions
      if (!data.practiceQuestions || data.practiceQuestions.length < 10) {
        const contextSummary = `${data.simpleExplanation} Key points: ${data.keyPoints.join('. ')}. Example: ${data.example}`;
        fetchPracticeQuestions(data.topic, data.difficulty, contextSummary);
      }
    } catch (err: any) {
      console.error('Explanation request failed:', err);
      setError(err?.message || 'Failed to generate explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!explanation) return;
    setPdfLoading(true);
    setPdfSuccess(false);
    setPdfError(null);

    try {
      // 1. Fetch structured exam notes from server
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: explanation.topic,
          difficulty: explanation.difficulty,
          explanation: explanation.simpleExplanation,
          analogy: explanation.easyAnalogy,
          keyPoints: explanation.keyPoints,
          example: explanation.example,
        }),
      });

      let notes: StructuredStudyNotes;
      if (response.ok) {
        notes = await response.json();
      } else {
        // Fallback to direct client-side generation from explanation
        notes = buildNotesFromExplanation(explanation);
      }

      // 2. Generate and trigger download
      createStudyNotesPDF(notes);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err: any) {
      console.error('PDF generation error, attempting fallback:', err);
      try {
        const fallbackNotes = buildNotesFromExplanation(explanation);
        createStudyNotesPDF(fallbackNotes);
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 4000);
      } catch (fallbackErr: any) {
        setPdfError('Failed to generate PDF. Please try again.');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadMindMapPDF = async () => {
    if (!explanation || mindMapPdfLoading) return;
    setMindMapPdfLoading(true);
    setMindMapPdfSuccess(false);
    setMindMapPdfError(null);

    try {
      // 1. Fetch or generate the mind map structure for the current topic/explanation
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: explanation.topic,
          context: `${explanation.simpleExplanation} Key points: ${explanation.keyPoints.join('. ')}. Example: ${explanation.example}`,
        }),
      });

      let mapData: MindMapData;
      if (response.ok) {
        mapData = await response.json();
      } else {
        // Fallback: build a balanced mind map from explanation state
        mapData = {
          topic: explanation.topic,
          centralConcept: explanation.topic,
          coreSummary: explanation.simpleExplanation.slice(0, 140),
          generatedAt: new Date().toISOString(),
          branches: [
            {
              id: 'b1',
              title: 'Core Concept & Logic',
              summary: 'Fundamental principle and conceptual framework',
              color: 'indigo',
              subtopics: explanation.keyPoints.slice(0, 3).map((kp, idx) => ({
                id: `st-1-${idx}`,
                title: kp.split(':')[0] || `Key Point ${idx + 1}`,
                description: kp.includes(':') ? kp.split(':')[1].trim() : kp,
                keyDetail: 'Essential Concept',
              })),
            },
            {
              id: 'b2',
              title: 'Real-World Analogy',
              summary: 'Intuitive mental model for rapid understanding',
              color: 'amber',
              subtopics: [
                {
                  id: 'st-2-1',
                  title: 'Mental Model',
                  description: explanation.easyAnalogy,
                  keyDetail: 'Conceptual bridge',
                },
              ],
            },
            {
              id: 'b3',
              title: 'Practical Application',
              summary: 'Concrete execution and practical demonstration',
              color: 'emerald',
              subtopics: [
                {
                  id: 'st-3-1',
                  title: 'Worked Example',
                  description: explanation.example,
                  keyDetail: 'Applied context',
                },
              ],
            },
            {
              id: 'b4',
              title: 'Key Insights',
              summary: 'Critical facts and exam preparation pointers',
              color: 'cyan',
              subtopics: explanation.keyPoints.slice(3, 6).map((kp, idx) => ({
                id: `st-4-${idx}`,
                title: kp.split(':')[0] || `Insight ${idx + 1}`,
                description: kp.includes(':') ? kp.split(':')[1].trim() : kp,
                keyDetail: 'Exam Focus',
              })),
            },
          ].filter((b) => b.subtopics.length > 0),
        };
      }

      // 2. Export vector PDF with dynamic dimensions and clean balanced layout
      exportMindMapToPDF(mapData);
      setMindMapPdfSuccess(true);
      setTimeout(() => setMindMapPdfSuccess(false), 4000);
    } catch (err: any) {
      console.error('Mind Map PDF download failed:', err);
      setMindMapPdfError(err?.message || 'Failed to download Mind Map. Please try again.');
    } finally {
      setMindMapPdfLoading(false);
    }
  };

  const handleCopy = () => {
    if (!explanation) return;
    const textContent = `AI STUDY EXPLAINER: ${explanation.topic} (${explanation.difficulty} Level)
    
📖 1. SIMPLE EXPLANATION:
${explanation.simpleExplanation}

💡 2. EASY ANALOGY:
${explanation.easyAnalogy}

🔑 3. KEY POINTS:
${explanation.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

🧪 4. EXAMPLE:
${explanation.example}

📝 5. PRACTICE QUESTION:
${explanation.practiceQuestion.question}
Options:
${explanation.practiceQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}
Correct Answer: Option ${String.fromCharCode(65 + explanation.practiceQuestion.correctOptionIndex)}
Explanation: ${explanation.practiceQuestion.explanation}
`;

    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeech = () => {
    if (!window.speechSynthesis || !explanation) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const fullText = `${explanation.topic}. ${explanation.simpleExplanation}. Here is an analogy: ${explanation.easyAnalogy}. Key takeaways: ${explanation.keyPoints.join('. ')}. Example: ${explanation.example}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Search & Prompt Section - Clean, Open, No Boxy Frame */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Concept Explainer
          </h2>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExplain();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
            {/* Topic Input */}
            <div className="relative flex-1">
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, Newton's Third Law, Quantum Computing..."
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

            <div className="flex items-center gap-2 px-1 pb-1 sm:pb-0 sm:px-0">
              {/* Difficulty Dropdown */}
              <div className="relative">
                <select
                  id="difficulty-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="h-10 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs focus:outline-none appearance-none cursor-pointer transition-colors"
                  disabled={loading}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Explain Button */}
              <button
                id="explain-submit-btn"
                type="submit"
                disabled={loading || !topic.trim()}
                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {loading && !isExpanded ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Explaining...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explain</span>
                  </>
                )}
              </button>

              {/* Expand Button: Detailed Explanation with Example */}
              <button
                id="search-expand-btn"
                type="button"
                onClick={() => handleExplain(undefined, undefined, true)}
                disabled={loading || !topic.trim()}
                title="Search and get detailed in-depth explanation with step-by-step worked example"
                className="h-10 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
              >
                {loading && isExpanded ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Expanding...</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feature options right when asking any topic */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Study options:</span>
            <button
              type="button"
              onClick={() => {
                setActiveStudyTab('guide');
                if (!explanation && topic.trim()) {
                  handleExplain();
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'guide'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Concept Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudyTab('flashcards')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'flashcards'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Flashcards</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudyTab('exam')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'exam'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Timer className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Practice Exam</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudyTab('planner')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'planner'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <CalendarCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Study Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudyTab('mindmap')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'mindmap'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <GitBranch className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Mind Map</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudyTab('cheatsheet')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStudyTab === 'cheatsheet'
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Calculator className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Formulas</span>
            </button>
          </div>

          {/* Clean Suggestion Links (No Boxy Chips) */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="text-slate-400 dark:text-slate-500">Try:</span>
            {SAMPLE_STUDY_TOPICS.map((item, idx) => (
              <React.Fragment key={item.topic}>
                <button
                  type="button"
                  onClick={() => {
                    setTopic(item.topic);
                    setDifficulty(item.difficulty);
                    handleExplain(item.topic, item.difficulty);
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
                >
                  {item.topic}
                </button>
                {idx < SAMPLE_STUDY_TOPICS.length - 1 && (
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
              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 pt-6 border-t border-slate-200/60 dark:border-slate-800 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-8 w-64 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-32 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200/60 dark:bg-slate-800/70 rounded-md w-full" />
            <div className="h-4 bg-slate-200/60 dark:bg-slate-800/70 rounded-md w-5/6" />
            <div className="h-4 bg-slate-200/60 dark:bg-slate-800/70 rounded-md w-4/6" />
          </div>
          <div className="h-20 bg-slate-200/40 dark:bg-slate-800/50 rounded-lg" />
        </div>
      )}

      {/* Non-Guide Feature Views */}
      {activeStudyTab === 'flashcards' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Interactive Flashcards on {explanation?.topic || topic || 'Current Topic'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveStudyTab('guide')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              ← Back to Concept Guide
            </button>
          </div>
          <FlashcardDeckView initialTopic={explanation?.topic || topic} autoGenerate={true} hideInputHeader={false} />
        </div>
      )}

      {activeStudyTab === 'exam' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Timed Practice Exam on {explanation?.topic || topic || 'Current Topic'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveStudyTab('guide')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              ← Back to Concept Guide
            </button>
          </div>
          <PracticeExamSimulator initialTopic={explanation?.topic || topic} hideInputHeader={false} />
        </div>
      )}

      {activeStudyTab === 'planner' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Revision Schedule for {explanation?.topic || topic || 'Current Topic'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveStudyTab('guide')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              ← Back to Concept Guide
            </button>
          </div>
          <StudyPlanner initialTopic={explanation?.topic || topic} hideInputHeader={false} />
        </div>
      )}

      {activeStudyTab === 'mindmap' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Concept Mind Map for {explanation?.topic || topic || 'Current Topic'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveStudyTab('guide')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              ← Back to Concept Guide
            </button>
          </div>
          <MindMapGenerator initialTopic={explanation?.topic || topic} />
        </div>
      )}

      {activeStudyTab === 'cheatsheet' && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Formula Cheat Sheet for {explanation?.topic || topic || 'Current Topic'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveStudyTab('guide')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              ← Back to Concept Guide
            </button>
          </div>
          <FormulaCheatSheet initialTopic={explanation?.topic || topic} />
        </div>
      )}

      {/* Clean Uncluttered Empty State */}
      {activeStudyTab === 'guide' && !loading && !explanation && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Enter a topic to explain
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Type any concept, equation, or study question above, or select a sample to begin.
            </p>
          </div>
        </div>
      )}

      {/* Explanation Results Display - Clean Flowing Article (No Boxes Everywhere) */}
      {activeStudyTab === 'guide' && !loading && explanation && (
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-8 pt-4"
        >
          {/* Document Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {explanation.difficulty} Level
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Concept Guide</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {explanation.topic}
              </h2>
            </div>

            {/* Clean Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="listen-aloud-btn"
                type="button"
                onClick={toggleSpeech}
                title="Read explanation aloud"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>

              <button
                id="generate-pdf-header-btn"
                type="button"
                onClick={handleGeneratePDF}
                disabled={pdfLoading}
                title="Download structured study notes PDF"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {pdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : pdfSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{pdfSuccess ? 'Saved ✓' : 'Notes (PDF)'}</span>
              </button>

              <button
                id="download-mindmap-header-btn"
                type="button"
                onClick={handleDownloadMindMapPDF}
                disabled={mindMapPdfLoading}
                title="Download Concept Mind Map PDF"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {mindMapPdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : mindMapPdfSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{mindMapPdfSuccess ? 'Saved ✓' : 'Mind Map'}</span>
              </button>

              <button
                id="export-markdown-btn"
                type="button"
                onClick={() => exportExplanationToMarkdown(explanation)}
                title="Export notes as Markdown (.md)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Export (.md)</span>
              </button>

              <button
                id="make-flashcards-btn"
                type="button"
                onClick={() => {
                  if (onOpenFlashcardsForTopic) onOpenFlashcardsForTopic(explanation.topic);
                  setActiveStudyTab('flashcards');
                }}
                title="Practice Flashcards for this topic"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Flashcards</span>
              </button>

              <button
                id="make-exam-btn"
                type="button"
                onClick={() => setActiveStudyTab('exam')}
                title="Take Practice Exam for this topic"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Practice Exam</span>
              </button>

              <button
                id="make-plan-btn"
                type="button"
                onClick={() => setActiveStudyTab('planner')}
                title="Create Study Schedule for this topic"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Schedule</span>
              </button>

              <button
                id="bookmark-explanation-btn"
                type="button"
                onClick={handleToggleBookmark}
                title={isBookmarked ? 'Remove from Saved Library' : 'Save to Library'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
              </button>

              {/* Expand / Collapse Detailed Explanation Button */}
              <button
                id="expand-detailed-toolbar-btn"
                type="button"
                onClick={handleToggleExpand}
                disabled={expandingLoading}
                title={isExpanded ? 'Collapse detailed breakdown' : 'Expand detailed explanation with step-by-step worked example'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-xs ${
                  isExpanded
                    ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                    : 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/80 hover:bg-violet-100 dark:hover:bg-violet-900/50'
                }`}
              >
                {expandingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
                <span>{isExpanded ? 'Collapse Details' : 'Expand Details'}</span>
              </button>

              <button
                id="copy-notes-btn"
                type="button"
                onClick={handleCopy}
                title="Copy notes to clipboard"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                id="regenerate-btn"
                type="button"
                onClick={() => handleExplain()}
                title="Regenerate explanation"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Expand Callout Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-violet-950 dark:text-violet-200 flex items-center gap-2">
                  <span>Detailed Explanation &amp; Worked Example</span>
                  {isExpanded && (
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200 font-semibold">
                      Active
                    </span>
                  )}
                </h4>
                <p className="text-3xs sm:text-xs text-violet-700 dark:text-violet-300/80">
                  {isExpanded
                    ? 'Displaying academic mechanics, comprehensive step-by-step worked example, formulas, and pitfalls below.'
                    : 'Click Expand for full theoretical mechanisms, calculations, and complete step-by-step worked examples.'}
                </p>
              </div>
            </div>
            <button
              id="expand-detailed-banner-btn"
              type="button"
              onClick={handleToggleExpand}
              disabled={expandingLoading}
              className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              {expandingLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading Details...</span>
                </>
              ) : isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Collapse Details</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Expand (Detailed + Example)</span>
                </>
              )}
            </button>
          </div>

          {/* EXPANDED DETAILED EXPLANATION & WORKED EXAMPLE SECTION */}
          {isExpanded && (
            <section
              id="detailed-explanation-section"
              className="space-y-6 p-5 sm:p-6 rounded-2xl bg-violet-50/30 dark:bg-slate-900/90 border border-violet-200/80 dark:border-violet-900/60 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Detailed Explanation &amp; Comprehensive Worked Example
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </button>
              </div>

              {expandingLoading ? (
                <div className="py-8 text-center space-y-3 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Generating in-depth theoretical analysis and complete step-by-step worked example...
                  </p>
                </div>
              ) : explanation.detailedBreakdown ? (
                <div className="space-y-6">
                  {/* 1. In-Depth Theoretical Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                      <span>📖</span>
                      <span>In-Depth Conceptual Exposition</span>
                    </h4>
                    <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                      {explanation.detailedBreakdown.inDepthExplanation}
                    </div>
                  </div>

                  {/* 2. Step-by-Step Worked Example */}
                  <div className="space-y-3 pt-5 border-t border-slate-200/70 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✏️</span>
                      <span>Step-by-Step Worked Example</span>
                    </h4>

                    {/* Example Scenario Card */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 shadow-2xs">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1 text-sm sm:text-base">
                        {explanation.detailedBreakdown.stepByStepExample.title}
                      </span>
                      <p className="leading-relaxed font-normal">
                        {explanation.detailedBreakdown.stepByStepExample.scenario}
                      </p>
                    </div>

                    {/* Sequential Steps */}
                    <div className="space-y-3">
                      {explanation.detailedBreakdown.stepByStepExample.steps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {step.stepNumber}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {step.title}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pl-7 leading-relaxed font-normal">
                            {step.explanation}
                          </p>
                          {step.calculationOrDetail && (
                            <div className="ml-7 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 font-mono text-3xs sm:text-xs text-indigo-700 dark:text-indigo-300 whitespace-pre-wrap">
                              {step.calculationOrDetail}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Example Conclusion / Takeaway */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                      <span className="font-bold shrink-0">Key Takeaway:</span>
                      <span className="font-normal">{explanation.detailedBreakdown.stepByStepExample.takeaway}</span>
                    </div>
                  </div>

                  {/* 3. Core Mechanisms */}
                  {explanation.detailedBreakdown.coreMechanisms && explanation.detailedBreakdown.coreMechanisms.length > 0 && (
                    <div className="space-y-3 pt-5 border-t border-slate-200/70 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>⚙️</span>
                        <span>Core Governing Mechanisms</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {explanation.detailedBreakdown.coreMechanisms.map((mech, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-1 shadow-2xs"
                          >
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                              {mech.mechanism}
                            </span>
                            <p className="text-3xs sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                              {mech.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Common Misconceptions */}
                  {explanation.detailedBreakdown.commonMisconceptions && explanation.detailedBreakdown.commonMisconceptions.length > 0 && (
                    <div className="space-y-3 pt-5 border-t border-slate-200/70 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Common Misconceptions &amp; Exam Traps</span>
                      </h4>
                      <div className="space-y-2.5">
                        {explanation.detailedBreakdown.commonMisconceptions.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-start gap-1.5 text-rose-800 dark:text-rose-300 font-semibold">
                              <span className="shrink-0">❌ Trap:</span>
                              <span className="font-normal">"{item.misconception}"</span>
                            </div>
                            <div className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium pl-4">
                              <span className="shrink-0">✓ Reality:</span>
                              <span className="font-normal">{item.correction}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Practical Applications */}
                  {explanation.detailedBreakdown.practicalApplications && explanation.detailedBreakdown.practicalApplications.length > 0 && (
                    <div className="space-y-2.5 pt-5 border-t border-slate-200/70 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Real-World &amp; Industry Applications
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {explanation.detailedBreakdown.practicalApplications.map((app, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-800"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Collapse Button */}
                  <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Collapse Detailed Breakdown</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {/* 1. SIMPLE EXPLANATION - Clean Flowing Typography */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Overview
            </h3>
            <div className="text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed whitespace-pre-line font-normal">
              {explanation.simpleExplanation}
            </div>
          </section>

          {/* 2. EASY ANALOGY - Clean Blockquote (No Box) */}
          <section className="border-l-2 border-amber-400 dark:border-amber-500 pl-5 py-2 my-6">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <span>💡</span>
              <span>Mental Model</span>
            </div>
            <p className="text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed italic font-normal">
              "{explanation.easyAnalogy}"
            </p>
          </section>

          {/* 3. KEY POINTS - Clean Numbered List (No Nested Box Cards) */}
          <section className="space-y-4 pt-6 border-t border-slate-200/60 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Key Principles
            </h3>

            <div className="space-y-3.5 pl-1">
              {explanation.keyPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. REAL-WORLD EXAMPLE - Clean Section (No Nested Box) */}
          <section className="space-y-2 pt-6 border-t border-slate-200/60 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Real-World Application
            </h3>
            <div className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed pl-1">
              {explanation.example}
            </div>
          </section>

          {/* 5. PRACTICE QUIZ - Integrated Seamlessly */}
          <section className="pt-8 border-t border-slate-200/80 dark:border-slate-800">
            <PracticeQuiz
              quiz={explanation.practiceQuestion}
              questions={explanation.practiceQuestions}
              topic={explanation.topic}
              difficulty={explanation.difficulty}
              isLoadingMore={practiceQuestionsLoading}
              onRefreshQuestions={() => {
                const contextSummary = `${explanation.simpleExplanation} Key points: ${explanation.keyPoints.join('. ')}. Example: ${explanation.example}`;
                fetchPracticeQuestions(explanation.topic, explanation.difficulty, contextSummary);
              }}
            />
          </section>
        </motion.article>
      )}

    </div>
  );
};
