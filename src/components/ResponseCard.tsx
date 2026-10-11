import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  Clock,
  Zap,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FlaskConical,
} from 'lucide-react';
import { ModelResult } from '../shared/types.js';

interface ResponseCardProps {
  result: ModelResult;
  isFastest?: boolean;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  onExpand: () => void;
}

export const ResponseCard: React.FC<ResponseCardProps> = ({
  result,
  isFastest,
  onRegenerate,
  isRegenerating = false,
  onExpand,
}) => {
  const [copied, setCopied] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);

  // Live stopwatch while loading
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (result.status === 'loading' || isRegenerating) {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTimer(Math.round((Date.now() - start) / 100) / 10);
      }, 100);
    } else {
      setElapsedTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [result.status, isRegenerating]);

  const handleCopy = async () => {
    if (!result.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const isLoading = result.status === 'loading' || isRegenerating;

  // Tokens per second calculation
  const tokensPerSec =
    result.status === 'success' && result.usage?.completionTokens && result.durationMs > 0
      ? Math.round((result.usage.completionTokens / (result.durationMs / 1000)) * 10) / 10
      : null;

  return (
    <div
      className={`flex flex-col h-full rounded-xl border transition-all duration-150 ${
        result.status === 'success'
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
          : result.status === 'loading'
          ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
          : result.status === 'not_configured'
          ? 'bg-slate-50/70 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700'
          : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/60'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
        <div>
          {/* Provider & Model */}
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              {result.modelName}
            </h3>
            {result.isDemo && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                <FlaskConical className="w-3 h-3" />
                Demo
              </span>
            )}
            {isFastest && result.status === 'success' && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Fastest
              </span>
            )}
          </div>

          {/* Unboxed Metadata Discipline */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{result.providerName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{result.modelId}</span>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-1">
          {result.status === 'success' && result.text && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title={copied ? 'Copied to clipboard!' : 'Copy response text'}
                aria-label="Copy response text"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onExpand}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title="Expand fullscreen view"
                aria-label="Expand fullscreen view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading || result.status === 'not_configured'}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Regenerate this model response"
            aria-label="Regenerate this model response"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[500px] text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Generating response...{' '}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                {elapsedTimer.toFixed(1)}s
              </span>
            </div>
            <div className="w-3/4 space-y-2 pt-2">
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-5/6" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-4/6" />
            </div>
          </div>
        )}

        {/* Success State */}
        {!isLoading && result.status === 'success' && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed break-words">
            {result.text}
          </div>
        )}

        {/* Not Configured State */}
        {!isLoading && result.status === 'not_configured' && (
          <div className="py-8 px-2 flex flex-col items-center text-center space-y-2.5">
            <HelpCircle className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Provider Not Connected
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {result.error ||
                'This provider requires an environment secret configured in the server to generate responses.'}
            </p>
          </div>
        )}

        {/* Timeout State */}
        {!isLoading && result.status === 'timeout' && (
          <div className="py-8 px-2 flex flex-col items-center text-center space-y-2.5">
            <Clock className="w-7 h-7 text-amber-500" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Request Timed Out
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              {result.error || 'The model did not respond within the allocated timeout limit.'}
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              Retry Request
            </button>
          </div>
        )}

        {/* Rate Limited State */}
        {!isLoading && result.status === 'rate_limited' && (
          <div className="py-8 px-2 flex flex-col items-center text-center space-y-2.5">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Rate Limit / Quota Exceeded
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              {result.error || 'API rate limit or quota exceeded. Please wait a moment.'}
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* General Error State */}
        {!isLoading && result.status === 'error' && (
          <div className="py-8 px-2 flex flex-col items-center text-center space-y-2.5">
            <XCircle className="w-7 h-7 text-rose-500" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Model Error
            </h4>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-xs leading-relaxed font-mono">
              {result.error || 'An error occurred during generation.'}
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Card Footer Telemetry */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
        {/* Latency */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {result.durationMs > 0 ? `${(result.durationMs / 1000).toFixed(2)}s` : '--'}
          </span>
        </div>

        {/* Tokens & Speed */}
        <div className="flex items-center gap-2">
          {result.usage?.totalTokens !== undefined && (
            <span title={`Prompt: ${result.usage.promptTokens || 0} / Completion: ${result.usage.completionTokens || 0}`}>
              {result.usage.totalTokens} tokens
            </span>
          )}

          {tokensPerSec && (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-0.5" title="Tokens per second">
                <Zap className="w-3 h-3 text-amber-500" />
                {tokensPerSec} t/s
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
