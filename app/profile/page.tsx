'use client';

import { Settings, ChevronRight, User, Bell, Link as LinkIcon, Lock, LogOut, DollarSign, Shield, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { useSession, signOut, authClient } from '@/lib/auth-client';

export default function ProfilePage() {
  const router = useRouter();
  const lists = useMapStore((state) => state.lists);
  const { data: session } = useSession();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [monetizationStatus, setMonetizationStatus] = useState('none');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const user = session?.user;

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/users/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setFollowers(data.followers ?? 0);
        setFollowing(data.following ?? 0);
      })
      .catch(() => {});
    fetch('/api/monetization/status')
      .then((r) => r.json())
      .then((d) => setMonetizationStatus(d.status ?? 'none'))
      .catch(() => {});
    fetch('/api/admin/stats')
      .then((r) => { if (r.ok) setIsAdmin(true); })
      .catch(() => {});
  }, [user?.id]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  function openEditProfile() {
    setEditName(user?.name ?? '');
    setShowEditProfile(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) return;
    setSaving(true);
    await authClient.updateUser({ name: editName.trim() });
    setSaving(false);
    setShowEditProfile(false);
  }

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-slate-50 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center h-14 bg-white/90 backdrop-blur-md px-4 justify-between border-b border-slate-100">
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <button className="flex items-center justify-center rounded-full p-2 hover:bg-slate-100 transition-colors">
          <Settings className="w-6 h-6 text-slate-700" />
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full">
        {/* Profile Section */}
        <div className="flex p-6 flex-col items-center">
          <div className="relative group">
            <div className="bg-slate-200 rounded-full h-32 w-32 ring-4 ring-blue-100 flex items-center justify-center overflow-hidden">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-400" />
              )}
            </div>
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold leading-tight">{user?.name ?? 'Traveler'}</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              {user?.email ?? 'Exploring the world one map at a time.'}
            </p>
          </div>
          <div className="flex gap-4 mt-6 w-full max-w-md">
            <button
              onClick={openEditProfile}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-all"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 px-6 py-4 border-y border-slate-200 bg-white">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{followers}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Followers</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{following}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Following</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{lists.length}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Maps</span>
          </div>
        </div>

        {/* Settings Section Header */}
        <div className="px-4 pt-8 pb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Account Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="px-4 pb-8">
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            <button
              onClick={() => setShowAccountDetails(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium">Account Details</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Bell className="w-5 h-5" />
                </div>
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <span className="font-medium">Linked Accounts</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="font-medium">Privacy & Security</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            {monetizationStatus === 'approved' && (
              <Link href="/earnings" className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Earnings</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Admin Dashboard</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            )}
          </div>

          <div className="mt-4 px-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 text-red-500 font-medium p-2 text-sm hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditProfile(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showAccountDetails && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAccountDetails(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Account Details</h2>
              <button onClick={() => setShowAccountDetails(false)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-500">Name</span>
                  <span className="text-sm font-medium">{user?.name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-500">Email</span>
                  <span className="text-sm font-medium">{user?.email ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-500">User ID</span>
                  <span className="text-sm font-mono text-slate-400 truncate max-w-[160px]">{user?.id ?? '—'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAccountDetails(false)}
              className="w-full mt-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
