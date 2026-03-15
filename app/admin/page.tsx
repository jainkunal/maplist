'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, DollarSign } from 'lucide-react';
import { useToast } from '@/components/Toast';

type Tab = 'overview' | 'creators' | 'payouts';

interface Creator {
  id: string;
  name: string;
  email: string;
  monetizationStatus: string;
  createdAt: string;
  _count: { lists: number };
}

interface PayoutRecord {
  id: string;
  userId: string;
  amount: number;
  note: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface Stats {
  totalRevenue: number;
  totalCreatorEarnings: number;
  totalPaidOut: number;
  totalSales: number;
  recentPurchases: { id: string; buyerName: string; listTitle: string; amount: number; creatorShare: number; platformShare: number; createdAt: string }[];
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Payout form state
  const [payoutUserId, setPayoutUserId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/admin/creators').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/admin/payouts').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([s, c, p]) => { setStats(s); setCreators(c); setPayouts(p); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleCreatorAction = async (userId: string, status: 'approved' | 'rejected') => {
    const res = await fetch('/api/admin/creators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    });
    if (res.ok) {
      setCreators((prev) => prev.map((c) => c.id === userId ? { ...c, monetizationStatus: status } : c));
      toast(`Creator ${status}`);
    } else {
      toast('Action failed', 'error');
    }
  };

  const handleRecordPayout = async () => {
    if (!payoutUserId || !payoutAmount) return;
    setSubmittingPayout(true);
    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: payoutUserId, amount: Math.round(parseFloat(payoutAmount) * 100), note: payoutNote }),
    });
    if (res.ok) {
      const payout = await res.json();
      setPayouts((prev) => [{ ...payout, user: creators.find((c) => c.id === payoutUserId) ?? { name: 'Unknown', email: '' } }, ...prev]);
      setPayoutUserId('');
      setPayoutAmount('');
      setPayoutNote('');
      toast('Payout recorded');
    } else {
      toast('Failed to record payout', 'error');
    }
    setSubmittingPayout(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Access denied or failed to load data.</p>
      </div>
    );
  }

  const pendingCreators = creators.filter((c) => c.monetizationStatus === 'pending');
  const approvedCreators = creators.filter((c) => c.monetizationStatus === 'approved');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex items-center h-14 bg-white/90 backdrop-blur-md px-4 border-b border-slate-100">
        <button onClick={() => router.back()} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Admin Dashboard</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {(['overview', 'creators', 'payouts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${
              tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
            }`}
          >
            {t}
            {t === 'creators' && pendingCreators.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingCreators.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Platform Revenue</p>
                <p className="text-xl font-bold text-slate-900">{fmt(stats.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Creator Earnings</p>
                <p className="text-xl font-bold text-slate-900">{fmt(stats.totalCreatorEarnings)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Paid Out</p>
                <p className="text-xl font-bold text-slate-900">{fmt(stats.totalPaidOut)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Sales</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalSales}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Purchases</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {stats.recentPurchases.length === 0 && (
                  <p className="p-4 text-sm text-slate-500 text-center">No purchases yet.</p>
                )}
                {stats.recentPurchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.listTitle}</p>
                      <p className="text-xs text-slate-500">{p.buyerName} &middot; {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-slate-900">{fmt(p.amount)}</p>
                      <p className="text-[10px] text-slate-400">Platform: {fmt(p.platformShare)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Creators Tab */}
        {tab === 'creators' && (
          <>
            {pendingCreators.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Pending Requests</h2>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {pendingCreators.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email} &middot; {c._count.lists} lists &middot; joined {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button
                          onClick={() => handleCreatorAction(c.id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleCreatorAction(c.id, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold transition-colors"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Approved Creators</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {approvedCreators.length === 0 && (
                  <p className="p-4 text-sm text-slate-500 text-center">No approved creators yet.</p>
                )}
                {approvedCreators.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email} &middot; {c._count.lists} lists</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                      Approved
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Payouts Tab */}
        {tab === 'payouts' && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h2 className="font-bold text-slate-900">Record Payout</h2>
              <select
                value={payoutUserId}
                onChange={(e) => setPayoutUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select creator...</option>
                {approvedCreators.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Amount (USD)"
                className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Note (e.g. Bank transfer ref #123)"
                className="w-full rounded-xl border border-slate-200 bg-white h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRecordPayout}
                disabled={submittingPayout || !payoutUserId || !payoutAmount}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {submittingPayout ? 'Recording...' : 'Record Payout'}
              </button>
            </div>

            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payout History</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {payouts.length === 0 && (
                  <p className="p-4 text-sm text-slate-500 text-center">No payouts recorded yet.</p>
                )}
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{p.user.name}</p>
                      <p className="text-xs text-slate-500">{p.note || 'No note'} &middot; {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0 ml-4">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
