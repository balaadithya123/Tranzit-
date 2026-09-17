import React, { useState, useEffect } from 'react';
import { OwnerProfile, EarningsEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { Wallet, TrendingUp, QrCode, CreditCard, Banknote, Plus, Calendar, Check, ArrowUpRight, DollarSign, Clock, Edit2, X } from 'lucide-react';

interface EarningsViewProps {
  owner: OwnerProfile;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ owner }) => {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Settlement Edit Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [editTodayRev, setEditTodayRev] = useState<number>(owner.todayRevenue || 48250);
  const [editWalletBal, setEditWalletBal] = useState<number>(owner.walletBalance || 185400);
  const [editNextPayoutDate, setEditNextPayoutDate] = useState<string>(owner.nextPayoutDate || '2026-09-20');
  const [editNextPayoutAmount, setEditNextPayoutAmount] = useState<number>(owner.nextPayoutAmount || owner.walletBalance || 185400);

  // New Earnings Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashVal, setCashVal] = useState<number>(14000);
  const [upiVal, setUpiVal] = useState<number>(28500);
  const [cardVal, setCardVal] = useState<number>(6000);

  // Keep modal state in sync with owner props when owner changes
  useEffect(() => {
    setEditTodayRev(owner.todayRevenue || 48250);
    setEditWalletBal(owner.walletBalance || 185400);
    setEditNextPayoutDate(owner.nextPayoutDate || '2026-09-20');
    setEditNextPayoutAmount(owner.nextPayoutAmount || owner.walletBalance || 185400);
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
      // Sort by date
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

    // Update today's revenue and add to wallet balance in owner profile
    const currentWallet = owner.walletBalance || 185400;
    await updateDoc(doc(db, 'owners', owner.id), {
      todayRevenue: totalRev,
      walletBalance: currentWallet + totalRev,
      nextPayoutAmount: currentWallet + totalRev
    });

    setIsLogModalOpen(false);
  };

  // Lock background body scroll when modals are open
  useEffect(() => {
    if (isSettlementModalOpen || isLogModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSettlementModalOpen, isLogModalOpen]);

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
    const currentBal = owner.walletBalance || 185400;
    if (currentBal <= 0) return;
    
    // Process instant payout simulation into Firestore
    await updateDoc(doc(db, 'owners', owner.id), {
      walletBalance: 0,
      nextPayoutAmount: 0,
      nextPayoutDate: 'Paid Out Today'
    });
    alert(`Success! ₹${currentBal.toLocaleString('en-IN')} payout initiated to your registered bank account.`);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Title Bar */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-800 uppercase tracking-widest mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>SaaS Financial & Settlement Models</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F2C] tracking-tight">
            Revenue & Wallet Settlement
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Compare real daily ticket revenue collection versus running wallet escrow settlement. Both values sync live with Firestore.
          </p>
        </div>

        <button
          onClick={() => setIsSettlementModalOpen(true)}
          className="px-3.5 py-2 border border-[#E8E4DC] bg-[#FBF9F5] hover:bg-white text-slate-700 text-xs font-mono uppercase font-bold rounded-xs flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Edit2 className="w-3.5 h-3.5 text-amber-700" />
          <span>Adjust Settlement Data</span>
        </button>
      </div>

      {/* Requirement 2: Two Summary Figures Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Figure 1: Collected Today */}
        <div className="bg-white border border-[#E8E4DC] border-l-4 border-l-amber-600 p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-amber-900">
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>Model A: Daily Fare Settlement</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-xs">
              Live Firestore
            </span>
          </div>

          <div className="text-xs text-slate-500 uppercase font-mono tracking-wider font-semibold">
            Collected Today (Literal Ticket Revenue)
          </div>

          <div className="text-3xl font-mono font-extrabold text-[#1A1F2C] mt-1 mb-2">
            {formatINR(owner.todayRevenue || 0)}
          </div>

          <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between text-xs text-slate-600">
            <span className="font-sans">Literal ticket sales recorded across today's active bus routes.</span>
            <span className="font-mono font-bold text-amber-800 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% vs avg</span>
            </span>
          </div>
        </div>

        {/* Figure 2: Wallet Balance */}
        <div className="bg-white border border-[#E8E4DC] border-l-4 border-l-emerald-600 p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-emerald-900">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Model B: Running Wallet Escrow</span>
            </div>
            <button
              onClick={handleRequestPayoutNow}
              disabled={(owner.walletBalance || 0) <= 0}
              className="text-[10px] font-mono font-bold uppercase bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-2.5 py-1 rounded-xs transition-colors"
            >
              Payout Now
            </button>
          </div>

          <div className="text-xs text-slate-500 uppercase font-mono tracking-wider font-semibold">
            Wallet Balance (Pending Settlement)
          </div>

          <div className="text-3xl font-mono font-extrabold text-[#1A1F2C] mt-1 mb-2">
            {formatINR(owner.walletBalance || 185400)}
          </div>

          <div className="pt-3 border-t border-[#E8E4DC] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1 font-mono text-slate-600">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Next Payout: <strong className="text-[#1A1F2C]">{owner.nextPayoutDate || '2026-09-20'}</strong></span>
            </div>
            <div className="font-mono font-bold text-emerald-800">
              Amount: {formatINR(owner.nextPayoutAmount || owner.walletBalance || 185400)}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E8E4DC]">
          <div>
            <h3 className="text-sm font-bold font-mono text-[#1A1F2C] uppercase">
              7-Day Ticket Revenue Readout
            </h3>
            <span className="text-xs text-slate-500">Daily passenger fare collections breakdown</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right font-mono">
              <span className="text-[10px] uppercase text-slate-500 block">7-Day Sum</span>
              <span className="text-xs font-bold text-amber-900">{formatINR(runningWeeklyTotal)}</span>
            </div>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#1A1F2C] text-white hover:bg-[#0F131D] text-xs font-mono uppercase font-bold rounded-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Daily Revenue</span>
            </button>
          </div>
        </div>

        {/* Custom SVG / HTML Bar Chart */}
        <div className="h-56 pt-6 flex items-end justify-between space-x-2 sm:space-x-4 border-b border-[#E8E4DC]">
          {earnings.map((entry) => {
            const heightPercent = Math.min(100, Math.max(15, (entry.ticketRevenue / maxRevenueDay) * 100));
            return (
              <div key={entry.id} className="flex-1 flex flex-col items-center group relative">
                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-[#1A1F2C] text-[#FBF9F5] px-2.5 py-1 rounded-xs text-[11px] font-mono z-10 whitespace-nowrap shadow-md pointer-events-none">
                  <div>{entry.date} ({entry.day})</div>
                  <div className="text-amber-400 font-bold">{formatINR(entry.ticketRevenue)}</div>
                </div>

                {/* Amount on top of bar */}
                <span className="text-[10px] font-mono font-bold text-amber-900 mb-1 hidden sm:block">
                  ₹{(entry.ticketRevenue / 1000).toFixed(1)}k
                </span>

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[48px] bg-amber-500 hover:bg-amber-600 transition-all border-t border-x border-amber-600 rounded-t-xs"
                />

                {/* Day Label */}
                <span className="text-xs font-mono font-semibold text-[#1A1F2C] mt-2">
                  {entry.day}
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:block">
                  {entry.date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Channel Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UPI / Digital QR */}
        <div className="bg-white border border-[#E8E4DC] border-t-2 border-t-emerald-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600">
              UPI & Online QR
            </span>
            <QrCode className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {formatINR(totalUpi)}
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8E4DC] flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{upiPct}% of total</span>
            <span className="text-emerald-700 font-bold">Direct Bank Settlement</span>
          </div>
        </div>

        {/* Conductor Cash */}
        <div className="bg-white border border-[#E8E4DC] border-t-2 border-t-amber-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600">
              Conductor Cash
            </span>
            <Banknote className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {formatINR(totalCash)}
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8E4DC] flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{cashPct}% of total</span>
            <span className="text-amber-800 font-bold">Daily Depot Deposit</span>
          </div>
        </div>

        {/* Card POS */}
        <div className="bg-white border border-[#E8E4DC] border-t-2 border-t-indigo-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase font-bold text-slate-600">
              Card POS Terminals
            </span>
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {formatINR(totalCard)}
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8E4DC] flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{cardPct}% of total</span>
            <span className="text-indigo-800 font-bold">T+1 Settlement</span>
          </div>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-700">
            Daily Collections Ledger ({earnings.length} Entries)
          </span>
          <span className="text-[11px] font-mono text-slate-500">Firestore `earnings` collection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Date & Day</th>
                <th className="py-3 px-4">Cash Collection</th>
                <th className="py-3 px-4">UPI QR Revenue</th>
                <th className="py-3 px-4">Card POS</th>
                <th className="py-3 px-4 text-right">Daily Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs font-mono">
              {earnings.map((e) => (
                <tr key={e.id} className="hover:bg-[#FBF9F5]">
                  <td className="py-3.5 px-4 font-bold text-[#1A1F2C]">
                    {e.date} <span className="text-slate-400 uppercase">({e.day})</span>
                  </td>
                  <td className="py-3.5 px-4 text-amber-900 font-medium">
                    {formatINR(e.cashAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-900 font-medium">
                    {formatINR(e.upiAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-indigo-900 font-medium">
                    {formatINR(e.cardAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-base text-[#1A1F2C]">
                    {formatINR(e.ticketRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Settlement Data Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E8E4DC] max-w-md w-full max-h-[90vh] flex flex-col rounded-xs shadow-xl animate-in fade-in overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E8E4DC] flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#1A1F2C]">
                Adjust Settlement Figures (Firestore)
              </h3>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                    Collected Today (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editTodayRev}
                    onChange={(e) => setEditTodayRev(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                    Wallet Balance (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editWalletBal}
                    onChange={(e) => setEditWalletBal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                      Next Payout Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editNextPayoutDate}
                      onChange={(e) => setEditNextPayoutDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                      Next Payout Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editNextPayoutAmount}
                      onChange={(e) => setEditNextPayoutAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 p-4 bg-[#FBF9F5] border-t border-[#E8E4DC] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A1F2C] text-white hover:bg-[#0F131D] text-xs font-mono uppercase font-bold rounded-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Update Firestore Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Daily Revenue Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] max-w-md w-full p-6 rounded-xs shadow-xl animate-in fade-in">
            <h3 className="text-base font-extrabold text-[#1A1F2C] mb-4 pb-2 border-b border-[#E8E4DC]">
              Log Ticket Revenue Entry
            </h3>

            <form onSubmit={handleSaveEarningsLog} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Conductor Cash Collection (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cashVal}
                  onChange={(e) => setCashVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">UPI QR Ticket Revenue (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={upiVal}
                  onChange={(e) => setUpiVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Card POS Revenue (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cardVal}
                  onChange={(e) => setCardVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div className="p-3 bg-[#1A1F2C] text-[#FBF9F5] rounded-xs flex items-center justify-between font-mono">
                <span className="text-xs uppercase text-slate-300">Total Entry Amount</span>
                <span className="text-xl font-bold text-amber-400">
                  {formatINR(Number(cashVal) + Number(upiVal) + Number(cardVal))}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono uppercase font-bold rounded-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
