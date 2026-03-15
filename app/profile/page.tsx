'use client';

import { Settings, ChevronRight, User, Bell, Link as LinkIcon, Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { useSession, signOut } from '@/lib/auth-client';

export default function ProfilePage() {
  const router = useRouter();
  const lists = useMapStore((state) => state.lists);
  const { data: session } = useSession();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

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
  }, [user?.id]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-slate-50 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Curator Profile</h1>
        </div>
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
            <button className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-all">
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
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
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
    </div>
  );
}
