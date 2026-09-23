import React from 'react';
import { OwnerProfile } from '../types';
import { 
  LayoutDashboard, 
  Bus, 
  Ticket, 
  Wallet, 
  UserCheck, 
  FileText,
  Wrench,
  Settings,
  Search, 
  Bell, 
  User, 
  LogOut, 
  Sparkles,
  Keyboard,
  Moon,
  Sun
} from 'lucide-react';
import { isPlatformAdmin } from '../lib/pricingService';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  owner: OwnerProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfileModal?: () => void;
  onOpenReportsModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onLogout?: () => void;
  maintenanceAlertsCount?: number;
  driverAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  owner,
  activeTab,
  setActiveTab,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onLogout,
  maintenanceAlertsCount = 0,
  driverAlertsCount = 0,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isSaaS = owner.planType === 'SaaS';
  const isAdmin = isPlatformAdmin(owner);

  // Primary navigation tabs (stacked)
  const navTabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'fleet',
      label: 'Fleet Management',
      icon: Bus,
      badge: maintenanceAlertsCount,
    },
    {
      id: isSaaS ? 'fares' : 'lease',
      label: isSaaS ? 'Routes & Fares' : 'Lease Terms',
      icon: isSaaS ? Ticket : FileText,
      badge: 0,
    },
    {
      id: 'drivers',
      label: 'Drivers Registry',
      icon: UserCheck,
      badge: driverAlertsCount,
    },
    {
      id: 'maintenance',
      label: 'Workshop & Service',
      icon: Wrench,
      badge: maintenanceAlertsCount,
    },
    {
      id: isSaaS ? 'earnings' : 'lease',
      label: isSaaS ? 'Earnings Ledger' : 'Payouts',
      icon: isSaaS ? Wallet : FileText,
      badge: 0,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: 0,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-black border-r border-slate-200 dark:border-neutral-850 h-screen fixed top-0 left-0 z-40 select-none">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200/60 dark:border-neutral-850/60 flex flex-col space-y-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-slate-950 dark:bg-violet-950/20 text-white dark:text-violet-400 flex items-center justify-center font-black text-sm rounded-xl border border-slate-800 dark:border-violet-500/30">
            TZ
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-900 dark:text-white font-sans uppercase">
              Tranzit OS
            </h1>
            <p className="text-[9px] font-mono font-black text-violet-600 dark:text-violet-400 tracking-widest uppercase">
              Carrier Console
            </p>
          </div>
        </div>

        {/* Company profile pill */}
        <div className="mt-1.5 px-3 py-1.5 bg-slate-50 dark:bg-neutral-900/25 rounded-xl border border-slate-100 dark:border-neutral-800/40">
          <p className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 font-bold uppercase truncate">
            {owner.companyName || 'Platform Carrier'}
          </p>
        </div>
      </div>

      {/* Global Interactive Search Bar inside Sidebar */}
      {onOpenCommandPalette && (
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-neutral-900/50 hover:bg-slate-100 dark:hover:bg-neutral-900 text-slate-500 dark:text-neutral-400 text-xs font-mono rounded-xl border border-slate-100 dark:border-neutral-850/50 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search command...</span>
            </div>
            <kbd className="text-[9px] bg-slate-200/60 dark:bg-neutral-850 px-1.5 py-0.5 rounded font-bold">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation Links Area */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer group ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-violet-950/40 dark:text-violet-300 dark:border dark:border-violet-500/30 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-900/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span>{tab.label}</span>
              </div>

              {/* Conditional Badges */}
              {tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                  isActive ? 'bg-violet-600 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Super Admin Pricing link if applicable */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('admin-pricing')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-4 ${
              activeTab === 'admin-pricing'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-400'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Pricing Admin Console</span>
          </button>
        )}
      </nav>

      {/* Quick Utilities / Toolbar inside Sidebar */}
      <div className="px-4 py-2 border-t border-slate-200/50 dark:border-neutral-850/50 flex items-center justify-between text-slate-500 dark:text-neutral-400">
        {onOpenShortcutsModal && (
          <button
            type="button"
            onClick={onOpenShortcutsModal}
            className="p-2 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {onOpenReportsModal && (
          <button
            type="button"
            onClick={onOpenReportsModal}
            className="p-2 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer relative"
            title="System Diagnostics & Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
          title={theme === 'dark' ? 'Light Mode (D)' : 'Dark Mode (D)'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Solid User Account Footer inside Sidebar */}
      <div className="p-4 bg-slate-50 dark:bg-neutral-950 border-t border-slate-200 dark:border-neutral-850">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shadow-violet-500/20">
            {owner.name ? owner.name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate">
              {owner.name || 'Platform Carrier'}
            </h4>
            <p className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 truncate">
              {owner.email}
            </p>
          </div>
        </div>

        {/* User Interactive Card Actions */}
        <div className="grid grid-cols-3 gap-1 text-center">
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 rounded-lg border border-slate-150 dark:border-neutral-850 flex items-center justify-center cursor-pointer transition-colors"
              title="Edit Profile Settings"
            >
              <User className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className="py-1.5 px-2 bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 rounded-lg border border-slate-150 dark:border-neutral-850 flex items-center justify-center cursor-pointer transition-colors"
            title="SaaS Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/50 flex items-center justify-center cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </aside>
  );
};
