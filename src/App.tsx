import React, { useState, useEffect } from 'react';
import { OwnerProfile } from './types';
import { seedInitialFirestoreData } from './lib/seedData';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthView } from './components/AuthView';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { FaresRoutesView } from './components/FaresRoutesView';
import { EarningsView } from './components/EarningsView';
import { LeaseTermsPayoutsView } from './components/LeaseTermsPayoutsView';
import { FleetMaintenanceView } from './components/FleetMaintenanceView';
import { FuelPerksView } from './components/FuelPerksView';
import { Bus, RefreshCw, Sparkles } from 'lucide-react';

export default function App() {
  const [currentOwner, setCurrentOwner] = useState<OwnerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [initializing, setInitializing] = useState(true);

  // Initialize and seed Firestore demo accounts on first mount
  useEffect(() => {
    async function initApp() {
      try {
        await seedInitialFirestoreData();
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setInitializing(false);
      }
    }
    initApp();
  }, []);

  // Listen for real-time owner profile changes if logged in
  useEffect(() => {
    if (!currentOwner?.id) return;

    const unsub = onSnapshot(doc(db, 'owners', currentOwner.id), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentOwner(snapshot.data() as OwnerProfile);
      }
    });

    return () => unsub();
  }, [currentOwner?.id]);

  const handleLoginSuccess = (owner: OwnerProfile) => {
    setCurrentOwner(owner);
    setActiveTab('overview');
  };

  const handleLogout = () => {
    setCurrentOwner(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 bg-[#1A1F2C] text-[#FBF9F5] flex items-center justify-center font-extrabold text-2xl mb-4 rounded-xs">
          TZ
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono uppercase text-slate-600">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
          <span>Connecting to Tranzit Firestore Platform...</span>
        </div>
      </div>
    );
  }

  if (!currentOwner) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  const isSaaS = currentOwner.planType === 'SaaS';

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex flex-col font-sans selection:bg-amber-100">
      {/* Top Navbar */}
      <Navbar
        owner={currentOwner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <OverviewView owner={currentOwner} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'fares' && isSaaS && (
          <FaresRoutesView owner={currentOwner} />
        )}

        {activeTab === 'earnings' && isSaaS && (
          <EarningsView owner={currentOwner} />
        )}

        {activeTab === 'lease' && !isSaaS && (
          <LeaseTermsPayoutsView owner={currentOwner} />
        )}

        {activeTab === 'fleet' && (
          <FleetMaintenanceView owner={currentOwner} />
        )}

        {activeTab === 'fuel-perks' && isSaaS && (
          <FuelPerksView owner={currentOwner} />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="bg-white border-t border-[#E8E4DC] py-6 mt-12 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-[#1A1F2C]">TRANZIT</span>
            <span>•</span>
            <span>Private Bus Operations Platform India</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firestore Connected</span>
            </span>
            <span>{currentOwner.companyName} ({currentOwner.planType})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
