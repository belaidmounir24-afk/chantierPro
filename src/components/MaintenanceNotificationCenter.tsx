import React, { useState } from 'react';
import { MaintenanceAlert, Equipment, Site } from '../types';
import {
  Bell,
  X,
  AlertTriangle,
  Wrench,
  Gauge,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Filter,
  Check,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/android';

interface MaintenanceNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: MaintenanceAlert[];
  onOpenMaintenanceModal: (equipment: Equipment) => void;
  onNavigateToEquipment: (equipmentId: string) => void;
  onQuickHoursPrompt: (equipment: Equipment) => void;
  equipmentList: Equipment[];
  sites: Site[];
  onDismissAlert?: (alertId: string) => void;
}

export const MaintenanceNotificationCenter: React.FC<MaintenanceNotificationCenterProps> = ({
  isOpen,
  onClose,
  alerts,
  onOpenMaintenanceModal,
  onNavigateToEquipment,
  onQuickHoursPrompt,
  equipmentList,
  sites,
  onDismissAlert
}) => {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'warning'>('all');

  if (!isOpen) return null;

  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'urgent') return a.severity === 'urgent';
    if (filterType === 'warning') return a.severity === 'warning';
    return true;
  });

  return (
    <div
      id="maintenance-notifications-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg h-full max-h-[92vh] sm:max-h-[90vh] bg-white rounded-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-slate-900">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{t('notifications.title', 'Centre d’Alertes & Entretiens')}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {alerts.length === 0
                  ? t('notifications.allUpToDate', 'Tout le parc matériel est à jour')
                  : `${alerts.length} ${t('notifications.alertsPending', 'alerte(s) d’entretien en attente')}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterType('all');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {t('notifications.filterAll', 'Toutes')} ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterType('urgent');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>{t('notifications.filterUrgent', 'Urgentes')}</span> ({urgentCount})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterType('warning');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'warning'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>{t('notifications.filterWarning', 'Seuil proche')}</span> ({warningCount})
            </button>
          </div>
        </div>

        {/* List of Alerts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t('notifications.zeroAlertsTitle', 'Aucune alerte d’entretien active')}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t(
                  'notifications.zeroAlertsDesc',
                  'Tous vos engins et machines respectent leurs seuils de fonctionnement et leurs calendriers d’entretien.'
                )}
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const eq = equipmentList.find(e => e.id === alert.equipmentId);
              const isUrgent = alert.severity === 'urgent';

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl p-4 border transition-all shadow-xs ${
                    isUrgent
                      ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                      : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {isUrgent
                          ? t('notifications.badgeUrgent', 'Dépassement / Urgent')
                          : t('notifications.badgeWarning', 'Seuil Atteint')}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {alert.siteName}
                      </span>
                    </div>

                    {onDismissAlert && (
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.id)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 text-xs"
                        title={t('notifications.dismiss', 'Masquer')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-slate-900 mb-1">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {alert.message}
                  </p>

                  {/* Machine metrics pill */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white/80 rounded-xl p-2.5 border border-slate-200/80 text-[11px] mb-3">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Gauge className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Horamètre</span>
                        <span className="font-extrabold">{alert.currentHours} h</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Reste / Écart</span>
                        <span
                          className={`font-extrabold ${
                            alert.hoursRemaining <= 0 ? 'text-rose-600' : 'text-amber-700'
                          }`}
                        >
                          {alert.hoursRemaining <= 0
                            ? `-${Math.abs(alert.hoursRemaining)} h`
                            : `${alert.hoursRemaining} h`}
                        </span>
                      </div>
                    </div>

                    {alert.nextMaintenanceDate && (
                      <div className="flex items-center gap-1.5 text-slate-700 col-span-2 sm:col-span-1">
                        <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Échéance</span>
                          <span className="font-extrabold truncate">{alert.nextMaintenanceDate}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/50">
                    {eq && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          onOpenMaintenanceModal(eq);
                          onClose();
                        }}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 py-2 px-3 text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>{t('notifications.recordMaintenance', 'Enregistrer Entretien')}</span>
                      </button>
                    )}

                    {eq && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          onQuickHoursPrompt(eq);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 py-2 px-2.5 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                        title={t('notifications.updateHours', 'Ajuster le compteur')}
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        <span>{t('notifications.hoursBtn', 'Ajuster h')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        onNavigateToEquipment(alert.equipmentId);
                        onClose();
                      }}
                      className="flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 px-2.5 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>{t('notifications.viewMachine', 'Voir')}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{t('notifications.autoMonitoring', 'Surveillance automatique en temps réel')}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-900 hover:underline cursor-pointer"
          >
            {t('common.close', 'Fermer')}
          </button>
        </div>
      </div>
    </div>
  );
};
