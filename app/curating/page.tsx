'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CuratingPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const input = sessionStorage.getItem('curating_input');
    if (!input) {
      router.replace('/create');
      return;
    }

    fetch('/api/curate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create list');
        return res.json();
      })
      .then(({ id }) => {
        sessionStorage.removeItem('curating_input');
        router.replace(`/lists/${id}`);
      })
      .catch(() => {
        router.replace('/create?error=1');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 px-6">
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute w-36 h-36 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="relative w-28 h-28 flex items-center justify-center border-2 border-blue-500/30 rounded-full">
          <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />
          <span
            className="material-symbols-outlined text-blue-600 text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            explore
          </span>
        </div>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Creating your map...</h1>
      <p className="text-slate-500 text-sm text-center max-w-xs">
        We&apos;ll extract, geocode, and save your places. You can follow along on the next screen.
      </p>
    </div>
  );
}
