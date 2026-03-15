'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Map, List, PlusCircle, User } from 'lucide-react';

const NO_SHELL_ROUTES = ['/', '/login'];

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = NO_SHELL_ROUTES.includes(pathname);

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
      <div className="flex-1 pb-16">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 bg-white/80 backdrop-blur-md px-4 pb-6 pt-2">
        <Link
          href="/explore"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600"
        >
          <Map className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        </Link>
        <Link
          href="/lists"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600"
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">My Lists</span>
        </Link>
        <Link href="/create" className="flex flex-1 flex-col items-center justify-center gap-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <PlusCircle className="w-6 h-6" />
          </div>
        </Link>
        <Link
          href="/profile"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
