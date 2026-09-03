import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Trash2,
  ExternalLink,
  BookOpen,
  Layers,
  CalendarCheck,
  Calculator,
  GitBranch,
  UploadCloud,
  FileDown,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SavedItem, SavedItemType } from '../types';
import { getAllSavedItems, deleteSavedItem, toggleBookmarkStatus } from '../services/storage';
import { exportExplanationToMarkdown, exportFlashcardsToAnki, exportStudyPlanToMarkdown } from '../utils/exportUtils';

interface SavedLibraryProps {
  onOpenItem: (item: SavedItem) => void;
}

export const SavedLibrary: React.FC<SavedLibraryProps> = ({ onOpenItem }) => {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SavedItemType | 'all'>('all');

  const refreshItems = () => {
    setItems(getAllSavedItems());
  };

  useEffect(() => {
    refreshItems();
    window.addEventListener('library-storage-updated', refreshItems);
    return () => window.removeEventListener('library-storage-updated', refreshItems);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedItem(id);
    refreshItems();
  };

  const handleExportItem = (item: SavedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'explanation') {
      exportExplanationToMarkdown(item.data);
    } else if (item.type === 'flashcards') {
      exportFlashcardsToAnki(item.data);
    } else if (item.type === 'study_plan') {
      exportStudyPlanToMarkdown(item.data);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getItemIcon = (type: SavedItemType) => {
    switch (type) {
      case 'explanation':
        return <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'flashcards':
        return <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
      case 'study_plan':
        return <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'cheatsheet':
        return <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'mindmap':
        return <GitBranch className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'question':
        return <UploadCloud className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Bookmark className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: SavedItemType) => {
    switch (type) {
      case 'explanation':
        return 'Explanation';
      case 'flashcards':
        return 'Flashcards';
      case 'study_plan':
        return 'Study Plan';
      case 'cheatsheet':
        return 'Formulas';
      case 'mindmap':
        return 'Mind Map';
      case 'question':
        return 'Solved Problem';
      default:
        return 'Note';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Saved Library & Bookmarks
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Access and export your saved study explanations, flashcard decks, solved exam papers, and revision schedules.
            </p>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {items.length} saved item{items.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved items by topic or title..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'explanation', 'flashcards', 'study_plan', 'question', 'cheatsheet'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {filter === 'all' ? 'All' : getTypeLabel(filter)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery ? 'No matching saved items found' : 'Your library is empty'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search query or clear the filter.'
                : 'Bookmark explanations, flashcards, or study plans to save them for revision anytime.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItem(item)}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-sm cursor-pointer flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {getItemIcon(item.type)}
                    <span>{getTypeLabel(item.type)}</span>
                  </div>

                  <span className="text-2xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  {/* Export button */}
                  {(item.type === 'explanation' || item.type === 'flashcards' || item.type === 'study_plan') && (
                    <button
                      type="button"
                      onClick={(e) => handleExportItem(item, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={item.type === 'flashcards' ? 'Export to Anki (.tsv)' : 'Export to Markdown (.md)'}
                    >
                      {item.type === 'flashcards' ? (
                        <Download className="w-3.5 h-3.5" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 text-2xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
