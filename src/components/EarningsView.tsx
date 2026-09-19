import React, { useState, useEffect } from 'react';
import { OwnerProfile, EarningsEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR, ANOMALY_THRESHOLD_PERCENT, computeWeekdayAnomaly, downloadCSV } from '../lib/utils';
import { Wallet, TrendingUp, QrCode, CreditCard, Banknote, Plus, Clock, Edit2, X, Download, AlertTriangle, FileSpreadsheet, Info, Check } from 'lucide-react';
import { ReportsModal } from './ReportsModal';

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

    const sanitizedName = (owner.companyName || owner.name || 'fleet').replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(`tranzit-earnings-${sanitizedName}-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
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
    if (currentBal <= 0) return;
    
    await updateDoc(doc(db, 'owners', owner.id), {
      walletBalance: 0,
      nextPayoutAmount: 0,
      nextPayoutDate: 'Paid Out Today'
    });
    alert(`Success! ₹${currentBal.toLocaleString('en-IN')} payout initiated to your registered bank account.`);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5 font-bold">
            <Wallet className="w-3.5 h-3.5" />
            <span>Earnings</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Revenue & Settlements
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Daily fare collections and wallet balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3.5 py-2 border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-mono uppercase font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => setIsSettlementModalOpen(true)}
            className="px-3.5 py-2 border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Adjust Balances</span>
          </button>
        </div>
      </div>

      {/* Two Summary Figures Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Figure 1: Collected Today */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 border-l-4 border-l-amber-600 p-6 rounded-xl shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-amber-800 dark:text-amber-400">
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>Daily Collections</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
              Live
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-mono tracking-wider font-semibold">
            Collected Today
          </div>

          <div className="text-3xl font-mono font-extrabold text-slate-900 dark:text-neutral-100 mt-1 mb-2">
            {formatINR(owner.todayRevenue || 0)}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-600 dark:text-neutral-400">
            <span className="font-sans">Today's ticket sales</span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% vs avg</span>
            </span>
          </div>
        </div>

        {/* Figure 2: Wallet Balance */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 border-l-4 border-l-emerald-600 p-6 rounded-xl shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-emerald-800 dark:text-emerald-400">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Wallet Settlement</span>
            </div>
            <button
              onClick={handleRequestPayoutNow}
              disabled={(owner.walletBalance || 0) <= 0}
              className="text-[10px] font-mono font-bold uppercase bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Payout Now
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-mono tracking-wider font-semibold">
            Wallet Balance
          </div>

          <div className="text-3xl font-mono font-extrabold text-slate-900 dark:text-neutral-100 mt-1 mb-2">
            {formatINR(owner.walletBalance || 0)}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1 font-mono text-slate-600 dark:text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Next Payout: <strong className="text-slate-900 dark:text-neutral-100">{owner.nextPayoutDate || 'Not scheduled yet'}</strong></span>
            </div>
            <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              Amount: {formatINR(owner.nextPayoutAmount || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-neutral-100 uppercase">
              7-Day Revenue
            </h3>
            <span className="text-xs text-slate-500 dark:text-neutral-400">Daily collections breakdown</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right font-mono">
              <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block">7-Day Sum</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{formatINR(runningWeeklyTotal)}</span>
            </div>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-neutral-900 dark:text-neutral-100 hover:bg-slate-800 dark:hover:bg-neutral-800 border border-slate-700 dark:border-neutral-700 text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Revenue</span>
            </button>
          </div>
        </div>

        {/* Custom Bar Visualizer */}
        {earnings.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-lg">
            <Banknote className="w-8 h-8 text-slate-300 dark:text-neutral-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
              No revenue entries recorded yet. Click &apos;Log Revenue&apos; to record daily collections.
            </p>
          </div>
        ) : (
          <div className="h-56 pt-6 flex items-end justify-between space-x-2 sm:space-x-4 border-b border-slate-200 dark:border-neutral-800">
            {earnings.map((entry) => {
              const heightPercent = Math.min(100, Math.max(15, (entry.ticketRevenue / maxRevenueDay) * 100));
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center group relative">
                  {/* Hover Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-black text-white px-2.5 py-1 rounded-md text-[11px] font-mono z-10 whitespace-nowrap shadow-md pointer-events-none border border-neutral-800">
                    <div>{entry.date} ({entry.day})</div>
                    <div className="text-amber-400 font-bold">{formatINR(entry.ticketRevenue)}</div>
                  </div>

                  {/* Amount on top of bar */}
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 mb-1 hidden sm:block">
                    ₹{(entry.ticketRevenue / 1000).toFixed(1)}k
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[48px] bg-amber-500 hover:bg-amber-600 transition-all border-t border-x border-amber-600 rounded-t-md"
                  />

                  {/* Day Label */}
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-neutral-200 mt-2">
                    {entry.day}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 hidden sm:block">
                    {entry.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Channel Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UPI / Digital QR */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 border-t-2 border-t-emerald-600 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-neutral-400">
              UPI & Online QR
            </span>
            <QrCode className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-neutral-100">
            {formatINR(totalUpi)}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{upiPct}% of total</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Direct Bank Settlement</span>
          </div>
        </div>

        {/* Conductor Cash */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 border-t-2 border-t-amber-600 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-neutral-400">
              Conductor Cash
            </span>
            <Banknote className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-neutral-100">
            {formatINR(totalCash)}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{cashPct}% of total</span>
            <span className="text-amber-800 dark:text-amber-300 font-bold">Daily Depot Deposit</span>
          </div>
        </div>

        {/* Card POS */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 border-t-2 border-t-indigo-600 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600 dark:text-neutral-400">
              Card POS Terminals
            </span>
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 dark:text-neutral-100">
            {formatINR(totalCard)}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>{cardPct}% of total</span>
            <span className="text-indigo-800 dark:text-indigo-300 font-bold">T+1 Settlement</span>
          </div>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200 block">
              Collections Ledger ({earnings.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">Recorded transactions</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 hover:border-slate-800 text-slate-700 dark:text-neutral-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Export Collections as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsReportsModalOpen(true)}
              className="px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 hover:border-amber-600 text-slate-700 dark:text-neutral-300 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Date & Day</th>
                <th className="py-3 px-4">Cash</th>
                <th className="py-3 px-4">UPI QR</th>
                <th className="py-3 px-4">Card POS</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-mono">
              {earnings.map((e) => {
                const anomaly = computeWeekdayAnomaly(e, earnings, ANOMALY_THRESHOLD_PERCENT);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-neutral-100">
                      <div className="flex flex-col items-start gap-1">
                        <div>
                          {e.date} <span className="text-slate-400 dark:text-neutral-500 uppercase">({e.day})</span>
                        </div>
                        {anomaly.isAnomaly && (
                          <button
                            type="button"
                            onClick={() => setSelectedAnomaly({ entry: e, anomaly })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60 rounded-md font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                            title="Click to view root cause analysis"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                            <span>-{anomaly.percentDrop}% vs avg</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-amber-900 dark:text-amber-300 font-medium">
                      {formatINR(e.cashAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-900 dark:text-emerald-300 font-medium">
                      {formatINR(e.upiAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-indigo-900 dark:text-indigo-300 font-medium">
                      {formatINR(e.cardAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-base text-slate-900 dark:text-neutral-100">
                      {formatINR(e.ticketRevenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Settlement Data Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-md w-full max-h-[90vh] flex flex-col rounded-xl shadow-xl animate-in fade-in overflow-hidden my-auto text-slate-900 dark:text-neutral-100">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex-shrink-0">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 font-sans">
                Adjust Balances
              </h3>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">
                    Collected Today (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editTodayRev}
                    onChange={(e) => setEditTodayRev(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">
                    Wallet Balance (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editWalletBal}
                    onChange={(e) => setEditWalletBal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">
                      Next Payout Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editNextPayoutDate}
                      onChange={(e) => setEditNextPayoutDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">
                      Next Payout Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editNextPayoutAmount}
                      onChange={(e) => setEditNextPayoutAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 p-4 bg-slate-50 dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-xs font-mono uppercase font-bold rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 dark:bg-amber-600 text-white dark:text-slate-950 font-mono font-bold text-xs uppercase rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Daily Revenue Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-md w-full p-6 rounded-xl shadow-xl animate-in fade-in text-slate-900 dark:text-neutral-100">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 mb-4 pb-2 border-b border-slate-200 dark:border-neutral-800 font-sans">
              Log Revenue
            </h3>

            <form onSubmit={handleSaveEarningsLog} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Conductor Cash Collection (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cashVal}
                  onChange={(e) => setCashVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">UPI QR Ticket Revenue (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={upiVal}
                  onChange={(e) => setUpiVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Card POS Revenue (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cardVal}
                  onChange={(e) => setCardVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-black text-white rounded-lg flex items-center justify-between font-mono border border-neutral-800">
                <span className="text-xs uppercase text-neutral-400">Total Entry Amount</span>
                <span className="text-xl font-bold text-amber-400">
                  {formatINR(Number(cashVal) + Number(upiVal) + Number(cardVal))}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-xs font-mono uppercase font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono uppercase font-bold rounded-lg cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anomaly Root Cause Analysis Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-lg w-full rounded-xl shadow-xl animate-in fade-in overflow-hidden my-auto text-slate-900 dark:text-neutral-100">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 font-sans">
                    Revenue Anomaly Analysis
                  </h3>
                  <p className="text-xs font-mono text-amber-900 dark:text-amber-300 font-bold">
                    {selectedAnomaly.entry.date} ({selectedAnomaly.entry.day})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Variance Stats Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block font-bold">Collected Revenue</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                    {formatINR(selectedAnomaly.entry.ticketRevenue)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block font-bold">4-Wk Weekday Baseline</span>
                  <span className="text-lg font-bold text-slate-700 dark:text-neutral-300">
                    {formatINR(selectedAnomaly.anomaly.expectedAvg)}
                  </span>
                </div>
              </div>

              {/* Alert Callout */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-950 dark:text-amber-200 block">
                    Deficit: -{selectedAnomaly.anomaly.percentDrop}% Below Average
                  </span>
                  <span className="text-[11px] font-mono text-amber-800 dark:text-amber-400">
                    Threshold: &gt;{ANOMALY_THRESHOLD_PERCENT}% drop triggers operational audit
                  </span>
                </div>
                <span className="px-2 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono text-[10px] font-extrabold rounded uppercase">
                  Flagged
                </span>
              </div>

              {/* Potential Root Causes */}
              <div>
                <h4 className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300 mb-2 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Probable Operational Causes</span>
                </h4>
                <ul className="space-y-2 text-xs font-sans text-slate-700 dark:text-neutral-300">
                  <li className="p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg flex items-start space-x-2">
                    <span className="text-base leading-none mt-0.5">🌧️</span>
                    <div>
                      <strong className="text-slate-900 dark:text-neutral-100 block">Severe Weather Event</strong>
                      <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                        Heavy showers or waterlogged corridors suppressed passenger footfall across arterial stops.
                      </span>
                    </div>
                  </li>

                  <li className="p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg flex items-start space-x-2">
                    <span className="text-base leading-none mt-0.5">🛠️</span>
                    <div>
                      <strong className="text-slate-900 dark:text-neutral-100 block">Depot Maintenance & Tripping Loss</strong>
                      <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                        Fleet bus undergoing scheduled overhaul caused truncated or cancelled scheduled trips.
                      </span>
                    </div>
                  </li>

                  <li className="p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg flex items-start space-x-2">
                    <span className="text-base leading-none mt-0.5">📅</span>
                    <div>
                      <strong className="text-slate-900 dark:text-neutral-100 block">Regional Holiday / Long Weekend</strong>
                      <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                        State holiday or school break reduced peak-hour daily office commuters on the route.
                      </span>
                    </div>
                  </li>

                  <li className="p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg flex items-start space-x-2">
                    <span className="text-base leading-none mt-0.5">🚧</span>
                    <div>
                      <strong className="text-slate-900 dark:text-neutral-100 block">Traffic Diversion / Road Works</strong>
                      <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                        Infrastructure works or traffic police barricades forced detours, lowering frequency.
                      </span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAnomaly(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer border border-slate-700 dark:border-neutral-700"
                >
                  Dismiss & Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Statement Export Modal */}
      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        defaultReportType="earnings"
      />
    </div>
  );
};
