import React, { useState } from 'react';
import { OwnerProfile } from '../types';
import { Bus, LogOut, Sparkles, Building2, Ticket, Wallet, Wrench, LayoutDashboard, MapPin, Edit3, Fuel, FileText, Download, UserCheck } from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';
import { ReportsModal } from './ReportsModal';

interface NavbarProps {
  owner: OwnerProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  owner,
  activeTab,
  setActiveTab,
  onLogout
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const isSaaS = owner.planType === 'SaaS';

  const accentColorClass = isSaaS 
    ? 'text-amber-700 bg-amber-500/10 border-amber-300' 
    : 'text-teal-700 bg-teal-500/10 border-teal-300';

  const activeTabClass = isSaaS
    ? 'border-amber-600 text-amber-900 bg-amber-50 font-semibold'
    : 'border-teal-600 text-teal-900 bg-teal-50 font-semibold';

  return (
    <>
      <header className="bg-[#FBF9F5] border-b border-[#E8E4DC] sticky top-0 z-40 shadow-xs">
        {/* Top Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 border-b border-[#E8E4DC]/60 gap-2">
            
            {/* Logo & Platform Title */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[#1A1F2C] text-[#FBF9F5] flex items-center justify-center font-extrabold text-xl tracking-tighter rounded-sm border border-[#1A1F2C]">
                TZ
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight text-[#1A1F2C]">Tranzit</span>
                  <span className="text-xs text-slate-400 font-mono">v1.0</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">Bus Operations Platform</p>
              </div>
            </div>

            {/* Owner & Plan Details */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Plan Badge */}
              <div className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-xs border uppercase tracking-wider flex items-center space-x-1.5 ${accentColorClass}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSaaS ? 'SaaS Subscription' : 'Fleet Lease'}</span>
              </div>

              {/* Export Reports Button */}
              <button
                onClick={() => setIsReportsModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-[#E8E4DC] hover:border-amber-600 hover:text-amber-900 text-xs font-mono text-slate-700 rounded-xs transition-colors cursor-pointer group"
                title="Generate and download monthly earnings and maintenance PDF reports"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Reports (PDF)</span>
              </button>

              {/* Hub City Quick Badge Button */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-[#E8E4DC] hover:border-[#1A1F2C] text-xs font-mono text-slate-700 hover:text-[#1A1F2C] rounded-xs transition-colors cursor-pointer group"
                title="Click to edit Hub City & Fleet Profile"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
                <span className="font-bold">{owner.city || "Bengaluru"}</span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-[#1A1F2C]" />
              </button>

              {/* Owner Info */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-[#1A1F2C] flex items-center justify-end space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  {owner.companyName || owner.name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{(owner.activeBusesCount ?? 3)} Buses Enrolled</span>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xs border border-transparent hover:border-red-200 transition-colors text-xs font-medium flex items-center space-x-1 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Responsive Wrap layout so all tabs stay visible */}
          <nav className="flex flex-wrap items-center gap-1.5 py-2.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? activeTabClass
                  : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            {isSaaS ? (
              <>
                <button
                  onClick={() => setActiveTab('fares')}
                  className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                    activeTab === 'fares'
                      ? activeTabClass
                      : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Fares & Routes</span>
                </button>

                <button
                  onClick={() => setActiveTab('earnings')}
                  className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                    activeTab === 'earnings'
                      ? activeTabClass
                      : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Earnings & Wallet</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('lease')}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                  activeTab === 'lease'
                    ? activeTabClass
                    : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Lease Terms & Payouts</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('fuel-perks')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'fuel-perks'
                  ? activeTabClass
                  : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 text-amber-700" />
              <span>Fuel & Perks (AI)</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'fleet'
                  ? activeTabClass
                  : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-slate-700" />
              <span>Fleet & Maintenance</span>
            </button>

            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-all flex items-center space-x-1.5 rounded-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'drivers'
                  ? activeTabClass
                  : 'border-transparent text-slate-600 hover:text-[#1A1F2C] hover:border-[#E8E4DC] bg-white/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Drivers & Roster</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Edit Profile & Hub Settings Modal */}
      <EditProfileModal
        owner={owner}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Monthly Reports Export Modal */}
      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />
    </>
  );
};
