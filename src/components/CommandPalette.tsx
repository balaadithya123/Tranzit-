import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  Bus as BusIcon, 
  UserCheck, 
  Ticket, 
  Wallet, 
  FileText, 
  Fuel, 
  Download, 
  Moon, 
  Sun, 
  X, 
  CornerDownLeft,
  MapPin,
  Settings,
  Trash2
} from 'lucide-react';
import { Bus, Driver, OwnerProfile, RouteItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  owner: OwnerProfile;
  buses: Bus[];
  drivers: Driver[];
  routes?: RouteItem[];
  onNavigateTab: (tab: string) => void;
  onOpenReportsModal: () => void;
  onOpenProfileModal: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Fleet Buses' | 'Pilots' | 'Routes' | 'Actions';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  owner,
  buses,
  drivers,
  routes = [],
  onNavigateTab,
  onOpenReportsModal,
  onOpenProfileModal
}) => {
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { toggleTheme, resolvedTheme } = useTheme();
  const isSaaS = owner.planType === 'SaaS';

  // Build searchable commands list
  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // Navigation Commands
    list.push({
      id: 'nav-overview',
      title: 'Mission Control (Overview)',
      subtitle: 'Fleet status, live KPIs, active radar alerts',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => { onNavigateTab('overview'); onClose(); },
      badge: '1'
    });

    list.push({
      id: 'nav-fleet',
      title: 'Fleet & Maintenance',
      subtitle: 'Buses registry, scheduled service dates, odometer',
      category: 'Navigation',
      icon: BusIcon,
      action: () => { onNavigateTab('fleet'); onClose(); },
      badge: '2'
    });

    list.push({
      id: 'nav-drivers',
      title: 'Drivers & Pilots Roster',
      subtitle: 'Commercial license validity, safety records',
      category: 'Navigation',
      icon: UserCheck,
      action: () => { onNavigateTab('drivers'); onClose(); },
      badge: '3'
    });

    if (isSaaS) {
      list.push({
        id: 'nav-fares',
        title: 'Routes & Dynamic Fares',
        subtitle: 'Base charges, per-km rates, active intercity runs',
        category: 'Navigation',
        icon: Ticket,
        action: () => { onNavigateTab('fares'); onClose(); },
        badge: '4'
      });

      list.push({
        id: 'nav-earnings',
        title: 'Earnings & Settlements',
        subtitle: 'UPI & cash collections, SaaS flat billing, wallet balance',
        category: 'Navigation',
        icon: Wallet,
        action: () => { onNavigateTab('earnings'); onClose(); },
        badge: '5'
      });
    } else {
      list.push({
        id: 'nav-lease',
        title: 'Lease Contract & Payouts',
        subtitle: 'Fixed monthly yield, bank settlement schedule',
        category: 'Navigation',
        icon: FileText,
        action: () => { onNavigateTab('lease'); onClose(); },
        badge: '5'
      });
    }

    list.push({
      id: 'nav-fuel-perks',
      title: 'Fuel & Fastag Perks',
      subtitle: 'HPCL fuel discounts, verified driver incentive credits',
      category: 'Navigation',
      icon: Fuel,
      action: () => { onNavigateTab('fuel-perks'); onClose(); },
      badge: '6'
    });

    list.push({
      id: 'nav-settings',
      title: 'Settings & Fleet Administration',
      subtitle: 'Company profile, commercial plan, depot city, delete account',
      category: 'Navigation',
      icon: Settings,
      action: () => { onNavigateTab('settings'); onClose(); },
      badge: '7'
    });

    // Quick Actions
    list.push({
      id: 'act-report',
      title: 'Export Operations Report (PDF)',
      subtitle: 'Monthly financials, route fares, and maintenance audit',
      category: 'Actions',
      icon: Download,
      action: () => { onClose(); onOpenReportsModal(); }
    });

    list.push({
      id: 'act-settings',
      title: 'Open Account & Fleet Settings',
      subtitle: 'Manage profile, plan parameters and lifecycle options',
      category: 'Actions',
      icon: Settings,
      action: () => { onClose(); onNavigateTab('settings'); }
    });

    list.push({
      id: 'act-delete-account',
      title: 'Delete Account & Clear All Data',
      subtitle: 'Permanently purge operator profile, buses, routes, drivers & logs',
      category: 'Actions',
      icon: Trash2,
      action: () => { onClose(); onNavigateTab('settings'); }
    });

    list.push({
      id: 'act-hub',
      title: `Change Operating Hub City (${owner.city || 'Bengaluru'})`,
      subtitle: 'Update central depot location and contact phone',
      category: 'Actions',
      icon: MapPin,
      action: () => { onClose(); onOpenProfileModal(); }
    });

    list.push({
      id: 'act-theme',
      title: resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: 'Toggle operator high-contrast palette (Hotkey: D)',
      category: 'Actions',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: () => { toggleTheme(); onClose(); }
    });

    // Dynamic Bus entries
    buses.forEach(bus => {
      list.push({
        id: `bus-${bus.id}`,
        title: `${bus.regNumber} — ${bus.model}`,
        subtitle: `Route: ${bus.routeAssigned || 'Depot Reserve'} • Next Service: ${bus.nextServiceDue || 'N/A'}`,
        category: 'Fleet Buses',
        icon: BusIcon,
        action: () => { onNavigateTab('fleet'); onClose(); },
        badge: bus.status
      });
    });

    // Dynamic Driver entries
    drivers.forEach(driver => {
      list.push({
        id: `driver-${driver.id}`,
        title: `${driver.name} (Pilot)`,
        subtitle: `DL: ${driver.licenseNumber} • Expiry: ${driver.licenseExpiryDate}`,
        category: 'Pilots',
        icon: UserCheck,
        action: () => { onNavigateTab('drivers'); onClose(); }
      });
    });

    // Dynamic Route entries
    routes.forEach(route => {
      const permitTag = route.permitType === 'stage_carriage'
        ? 'Stage Carriage (STA Mandated)'
        : route.permitType === 'contract_carriage'
        ? 'Contract Carriage'
        : route.permitType === 'tourist_permit'
        ? 'Tourist Permit'
        : 'Unverified Permit';

      list.push({
        id: `route-${route.id}`,
        title: route.routeName,
        subtitle: `${route.origin} → ${route.destination} (${route.distanceKm} km) • ${permitTag}`,
        category: 'Routes',
        icon: Ticket,
        action: () => { onNavigateTab('fares'); onClose(); },
        badge: route.permitType === 'stage_carriage' ? 'STA' : route.permitType === 'unverified' ? '⚠️ Unverified' : `${route.distanceKm}km`
      });
    });

    return list;
  }, [owner, buses, drivers, routes, isSaaS, resolvedTheme, onNavigateTab, onOpenReportsModal, onOpenProfileModal, toggleTheme, onClose]);

  // Filter commands by queryText
  const filteredCommands = useMemo(() => {
    if (!queryText.trim()) return commands;
    const q = queryText.toLowerCase().trim();
    return commands.filter(c => 
      c.title.toLowerCase().includes(q) || 
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    );
  }, [commands, queryText]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset query on open/close
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40">
          <Search className="w-5 h-5 text-slate-400 dark:text-neutral-500 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            placeholder="Type a command, search bus KA-01, driver, or route..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none font-sans"
          />
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center space-x-1 text-[11px] font-mono text-slate-400 dark:text-neutral-500 ml-2 px-1.5 py-0.5 bg-slate-200/60 dark:bg-neutral-800/80 rounded">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-transparent flex-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-neutral-400">
              No matching commands, vehicles, or pilots found for &ldquo;{queryText}&rdquo;.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold truncate font-sans">{item.title}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-neutral-800/80 text-slate-500 dark:text-neutral-400 font-medium">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-sans">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-3 shrink-0">
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 hidden sm:inline" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-neutral-900/60 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[10px] font-semibold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[10px] font-semibold">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[10px] font-semibold">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <div>
            <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-[10px] font-semibold">?</kbd> for shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
