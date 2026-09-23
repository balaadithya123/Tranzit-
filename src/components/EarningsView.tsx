import React, { useState, useEffect } from 'react';
import { OwnerProfile, EarningsEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR, ANOMALY_THRESHOLD_PERCENT, computeWeekdayAnomaly, downloadCSV } from '../lib/utils';
import {
  Wallet,
  TrendingUp,
  QrCode,
  CreditCard,
  Banknote,
  Plus,
  Clock,
  Edit2,
  X,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  Check,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { ReportsModal } from './ReportsModal';
import { StatCard } from './StatCard';

interface EarningsViewProps {
  owner: OwnerProfile;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ owner }) => {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Anomaly explanation modal state
  const [selectedAnomaly, setSelectedAnomaly] = useState<{ entry: EarningsEntry; anomaly: ReturnType<typeof computeWeekdayAnomaly> } | null>(null);

  // Settlement Edit Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [editTodayRev, setEditTodayRev] = useState<number>(owner.todayRevenue || 0);
  const [editWalletBal, setEditWalletBal] = useState<number>(owner.walletBalance || 0);
  const [editNextPayoutDate, setEditNextPayoutDate] = useState<string>(owner.nextPayoutDate || '');
  const [editNextPayoutAmount, setEditNextPayoutAmount] = useState<number>(owner.nextPayoutAmount || 0);

  // New Earnings Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashVal, setCashVal] = useState<number>(0);
  const [upiVal, setUpiVal] = useState<number>(0);
  const [cardVal, setCardVal] = useState<number>(0);

  // Keep modal state in sync with owner props when owner changes
  useEffect(() => {
    setEditTodayRev(owner.todayRevenue || 0);
    setEditWalletBal(owner.walletBalance || 0);
    setEditNextPayoutDate(owner.nextPayoutDate || '');
    setEditNextPayoutAmount(owner.nextPayoutAmount || 0);
  }, [owner]);

  // Subscribe to earnings in Firestore
  useEffect(() => {
    if (!owner.id) return;

    const q = query(collection(db, 'earnings'), where('ownerId', '==', owner.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: EarningsEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as EarningsEntry);
      });
      list.sort((a, b) => a.date.localeCompare(b.date));
      setEarnings(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [owner.id]);

  // Calculations
  const runningWeeklyTotal = earnings.reduce((sum, item) => sum + (item.ticketRevenue || 0), 0);
  const totalCash = earnings.reduce((sum, item) => sum + (item.cashAmount || 0), 0);
  const totalUpi = earnings.reduce((sum, item) => sum + (item.upiAmount || 0), 0);
  const totalCard = earnings.reduce((sum, item) => sum + (item.cardAmount || 0), 0);

  const totalChannelsSum = totalCash + totalUpi + totalCard || 1;
  const cashPct = Math.round((totalCash / totalChannelsSum) * 100);
  const upiPct = Math.round((totalUpi / totalChannelsSum) * 100);
  const cardPct = Math.round((totalCard / totalChannelsSum) * 100);

  // Max value for bar chart height scaling
  const maxRevenueDay = Math.max(...earnings.map(e => e.ticketRevenue), 60000);

  const handleSaveEarningsLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const entryId = `e-${logDate}`;
    const totalRev = Number(cashVal) + Number(upiVal) + Number(cardVal);

    const existingEntry = earnings.find(item => item.date === logDate);
    const oldRevenue = existingEntry ? (existingEntry.ticketRevenue || 0) : 0;
    const revenueDelta = totalRev - oldRevenue;

    const dayName = new Date(logDate).toLocaleDateString('en-US', { weekday: 'short' });

    const newEntry: EarningsEntry = {
      id: entryId,
      ownerId: owner.id,
      day: dayName,
      date: logDate,
      ticketRevenue: totalRev,
      cashAmount: Number(cashVal),
      upiAmount: Number(upiVal),
      cardAmount: Number(cardVal)
    };

    await setDoc(doc(db, 'earnings', entryId), newEntry);

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = logDate === todayStr;

    const currentWallet = owner.walletBalance || 0;
    const updatedWallet = Math.max(0, currentWallet + revenueDelta);

    const ownerUpdate: Record<string, any> = {
      walletBalance: updatedWallet,
      nextPayoutAmount: updatedWallet
    };

    if (isToday) {
      ownerUpdate.todayRevenue = totalRev;
    }

    await updateDoc(doc(db, 'owners', owner.id), ownerUpdate);
    setIsLogModalOpen(false);
  };

  // Lock background body scroll when modals are open
  useEffect(() => {
    if (isSettlementModalOpen || isLogModalOpen || selectedAnomaly) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSettlementModalOpen, isLogModalOpen, selectedAnomaly]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Route',
      'Ticket Revenue (INR)',
      'Pass Revenue (INR)',
      'Fuel Cost (INR)',
      'Net Payout (INR)'
    ];

    const rows = earnings.map((e) => {
      const route = e.route || `${owner.city || 'Bengaluru'} Depot Commuter Route`;
      const passRevenue = e.passRevenue ?? Math.round(e.ticketRevenue * 0.15);
      const fuelCost = e.fuelCost ?? Math.round(e.ticketRevenue * 0.22);
      const netPayout = e.netPayout ?? (e.ticketRevenue + passRevenue - fuelCost);

      return [
        e.date,
        route,
        e.ticketRevenue,
        passRevenue,
        fuelCost,
        netPayout
      ];
    });

    downloadCSV(`tranzit_earnings_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDoc(doc(db, 'owners', owner.id), {
      todayRevenue: Number(editTodayRev),
      walletBalance: Number(editWalletBal),
      nextPayoutDate: editNextPayoutDate,
      nextPayoutAmount: Number(editNextPayoutAmount)
    });
    setIsSettlementModalOpen(false);
  };

  const handleRequestPayoutNow = async () => {
    const currentBal = owner.walletBalance || 0;
    if (currentBal <= 0) {
      alert("Wallet balance is zero. No funds to payout.");
      return;
    }

    if (!window.confirm(`Initiate instant payout of ₹${currentBal.toLocaleString('en-IN')} to your verified bank account?`)) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await updateDoc(doc(db, 'owners', owner.id), {
      walletBalance: 0,
      nextPayoutAmount: 0,
      lastPayoutDate: todayStr,
      lastPayoutAmount: currentBal
    });

    alert(`Success! ₹${currentBal.toLocaleString('en-IN')} payout initiated to your registered bank account.`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
            Revenue & Carrier Settlements
          </h1>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto flex-wrap gap-y-2">
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>PDF Statement</span>
          </button>

          <button
            onClick={() => setIsSettlementModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Adjust Balance</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Log Daily Revenue</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: TOP STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Collections"
          value={formatINR(owner.todayRevenue || 0)}
          subtext="Conductor cash & UPI live sync"
          icon={Banknote}
        />
        <StatCard
          label="Carrier Wallet Balance"
          value={formatINR(owner.walletBalance || 0)}
          subtext={`Next payout: ${owner.nextPayoutDate || 'Automated weekly'}`}
          icon={Wallet}
        />
        <StatCard
          label="7-Day Revenue Sum"
          value={formatINR(runningWeeklyTotal)}
          subtext="Aggregated across active routes"
          icon={TrendingUp}
        />
        <StatCard
          label="Settlement Channel"
          value={`${upiPct}% UPI`}
          subtext={`${cashPct}% Cash • ${cardPct}% POS Card`}
          icon={QrCode}
        />
      </div>

      {/* SECTION 3: 7-DAY REVENUE CHART */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-5 sm:p-6 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              7-Day Revenue Trends & Daily Volume
            </h3>
            <span className="text-xs text-slate-500 dark:text-neutral-400">Daily collections breakdown with anomaly detection</span>
          </div>

          <button
            onClick={handleRequestPayoutNow}
            disabled={(owner.walletBalance || 0) <= 0}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Instant Payout
          </button>
        </div>

        {earnings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            No daily collections logged yet.
          </div>
        ) : (
          <div className="h-56 pt-6 flex items-end justify-between space-x-2 sm:space-x-4 border-b border-slate-100 dark:border-neutral-800">
            {earnings.map((entry) => {
              const heightPercent = Math.min(100, Math.max(15, (entry.ticketRevenue / maxRevenueDay) * 100));
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-mono z-10 whitespace-nowrap shadow-md pointer-events-none border border-slate-800">
                    <div>{entry.date} ({entry.day})</div>
                    <div className="text-blue-400 font-bold">{formatINR(entry.ticketRevenue)}</div>
                  </div>

                  {/* Amount above bar */}
                  <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-neutral-300 mb-1 hidden sm:block">
                    ₹{(entry.ticketRevenue / 1000).toFixed(1)}k
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[48px] bg-blue-600 hover:bg-blue-500 transition-all rounded-t-lg"
                  />

                  {/* Day Label */}
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-2">
                    {entry.day}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:block">
                    {entry.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: PAYMENT CHANNEL BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UPI */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500 dark:text-neutral-400">
              UPI Dynamic QR
            </span>
            <QrCode className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
            {formatINR(totalUpi)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{upiPct}% share</span>
            <span className="text-emerald-600 font-bold">Instant Bank Settlement</span>
          </div>
        </div>

        {/* Conductor Cash */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500 dark:text-neutral-400">
              Conductor Cash
            </span>
            <Banknote className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
            {formatINR(totalCash)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{cashPct}% share</span>
            <span className="text-amber-600 font-bold">Daily Depot Remittance</span>
          </div>
        </div>

        {/* Card POS */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500 dark:text-neutral-400">
              Smart Transit Card
            </span>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
            {formatINR(totalCard)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{cardPct}% share</span>
            <span className="text-blue-600 font-bold">T+1 Auto Clear</span>
          </div>
        </div>
      </div>

      {/* SECTION 5: DETAILED REVENUE TABLE */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Daily Collections Ledger ({earnings.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Verified fare receipts & digital splits</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Date & Day</th>
                <th className="py-3 px-4">Cash</th>
                <th className="py-3 px-4">UPI QR</th>
                <th className="py-3 px-4">Card POS</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-mono">
              {earnings.map((e) => {
                const anomaly = computeWeekdayAnomaly(e, earnings, ANOMALY_THRESHOLD_PERCENT);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span>{e.date}</span>
                        <span className="text-slate-400 font-normal">({e.day})</span>
                        {anomaly.isAnomaly && (
                          <button
                            type="button"
                            onClick={() => setSelectedAnomaly({ entry: e, anomaly })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>-{anomaly.percentDrop}%</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-amber-700 dark:text-amber-400 font-medium">
                      {formatINR(e.cashAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                      {formatINR(e.upiAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-blue-700 dark:text-blue-400 font-medium">
                      {formatINR(e.cardAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(e.ticketRevenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST SETTLEMENT MODAL */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-md w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Adjust Settlement Balances
              </h3>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Collected Today (₹)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editTodayRev}
                  onChange={(e) => setEditTodayRev(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Carrier Wallet Balance (₹)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editWalletBal}
                  onChange={(e) => setEditWalletBal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Next Payout Date
                  </label>
                  <input
                    type="date"
                    value={editNextPayoutDate}
                    onChange={(e) => setEditNextPayoutDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Payout Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editNextPayoutAmount}
                    onChange={(e) => setEditNextPayoutAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG REVENUE MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-md w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Log Daily Collections
              </h3>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEarningsLog} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Conductor Cash (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cashVal}
                    onChange={(e) => setCashVal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    UPI Dynamic QR (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={upiVal}
                    onChange={(e) => setUpiVal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Transit Card POS (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cardVal}
                    onChange={(e) => setCardVal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-mono flex items-center justify-between text-blue-900 dark:text-blue-300">
                <span>Total Computed:</span>
                <span className="font-bold text-sm">
                  {formatINR(Number(cashVal) + Number(upiVal) + Number(cardVal))}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Submit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANOMALY MODAL */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-md w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2 text-amber-600 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold font-sans">Revenue Drop Detected</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-neutral-300 leading-relaxed font-sans">
                On <strong>{selectedAnomaly.entry.date} ({selectedAnomaly.entry.day})</strong>, total collection was{' '}
                <strong className="text-slate-900 dark:text-white">{formatINR(selectedAnomaly.entry.ticketRevenue)}</strong>, which is{' '}
                <strong className="text-amber-600">{selectedAnomaly.anomaly.percentDrop}% lower</strong> than your average{' '}
                {selectedAnomaly.entry.day} collection of {formatINR(selectedAnomaly.anomaly.historicalAvg)}.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 font-mono space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Actual Revenue:</span>
                  <span className="font-bold">{formatINR(selectedAnomaly.entry.ticketRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Historical Avg:</span>
                  <span className="font-bold">{formatINR(selectedAnomaly.anomaly.historicalAvg)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        defaultReportType="earnings"
      />
    </div>
  );
};
