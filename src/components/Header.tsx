import React, { useState } from 'react';
import { OwnerProfile } from '../types';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Download, 
  Keyboard, 
  LogOut, 
  User
} from 'lucide-react';
import { isPlatformAdmin } from '../lib/pricingService';

interface HeaderProps {
  owner: OwnerProfile;
  activeTab: string;
  onOpenProfileModal: () => void;
  onOpenReportsModal: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  owner,
  activeTab,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onLogout,
  onNavigateTab
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const isSaaS = owner.planType === 'SaaS';
  const isAdmin = isPlatformAdmin(owner);

  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'fleet', label: 'Fleet' },
    { id: 'fares', label: 'Routes' },
    { id: 'drivers', label: 'Drivers' },
    { id: isSaaS ? 'earnings' : 'lease', label: isSaaS ? 'Earnings' : 'Lease & Payouts' },
    { id: 'fuel-perks', label: 'Fuel Perks' },
    { id: 'settings', label: 'Settings' },
    ...(isAdmin ? [{ id: 'admin-pricing', label: 'Admin' }] : [])
  ];

  return (
    <header className="w-full pb-4 sm:pb-6 pt-1 flex flex-col gap-3.5 sm:gap-4 border-b border-slate-100 dark:border-neutral-800/80 mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 dark:bg-amber-500/20 text-white dark:text-amber-400 flex items-center justify-center font-extrabold text-sm sm:text-base tracking-tighter rounded-xl border border-slate-800 dark:border-amber-500/30 shadow-2xs">
            TZ
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-sans">
                Tranzit
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded font-bold">
                OS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-slate-100/90 dark:bg-neutral-900/90 p-1 rounded-full border border-slate-200/80 dark:border-neutral-800">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateTab && onNavigateTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Search, Notifications, Profile Capsule */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Search Icon Button */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="p-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-full text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Notification Bell Button */}
          <button
            onClick={onOpenReportsModal}
            className="relative p-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-full text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
            title="Notifications & Reports"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-neutral-900"></span>
          </button>

          {/* User Profile Capsule */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2 pl-1 pr-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-full transition-colors cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {owner.name ? owner.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight font-sans truncate max-w-[120px]">
                  {owner.companyName || owner.name || 'Platform Carrier'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{owner.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 truncate">{owner.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {owner.planType} Plan
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    onOpenProfileModal();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fleet Profile & City Hub</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    onOpenReportsModal();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download Fleet Reports</span>
                </button>

                {onOpenShortcutsModal && (
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onOpenShortcutsModal();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Keyboard Shortcuts (?)</span>
                  </button>
                )}

                {onLogout && (
                  <div className="mt-1 pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Bar (Seamless single-bar switcher, no duplicate bottom nav) */}
      <nav className="flex md:hidden items-center space-x-1 overflow-x-auto no-scrollbar py-1 px-1 bg-slate-100/90 dark:bg-neutral-900/90 rounded-xl border border-slate-200/80 dark:border-neutral-800">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigateTab && onNavigateTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-neutral-800/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};


