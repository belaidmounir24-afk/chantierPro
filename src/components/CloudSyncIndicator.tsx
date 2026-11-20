import React from 'react';
import { CloudSyncStatus } from '../services/firebase';
import { triggerHaptic } from '../utils/android';
import { Cloud, CloudCheck, RefreshCw, WifiOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface CloudSyncIndicatorProps {
  status: CloudSyncStatus;
  isOnline: boolean;
  currentUser: User | null;
  lastSyncTime: string | null;
  onClick: () => void;
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
  status,
  isOnline,
  currentUser,
  lastSyncTime,
  onClick
}) => {
  const handleClick = () => {
    triggerHaptic('light');
    onClick();
  };

  if (!isOnline) {
    return (
      <button
        type="button"
        id="cloud-sync-badge-offline"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/25 transition-all cursor-pointer shadow-xs shrink-0"
        title="Mode hors-ligne : Données enregistrées sur votre téléphone. Cliquez pour plus d'infos."
      >
        <WifiOff className="h-3 w-3 text-amber-400 shrink-0" />
        <span className="hidden sm:inline">Hors-ligne (Sauvegardé local)</span>
        <span className="sm:hidden">Hors-ligne</span>
      </button>
    );
  }

  if (status === 'SYNCING') {
    return (
      <button
        type="button"
        id="cloud-sync-badge-syncing"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold transition-all cursor-pointer shadow-xs shrink-0"
        title="Synchronisation avec le Cloud en cours..."
      >
        <RefreshCw className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
        <span className="hidden sm:inline">Synchronisation...</span>
        <span className="sm:hidden">Synchro...</span>
      </button>
    );
  }

  if (currentUser) {
    return (
      <button
        type="button"
        id="cloud-sync-badge-synced"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer shadow-xs shrink-0"
        title={`Données sécurisées en ligne (Dernier sync : ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('fr-FR') : 'Actif'})`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="hidden md:inline">Vos données sont sécurisées en ligne</span>
        <span className="md:hidden">Cloud Sécurisé</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      </button>
    );
  }

  // Not connected
  return (
    <button
      type="button"
      id="cloud-sync-badge-disconnected"
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs shrink-0"
      title="Sauvegarde Cloud inactive. Cliquez pour vous connecter et protéger vos données."
    >
      <Cloud className="h-3 w-3 text-amber-400 shrink-0" />
      <span className="hidden sm:inline">Activer Sauvegarde Cloud</span>
      <span className="sm:hidden">Cloud</span>
    </button>
  );
};
