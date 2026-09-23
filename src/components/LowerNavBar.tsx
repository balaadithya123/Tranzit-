import React, { useState, useRef, useEffect } from 'react';
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
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { isPlatformAdmin } from '../lib/pricingService';

interface LowerNavBarProps {
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

export const LowerNavBar: React.FC<LowerNavBarProps> = ({
  owner,
  activeTab,
  setActiveTab,
  onOpenProfileModal,
  onOpenReportsModal,
  onOpenCommandPalette,
  onLogout,
  maintenanceAlertsCount = 0,
  driverAlertsCount = 0,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isSaaS = owner.planType === 'SaaS';
  const isAdmin = isPlatformAdmin(owner);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation tabs
  const navTabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'fleet',
      label: 'Fleet',
      icon: Bus,
      badge: maintenanceAlertsCount,
    },
    {
      id: isSaaS ? 'fares' : 'lease',
      label: isSaaS ? 'Routes' : 'Lease',
      icon: isSaaS ? Ticket : FileText,
      badge: 0,
    },
    {
      id: 'drivers',
      label: 'Drivers',
      icon: UserCheck,
      badge: driverAlertsCount,
    },
    {
      id: 'maintenance',
      label: 'Service',
      icon: Wrench,
      badge: maintenanceAlertsCount,
    },
    {
      id: isSaaS ? 'earnings' : 'lease',
      label: isSaaS ? 'Earnings' : 'Payouts',
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
    <>
      {/* MOBILE MORE ACTIONS POPOVER / SHEET (< sm) */}
      {isMoreMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-3 animate-in fade-in duration-150">
          <div 
            ref={menuRef}
            className="w-full bg-white dark:bg-[#10131a] border border-slate-200 dark:border-neutral-800 rounded-3xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom-5 duration-200"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {owner.name ? owner.name.charAt(0).toUpperCase() : 'T'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                    {owner.name || 'Platform Carrier'}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 truncate max-w-[180px]">
                    {owner.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setIsMoreMenuOpen(false);
                }}
                className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-neutral-300 text-xs font-mono font-medium transition-colors cursor-pointer text-left"
              >
                <Settings className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Settings</span>
              </button>

              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenCommandPalette();
                  }}
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-neutral-300 text-xs font-mono font-medium transition-colors cursor-pointer text-left"
                >
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">Search (⌘K)</span>
                </button>
              )}

              {onOpenReportsModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenReportsModal();
                  }}
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-neutral-300 text-xs font-mono font-medium transition-colors cursor-pointer text-left"
                >
                  <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Reports & Bell</span>
                </button>
              )}

              {onOpenProfileModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenProfileModal();
                  }}
                  className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-neutral-300 text-xs font-mono font-medium transition-colors cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="truncate">Edit Profile</span>
                </button>
              )}
            </div>

            {/* Admin option if applicable */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin-pricing');
                  setIsMoreMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Super Admin Pricing Console</span>
              </button>
            )}

            {/* Sign Out Action */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs font-mono font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Fleet OS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOWER BAR COMPONENT (Fixed at bottom) */}
      <nav 
        className="fixed bottom-0 sm:bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-0 sm:px-4"
        aria-label="Application Navigation"
      >
        {/* ========================================================= */}
        {/* DESKTOP / TABLET DOCK (sm:flex)                           */}
        {/* ========================================================= */}
        <div className="hidden sm:flex pointer-events-auto items-center space-x-1 px-2.5 py-1.5 bg-white/95 dark:bg-[#10131a]/95 backdrop-blur-xl border border-slate-200/90 dark:border-neutral-800/90 rounded-full shadow-2xl transition-all">
          
          {/* Nav Pills */}
          <div className="flex items-center space-x-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                      isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:border-neutral-800 mx-0.5" />

          {/* Quick Utility Icons */}
          <div className="flex items-center space-x-1">
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="p-2 rounded-full text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Search (⌘K)"
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenReportsModal && (
              <button
                type="button"
                onClick={onOpenReportsModal}
                className="relative p-2 rounded-full text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Reports & Alerts"
                aria-label="Reports"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-neutral-900" />
              </button>
            )}

            {/* Profile Menu Trigger */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-2xs"
                title="Account Menu"
              >
                {owner.name ? owner.name.charAt(0).toUpperCase() : 'T'}
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 bottom-10 w-52 bg-white dark:bg-[#10131a] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-2 font-mono text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans">{owner.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">{owner.email}</p>
                  </div>

                  {onOpenProfileModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenProfileModal();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center space-x-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit Profile</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center space-x-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Settings</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveTab('admin-pricing');
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-purple-600 dark:text-purple-400 flex items-center space-x-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Super Admin</span>
                    </button>
                  )}

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-100 dark:border-neutral-800 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center space-x-2 cursor-pointer"
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

        {/* ========================================================= */}
        {/* MOBILE FULL-WIDTH LOWER BAR (< sm)                       */}
        {/* ========================================================= */}
        <div className="sm:hidden pointer-events-auto w-full bg-white/95 dark:bg-[#0c0e15]/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800 px-1 py-1.5 shadow-2xl safe-area-bottom">
          <div className="flex items-center justify-around">
            {/* Top 5 core tabs */}
            {navTabs.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] min-w-[48px] cursor-pointer ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] tracking-tight mt-0.5 font-sans whitespace-nowrap ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />
                  )}
                </button>
              );
            })}

            {/* Earnings tab (6th) */}
            {(() => {
              const earningsTab = navTabs[5];
              const Icon = earningsTab.icon;
              const isActive = activeTab === earningsTab.id;
              return (
                <button
                  type="button"
                  onClick={() => setActiveTab(earningsTab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] min-w-[48px] cursor-pointer ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  <span className={`text-[10px] tracking-tight mt-0.5 font-sans whitespace-nowrap ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                    {earningsTab.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />
                  )}
                </button>
              );
            })()}

            {/* More Menu Trigger (Settings, Profile, Search, Reports, Logout) */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] min-w-[48px] cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              aria-label="More options"
            >
              <Menu className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] tracking-tight mt-0.5 font-sans font-medium whitespace-nowrap">
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
