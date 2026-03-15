'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Map, List, PlusCircle, User } from 'lucide-react';

const NO_SHELL_ROUTES = ['/', '/login', '/p/'];

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = NO_SHELL_ROUTES.some((r) => pathname === r || pathname.startsWith('/p/'));

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div
      className="bg-slate-50 text-slate-900 antialiased flex flex-col"
      style={{ height: '100dvh' }}
    >
      {/* Scrollable content — nav stays pinned at bottom */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>

      <nav
        className="shrink-0 flex border-t border-slate-200 bg-white px-2 pt-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/explore"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-500 active:text-blue-600"
        >
          <Map className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        </Link>
        <Link
          href="/lists"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-500 active:text-blue-600"
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">My Lists</span>
        </Link>
        <Link href="/create" className="flex flex-1 flex-col items-center justify-center gap-1 py-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <PlusCircle className="w-6 h-6" />
          </div>
        </Link>
        <Link
          href="/profile"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-500 active:text-blue-600"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
