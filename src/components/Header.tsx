import React from 'react';
import { OwnerProfile } from '../types';
import { 
  Menu, 
  MapPin, 
  Download, 
  Edit3, 
  Search,
  Keyboard,
  LayoutDashboard,
  Bus,
  UserCheck,
  Ticket,
  Wallet,
  FileText,
  Fuel,
  LogOut,
  Settings
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  owner: OwnerProfile;
  activeTab: string;
  onOpenMobileSidebar: () => void;
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
  onOpenMobileSidebar,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onLogout,
  onNavigateTab
}) => {
  const isSaaS = owner.planType === 'SaaS';

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview':
        return { title: 'Overview', category: 'Operations', icon: LayoutDashboard };
      case 'fleet':
        return { title: 'Fleet', category: 'Operations', icon: Bus };
      case 'drivers':
        return { title: 'Drivers', category: 'Operations', icon: UserCheck };
      case 'fares':
        return { title: 'Routes', category: 'Operations', icon: Ticket };
      case 'earnings':
        return { title: 'Earnings', category: 'Commercials', icon: Wallet };
      case 'lease':
        return { title: 'Lease & Payouts', category: 'Commercials', icon: FileText };
      case 'fuel-perks':
        return { title: 'Fuel Perks', category: 'Services', icon: Fuel };
      case 'settings':
        return { title: 'Settings', category: 'Preferences', icon: Settings };
      default:
        return { title: 'Overview', category: 'Console', icon: LayoutDashboard };
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
              <div className="flex items-center space-x-2 mt-0.5">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight leading-none font-sans">
                  {tabInfo.title}
                </h1>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${
                  isSaaS 
                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' 
                    : 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20'
                }`}>
                  {owner.planType} Plan
                </span>
              </div>
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

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Settings & Account Configuration */}
          <button
            onClick={() => onNavigateTab ? onNavigateTab('settings') : onOpenProfileModal()}
            className={`p-2 bg-white dark:bg-neutral-900 border rounded-lg transition-colors cursor-pointer shadow-2xs ${
              activeTab === 'settings'
                ? 'text-amber-600 dark:text-amber-400 border-amber-500/60 bg-amber-50 dark:bg-neutral-800'
                : 'border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800'
            }`}
            title="Account & Fleet Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

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

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 border border-slate-200 dark:border-neutral-800 hover:border-rose-300 dark:hover:border-rose-800 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1 text-xs font-mono"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px] font-semibold">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
