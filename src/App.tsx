import React, { useState, useEffect, Suspense, lazy } from 'react';
import { OwnerProfile, Bus, Driver, RouteItem, PlanType } from './types';
import { seedUserData } from './lib/seedData';
import { getSavedLocalOwner, saveLocalOwner } from './lib/firebaseAuthHelper';
import { doc, onSnapshot, getDoc, setDoc, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EditProfileModal } from './components/EditProfileModal';
import { ReportsModal } from './components/ReportsModal';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getServiceStatus, getLicenseValidityInfo } from './lib/utils';
import { formatEmailToName, DEMO_SaaS_EMAIL, DEMO_LEASE_EMAIL } from './lib/seedData';
import { RefreshCw } from 'lucide-react';

// Code-split main view components with React.lazy
const OverviewView = lazy(() => import('./components/OverviewView').then(m => ({ default: m.OverviewView })));
const FaresRoutesView = lazy(() => import('./components/FaresRoutesView').then(m => ({ default: m.FaresRoutesView })));
const EarningsView = lazy(() => import('./components/EarningsView').then(m => ({ default: m.EarningsView })));
const LeaseTermsPayoutsView = lazy(() => import('./components/LeaseTermsPayoutsView').then(m => ({ default: m.LeaseTermsPayoutsView })));
const FleetMaintenanceView = lazy(() => import('./components/FleetMaintenanceView').then(m => ({ default: m.FleetMaintenanceView })));
const FuelPerksView = lazy(() => import('./components/FuelPerksView').then(m => ({ default: m.FuelPerksView })));
const DriversView = lazy(() => import('./components/DriversView').then(m => ({ default: m.DriversView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const SubscriptionView = lazy(() => import('./components/SubscriptionView').then(m => ({ default: m.SubscriptionView })));
const AdminPricingSettingsView = lazy(() => import('./components/AdminPricingSettingsView').then(m => ({ default: m.AdminPricingSettingsView })));

function MainApp() {
  const [currentOwner, setCurrentOwner] = useState<OwnerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [initializing, setInitializing] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Fleet & driver telemetry for navigation badge alerts
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);

  const { toggleTheme } = useTheme();

  // Listen for Firebase Auth state changes and restore owner session
  useEffect(() => {
    // 1. Check local session storage first for immediate responsive hydration
    const cachedOwner = getSavedLocalOwner();
    if (cachedOwner) {
      setCurrentOwner(cachedOwner);
    }

    // Safety timer to prevent any indefinite splash screen hanging
    const safetyTimer = setTimeout(() => {
      setInitializing(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch current owner profile from Firestore
          let ownerDoc: any = null;
          try {
            ownerDoc = await getDoc(doc(db, 'owners', user.uid));
          } catch (fetchErr) {
            console.warn("Notice retrieving owner document:", fetchErr);
          }

          if (ownerDoc && ownerDoc.exists()) {
            const rawData = ownerDoc.data() as OwnerProfile;
            const userEmail = (user.email || '').toLowerCase();
            
            // STRICTLY PRESERVE user's saved company name and fleet profile.
            // NEVER overwrite companyName or name on reload.
            const properName = rawData.name?.trim() || user.displayName || formatEmailToName(userEmail);
            const properCompany = rawData.companyName?.trim() || (user.displayName ? `${user.displayName} Travels` : `${properName} Logistics`);
            
            const profile: OwnerProfile = {
              ...rawData,
              id: user.uid,
              uid: user.uid,
              email: userEmail || rawData.email,
              name: properName,
              companyName: properCompany
            };

            // Only update Firestore if initial profile was completely missing name or companyName
            if (!rawData.companyName?.trim() || !rawData.name?.trim()) {
              setDoc(doc(db, 'owners', user.uid), {
                name: properName,
                companyName: properCompany
              }, { merge: true }).catch(saveErr => {
                console.warn("Notice setting default profile fields:", saveErr);
              });
            }

            setCurrentOwner(profile);
            saveLocalOwner(profile);
          } else {
            // Document does not exist in Firestore yet (e.g. brand-new Google Sign-In)
            const cached = getSavedLocalOwner();
            if (cached && cached.id === user.uid && cached.companyName) {
              setCurrentOwner(cached);
              setDoc(doc(db, 'owners', user.uid), cached, { merge: true }).catch(() => {});
            } else {
              const userEmail = (user.email || '').toLowerCase();
              const properName = user.displayName || formatEmailToName(userEmail);
              const newProfile: OwnerProfile = {
                id: user.uid,
                uid: user.uid,
                name: properName,
                email: userEmail,
                companyName: user.displayName ? `${user.displayName} Travels` : `${properName} Logistics`,
                planType: 'SaaS',
                city: "Bengaluru",
                phone: "+91 98000 00000",
                activeBusesCount: 0,
                todayRevenue: 0,
                walletBalance: 0,
                subscriptionTier: 'starter',
                subscriptionPlanName: 'Starter',
                saasFeePerBus: 649,
                isAdmin: false,
                nextPayoutDate: "",
                nextPayoutAmount: 0,
                avgDailyRiders: 0,
                createdAt: new Date().toISOString()
              };
              setCurrentOwner(newProfile);
              saveLocalOwner(newProfile);
              setDoc(doc(db, 'owners', user.uid), newProfile, { merge: true }).catch(err => {
                console.warn("Notice initializing owner profile in background:", err);
              });
            }
          }
        } catch (err) {
          console.warn("Owner session retrieval notice:", err);
          const cached = getSavedLocalOwner();
          if (cached && cached.id === user.uid) {
            setCurrentOwner(cached);
          }
        }
      } else {
        const cached = getSavedLocalOwner();
        if (cached?.id) {
          // If user logged out explicitly or session is empty
          setCurrentOwner(cached);
        } else {
          saveLocalOwner(null);
          setCurrentOwner(null);
        }
      }
      setInitializing(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Global Keyboard Shortcuts (Friction Reduction Engine)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is actively typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // 1. Command Palette: Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // 2. Search shortcut: "/" (when not typing)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 3. Shortcuts modal: "?"
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // 4. Toggle dark theme: "d" / "D" (when not typing)
      if ((e.key === 'd' || e.key === 'D') && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // 5. Rapid Tab Switching: "1" to "7" (when not typing)
      if (!isInput && !e.metaKey && !e.ctrlKey && currentOwner) {
        const isSaaS = currentOwner.planType === 'SaaS';
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('overview');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('fleet');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('drivers');
            break;
          case '4':
            if (isSaaS) {
              e.preventDefault();
              setActiveTab('fares');
            }
            break;
          case '5':
            e.preventDefault();
            setActiveTab(isSaaS ? 'earnings' : 'lease');
            break;
          case '6':
            e.preventDefault();
            setActiveTab('fuel-perks');
            break;
          case '7':
            e.preventDefault();
            setActiveTab('settings');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentOwner, toggleTheme]);

  // Listen for real-time owner profile changes if logged in
  useEffect(() => {
    if (!currentOwner?.id) return;

    const unsubOwner = onSnapshot(doc(db, 'owners', currentOwner.id), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentOwner(snapshot.data() as OwnerProfile);
      } else {
        // Document was deleted from Firestore
        saveLocalOwner(null);
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        setCurrentOwner(null);
      }
    });

    const busesQuery = query(collection(db, 'buses'), where('ownerId', '==', currentOwner.id));
    const unsubBuses = onSnapshot(busesQuery, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Bus));
      setBuses(list);
    });

    const driversQuery = query(collection(db, 'drivers'), where('ownerId', '==', currentOwner.id));
    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Driver));
      setDrivers(list);
    });

    const routesQuery = query(collection(db, 'routes'), where('ownerId', '==', currentOwner.id));
    const unsubRoutes = onSnapshot(routesQuery, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as RouteItem));
      setRoutes(list);
    });

    return () => {
      unsubOwner();
      unsubBuses();
      unsubDrivers();
      unsubRoutes();
    };
  }, [currentOwner?.id]);

  const handleLoginSuccess = (owner: OwnerProfile) => {
    setCurrentOwner(owner);
    saveLocalOwner(owner);
    setActiveTab('overview');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out notice:", err);
    }
    saveLocalOwner(null);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    setCurrentOwner(null);
  };

  const handleAccountDeleted = () => {
    saveLocalOwner(null);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    setCurrentOwner(null);
    setActiveTab('overview');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 bg-slate-900 dark:bg-neutral-900 text-white dark:text-amber-400 flex items-center justify-center font-extrabold text-2xl mb-4 rounded-xl border border-slate-800 dark:border-neutral-800 shadow-md">
          TZ
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono uppercase text-slate-600 dark:text-neutral-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
          <span>Connecting to Tranzit Fleet OS...</span>
        </div>
      </div>
    );
  }

  if (!currentOwner) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  const isSaaS = currentOwner.planType === 'SaaS';

  const maintenanceAlertsCount = buses.filter(b => {
    const status = getServiceStatus(b.nextServiceDue);
    return status === 'Overdue' || status === 'Due';
  }).length;

  const driverAlertsCount = drivers.filter(d => {
    return getLicenseValidityInfo(d.licenseExpiryDate).isUrgent;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-neutral-100 flex font-sans selection:bg-amber-500/20 transition-colors">
      {/* Enterprise Sidebar Navigation */}
      <Sidebar
        owner={currentOwner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenProfileModal={() => setIsEditProfileOpen(true)}
        onOpenReportsModal={() => setIsReportsModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        maintenanceAlertsCount={maintenanceAlertsCount}
        driverAlertsCount={driverAlertsCount}
      />

      {/* Main App Content Canvas */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 transition-all">
        {/* Sticky Top Header */}
        <Header
          owner={currentOwner}
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenProfileModal={() => setIsEditProfileOpen(true)}
          onOpenReportsModal={() => setIsReportsModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
          onLogout={handleLogout}
          onNavigateTab={setActiveTab}
        />

        {/* Tab Module Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-24 bg-white/60 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400 mb-2" />
                <span className="font-mono text-xs uppercase tracking-wider text-slate-600 dark:text-neutral-400 font-bold">
                  Loading Fleet Module...
                </span>
              </div>
            }
          >
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

            {activeTab === 'drivers' && (
              <DriversView owner={currentOwner} />
            )}

            {activeTab === 'fuel-perks' && (
              <FuelPerksView owner={currentOwner} />
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                owner={currentOwner} 
                onAccountDeleted={handleAccountDeleted}
                onOpenReportsModal={() => setIsReportsModalOpen(true)}
                onNavigateTab={setActiveTab}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'subscription' && (
              <SubscriptionView 
                owner={currentOwner} 
                onNavigateTab={setActiveTab}
                onPlanUpdated={(updatedFields) => {
                  setCurrentOwner(prev => prev ? { ...prev, ...updatedFields } : null);
                }}
              />
            )}

            {activeTab === 'admin-pricing' && (
              <AdminPricingSettingsView 
                owner={currentOwner} 
                onNavigateTab={setActiveTab}
              />
            )}
          </Suspense>
        </main>

        {/* Operational Footer */}
        <footer className="bg-white dark:bg-[#0A0A0A] border-t border-slate-200 dark:border-neutral-800 py-5 mt-auto text-xs font-mono text-slate-500 dark:text-neutral-400 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 dark:text-neutral-100">TRANZIT OS</span>
              <span>•</span>
              <span>Private Bus Operations Platform India</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Synced</span>
              </span>
              <span>{currentOwner.companyName} ({currentOwner.planType})</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      {isEditProfileOpen && (
        <EditProfileModal
          owner={currentOwner}
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          onAccountDeleted={() => {
            saveLocalOwner(null);
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch (e) {}
            setCurrentOwner(null);
          }}
          onLogout={handleLogout}
        />
      )}

      {isReportsModalOpen && (
        <ReportsModal
          owner={currentOwner}
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
        />
      )}

      {/* Command Palette / Spotlight Search */}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          owner={currentOwner}
          buses={buses}
          drivers={drivers}
          routes={routes}
          onNavigateTab={setActiveTab}
          onOpenReportsModal={() => {
            setIsCommandPaletteOpen(false);
            setIsReportsModalOpen(true);
          }}
          onOpenProfileModal={() => {
            setIsCommandPaletteOpen(false);
            setIsEditProfileOpen(true);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Keyboard Shortcuts Cheat Sheet */}
      {isShortcutsOpen && (
        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          isSaaS={currentOwner.planType === 'SaaS'}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
