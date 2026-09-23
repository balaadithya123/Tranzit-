import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  badgeText?: string;
  accentColor?: 'amber' | 'teal' | 'navy' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badgeText,
  accentColor = 'amber'
}) => {
  const badgeClass =
    accentColor === 'amber'
      ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30'
      : accentColor === 'teal'
      ? 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20 dark:border-teal-500/30'
      : accentColor === 'navy'
      ? 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/20'
      : 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/20';

  const iconAccent =
    accentColor === 'amber'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20'
      : accentColor === 'teal'
      ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/20'
      : 'text-neutral-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700';

  return (
    <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-semibold block truncate">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-neutral-100 mt-2 tracking-tight">
            {value}
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg border shrink-0 ${iconAccent}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs gap-2">
        {subtext ? (
          <span className="text-slate-500 dark:text-neutral-400 font-sans truncate">{subtext}</span>
        ) : (
          <span />
        )}

        {badgeText && (
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border uppercase shrink-0 ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
