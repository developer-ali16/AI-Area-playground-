import React from 'react';
import {
  Layers,
  Sun,
  Moon,
  Info,
  History,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';
import { ProviderInfo } from '../shared/types.js';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  providers: ProviderInfo[];
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenArchitectureModal: () => void;
  onOpenHistoryDrawer: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  providers,
  isDemoMode,
  onToggleDemoMode,
  onOpenArchitectureModal,
  onOpenHistoryDrawer,
  historyCount,
}) => {
  const geminiProvider = providers.find((p) => p.id === 'gemini');
  const isGeminiReady = Boolean(geminiProvider?.isConfigured);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                AI Arena
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                v1.0
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {isGeminiReady ? 'Gemini Live Connected' : 'Checking Credentials...'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Concurrent Benchmarking</span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDemoMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isDemoMode
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            title="Toggle Demo Mode: Enables labeled simulated benchmark models for multi-column UI testing"
          >
            <FlaskConical className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">
              {isDemoMode ? 'Demo Mode Active' : 'Enable Demo Mode'}
            </span>
            <span className="md:hidden">Demo</span>
          </button>

          {/* Architecture & Key Info Button */}
          <button
            type="button"
            onClick={onOpenArchitectureModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Provider connectivity & architecture details"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Providers</span>
          </button>

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistoryDrawer}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Comparison History"
            aria-label="Comparison History"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
