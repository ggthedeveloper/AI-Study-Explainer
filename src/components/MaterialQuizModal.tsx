import React, { useState } from 'react';
import { X, Award, CheckCircle2, XCircle, Lightbulb, ArrowRight, RotateCcw } from 'lucide-react';
import { MaterialQuizItem } from '../types';

interface MaterialQuizModalProps {
  quizItems: MaterialQuizItem[];
  onClose: () => void;
}

export const MaterialQuizModal: React.FC<MaterialQuizModalProps> = ({ quizItems, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!quizItems || quizItems.length === 0) return null;

  const currentItem = quizItems[currentIndex];

  const handleSelectOption = (optIndex: number) => {
    if (isAnswered) return;
    setSelectedOption(optIndex);
    setIsAnswered(true);
    if (optIndex === currentItem.correctOptionIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowHint(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowHint(false);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Material Knowledge Check
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Test your mastery of the concepts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completion Screen */}
        {isCompleted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Quiz Completed!
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{score}</span> out of{' '}
                <span className="font-bold">{quizItems.length}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Active Question */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">
                Question {currentIndex + 1} of {quizItems.length}
              </span>
              <span className="font-mono font-medium">
                Score: {score}/{currentIndex + (isAnswered ? 1 : 0)}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentItem.question}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {currentItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isAnswered && idx === currentItem.correctOptionIndex;
                const isIncorrect = isAnswered && isSelected && idx !== currentItem.correctOptionIndex;

                let optClass =
                  'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-300 dark:hover:border-indigo-700';

                if (isCorrect) {
                  optClass =
                    'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs';
                } else if (isIncorrect) {
                  optClass =
                    'border-rose-500 dark:border-rose-500/80 bg-rose-50 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 line-through';
                } else if (isAnswered) {
                  optClass =
                    'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 opacity-60';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${optClass} disabled:cursor-default`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug pt-0.5">{option}</span>
                    </div>
                    {isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {isIncorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint toggle */}
            {currentItem.hint && !isAnswered && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
                </button>
                {showHint && (
                  <p className="mt-1.5 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    💡 {currentItem.hint}
                  </p>
                )}
              </div>
            )}

            {/* Answer Explanation once chosen */}
            {isAnswered && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Explanation:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {currentItem.explanation}
                </p>
              </div>
            )}

            {/* Footer button */}
            {isAnswered && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{currentIndex < quizItems.length - 1 ? 'Next Question' : 'View Results'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
