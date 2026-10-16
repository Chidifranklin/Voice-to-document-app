import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 text-white px-4 py-2.5 shadow-xl backdrop-blur-xs text-xs font-medium animate-in slide-in-from-bottom-2">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
      <div>
        <p className="font-semibold">Weak or No Internet Connection</p>
        <p className="text-[11px] text-amber-100">Firestore offline persistence is active. Your notes will sync automatically.</p>
      </div>
    </div>
  );
};
