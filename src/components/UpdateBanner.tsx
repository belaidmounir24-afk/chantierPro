import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { UpdateService, CURRENT_APP_VERSION } from '../services/updateService';
import { triggerHaptic } from '../utils/android';

interface UpdateBannerProps {
  onOpenUpdateModal: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ onOpenUpdateModal }) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>(CURRENT_APP_VERSION);
  const [isApplying, setIsApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = () => {
    const cached = UpdateService.getCachedUpdateState();
    if (cached.hasUpdate && !UpdateService.isUpdateDismissed(cached.latestVersion)) {
      setHasUpdate(true);
      setLatestVersion(cached.latestVersion);
    } else {
      setHasUpdate(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handleStatusChange = () => checkStatus();
    window.addEventListener('chantierpro_update_status_changed', handleStatusChange);
    return () => window.removeEventListener('chantierpro_update_status_changed', handleStatusChange);
  }, []);

  if (!hasUpdate || dismissed) return null;

  const handleApply = async () => {
    triggerHaptic('warning');
    setIsApplying(true);
    try {
      await UpdateService.applyUpdate();
    } catch (err) {
      console.error(err);
      setIsApplying(false);
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setDismissed(true);
    UpdateService.dismissUpdateBanner(latestVersion);
  };

  return (
    <div
      id="chantierpro-update-banner"
      className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-3 py-2 shadow-md flex items-center justify-between gap-3 text-xs z-40 border-b border-amber-400/80 animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2 font-bold truncate">
        <span className="p-1 rounded-full bg-slate-950/15 text-slate-950 shrink-0">
          <Sparkles className="h-3.5 w-3.5 animate-spin" />
        </span>
        <span className="truncate">
          <strong>Mise à jour disponible :</strong> ChantierPro v{latestVersion} est prête pour toutes vos applications partagées !
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying}
          className="bg-slate-950 hover:bg-slate-900 active:bg-slate-800 text-white font-extrabold px-3 py-1 rounded-lg text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isApplying ? 'animate-spin' : ''}`} />
          <span>{isApplying ? 'Mise à jour...' : 'Mettre à jour'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenUpdateModal();
          }}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer hidden sm:inline-flex"
        >
          Détails
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-slate-950/70 hover:text-slate-950 transition-colors cursor-pointer"
          title="Masquer cette notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
