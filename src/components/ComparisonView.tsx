import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Zap,
  Clock,
  Cpu,
  X,
  Copy,
  Check,
  Columns,
  List,
} from 'lucide-react';
import { ModelResult } from '../shared/types.js';
import { ResponseCard } from './ResponseCard.js';

interface ComparisonViewProps {
  results: ModelResult[];
  isLoading: boolean;
  onRegenerateModel: (providerId: string, modelId: string) => void;
  regeneratingMap: Record<string, boolean>;
  onSelectPromptPreset: (promptText: string) => void;
  totalDurationMs?: number;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  results,
  isLoading,
  onRegenerateModel,
  regeneratingMap,
  onSelectPromptPreset,
  totalDurationMs,
}) => {
  const [expandedModel, setExpandedModel] = useState<ModelResult | null>(null);
  const [mobileViewTab, setMobileViewTab] = useState<number | 'all'>('all');
  const [modalCopied, setModalCopied] = useState(false);

  // Empty State
  if (results.length === 0 && !isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Ready for Multi-Model Evaluation
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-6">
          Submit a prompt above to evaluate responses side-by-side. Measure generation speed,
          reasoning differences, and token efficiency concurrently with genuine provider APIs.
        </p>

        {/* Quick starter suggestions */}
        <div className="max-w-xl mx-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
            Suggested Arena Queries
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() =>
                onSelectPromptPreset(
                  'Write a TypeScript function that deep merges two nested objects with type safety.'
                )
              }
              className="p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                Coding & TypeScript
              </span>
              Deep merge two nested objects with type safety
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectPromptPreset(
                  'Explain the differences between optimistic updates and pessimistic locking with a real-world checkout example.'
                )
              }
              className="p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                System Design
              </span>
              Optimistic updates vs pessimistic locking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find fastest model among successful ones
  const successfulResults = results.filter((r) => r.status === 'success' && r.durationMs > 0);
  const minDuration =
    successfulResults.length > 1
      ? Math.min(...successfulResults.map((r) => r.durationMs))
      : null;

  const totalTokensGenerated = results.reduce(
    (acc, r) => acc + (r.usage?.totalTokens || 0),
    0
  );

  // Column layout calculation for desktop
  const colCount = Math.min(Math.max(results.length, 1), 4);
  const gridClass =
    colCount === 1
      ? 'grid-cols-1 max-w-2xl mx-auto'
      : colCount === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : colCount === 3
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  const handleCopyModalText = async () => {
    if (!expandedModel?.text) return;
    try {
      await navigator.clipboard.writeText(expandedModel.text);
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 2000);
    } catch {
      setModalCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Benchmark Summary Bar */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              Arena Benchmark
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {results.length} model{results.length !== 1 ? 's' : ''} compared
            </span>
            {totalDurationMs !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  Total Run: {(totalDurationMs / 1000).toFixed(2)}s
                </span>
              </>
            )}
            {totalTokensGenerated > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{totalTokensGenerated} tokens</span>
              </>
            )}
          </div>

          {/* Mobile view switcher */}
          <div className="flex sm:hidden items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMobileViewTab('all')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                mobileViewTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              All Stacked
            </button>
            {results.map((r, i) => (
              <button
                key={r.modelId}
                type="button"
                onClick={() => setMobileViewTab(i)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  mobileViewTab === i
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {r.modelName.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Response Columns */}
      <div className={`grid gap-4 ${gridClass}`}>
        {results.map((result, idx) => {
          const key = `${result.providerId}-${result.modelId}`;
          const isRegenerating = Boolean(regeneratingMap[key]);
          const isFastest = minDuration !== null && result.durationMs === minDuration;

          // Mobile filter: if a specific model tab is selected on mobile, hide others on small screens
          const isHiddenOnMobile =
            mobileViewTab !== 'all' && typeof mobileViewTab === 'number' && mobileViewTab !== idx;

          return (
            <div
              key={key}
              className={`${isHiddenOnMobile ? 'hidden sm:block' : 'block'} min-w-0`}
            >
              <ResponseCard
                result={result}
                isFastest={isFastest}
                isRegenerating={isRegenerating}
                onRegenerate={() => onRegenerateModel(result.providerId, result.modelId)}
                onExpand={() => setExpandedModel(result)}
              />
            </div>
          );
        })}
      </div>

      {/* Fullscreen Expansion Modal */}
      {expandedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {expandedModel.modelName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                  <span>{expandedModel.providerName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{expandedModel.modelId}</span>
                  {expandedModel.durationMs > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{(expandedModel.durationMs / 1000).toFixed(2)}s</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyModalText}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {modalCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedModel(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text font-mono">
              {expandedModel.text}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>
                Tokens: {expandedModel.usage?.totalTokens || 'N/A'} (Prompt:{' '}
                {expandedModel.usage?.promptTokens || 0} / Completion:{' '}
                {expandedModel.usage?.completionTokens || 0})
              </span>
              <button
                type="button"
                onClick={() => setExpandedModel(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
