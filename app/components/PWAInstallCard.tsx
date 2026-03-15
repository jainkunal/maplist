'use client';

import { Share2, X, Download } from 'lucide-react';
import { usePWA } from './PWAContext';

export default function PWAInstallCard() {
  const { canInstall, handleInstall, handleDismiss } = usePWA();

  if (!canInstall) return null;

  return (
    <div className="relative rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
          <Share2 className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 mb-1">Share links straight to MapLists</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Install the app and it appears in your phone&apos;s share sheet — share any restaurant
            link, Google Maps URL, or travel article and we&apos;ll add it straight to your list.
          </p>
        </div>
      </div>

      <button
        onClick={handleInstall}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        Install MapLists
      </button>
    </div>
  );
}
