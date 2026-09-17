import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, PayoutEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { Wallet, ShieldCheck, Calendar, Building2, CheckCircle2, Clock, Sparkles, Plus, Check } from 'lucide-react';

interface LeaseTermsPayoutsViewProps {
  owner: OwnerProfile;
}

export const LeaseTermsPayoutsView: React.FC<LeaseTermsPayoutsViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for adding/simulating payout record
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutDate, setPayoutDate] = useState('2026-11-01');
  const [payoutAmount, setPayoutAmount] = useState<number>(255000);
  const [payoutStatus, setPayoutStatus] = useState<'Paid' | 'Scheduled' | 'Processing'>('Scheduled');

  // Subscribe to buses and payouts in Firestore
  useEffect(() => {
    if (!owner.id) return;

    // Buses Query
    const busesQuery = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQuery, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);
    });

    // Payouts Query
    const payoutsQuery = query(collection(db, 'payouts'), where('ownerId', '==', owner.id));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const list: PayoutEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PayoutEntry);
      });
      // Sort payouts by date descending
      list.sort((a, b) => b.date.localeCompare(a.date));
      setPayouts(list);
      setLoading(false);
    });

    return () => {
      unsubBuses();
      unsubPayouts();
    };
  }, [owner.id]);

  const totalMonthlyLeaseGuarantee = buses.reduce((sum, b) => sum + (b.leaseValue || 85000), 0);

  const handleAddPayoutRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = `p-${Date.now()}`;
    const newPayout: PayoutEntry = {
      id: pid,
      ownerId: owner.id,
      date: payoutDate,
      amount: Number(payoutAmount),
      status: payoutStatus,
      referenceNo: payoutStatus === 'Paid' ? `TXN-${Date.now().toString().slice(-6)}` : `SCH-${payoutDate.replace(/-/g, '')}`,
      bankAccount: "HDFC Bank (•••• 4921)"
    };

    await setDoc(doc(db, 'payouts', pid), newPayout);
    setIsPayoutModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header Banner */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-teal-800 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tranzit Fleet Lease Contract</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F2C] tracking-tight">
            Lease Terms & Guaranteed Payouts
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Tranzit operates your leased vehicles entirely. Fixed monthly payouts are credited directly on the 1st of every month.
          </p>
        </div>

        {/* Guaranteed Monthly Payout Box */}
        <div className="bg-teal-500/10 border border-teal-300 p-4 rounded-xs text-right">
          <span className="text-[10px] font-mono uppercase text-teal-900 block font-bold">
            Total Monthly Fixed Lease Guarantee
          </span>
          <span className="text-2xl font-mono font-bold text-teal-950">
            {formatINR(totalMonthlyLeaseGuarantee || 255000)} / mo
          </span>
        </div>
      </div>

      {/* Leased Buses Table */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-700">
            Leased Bus Contracts ({buses.length})
          </span>
          <span className="text-[11px] font-mono text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-xs border border-teal-300">
            Tranzit Managed Operations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Bus Registration</th>
                <th className="py-3 px-4">Vehicle Model</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Monthly Lease Value</th>
                <th className="py-3 px-4">Lease Renewal Date</th>
                <th className="py-3 px-4 text-right">Contract Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs">
              {buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                    No leased vehicles found in database.
                  </td>
                </tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#1A1F2C]">
                      {bus.regNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {bus.model}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {bus.capacity} Seats
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-900 text-sm">
                      {formatINR(bus.leaseValue || 85000)} / mo
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {bus.renewalDate || '2027-03-31'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs bg-teal-100 text-teal-900 border border-teal-300">
                        Active Lease
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History Table */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-slate-700">
              Payout History & Scheduled Transfers
            </h3>
            <span className="text-[11px] text-slate-500">Direct NEFT/RTGS bank transfers</span>
          </div>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-mono uppercase font-bold rounded-xs transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payout Record</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Payout Date</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference / Txn #</th>
                <th className="py-3 px-4 text-right">Settlement Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs font-mono">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-[#FBF9F5]">
                  <td className="py-3.5 px-4 font-bold text-[#1A1F2C]">
                    {p.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-900 text-sm">
                    {formatINR(p.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs border flex items-center w-fit space-x-1 ${
                      p.status === 'Paid' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                      p.status === 'Scheduled' ? 'bg-teal-100 text-teal-900 border-teal-300' :
                      'bg-amber-100 text-amber-900 border-amber-300'
                    }`}>
                      {p.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                      {p.status === 'Scheduled' && <Clock className="w-3 h-3 text-teal-700" />}
                      <span>{p.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {p.referenceNo}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600">
                    {p.bankAccount || 'HDFC Bank (•••• 4921)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payout Record Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] max-w-md w-full p-6 rounded-xs shadow-xl animate-in fade-in">
            <h3 className="text-base font-extrabold text-[#1A1F2C] mb-4 pb-2 border-b border-[#E8E4DC]">
              Record Lease Payout Schedule
            </h3>

            <form onSubmit={handleAddPayoutRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Payout Date</label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Payout Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Status</label>
                <select
                  value={payoutStatus}
                  onChange={(e) => setPayoutStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-mono uppercase font-bold rounded-xs"
                >
                  Save Payout Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
