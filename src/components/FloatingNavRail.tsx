import React from 'react';
import { OwnerProfile } from '../types';
import { 
  LayoutGrid, 
  Bus, 
  Wallet, 
  FileText, 
  Wrench, 
  Fuel, 
  Settings, 
  Sliders, 
  HelpCircle, 
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { isPlatformAdmin } from '../lib/pricingService';

interface FloatingNavRailProps {
  owner: OwnerProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  layoutMode?: 'island' | 'classic';
  onToggleLayoutMode?: () => void;
  onLogout: () => void;
  onOpenShortcutsModal?: () => void;
  maintenanceAlertsCount?: number;
  driverAlertsCount?: number;
}

export const FloatingNavRail: React.FC<FloatingNavRailProps> = ({
  owner,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenShortcutsModal,
  maintenanceAlertsCount = 0,
  driverAlertsCount = 0,
}) => {
  const isSaaS = owner.planType === 'SaaS';
  const { theme, toggleTheme } = useTheme();
  const isAdmin = isPlatformAdmin(owner);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutGrid,
      badge: 0
    },
    {
      id: 'fleet',
      label: 'Fleet & Buses',
      icon: Bus,
      badge: maintenanceAlertsCount
    },
    {
      id: isSaaS ? 'earnings' : 'lease',
      label: isSaaS ? 'Earnings' : 'Lease & Payouts',
      icon: isSaaS ? Wallet : FileText,
      badge: 0
    },
    {
      id: 'fares',
      label: 'Routes & Fares',
      icon: Wrench,
      badge: 0
    },
    {
      id: 'fuel-perks',
      label: 'Fuel Perks',
      icon: Fuel,
      badge: 0
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: 0
    },
    ...(isAdmin ? [{
      id: 'admin-pricing',
      label: 'Admin Pricing',
      icon: Sliders,
      badge: 0
    }] : [])
  ];

  return (
    <aside className="hidden lg:flex flex-col items-center justify-between py-6 px-3 shrink-0 select-none z-30">
      {/* Top: Vertical Theme Toggle Capsule */}
      <div className="bg-white dark:bg-[#11141e] border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-1 shadow-md shadow-slate-200/40 dark:shadow-none flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => { if (theme === 'dark') toggleTheme(); }}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-100 text-amber-500 shadow-2xs font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          title="Light Theme"
          aria-label="Light Theme"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { if (theme === 'light') toggleTheme(); }}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-neutral-800 text-amber-400 shadow-2xs font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          title="Dark Theme"
          aria-label="Dark Theme"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Vertical Floating Navigation Dock */}
      <div className="bg-white dark:bg-[#11141e] border border-slate-200/90 dark:border-neutral-800 rounded-3xl p-1.5 shadow-md shadow-slate-200/40 dark:shadow-none flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative p-2.5 rounded-2xl transition-all cursor-pointer group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800/80'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#11141e]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Help & Logout Capsule */}
      <div className="bg-white dark:bg-[#11141e] border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-1 shadow-md shadow-slate-200/40 dark:shadow-none flex flex-col items-center gap-1">
        {onOpenShortcutsModal && (
          <button
            type="button"
            onClick={onOpenShortcutsModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
