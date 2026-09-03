import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Timer,
  Clock,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Layers,
  Award,
  Loader2,
  Check,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import { TimedExam, ExamQuestion, ExamAttemptResult, DifficultyLevel } from '../types';
import { saveLibraryItem } from '../services/storage';

interface PracticeExamSimulatorProps {
  initialTopic?: string;
  initialExam?: TimedExam | null;
  hideInputHeader?: boolean;
  onConvertToFlashcards?: (deckData: any) => void;
}

export const PracticeExamSimulator: React.FC<PracticeExamSimulatorProps> = ({
  initialTopic,
  initialExam,
  hideInputHeader = false,
  onConvertToFlashcards,
}) => {
  // Setup State
  const [topic, setTopic] = useState(initialTopic || '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(initialExam ? initialExam.questions.length : 5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(initialExam ? initialExam.timeLimitMinutes : 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Exam State
  const [exam, setExam] = useState<TimedExam | null>(initialExam || null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialExam ? initialExam.timeLimitMinutes * 60 : 600);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState<boolean>(false);

  // Results State
  const [result, setResult] = useState<ExamAttemptResult | null>(null);

  // Sync initial exam if passed
  useEffect(() => {
    if (initialExam) {
      setExam(initialExam);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setFlaggedQuestions(new Set());
      setSecondsRemaining(initialExam.timeLimitMinutes * 60);
      setResult(null);
    }
  }, [initialExam]);

  // Sync initial topic
  useEffect(() => {
    if (initialTopic && !exam) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  // Timer Ref
  const timerRef = useRef<any>(null);

  // Timer Countdown Effect
  useEffect(() => {
    if (!exam || result || isTimerPaused) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, result, isTimerPaused]);

  const handleStartExam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          questionCount,
          timeLimitMinutes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate practice exam.');
      }

      const newExam: TimedExam = await res.json();
      setExam(newExam);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setFlaggedQuestions(new Set());
      setSecondsRemaining(newExam.timeLimitMinutes * 60);
      setIsTimerPaused(false);
    } catch (err: any) {
      setError(err?.message || 'Error creating exam simulation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleFinishExam = () => {
    if (!exam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    exam.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctOptionIndex) {
        score += 1;
      }
    });

    const total = exam.questions.length;
    const percentage = Math.round((score / total) * 100);
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    const timeSpent = exam.timeLimitMinutes * 60 - secondsRemaining;

    const finalResult: ExamAttemptResult = {
      examId: exam.id,
      examTitle: exam.examTitle,
      topic: exam.topic,
      score,
      totalQuestions: total,
      percentage,
      grade,
      timeSpentSeconds: Math.max(timeSpent, 0),
      userAnswers: selectedAnswers,
      flaggedQuestionIds: Array.from(flaggedQuestions),
      completedAt: new Date().toISOString(),
      questions: exam.questions,
    };

    setResult(finalResult);
    setShowSubmitWarning(false);

    // Save to Library history
    saveLibraryItem(
      'exam_result',
      `${exam.examTitle} (${percentage}%)`,
      exam.topic,
      `Scored ${score}/${total} (${percentage}%) - Grade ${grade}`,
      finalResult,
      [exam.topic, 'Exam Result']
    );
  };

  const handleConvertMissedToFlashcards = () => {
    if (!result || !onConvertToFlashcards) return;
    const missed = result.questions.filter((q) => result.userAnswers[q.id] !== q.correctOptionIndex);
    if (missed.length === 0) return;

    const cards = missed.map((q, idx) => ({
      id: `card-missed-${idx}-${Date.now()}`,
      front: q.question,
      back: `Correct Answer: ${q.options[q.correctOptionIndex]}\n\n${q.explanation}`,
      conceptTag: q.category || 'Exam Review',
      hint: q.hint,
      mastery: 'hard',
    }));

    const deck = {
      id: `deck-missed-${Date.now()}`,
      deckTitle: `${result.topic} - Weak Areas`,
      topic: result.topic,
      totalCards: cards.length,
      cards,
      createdAt: new Date().toISOString(),
    };

    onConvertToFlashcards(deck);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Check unanswered count for submit warning
  const answeredCount = exam ? Object.keys(selectedAnswers).length : 0;
  const unansweredCount = exam ? exam.questions.length - answeredCount : 0;
  const currentQuestion = exam?.questions[currentQuestionIndex];

  return (
    <div className="space-y-6 pb-12">
      {/* Configuration Header & Form (shown when not actively taking exam) */}
      {!exam && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Targeted Practice & Timed Exam Simulation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate realistic exam pressure with customizable question counts, countdown timers, and in-depth performance analytics.
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Subject / Focus Topic
                </label>
                <input
                  id="exam-topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Calculus Derivatives, Organic Mechanisms, Classical Mechanics..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Questions
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  <option value={5}>5 Questions (Quick Test)</option>
                  <option value={8}>8 Questions</option>
                  <option value={10}>10 Questions (Standard)</option>
                  <option value={15}>15 Questions (Full Drill)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Time Limit
                </label>
                <select
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-400 dark:text-slate-500">Quick Picks:</span>
                {['Thermodynamics', 'Differential Equations', 'Cell Respiration', 'Electromagnetism'].map(
                  (pick) => (
                    <button
                      key={pick}
                      type="button"
                      onClick={() => setTopic(pick)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-2xs"
                    >
                      {pick}
                    </button>
                  )
                )}
              </div>

              <button
                id="start-exam-btn"
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Preparing Exam...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Timed Exam</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !exam && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Timer className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Start a Timed Exam Simulation
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Select a subject above to launch a timed test with question flags, instant scoring, and performance analytics.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE EXAM RUNNER */}
      {exam && !result && currentQuestion && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Top Live Status Bar: Timer & Progress */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {exam.topic}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                Question {currentQuestionIndex + 1} of {exam.totalQuestions}
              </h3>
            </div>

            {/* Countdown Timer with warning threshold */}
            <div className="flex items-center gap-2">
              <div
                className={`px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold flex items-center gap-1.5 transition-colors ${
                  secondsRemaining < 60
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse'
                    : secondsRemaining < 180
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (unansweredCount > 0) setShowSubmitWarning(true);
                  else handleFinishExam();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Finish Exam
              </button>
            </div>
          </div>

          {/* Question Palette / Navigator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold text-slate-400 mr-1">Questions:</span>
            {exam.questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isFlagged = flaggedQuestions.has(q.id);
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                    isCurrent
                      ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-600 text-white'
                      : isAnswered
                      ? 'bg-slate-800 text-white dark:bg-slate-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Question Display Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-2xs font-semibold uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {currentQuestion.category || 'General'}
              </span>

              <button
                type="button"
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  flaggedQuestions.has(currentQuestion.id)
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                    : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag for review'}</span>
              </button>
            </div>

            {/* Question Text */}
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion.question}
            </h4>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.995] ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/90 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/90 border-indigo-500 ring-2 ring-indigo-500/20 dark:ring-indigo-500/40 text-indigo-950 dark:text-white font-medium shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/90 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="text-sm leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((p) => Math.max(p - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-slate-400">
                {answeredCount} of {exam.questions.length} answered
              </span>

              {currentQuestionIndex < exam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((p) => p + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (unansweredCount > 0) setShowSubmitWarning(true);
                    else handleFinishExam();
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>

          {/* Unanswered Submit Warning Modal */}
          <AnimatePresence>
            {showSubmitWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      You have {unansweredCount} unanswered question{unansweredCount === 1 ? '' : 's'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unanswered questions will be scored as incorrect. Are you sure you want to finish now?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSubmitWarning(false)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      Return to Exam
                    </button>
                    <button
                      type="button"
                      onClick={handleFinishExam}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      Yes, Finish Now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* POST-EXAM RESULTS & ANALYTICS VIEW */}
      {result && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Result Score Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-2xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Exam Completed
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {result.examTitle}
              </h3>
            </div>

            {/* Score & Grade Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {result.score}/{result.totalQuestions}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">Raw Score</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result.percentage}%
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">Accuracy</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {result.grade}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">Letter Grade</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {formatTime(result.timeSpentSeconds)}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">Time Spent</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              {result.score < result.totalQuestions && onConvertToFlashcards && (
                <button
                  type="button"
                  onClick={handleConvertMissedToFlashcards}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Layers className="w-4 h-4" />
                  <span>Turn Missed into Flashcards</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setExam(null);
                  setResult(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake / New Test</span>
              </button>
            </div>
          </div>

          {/* Question-by-Question Solution Review */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Detailed Solutions & Answers
            </h4>

            <div className="space-y-4">
              {result.questions.map((q, idx) => {
                const userChoice = result.userAnswers[q.id];
                const isCorrect = userChoice === q.correctOptionIndex;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isCorrect
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40'
                        : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Question {idx + 1}
                        </span>
                        <span className="text-2xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {q.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold">
                        {isCorrect ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                      {q.question}
                    </p>

                    {/* Options Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isSelectedByUser = userChoice === optIdx;
                        const isRightAnswer = optIdx === q.correctOptionIndex;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg flex items-center justify-between gap-2 ${
                              isRightAnswer
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 font-medium'
                                : isSelectedByUser
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-950 dark:text-rose-200 font-medium'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span>
                              <strong>{String.fromCharCode(65 + optIdx)}:</strong> {opt}
                            </span>
                            <span className="text-2xs font-bold shrink-0">
                              {isRightAnswer && '(Correct Answer)'}
                              {isSelectedByUser && !isRightAnswer && '(Your Choice)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Explanation:
                      </div>
                      <p className="leading-relaxed whitespace-pre-line">{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
