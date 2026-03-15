'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

interface Props {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowers?: number;
  onFollowersChange?: (count: number) => void;
}

export default function FollowButton({ userId, initialIsFollowing, initialFollowers, onFollowersChange }: Props) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [followers, setFollowers] = useState(initialFollowers ?? 0);
  const [loading, setLoading] = useState(initialIsFollowing === undefined);

  useEffect(() => {
    if (initialIsFollowing !== undefined) return;
    fetch(`/api/users/${userId}/follow`)
      .then((r) => r.json())
      .then((data) => {
        setIsFollowing(data.isFollowing);
        setFollowers(data.followers);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId, initialIsFollowing]);

  if (isPending || loading) return <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />;

  async function handleClick() {
    if (!session) {
      router.push('/login');
      return;
    }

    const method = isFollowing ? 'DELETE' : 'POST';
    setIsFollowing(!isFollowing);

    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      const data = await res.json();
      setFollowers(data.followers);
      onFollowersChange?.(data.followers);
    } else {
      setIsFollowing(isFollowing); // revert on error
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
        isFollowing
          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
