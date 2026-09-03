import React, { useState } from 'react';
import {
  CheckCircle2,
  ListOrdered,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Code2,
  Calculator,
  Send,
  HelpCircle,
  Copy,
  Check,
  RotateCw,
  Image as ImageIcon,
  Layers,
  ChevronRight
} from 'lucide-react';
import { DetectedQuestion, FollowUpMessage, MaterialQuizItem } from '../types';

interface QuestionDetailViewProps {
  question: DetectedQuestion;
  materialSummary: string;
  onOpenQuiz: (items: MaterialQuizItem[]) => void;
}

export const QuestionDetailView: React.FC<QuestionDetailViewProps> = ({
  question,
  materialSummary,
  onOpenQuiz,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'solution' | 'breakdown' | 'similar'>('solution');
  const [showHint, setShowHint] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  const [showSimilarAnswer, setShowSimilarAnswer] = useState(false);

  // Follow-up chat state
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'quiz_me') {
        const res = await fetch('/api/material-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'quiz_me',
            question,
            materialSummary,
          }),
        });
        const data = await res.json();
        if (data.quizItems && data.quizItems.length > 0) {
          onOpenQuiz(data.quizItems);
        }
      } else {
        const res = await fetch('/api/material-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            question,
            materialSummary,
          }),
        });
        const data = await res.json();
        if (data.text) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-q`,
              sender: 'user',
              text: action === 'explain_simply'
                ? 'Can you explain this simply (ELI5)?'
                : action === 'show_steps'
                ? 'Can you show a microscopic step-by-step breakdown?'
                : 'Can you give me a progressive hint?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            {
              id: `msg-${Date.now()}-a`,
              sender: 'assistant',
              text: data.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isSending) return;

    setInputQuery('');
    const userMsg: FollowUpMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch('/api/material-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'follow_up',
          question,
          materialSummary,
          userQuery: textToSend,
          history: [...messages, userMsg].map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json();
      const aiMsg: FollowUpMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: data.text || 'I have analyzed your question based on the material.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Follow-up error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'assistant',
          text: 'Sorry, I had trouble processing your question. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Header badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
              Question {question.questionNumber}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
              {question.questionType.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickAction('quiz_me')}
              disabled={actionLoading === 'quiz_me'}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{actionLoading === 'quiz_me' ? 'Generating...' : 'Quiz'}</span>
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {question.questionText}
          </h3>

          {/* Diagram Reference if applicable */}
          {question.diagramReference && (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Diagram: </span>
                <span>{question.diagramReference}</span>
              </div>
            </div>
          )}

          {/* Explicit Assumptions if noted */}
          {question.assumptions && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              <span className="font-semibold">Assumptions:</span> {question.assumptions}
            </p>
          )}
        </div>

        {/* PROMINENT FINAL ANSWER BANNER */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 dark:border-emerald-500/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 dark:text-emerald-300">
              Final Answer
            </span>
            <p className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-100 leading-normal">
              {question.finalAnswer}
            </p>
          </div>
        </div>

        {/* View Tabs: Solution | Calculations/Code Breakdown | Practice Similar */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('solution')}
            className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'solution'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Solution
          </button>

          {(question.mathBreakdown || question.codeBreakdown) && (
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'breakdown'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {question.mathBreakdown ? (
                <>
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Calculations</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code</span>
                </>
              )}
            </button>
          )}

          {question.similarQuestion && (
            <button
              type="button"
              onClick={() => setActiveTab('similar')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'similar'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Similar Problem</span>
            </button>
          )}
        </div>

        {/* Tab 1: Step-by-Step Solution */}
        {activeTab === 'solution' && (
          <div className="space-y-4 pt-1">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Steps</span>
              </div>

              <div className="space-y-2.5">
                {question.stepByStepSolution.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                  >
                    <p className="whitespace-pre-line">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Concept Box */}
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Concept</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {question.conceptExplanation}
              </p>
            </div>

            {/* Governing Formulas / Rules */}
            {question.formulasUsed && question.formulasUsed.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Formulas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {question.formulasUsed.map((formula, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    >
                      {formula}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {question.commonMistakes && question.commonMistakes.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Common Mistakes</span>
                </div>
                <ul className="space-y-1 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {question.commonMistakes.map((mistake, idx) => (
                    <li key={idx}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Learning Helpers: Hint & Simplified toggle */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSimplified(!showSimplified)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{showSimplified ? 'Hide Simplified' : 'Simplified'}</span>
              </button>
            </div>

            {showHint && question.hint && (
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                💡 <span className="font-semibold">Helpful Hint: </span>
                {question.hint}
              </div>
            )}

            {showSimplified && (
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                ✨ <span className="font-semibold">Simple Everyday Analogy: </span>
                {question.simplifiedExplanation || question.conceptExplanation}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Calculation / Code Breakdown */}
        {activeTab === 'breakdown' && (
          <div className="space-y-4 pt-1">
            {question.mathBreakdown && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Mathematical Calculation Flow</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Governing Formula
                    </span>
                    <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                      {question.mathBreakdown.formula}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Values Substituted
                    </span>
                    <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1">
                      {question.mathBreakdown.substitution}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Calculation Steps
                    </span>
                    <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-line">
                      {question.mathBreakdown.calculation}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 sm:col-span-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      Calculated Final Result
                    </span>
                    <p className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                      {question.mathBreakdown.finalResult}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {question.codeBreakdown && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Implementation in {question.codeBreakdown.language || 'Code'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(question.codeBreakdown!.code)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Algorithmic Approach: </span>
                  {question.codeBreakdown.approach}
                </div>

                <div className="rounded-xl overflow-hidden bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800">
                  <pre>{question.codeBreakdown.code}</pre>
                </div>

                {question.codeBreakdown.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {question.codeBreakdown.explanation}
                  </p>
                )}

                {question.codeBreakdown.expectedOutput && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-bold">Expected Output: </span>
                    {question.codeBreakdown.expectedOutput}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Practice Similar Problem */}
        {activeTab === 'similar' && question.similarQuestion && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Companion Practice Question</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs sm:text-sm">
              <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                {question.similarQuestion.question}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setShowSimilarAnswer(!showSimilarAnswer)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  {showSimilarAnswer ? 'Hide Solution' : 'Reveal Solution & Answer'}
                </button>
              </div>

              {showSimilarAnswer && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Answer: {question.similarQuestion.answer}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {question.similarQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Follow-up Q&A / Ask AI Tutor Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Study Coach
          </h4>
        </div>

        {/* Quick prompt suggestion chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleSendMessage('Why did you use this specific formula for this problem?')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Why this formula?
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Can you explain this like I am a beginner with a simpler analogy?')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Simpler analogy
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('Is there a shortcut or alternative method to solve this?')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Alternative method
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('How can I verify or double-check my answer during an exam?')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Exam check
          </button>
        </div>

        {/* Conversation History */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 whitespace-pre-line'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sending loader */}
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
            <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Input box */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask a question..."
            className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <button
            type="button"
            disabled={!inputQuery.trim() || isSending}
            onClick={() => handleSendMessage()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
