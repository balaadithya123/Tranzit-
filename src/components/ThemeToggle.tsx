import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabels = false }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (showLabels) {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 rounded-lg text-xs font-mono ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`px-2 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-white text-amber-700 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Light theme"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`px-2 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 text-sky-400 dark:bg-slate-950 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Dark theme"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`px-2 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Match system theme"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // Compact Icon-only Toggle
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg border transition-all cursor-pointer group shadow-2xs ${
        resolvedTheme === 'dark'
          ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-sky-300 hover:text-sky-200'
          : 'bg-white hover:bg-slate-100 border-slate-200 text-amber-600 hover:text-amber-700'
      } ${className}`}
      title={resolvedTheme === 'dark' ? 'Switch to Light mode (Press D)' : 'Switch to Dark mode (Press D)'}
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
      ) : (
        <Sun className="w-4 h-4 transition-transform group-hover:rotate-45" />
      )}
    </button>
  );
};
