import { useState } from 'react';
import { Navbar, AppTabType } from './components/Navbar';
import { StudyExplainer } from './components/StudyExplainer';
import { MindMapGenerator } from './components/MindMapGenerator';
import { FormulaCheatSheet } from './components/FormulaCheatSheet';
import { MaterialSolver } from './components/MaterialSolver';
import { FlashcardDeckView } from './components/FlashcardDeckView';
import { PracticeExamSimulator } from './components/PracticeExamSimulator';
import { StudyPlanner } from './components/StudyPlanner';
import { SavedLibrary } from './components/SavedLibrary';
import { FlashcardDeck, StudyExplanation, StudyPlan, SavedItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTabType>('explainer');

  // Shared loaded state for opening items from library or exam
  const [activeFlashcardDeck, setActiveFlashcardDeck] = useState<FlashcardDeck | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<StudyExplanation | null>(null);
  const [activeStudyPlan, setActiveStudyPlan] = useState<StudyPlan | null>(null);

  const handleOpenLibraryItem = (item: SavedItem) => {
    if (item.type === 'explanation') {
      setActiveExplanation(item.data);
      setActiveTab('explainer');
    } else if (item.type === 'flashcards') {
      setActiveFlashcardDeck(item.data);
      setActiveTab('flashcards');
    } else if (item.type === 'study_plan') {
      setActiveStudyPlan(item.data);
      setActiveTab('planner');
    } else if (item.type === 'question') {
      setActiveTab('material');
    } else if (item.type === 'cheatsheet') {
      setActiveTab('cheatsheet');
    } else if (item.type === 'mindmap') {
      setActiveTab('mindmap');
    }
  };

  const handleConvertExamToFlashcards = (deck: FlashcardDeck) => {
    setActiveFlashcardDeck(deck);
    setActiveTab('flashcards');
  };

  const handleOpenFlashcardsForTopic = (topic: string) => {
    setActiveFlashcardDeck({
      id: `deck-auto-${Date.now()}`,
      deckTitle: `${topic} Flashcards`,
      topic,
      totalCards: 0,
      cards: [],
      createdAt: new Date().toISOString(),
    });
    setActiveTab('flashcards');
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-[#fafbfc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900/60 dark:selection:text-indigo-100 transition-colors duration-200">
        {/* Top Navigation */}
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'explainer' && (
              <motion.div
                key="explainer-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <StudyExplainer
                  initialExplanation={activeExplanation}
                  onOpenFlashcardsForTopic={handleOpenFlashcardsForTopic}
                />
              </motion.div>
            )}

            {activeTab === 'material' && (
              <motion.div
                key="material-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <MaterialSolver />
              </motion.div>
            )}

            {activeTab === 'flashcards' && (
              <motion.div
                key="flashcards-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <FlashcardDeckView
                  initialDeck={activeFlashcardDeck}
                  onNavigateToTab={setActiveTab}
                />
              </motion.div>
            )}

            {activeTab === 'exam' && (
              <motion.div
                key="exam-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <PracticeExamSimulator
                  onConvertToFlashcards={handleConvertExamToFlashcards}
                />
              </motion.div>
            )}

            {activeTab === 'planner' && (
              <motion.div
                key="planner-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <StudyPlanner initialPlan={activeStudyPlan} />
              </motion.div>
            )}

            {activeTab === 'mindmap' && (
              <motion.div
                key="mindmap-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <MindMapGenerator />
              </motion.div>
            )}

            {activeTab === 'cheatsheet' && (
              <motion.div
                key="cheatsheet-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <FormulaCheatSheet />
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div
                key="library-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <SavedLibrary onOpenItem={handleOpenLibraryItem} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer id="app-footer" className="border-t border-slate-200/60 dark:border-slate-800/80 py-6 mt-auto transition-colors">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Study Explainer</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Study &amp; Revision Assistant</span>
            </div>
            <div id="footer-author" className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
              Made by Gaurav Gautam
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}






