'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Map, List, PlusCircle, User } from 'lucide-react';

const NO_SHELL_ROUTES = ['/', '/login', '/p/'];

const NAV_ITEMS = [
  { href: '/explore', label: 'Explore', icon: Map },
  { href: '/lists', label: 'My Lists', icon: List },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

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
        className="shrink-0 flex items-end border-t border-slate-200 bg-white px-2 pt-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Explore */}
        {NAV_ITEMS.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`relative flex items-center justify-center ${isActive ? 'after:absolute after:-top-1 after:h-0.5 after:w-5 after:rounded-full after:bg-blue-600 after:-translate-y-1' : ''}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
            </Link>
          );
        })}

        {/* Create — center pill */}
        <Link href="/create" className="flex flex-1 flex-col items-center justify-center gap-1 py-1">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${pathname.startsWith('/create') ? 'bg-blue-700 shadow-blue-700/40 scale-95' : 'bg-blue-600 shadow-blue-600/30'}`}>
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
        </Link>

        {/* Profile */}
        {NAV_ITEMS.slice(2).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`relative flex items-center justify-center ${isActive ? 'after:absolute after:-top-1 after:h-0.5 after:w-5 after:rounded-full after:bg-blue-600 after:-translate-y-1' : ''}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
