import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      id="connection-status-pill"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-colors ${
        isOnline
          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
          : 'bg-amber-500/15 text-amber-900 border-amber-500/30 shadow-xs'
      }`}
      title={isOnline ? 'Online - All changes saved to local storage' : 'Offline - Running 100% locally from your device storage'}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="w-3 h-3 text-emerald-600" />
          <span>Online</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <WifiOff className="w-3 h-3 text-amber-600" />
          <span>Offline Ready</span>
        </>
      )}
    </div>
  );
};
