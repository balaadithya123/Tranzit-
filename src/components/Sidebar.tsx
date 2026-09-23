import React from 'react';
import { OwnerProfile } from '../types';
import { 
  LayoutDashboard, 
  Bus, 
  UserCheck, 
  Ticket, 
  Wallet, 
  FileText, 
  Fuel, 
  Sparkles, 
  LogOut, 
  MapPin, 
  Edit3, 
  Download, 
  ChevronRight, 
  X,
  Keyboard,
  Settings,
  CreditCard,
  Sliders,
  Layers
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { isPlatformAdmin } from '../lib/pricingService';

interface SidebarProps {
  owner: OwnerProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  layoutMode?: 'island' | 'classic';
  onToggleLayoutMode?: () => void;
  onLogout: () => void;
  onOpenProfileModal: () => void;
  onOpenReportsModal: () => void;
  onOpenShortcutsModal?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  maintenanceAlertsCount?: number;
  driverAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  owner,
  activeTab,
  setActiveTab,
  layoutMode = 'island',
  onToggleLayoutMode,
  onLogout,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenShortcutsModal,
  isMobileOpen,
  setIsMobileOpen,
  maintenanceAlertsCount = 0,
  driverAlertsCount = 0,
}) => {
  const isSaaS = owner.planType === 'SaaS';

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const navItemClass = (isActive: boolean) => {
    if (isActive) {
      return 'bg-slate-900 text-white dark:bg-amber-500/15 dark:text-amber-300 dark:border dark:border-amber-500/30 font-semibold shadow-xs';
    }
    return 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-200/60 dark:hover:bg-neutral-900/80 transition-colors font-medium';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-100/90 dark:bg-[#0A0A0A] border-r border-slate-200 dark:border-neutral-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section: Brand & Profile Card */}
        <div className="flex flex-col">
          {/* Platform Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800/90 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-slate-900 dark:bg-amber-500/20 text-white dark:text-amber-400 flex items-center justify-center font-extrabold text-lg tracking-tighter rounded-lg border border-slate-800 dark:border-amber-500/30 shadow-2xs">
                TZ
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-neutral-100">Tranzit</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded font-semibold">
                    OS
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Fleet & Route Console
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Operator Profile Summary Box */}
          <div className="p-3.5 mx-3 mt-3 bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-neutral-800 text-white dark:text-neutral-200 flex items-center justify-center text-xs font-mono font-bold shrink-0 border border-slate-700/40 dark:border-neutral-700/50">
                {owner.companyName ? owner.companyName.substring(0, 2).toUpperCase() : 'TR'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate font-sans">
                  {owner.companyName || owner.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate font-mono">
                  {owner.name}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
              {/* Plan Badge */}
              <span
                className={`px-2 py-0.5 rounded-md font-semibold uppercase text-[10px] flex items-center space-x-1 ${
                  isSaaS
                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{owner.planType} Plan</span>
              </span>

              {/* Hub Quick Button */}
              <button
                onClick={onOpenProfileModal}
                className="flex items-center space-x-1 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 transition-colors cursor-pointer group"
                title="Edit Hub City & Fleet Profile"
              >
                <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold underline decoration-dotted">{owner.city || "Bengaluru"}</span>
                <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-amber-500" />
              </button>
            </div>
          </div>

          {/* Navigation Links Grouped Logically */}
          <nav className="p-3 space-y-4 overflow-y-auto mt-2">
            {/* Section 1: Fleet Operations */}
            <div>
              <div className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-neutral-500 font-bold">
                Operations
              </div>
              <div className="space-y-0.5">
                {/* Overview */}
                <button
                  onClick={() => handleNavClick('overview')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'overview'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Overview</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="hidden xl:inline text-[10px] font-mono opacity-50">1</span>
                    {activeTab === 'overview' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                </button>

                {/* Fleet & Maintenance */}
                <button
                  onClick={() => handleNavClick('fleet')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'fleet'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Bus className="w-4 h-4" />
                    <span>Fleet</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {maintenanceAlertsCount > 0 ? (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-mono text-[10px] font-bold rounded">
                        {maintenanceAlertsCount}
                      </span>
                    ) : (
                      <span className="hidden xl:inline text-[10px] font-mono opacity-50">2</span>
                    )}
                    {activeTab === 'fleet' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                </button>

                {/* Driver Roster */}
                <button
                  onClick={() => handleNavClick('drivers')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'drivers'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Drivers</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {driverAlertsCount > 0 ? (
                      <span className="px-1.5 py-0.2 bg-red-600 text-white font-mono text-[10px] font-bold rounded">
                        {driverAlertsCount}
                      </span>
                    ) : (
                      <span className="hidden xl:inline text-[10px] font-mono opacity-50">3</span>
                    )}
                    {activeTab === 'drivers' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                </button>

                {/* Routes (SaaS only) */}
                {isSaaS && (
                  <button
                    onClick={() => handleNavClick('fares')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                      activeTab === 'fares'
                    )}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Ticket className="w-4 h-4" />
                      <span>Routes</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="hidden xl:inline text-[10px] font-mono opacity-50">4</span>
                      {activeTab === 'fares' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: Financials & Settlements */}
            <div>
              <div className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-neutral-500 font-bold">
                Commercials
              </div>
              <div className="space-y-0.5">
                {isSaaS ? (
                  <button
                    onClick={() => handleNavClick('earnings')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                      activeTab === 'earnings'
                    )}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Wallet className="w-4 h-4" />
                      <span>Earnings</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="hidden xl:inline text-[10px] font-mono opacity-50">5</span>
                      {activeTab === 'earnings' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      )}
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavClick('lease')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                      activeTab === 'lease'
                    )}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4" />
                      <span>Lease & Payouts</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="hidden xl:inline text-[10px] font-mono opacity-50">5</span>
                      {activeTab === 'lease' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                      )}
                    </div>
                  </button>
                )}

                {/* Subscription Plan Tiers */}
                <button
                  onClick={() => handleNavClick('subscription')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'subscription'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Subscription</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded font-bold border border-amber-500/30">
                      Tiers
                    </span>
                    {activeTab === 'subscription' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Partner Network & Perks */}
            <div>
              <div className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-neutral-500 font-bold">
                Services
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleNavClick('fuel-perks')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'fuel-perks'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Fuel Perks</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="hidden xl:inline text-[10px] font-mono opacity-50">6</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded font-bold border border-amber-500/30">
                      AI
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 4: System & Preferences */}
            <div>
              <div className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-neutral-500 font-bold">
                Preferences
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleNavClick('settings')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                    activeTab === 'settings'
                  )}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Settings className="w-4 h-4" />
                    <span>Settings & Account</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="hidden xl:inline text-[10px] font-mono opacity-50">7</span>
                    {activeTab === 'settings' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Section 5: Platform Admin Controls (Admin Only) */}
            {isPlatformAdmin(owner) && (
              <div>
                <div className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold flex items-center justify-between">
                  <span>Platform Admin</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded font-black">
                    ADMIN
                  </span>
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('admin-pricing')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${navItemClass(
                      activeTab === 'admin-pricing'
                    )}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Tier Pricing Settings</span>
                    </div>
                    {activeTab === 'admin-pricing' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Section: Reports, Status & Logout */}
        <div className="p-3.5 border-t border-slate-200 dark:border-neutral-800/90 bg-white/70 dark:bg-[#121214]/70 space-y-2">
          {/* Layout Quick Action */}
          {onToggleLayoutMode && (
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="w-full py-1.5 px-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-[11px] font-mono text-slate-700 dark:text-neutral-300 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              title="Toggle between Island and Classic view"
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Switch to {layoutMode === 'island' ? 'Classic View' : 'Island View'}</span>
            </button>
          )}

          {/* Quick PDF Export */}
          <button
            onClick={onOpenReportsModal}
            className="w-full py-2 px-3 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-between cursor-pointer group shadow-2xs"
          >
            <span className="flex items-center space-x-2">
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Export PDF</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
          </button>

          {/* Theme & Shortcuts bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync</span>
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {onOpenShortcutsModal && (
                <button
                  onClick={onOpenShortcutsModal}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 text-xs cursor-pointer"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-800/50 transition-colors text-xs font-mono font-bold flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
            title="Sign Out / Log Out of Tranzit"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
