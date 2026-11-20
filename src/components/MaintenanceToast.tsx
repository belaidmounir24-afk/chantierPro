import React, { useEffect } from 'react';
import { MaintenanceAlert } from '../types';
import { AlertTriangle, Wrench, X, ChevronRight, Gauge } from 'lucide-react';
import { triggerHaptic } from '../utils/android';

interface MaintenanceToastProps {
  alert: MaintenanceAlert | null;
  onClose: () => void;
  onOpenMaintenance: (equipmentId: string) => void;
  onViewEquipment: (equipmentId: string) => void;
}

export const MaintenanceToast: React.FC<MaintenanceToastProps> = ({
  alert,
  onClose,
  onOpenMaintenance,
  onViewEquipment
}) => {
  useEffect(() => {
    if (alert) {
      triggerHaptic(alert.severity === 'urgent' ? 'error' : 'warning');
      const timer = setTimeout(() => {
        onClose();
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [alert, onClose]);

  if (!alert) return null;

  const isUrgent = alert.severity === 'urgent';

  return (
    <div
      id="maintenance-toast-banner"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-24px)] sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div
        className={`rounded-2xl p-4 shadow-2xl border flex flex-col gap-2.5 backdrop-blur-md ${
          isUrgent
            ? 'bg-slate-900/95 text-white border-rose-500/80 shadow-rose-950/30 ring-2 ring-rose-500/30'
            : 'bg-slate-900/95 text-white border-amber-500/80 shadow-amber-950/30 ring-2 ring-amber-500/30'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shrink-0 ${
                isUrgent
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded-md ${
                    isUrgent ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isUrgent ? 'Alerte Entretien Urgent' : 'Seuil Entretien Atteint'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">
                  {alert.siteName}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white mt-0.5">
                {alert.title}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-snug">
          {alert.message}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onViewEquipment(alert.equipmentId);
              onClose();
            }}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
          >
            <span>Voir l'engin</span>
            <ChevronRight className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenMaintenance(alert.equipmentId);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs shadow-xs transition-all cursor-pointer"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Enregistrer Entretien</span>
          </button>
        </div>
      </div>
    </div>
  );
};
