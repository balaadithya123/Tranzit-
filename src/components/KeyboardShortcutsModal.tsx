import React, { useEffect } from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSaaS?: boolean;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  isSaaS = true
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationShortcuts = [
    { key: '1', desc: 'Navigate to Mission Control (Overview)' },
    { key: '2', desc: 'Navigate to Fleet & Maintenance' },
    { key: '3', desc: 'Navigate to Drivers & Pilots' },
    { key: '4', desc: isSaaS ? 'Navigate to Routes & Dynamic Fares' : 'Reserved' },
    { key: '5', desc: isSaaS ? 'Navigate to Earnings & Settlements' : 'Navigate to Lease Payouts' },
    { key: '6', desc: 'Navigate to Fuel & Fastag Perks' },
    { key: '7', desc: 'Navigate to Settings & Account Administration' },
  ];

  const actionShortcuts = [
    { key: '⌘ K / Ctrl K', desc: 'Open Command Palette & Global Search' },
    { key: '?', desc: 'Open this Keyboard Shortcuts Cheat Sheet' },
    { key: 'D', desc: 'Toggle Dark / Light Theme Mode' },
    { key: 'R', desc: 'Open Financial & Operations Export Reports' },
    { key: 'H', desc: 'Open Depot Hub City & Settings Modal' },
    { key: 'ESC', desc: 'Close any active modal / overlay' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-neutral-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wide">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-slate-300 dark:text-neutral-400 font-sans">
                Quick commands for fleet operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-neutral-500 tracking-wider mb-2.5">
              System & Actions
            </h3>
            <div className="space-y-1.5">
              {actionShortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-900/60">
                  <span className="text-xs text-slate-700 dark:text-neutral-300 font-sans">{sc.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-neutral-500 tracking-wider mb-2.5">
              Tab Direct Switching
            </h3>
            <div className="space-y-1.5">
              {navigationShortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-900/60">
                  <span className="text-xs text-slate-700 dark:text-neutral-300 font-sans">{sc.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-neutral-900/60 border-t border-slate-200 dark:border-neutral-800 text-center text-xs text-slate-500 dark:text-neutral-400 font-mono">
          Tranzit OS • India Commercial Fleet Operations
        </div>
      </div>
    </div>
  );
};
