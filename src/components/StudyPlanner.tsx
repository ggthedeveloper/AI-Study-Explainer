import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  Download,
  Bookmark,
  BookmarkCheck,
  FileDown,
  Loader2,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { StudyPlan, StudyTask } from '../types';
import { exportStudyPlanToMarkdown } from '../utils/exportUtils';
import { saveLibraryItem, isItemSaved, removeSavedByTopic } from '../services/storage';

interface StudyPlannerProps {
  initialPlan?: StudyPlan | null;
  initialTopic?: string;
  initialExamName?: string;
  hideInputHeader?: boolean;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  initialPlan,
  initialTopic,
  initialExamName,
  hideInputHeader = false,
}) => {
  const [examName, setExamName] = useState(initialExamName || (initialTopic ? `${initialTopic} Exam / Revision` : ''));
  const [targetDate, setTargetDate] = useState('');
  const [topicsInput, setTopicsInput] = useState(initialTopic || '');
  const [dailyHours, setDailyHours] = useState<number>(2);
  const [currentLevel, setCurrentLevel] = useState<string>('Intermediate');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(initialPlan || null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // Sync initial plan if passed
  useEffect(() => {
    if (initialPlan) {
      setPlan(initialPlan);
      setIsBookmarked(isItemSaved(initialPlan.examName, 'study_plan'));
    }
  }, [initialPlan]);

  // Sync initial topic
  useEffect(() => {
    if (initialTopic && !plan) {
      setTopicsInput(initialTopic);
      if (!examName) setExamName(`${initialTopic} Exam / Revision`);
    }
  }, [initialTopic]);

  // Load last active plan from localStorage if available
  useEffect(() => {
    if (!initialPlan) {
      const saved = localStorage.getItem('ai_study_active_plan');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPlan(parsed);
          setIsBookmarked(isItemSaved(parsed.examName, 'study_plan'));
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  // Set minimum date to tomorrow
  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!examName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: examName.trim(),
          targetDate,
          topics: topicsInput.trim() ? topicsInput.split(',').map((t) => t.trim()) : undefined,
          dailyHours,
          currentLevel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate study plan.');
      }

      const newPlan: StudyPlan = await res.json();
      setPlan(newPlan);
      localStorage.setItem('ai_study_active_plan', JSON.stringify(newPlan));
      setIsBookmarked(false);
    } catch (err: any) {
      setError(err?.message || 'Error generating revision plan.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    const updatedPlan = { ...plan, tasks: updatedTasks };
    setPlan(updatedPlan);
    localStorage.setItem('ai_study_active_plan', JSON.stringify(updatedPlan));
  };

  const handleToggleBookmark = () => {
    if (!plan) return;
    if (isBookmarked) {
      removeSavedByTopic(plan.examName, 'study_plan');
      setIsBookmarked(false);
    } else {
      saveLibraryItem(
        'study_plan',
        plan.planTitle,
        plan.examName,
        `${plan.tasks.length} days: ${plan.overview.slice(0, 120)}...`,
        plan,
        [plan.examName, 'Study Plan']
      );
      setIsBookmarked(true);
    }
  };

  // Progress metrics
  const totalTasks = plan?.tasks.length || 0;
  const completedTasks = plan?.tasks.filter((t) => t.completed).length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Plan Config Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Study Schedule & Revision Checklist
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized day-by-day exam preparation roadmap with interactive task tracking and spaced repetition.
            </p>
          </div>

          {plan && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isBookmarked ? 'Saved in Library' : 'Save Plan to Library'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Bookmark'}</span>
              </button>

              <button
                type="button"
                onClick={() => exportStudyPlanToMarkdown(plan)}
                className="p-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export as Markdown (.md)"
              >
                <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Export (.md)</span>
              </button>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleGeneratePlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Exam / Subject Name
              </label>
              <input
                id="exam-name-input"
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. AP Physics Final, Organic Chem..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Target Exam Date
              </label>
              <input
                id="exam-date-input"
                type="date"
                min={getTomorrowDateString()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Daily Study Commitment
              </label>
              <select
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value={1}>1 hour / day</option>
                <option value={2}>2 hours / day (Recommended)</option>
                <option value={3}>3 hours / day</option>
                <option value={4}>4+ hours / day (Intensive)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Current Level
              </label>
              <select
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value="Beginner">Need Solid Foundations</option>
                <option value="Intermediate">Intermediate Review</option>
                <option value="Advanced">Advanced High-Score Drill</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="topics-input"
                type="text"
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="Key chapters or topics (comma-separated, optional: e.g. Optics, Thermodynamics, Circuits)"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            <button
              id="generate-plan-btn"
              type="submit"
              disabled={loading || !examName.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Building Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Plan</span>
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

      {/* Empty State */}
      {!loading && !plan && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Create Your Exam Revision Schedule
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Enter your exam details above to get a structured revision calendar with daily actionable tasks and countdown tracking.
            </p>
          </div>
        </div>
      )}

      {/* Active Plan Display */}
      {plan && (
        <div className="space-y-6">
          {/* Summary Banner & Progress */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                    {plan.examName}
                  </span>
                  {plan.targetDate && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Target: {plan.targetDate}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {plan.planTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {plan.overview}
                </p>
              </div>

              {/* Countdown & Total Hours Badges */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {plan.daysRemaining}
                  </div>
                  <div className="text-2xs text-slate-400">Days Left</div>
                </div>

                <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {plan.totalEstimatedHours}h
                  </div>
                  <div className="text-2xs text-slate-400">Total Study</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Revision Progress: {progressPercent}%
                </span>
                <span className="text-slate-400">
                  {completedTasks} of {totalTasks} days completed
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Strategic Phases */}
          {plan.phases && plan.phases.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plan.phases.map((phase, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-1.5 shadow-2xs"
                >
                  <div className="text-2xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {phase.dayRange}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {phase.phaseName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {phase.phaseFocus}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Day-by-Day Checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Daily Revision Checklist
            </h4>

            <div className="space-y-3">
              {plan.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    task.completed
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-indigo-500" />
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Day {task.dayNumber}
                      </span>
                      <h5
                        className={`text-sm font-bold truncate ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h5>

                      <span
                        className={`text-2xs px-2 py-0.5 rounded-md font-medium ml-auto ${
                          task.priority === 'High'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                            : task.priority === 'Low'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>Topic: <strong>{task.topic}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{task.estimatedMinutes} mins
                      </span>
                    </div>

                    {/* Action Steps */}
                    <ul className="space-y-1 pt-1">
                      {task.actionSteps.map((step, sIdx) => (
                        <li
                          key={sIdx}
                          className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                        >
                          <span className="text-indigo-500 leading-none mt-1">›</span>
                          <span className={task.completed ? 'line-through opacity-70' : ''}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Day Strategy & Tips */}
          {plan.topExamTips && plan.topExamTips.length > 0 && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                High-Yield Test Day Tips
              </h4>
              <ul className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
                {plan.topExamTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
