import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GitBranch,
  Calculator,
  UploadCloud,
  Layers,
  Timer,
  CalendarCheck,
  Bookmark,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { getAllSavedItems } from '../services/storage';

export type AppTabType =
  | 'explainer'
  | 'material'
  | 'flashcards'
  | 'exam'
  | 'planner'
  | 'mindmap'
  | 'cheatsheet'
  | 'library';

interface NavbarProps {
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = () => {
      setSavedCount(getAllSavedItems().length);
    };
    updateCount();
    window.addEventListener('library-storage-updated', updateCount);
    return () => window.removeEventListener('library-storage-updated', updateCount);
  }, []);

  const tabs: { id: AppTabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'explainer',
      label: 'Explainer',
      icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      id: 'material',
      label: 'Upload & Solve',
      icon: <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />,
    },
    {
      id: 'exam',
      label: 'Practice Exam',
      icon: <Timer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: 'planner',
      label: 'Study Schedule',
      icon: <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'mindmap',
      label: 'Mind Map',
      icon: <GitBranch className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
    },
    {
      id: 'cheatsheet',
      label: 'Formulas',
      icon: <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      id: 'library',
      label: 'Saved Library',
      icon: <Bookmark className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-3">
          {/* Logo & Branding */}
          <div
            onClick={() => onTabChange('explainer')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-xs">
              AI
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight hidden sm:inline">
              Study Explainer
            </span>
          </div>

          {/* Right Side: Tab Switcher & Theme Toggle */}
          <div className="flex items-center gap-2 overflow-hidden flex-1 justify-end">
            {/* Clean Segmented Tab Switcher with smooth scroll */}
            <nav className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 border border-transparent dark:border-slate-700 overflow-x-auto no-scrollbar py-1 px-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}-btn`}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.id === 'library' && savedCount > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-3xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {savedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Dark / Light Mode Toggle Button */}
            <div className="shrink-0 pl-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};





