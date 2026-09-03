import React, { useState } from 'react';
import { MindMapData } from '../types';
import { SAMPLE_MINDMAP_TOPICS } from '../utils/sampleData';
import { MindMapView } from './MindMapView';
import { Sparkles, GitBranch, Loader2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface MindMapGeneratorProps {
  initialMindMap?: MindMapData | null;
  initialTopic?: string;
}

export const MindMapGenerator: React.FC<MindMapGeneratorProps> = ({
  initialMindMap = null,
  initialTopic,
}) => {
  const [topic, setTopic] = useState<string>(
    initialTopic || initialMindMap?.topic || initialMindMap?.centralConcept || ''
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(initialMindMap);

  React.useEffect(() => {
    if (initialTopic && !mindMapData) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  const handleGenerate = async (overrideTopic?: string) => {
    const rawTarget = overrideTopic !== undefined ? overrideTopic : (topic || mindMapData?.topic || mindMapData?.centralConcept || '');
    const targetTopic = rawTarget.trim();

    if (!targetTopic) {
      setError('Please enter any topic, subject, or question to generate a mind map.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: targetTopic }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error status ${response.status}`);
      }

      const data: MindMapData = await response.json();
      setMindMapData(data);
      setTopic(data.topic || targetTopic);
    } catch (err: any) {
      console.error('Mind map generation failed:', err);
      setError(err?.message || 'Failed to generate mind map. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Top Input Section - Clean, Open */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Mind Map
          </h2>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
            <div className="relative flex-1">
              <input
                id="mindmap-topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Artificial Intelligence, Photosynthesis, French Revolution..."
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

            <button
              id="generate-mindmap-btn"
              type="submit"
              disabled={loading || !topic.trim()}
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mapping...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Map</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestion Links */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="text-slate-400 dark:text-slate-500">Try:</span>
            {SAMPLE_MINDMAP_TOPICS.map((sample, idx) => (
              <React.Fragment key={sample}>
                <button
                  type="button"
                  onClick={() => {
                    setTopic(sample);
                    handleGenerate(sample);
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
                >
                  {sample}
                </button>
                {idx < SAMPLE_MINDMAP_TOPICS.length - 1 && (
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </form>

        {/* Error Notification */}
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
        <div className="pt-8 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Structuring Mind Map...
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Analyzing "{topic}" and organizing branches, key definitions, and subtopics.
            </p>
          </div>
        </div>
      )}

      {/* Mind Map Canvas / Outline Display */}
      {!loading && mindMapData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MindMapView
            data={mindMapData}
            onRegenerate={() => handleGenerate()}
            isRegenerating={loading}
          />
        </motion.div>
      )}

      {/* Clean Empty State */}
      {!loading && !mindMapData && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <GitBranch className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Enter a topic for your mind map
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Type any subject above to generate an interactive visual concept tree.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
