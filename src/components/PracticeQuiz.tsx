import React, { useState, useEffect } from 'react';
import { PracticeQuestion, PracticeQuizResult } from '../types';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  BarChart3,
  Layers,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticeQuizProps {
  quiz?: PracticeQuestion;
  questions?: PracticeQuestion[];
  topic: string;
  difficulty?: string;
  onRefreshQuestions?: () => void;
  isLoadingMore?: boolean;
}

export const PracticeQuiz: React.FC<PracticeQuizProps> = ({
  quiz,
  questions: propQuestions,
  topic,
  difficulty = 'Beginner',
  onRefreshQuestions,
  isLoadingMore = false,
}) => {
  // Normalize questions array from either props or fallback
  const initialQuestions: PracticeQuestion[] = React.useMemo(() => {
    if (propQuestions && propQuestions.length > 0) {
      return propQuestions;
    }
    if (quiz) {
      return [quiz];
    }
    return [];
  }, [propQuestions, quiz]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Store user answers as a map: { [questionIndex]: selectedOptionIndex }
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  // Store submitted questions state: { [questionIndex]: boolean }
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  // Store hint disclosure per question: { [questionIndex]: boolean }
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  // Practice Completed / Results view state
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  // Filter in review screen ('all' | 'incorrect' | 'correct')
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('all');

  // Reset all state whenever topic changes
  useEffect(() => {
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setShowHints({});
    setIsQuizCompleted(false);
    setReviewFilter('all');
  }, [topic]);

  const totalQuestions = initialQuestions.length;
  const currentQuestion = initialQuestions[currentIndex] || initialQuestions[0];

  if (!currentQuestion || totalQuestions === 0) {
    return null;
  }

  const currentSelectedOption = userAnswers[currentIndex] !== undefined ? userAnswers[currentIndex] : null;
  const isCurrentSubmitted = Boolean(submittedQuestions[currentIndex]);
  const isCurrentHintOpen = Boolean(showHints[currentIndex]);

  const handleSelectOption = (optIndex: number) => {
    if (isCurrentSubmitted || isQuizCompleted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIndex,
    }));
  };

  const handleCheckCurrentAnswer = () => {
    if (currentSelectedOption === null) return;
    setSubmittedQuestions((prev) => ({
      ...prev,
      [currentIndex]: true,
    }));
  };

  const handleToggleHint = () => {
    setShowHints((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentIndex(index);
    }
  };

  // Submit and finish entire practice session
  const handleFinishPractice = () => {
    // Automatically submit all answered questions
    const autoSubmitted: Record<number, boolean> = { ...submittedQuestions };
    initialQuestions.forEach((_, idx) => {
      if (userAnswers[idx] !== undefined) {
        autoSubmitted[idx] = true;
      }
    });
    setSubmittedQuestions(autoSubmitted);
    setIsQuizCompleted(true);
  };

  const handleRestartPractice = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setShowHints({});
    setIsQuizCompleted(false);
    setReviewFilter('all');
  };

  // Metrics Calculation
  const answeredCount = Object.keys(userAnswers).length;
  const correctCount = initialQuestions.reduce((acc, q, idx) => {
    const ans = userAnswers[idx];
    return ans !== undefined && ans === q.correctOptionIndex ? acc + 1 : acc;
  }, 0);
  const incorrectCount = initialQuestions.reduce((acc, q, idx) => {
    const ans = userAnswers[idx];
    return ans !== undefined && ans !== q.correctOptionIndex ? acc + 1 : acc;
  }, 0);
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  // Badge helpers for question types & difficulty
  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'true_false':
        return { label: 'True / False', color: 'bg-sky-100 text-sky-800 border-sky-200' };
      case 'short_answer':
        return { label: 'Short Answer', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'conceptual':
        return { label: 'Conceptual Reasoning', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'application':
        return { label: 'Application & Scenario', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'mcq':
      default:
        return { label: 'Multiple Choice', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    switch (diff) {
      case 'Easy':
        return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Hard':
        return { label: 'Hard', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'Medium':
      default:
        return { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  const currentTypeBadge = getTypeBadge(currentQuestion.type);
  const currentDiffBadge = getDifficultyBadge(currentQuestion.difficulty);
  const isCurrentCorrect = currentSelectedOption === currentQuestion.correctOptionIndex;

  return (
    <div
      id="practice-quiz-section"
      className="space-y-6 pt-2"
    >
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Practice Quiz
          </h3>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            ({totalQuestions})
          </span>
        </div>

        {/* Top Actions: Hint & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isQuizCompleted && currentQuestion.hint && (
            <button
              id="quiz-hint-btn"
              type="button"
              onClick={handleToggleHint}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isCurrentHintOpen ? 'Hide Hint' : 'Hint'}</span>
            </button>
          )}

          {onRefreshQuestions && (
            <button
              type="button"
              onClick={onRefreshQuestions}
              disabled={isLoadingMore}
              title="Generate new question set"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isLoadingMore ? 'animate-spin' : ''}`} />
              <span>{isLoadingMore ? 'Loading…' : 'New Questions'}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW A: ACTIVE QUESTION NAVIGATION & SOLVING */}
      {!isQuizCompleted ? (
        <div className="space-y-5">
          {/* PROGRESS INDICATOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentQuestion.difficulty}
                </span>
              </div>
              <span className="text-[11px]">
                {answeredCount} answered
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* HINT BANNER */}
          <AnimatePresence>
            {isCurrentHintOpen && currentQuestion.hint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-950 dark:text-amber-200">Hint: </span>
                    {currentQuestion.hint}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* QUESTION PROMPT */}
          <div>
            {currentQuestion.conceptTag && (
              <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {currentQuestion.conceptTag}
              </span>
            )}
            <h4 className="text-slate-900 dark:text-white font-semibold text-base sm:text-lg leading-relaxed">
              {currentQuestion.question}
            </h4>
          </div>

          {/* MULTIPLE CHOICE / TRUE-FALSE OPTIONS */}
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isThisSelected = currentSelectedOption === idx;
              const isThisCorrect = idx === currentQuestion.correctOptionIndex;

              let optionStyle =
                'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100';

              if (isCurrentSubmitted) {
                if (isThisCorrect) {
                  optionStyle =
                    'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 font-medium shadow-xs';
                } else if (isThisSelected && !isThisCorrect) {
                  optionStyle =
                    'border-rose-400 dark:border-rose-500/80 bg-rose-50 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 line-through';
                } else {
                  optionStyle =
                    'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 opacity-60';
                }
              } else if (isThisSelected) {
                optionStyle =
                  'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/90 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/90 text-indigo-950 dark:text-white ring-2 ring-indigo-500/20 dark:ring-indigo-500/40 shadow-xs font-semibold';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isCurrentSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.995] ${optionStyle}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isCurrentSubmitted && isThisCorrect
                          ? 'bg-emerald-600 text-white'
                          : isCurrentSubmitted && isThisSelected && !isThisCorrect
                          ? 'bg-rose-600 text-white'
                          : isThisSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="leading-normal flex-1">{option}</span>
                  </div>

                  {isCurrentSubmitted && isThisCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {isCurrentSubmitted && isThisSelected && !isThisCorrect && (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* EXPLANATION ACCORDION ONCE VERIFIED */}
          {isCurrentSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                  isCurrentCorrect
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                    : 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCurrentCorrect ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold">
                    {isCurrentCorrect ? 'Correct' : 'Explanation'}
                  </div>
                  <p className="leading-relaxed opacity-90">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            {/* Left Button: Previous */}
            <button
              id="quiz-prev-btn"
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Middle Controls */}
            <div className="flex items-center gap-2">
              {!isCurrentSubmitted ? (
                <button
                  id="quiz-verify-btn"
                  type="button"
                  disabled={currentSelectedOption === null}
                  onClick={handleCheckCurrentAnswer}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Verify Answer
                </button>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isCurrentCorrect ? '✓ Correct' : '✓ Reviewed'}
                </span>
              )}
            </div>

            {/* Right Buttons: Next or Submit */}
            <div>
              {currentIndex < totalQuestions - 1 ? (
                <button
                  id="quiz-next-btn"
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-medium text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="quiz-finish-btn"
                  type="button"
                  onClick={handleFinishPractice}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Submit Practice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: FINAL RESULTS & DETAILED EXPLANATION BREAKDOWN */
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* SUMMARY SCORECARD - Clean minimal card */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Self-Test Complete
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {percentage >= 80 ? 'Mastery Achieved! 🌟' : percentage >= 50 ? 'Solid Effort! 📚' : 'Needs Review & Practice 💡'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Score: <strong className="text-slate-900 dark:text-white">{correctCount} of {totalQuestions}</strong> correct ({percentage}%)
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestartPractice}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Retake Practice</span>
            </button>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Answer Review
            </h5>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('incorrect')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  reviewFilter === 'incorrect'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('correct')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  reviewFilter === 'correct'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200'
                }`}
              >
                Correct ({correctCount})
              </button>
            </div>
          </div>

          {/* QUESTIONS BREAKDOWN LIST */}
          <div className="space-y-4">
            {initialQuestions
              .map((q, idx) => ({ q, idx }))
              .filter(({ q, idx }) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns !== undefined && userAns === q.correctOptionIndex;
                if (reviewFilter === 'correct') return isCorrect;
                if (reviewFilter === 'incorrect') return !isCorrect;
                return true;
              })
              .map(({ q, idx }) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns !== undefined && userAns === q.correctOptionIndex;

                return (
                  <div
                    key={idx}
                    className="pb-4 border-b border-slate-200/60 dark:border-slate-800 last:border-0 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Question {idx + 1}</span>
                      <span className={`font-semibold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                      </span>
                    </div>

                    <p className="text-slate-900 dark:text-white font-medium text-sm">
                      {q.question}
                    </p>

                    <div className="text-xs text-slate-600 dark:text-slate-400 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
                      <div>
                        <strong className="text-slate-700 dark:text-slate-300">Correct: </strong>
                        <span className="text-slate-800 dark:text-slate-200">{q.options[q.correctOptionIndex]}</span>
                      </div>
                      {!isCorrect && userAns !== undefined && (
                        <div>
                          <strong className="text-rose-700 dark:text-rose-400">Your answer: </strong>
                          <span className="line-through text-slate-600 dark:text-slate-400">{q.options[userAns]}</span>
                        </div>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 pt-0.5">{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
