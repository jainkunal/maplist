'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextValue {
  canInstall: boolean;
  dismissed: boolean;
  handleInstall: () => Promise<void>;
  handleDismiss: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  dismissed: false,
  handleInstall: async () => {},
  handleDismiss: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => setDismissed(true);

  return (
    <PWAContext.Provider
      value={{
        canInstall: !!installPrompt && !dismissed,
        dismissed,
        handleInstall,
        handleDismiss,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}
