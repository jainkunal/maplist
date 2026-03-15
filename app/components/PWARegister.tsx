'use client';

import { Download, X } from 'lucide-react';
import { usePWA } from './PWAContext';

export default function PWARegister() {
  const { canInstall, handleInstall, handleDismiss } = usePWA();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[100] flex items-center gap-2 rounded-full bg-blue-600 pl-3 pr-1 py-1 text-white shadow-lg shadow-blue-600/30">
      <Download className="w-4 h-4 shrink-0" />
      <button onClick={handleInstall} className="text-sm font-semibold whitespace-nowrap">
        Install app
      </button>
      <button onClick={handleDismiss} className="p-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
