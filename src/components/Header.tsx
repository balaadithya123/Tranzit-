import React from 'react';
import { OwnerProfile } from '../types';
import { 
  Menu, 
  MapPin, 
  Download, 
  Edit3, 
  Sparkles, 
  Search,
  Keyboard,
  LayoutDashboard,
  Bus,
  UserCheck,
  Ticket,
  Wallet,
  FileText,
  Fuel
} from 'lucide-react';
import { DEMO_SaaS_UID, DEMO_LEASE_UID } from '../lib/seedData';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  owner: OwnerProfile;
  activeTab: string;
  onOpenMobileSidebar: () => void;
  onOpenProfileModal: () => void;
  onOpenReportsModal: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onSwitchOwner?: (ownerId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  owner,
  activeTab,
  onOpenMobileSidebar,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onSwitchOwner
}) => {
  const isSaaS = owner.planType === 'SaaS';

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview':
        return { title: 'Mission Control', category: 'Operations', icon: LayoutDashboard };
      case 'fleet':
        return { title: 'Fleet & Maintenance', category: 'Operations', icon: Bus };
      case 'drivers':
        return { title: 'Drivers & Roster', category: 'Operations', icon: UserCheck };
      case 'fares':
        return { title: 'Routes & Dynamic Fares', category: 'Operations', icon: Ticket };
      case 'earnings':
        return { title: 'Revenue & Settlements', category: 'Commercials', icon: Wallet };
      case 'lease':
        return { title: 'Lease Contract & Payouts', category: 'Commercials', icon: FileText };
      case 'fuel-perks':
        return { title: 'Fuel & Fastag Perks', category: 'Partner Services', icon: Fuel };
      default:
        return { title: 'Dashboard', category: 'Console', icon: LayoutDashboard };
    }
  };

  const tabInfo = getTabLabel(activeTab);
  const IconComponent = tabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-50/85 dark:bg-black/85 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center space-x-3">
          {/* Mobile Drawer Trigger */}
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-800 dark:text-neutral-100 hidden sm:flex items-center justify-center shadow-2xs">
              <IconComponent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-neutral-500">
                <span>Tranzit</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-neutral-400 font-medium">{tabInfo.category}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight leading-none mt-0.5 font-sans">
                {tabInfo.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Center/Right: Quick Search & Command Palette Bar */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs text-slate-500 dark:text-neutral-400 transition-colors cursor-pointer shadow-2xs max-w-xs w-full justify-between"
            title="Search fleet, pilots, or jump to tabs (⌘K or /)"
          >
            <span className="flex items-center space-x-2 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
              <span className="truncate">Search fleet, drivers, routes...</span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 font-mono text-[10px] font-bold rounded border border-slate-200 dark:border-neutral-700 shrink-0">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Mobile search trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="md:hidden p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs"
              title="Search command palette"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Operating Hub Pill */}
          <button
            onClick={onOpenProfileModal}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:border-amber-500/60 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group shadow-2xs"
            title="Edit Operating Hub City & Depot Address"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-slate-400 dark:text-neutral-500 text-[11px]">Hub:</span>
            <span className="font-bold text-slate-900 dark:text-neutral-100">{owner.city || "Bengaluru"}</span>
            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-amber-500 ml-0.5" />
          </button>

          {/* Quick PDF Report Trigger */}
          <button
            onClick={onOpenReportsModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:border-amber-500/60 border border-slate-200 dark:border-neutral-800 text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg transition-colors cursor-pointer group shadow-2xs"
            title="Export Monthly Revenue, Route Fares, and Fleet Maintenance PDF Reports"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden lg:inline">Export PDF</span>
            <span className="lg:hidden">PDF</span>
          </button>

          {/* Demo Operator Switcher (Toggle SaaS vs Lease) */}
          {onSwitchOwner && (
            <button
              onClick={() => {
                const targetId = owner.id === DEMO_SaaS_UID ? DEMO_LEASE_UID : DEMO_SaaS_UID;
                onSwitchOwner(targetId);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                isSaaS
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30 text-teal-800 dark:text-teal-300'
              }`}
              title="Click to switch between SaaS and Fleet Lease demo accounts"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold hidden sm:inline">
                {isSaaS ? 'SaaS Mode' : 'Lease Mode'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-normal hidden xl:inline">
                (Switch)
              </span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Keyboard Shortcuts Helper */}
          {onOpenShortcutsModal && (
            <button
              onClick={onOpenShortcutsModal}
              className="p-2 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 transition-colors cursor-pointer shadow-2xs hidden sm:flex"
              title="Keyboard Shortcuts & Pro Tips (Press ?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
