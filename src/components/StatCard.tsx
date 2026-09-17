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
  const accentBorder = 
    accentColor === 'amber' ? 'border-t-2 border-t-amber-600' :
    accentColor === 'teal' ? 'border-t-2 border-t-teal-600' :
    accentColor === 'navy' ? 'border-t-2 border-t-[#1A1F2C]' :
    'border-t-2 border-t-slate-400';

  const badgeClass =
    accentColor === 'amber' ? 'bg-amber-100 text-amber-900 border-amber-300' :
    accentColor === 'teal' ? 'bg-teal-100 text-teal-900 border-teal-300' :
    accentColor === 'navy' ? 'bg-slate-100 text-slate-900 border-slate-300' :
    'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <div className={`bg-white border border-[#E8E4DC] ${accentBorder} p-5 rounded-xs flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold block">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-[#1A1F2C] mt-2 tracking-tight">
            {value}
          </div>
        </div>

        {Icon && (
          <div className="p-2 bg-[#FBF9F5] border border-[#E8E4DC] text-slate-700 rounded-xs">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E8E4DC]/60 flex items-center justify-between text-xs">
        {subtext ? (
          <span className="text-slate-500 font-sans">{subtext}</span>
        ) : (
          <span />
        )}

        {badgeText && (
          <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-xs border uppercase ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
