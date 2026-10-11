import React from 'react';
import { X, Trash2, Clock, Zap, ArrowRight, History } from 'lucide-react';
import { ComparisonHistoryItem } from '../shared/types.js';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ComparisonHistoryItem[];
  onSelectHistoryItem: (item: ComparisonHistoryItem) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Evaluation History
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({history.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                title="Clear all history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No previous evaluation runs recorded yet.</p>
              <p className="text-[11px] text-slate-500">
                Run a comparison to automatically save snapshots here.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="group p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1.5">
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span>{(item.totalDurationMs / 1000).toFixed(2)}s</span>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2 leading-relaxed mb-2">
                  "{item.prompt}"
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {item.results.length} models
                    </span>
                    {item.isDemoMode && (
                      <span className="text-amber-600 dark:text-amber-400 font-mono">
                        (Demo)
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    Load <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
