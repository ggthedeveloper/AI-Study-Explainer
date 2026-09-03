import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Download,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Lightbulb,
  Check,
  FileDown,
  Repeat,
  Trophy,
  Loader2,
} from 'lucide-react';
import { Flashcard, FlashcardDeck, MasteryLevel, DifficultyLevel } from '../types';
import { exportFlashcardsToAnki, exportFlashcardsToMarkdown } from '../utils/exportUtils';
import { saveLibraryItem, isItemSaved, removeSavedByTopic } from '../services/storage';

interface FlashcardDeckViewProps {
  initialDeck?: FlashcardDeck | null;
  initialTopic?: string;
  autoGenerate?: boolean;
  hideInputHeader?: boolean;
  onNavigateToTab?: (tab: any) => void;
}

export const FlashcardDeckView: React.FC<FlashcardDeckViewProps> = ({
  initialDeck,
  initialTopic,
  autoGenerate = false,
  hideInputHeader = false,
}) => {
  const [topicInput, setTopicInput] = useState(initialTopic || '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [cardCount, setCardCount] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deck, setDeck] = useState<FlashcardDeck | null>(initialDeck || null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // Sync initial deck if provided
  useEffect(() => {
    if (initialDeck && initialDeck.cards && initialDeck.cards.length > 0) {
      setDeck(initialDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setIsBookmarked(isItemSaved(initialDeck.topic, 'flashcards'));
    }
  }, [initialDeck]);

  // If initialTopic provided without deck, initialize or auto-generate
  useEffect(() => {
    if (initialTopic && (!deck || deck.cards.length === 0)) {
      setTopicInput(initialTopic);
      if (autoGenerate) {
        const fetchDeck = async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch('/api/generate-flashcards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: initialTopic.trim(),
                difficulty,
                count: cardCount,
              }),
            });
            if (res.ok) {
              const newDeck = await res.json();
              setDeck(newDeck);
              setCurrentIndex(0);
            }
          } catch (err: any) {
            setError(err?.message || 'Failed to auto-generate flashcards.');
          } finally {
            setLoading(false);
          }
        };
        fetchDeck();
      }
    }
  }, [initialTopic, autoGenerate]);

  // Check bookmark status when deck changes
  useEffect(() => {
    if (deck?.topic) {
      setIsBookmarked(isItemSaved(deck.topic, 'flashcards'));
    }
  }, [deck]);

  // Keyboard navigation for card flip and next/previous
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (!deck || deck.cards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck, currentIndex, isFlipped]);

  const handleGenerateDeck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim()) return;

    setLoading(true);
    setError(null);
    setIsFlipped(false);
    setShowHint(false);

    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput.trim(),
          difficulty,
          count: cardCount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate flashcards.');
      }

      const newDeck: FlashcardDeck = await res.json();
      setDeck(newDeck);
      setCurrentIndex(0);
      setIsBookmarked(false);
    } catch (err: any) {
      setError(err?.message || 'Error generating flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    if (!deck) return;
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % deck.cards.length);
  };

  const handlePrev = () => {
    if (!deck) return;
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev === 0 ? deck.cards.length - 1 : prev - 1));
  };

  const handleRateMastery = (mastery: MasteryLevel) => {
    if (!deck) return;
    const updatedCards = [...deck.cards];
    const currentCard = updatedCards[currentIndex];
    currentCard.mastery = mastery;
    currentCard.reviewCount = (currentCard.reviewCount || 0) + 1;
    currentCard.lastReviewed = new Date().toISOString();

    setDeck({
      ...deck,
      cards: updatedCards,
      lastStudiedAt: new Date().toISOString(),
    });

    // Auto advance to next card after a brief moment
    setTimeout(() => {
      handleNext();
    }, 200);
  };

  const handleShuffle = () => {
    if (!deck) return;
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...deck, cards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleResetProgress = () => {
    if (!deck) return;
    const reset = deck.cards.map((c) => ({
      ...c,
      mastery: 'unseen' as MasteryLevel,
      reviewCount: 0,
    }));
    setDeck({ ...deck, cards: reset });
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleToggleBookmark = () => {
    if (!deck) return;
    if (isBookmarked) {
      removeSavedByTopic(deck.topic, 'flashcards');
      setIsBookmarked(false);
    } else {
      saveLibraryItem(
        'flashcards',
        deck.deckTitle,
        deck.topic,
        `${deck.cards.length} cards: ${deck.cards[0]?.front || ''}`,
        deck,
        [deck.topic, 'Flashcards']
      );
      setIsBookmarked(true);
    }
  };

  // Stats calculation
  const totalCards = deck?.cards.length || 0;
  const easyCount = deck?.cards.filter((c) => c.mastery === 'easy').length || 0;
  const goodCount = deck?.cards.filter((c) => c.mastery === 'good').length || 0;
  const hardCount = deck?.cards.filter((c) => c.mastery === 'hard').length || 0;
  const currentCard = deck?.cards[currentIndex];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Generation Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Interactive Flashcards
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Spaced repetition active recall cards. Practice, rate mastery, and export directly to Anki.
            </p>
          </div>

          {deck && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isBookmarked ? 'Saved in Library' : 'Save Deck to Library'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Bookmark'}</span>
              </button>

              <button
                type="button"
                onClick={() => exportFlashcardsToAnki(deck)}
                className="p-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export for Anki (.tsv)"
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Anki (.tsv)</span>
              </button>

              <button
                type="button"
                onClick={() => exportFlashcardsToMarkdown(deck)}
                className="p-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export as Markdown (.md)"
              >
                <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Markdown</span>
              </button>
            </div>
          )}
        </div>

        {/* Input Form */}
        {(!hideInputHeader || !deck || deck.cards.length === 0) && (
          <form onSubmit={handleGenerateDeck} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="flashcard-topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Enter any topic (e.g. Mitosis vs Meiosis, Maxwell Equations, Organic Reactions)..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="px-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value={5}>5 cards</option>
                <option value={8}>8 cards</option>
                <option value={12}>12 cards</option>
                <option value={16}>16 cards</option>
              </select>

              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="px-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <button
                id="generate-flashcards-btn"
                type="submit"
                disabled={loading || !topicInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Deck</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick topic suggestion chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-400 dark:text-slate-500">Suggestions:</span>
            {['Cell Respiration', 'Newtonian Laws', 'Derivatives & Integrals', 'Periodic Trends'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setTopicInput(suggestion);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-2xs"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && !deck && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Create a Flashcard Deck
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Enter any concept above to generate active recall study cards with Anki export and spaced repetition ratings.
            </p>
          </div>
        </div>
      )}

      {/* Active Flashcard Viewer */}
      {deck && currentCard && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Deck Stats & Progress Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                Card {currentIndex + 1} of {totalCards}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">{deck.deckTitle}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{easyCount} Easy</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{goodCount} Good</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">{hardCount} Hard</span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            />
          </div>

          {/* 3D Flippable Card Stage */}
          <div className="perspective-1000 min-h-[300px] sm:min-h-[340px]">
            <motion.div
              id="active-flashcard"
              onClick={handleFlip}
              className={`w-full min-h-[300px] sm:min-h-[340px] rounded-2xl p-6 sm:p-8 flex flex-col justify-between border cursor-pointer select-none transition-all shadow-sm ${
                isFlipped
                  ? 'bg-slate-900 dark:bg-slate-950 text-white border-slate-800 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
              }`}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-2xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    isFlipped
                      ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800'
                  }`}
                >
                  {currentCard.conceptTag || 'Key Concept'}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-2xs">{isFlipped ? 'Click to show front' : 'Click to reveal answer'}</span>
                </div>
              </div>

              {/* Card Main Content */}
              <div className="my-auto py-6">
                {!isFlipped ? (
                  // Front
                  <div className="space-y-4">
                    <div className="text-2xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Question / Concept
                    </div>
                    <p className="text-base sm:text-xl font-medium leading-relaxed text-slate-900 dark:text-white">
                      {currentCard.front}
                    </p>

                    {currentCard.hint && (
                      <div className="pt-2">
                        {showHint ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
                          >
                            <Lightbulb className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                            <span>{currentCard.hint}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHint(true);
                            }}
                            className="inline-flex items-center gap-1 text-2xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Need a hint?</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Back
                  <div className="space-y-4">
                    <div className="text-2xs font-bold uppercase tracking-widest text-indigo-400">
                      Answer & Explanation
                    </div>
                    <p className="text-base sm:text-lg leading-relaxed text-slate-100 whitespace-pre-line font-normal">
                      {currentCard.back}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400">
                <span>Press Spacebar to flip, Arrow keys to navigate</span>
                {currentCard.mastery && currentCard.mastery !== 'unseen' && (
                  <span
                    className={`font-semibold capitalize ${
                      currentCard.mastery === 'easy'
                        ? 'text-emerald-500'
                        : currentCard.mastery === 'good'
                        ? 'text-indigo-400'
                        : 'text-amber-500'
                    }`}
                  >
                    Rated: {currentCard.mastery}
                  </span>
                )}
              </div>
            </motion.div>
          </div>

          {/* Spaced Repetition Rating Buttons (visible when flipped) */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs"
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rate your recall:</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleRateMastery('hard')}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                  >
                    Hard (Review soon)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateMastery('good')}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateMastery('easy')}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  >
                    Easy (Mastered)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Bar: Prev, Flip, Next, Shuffle, Reset */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Previous card (Left Arrow)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Next card (Right Arrow)"
              >
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleFlip}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Show Front' : 'Flip Card'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                title="Shuffle Deck"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetProgress}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                title="Reset Mastery Ratings"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
