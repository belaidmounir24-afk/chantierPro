import React, { useState, useEffect } from 'react';
import { Site, AppLicense, UserRole } from '../types';
import { Building2, Plus, Settings2, Edit, MapPin, HardHat, Database, Smartphone, Wifi, WifiOff, Globe, Bell, Search, Camera, Sparkles, Award, ShieldCheck, Users, Cloud, UserPlus, Moon, Sun } from 'lucide-react';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { LanguageModal } from './LanguageModal';
import { LicenseService } from '../services/licenseService';
import { UpdateService } from '../services/updateService';
import { CloudSyncIndicator } from './CloudSyncIndicator';
import { CloudSyncStatus } from '../services/firebase';

interface HeaderProps {
  userRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  sites: Site[];
  activeSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onOpenSiteModal: (site?: Site) => void;
  onOpenBackupModal: () => void;
  onOpenCloudModal?: () => void;
  onOpenInvitationsModal?: () => void;
  onOpenAndroidModal?: () => void;
  onOpenLicenseModal?: () => void;
  onOpenUpdateModal?: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenNotifications?: () => void;
  onOpenSearch?: () => void;
  onOpenAiSmartCapture?: () => void;
  license?: AppLicense;
  alertsCount?: number;
  hasUrgentAlerts?: boolean;
  isOnline?: boolean;
  cloudSyncStatus?: CloudSyncStatus;
  lastSyncTime?: string | null;
  firebaseUser?: any;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  onChangeRole,
  sites,
  activeSiteId,
  onSelectSite,
  onOpenSiteModal,
  onOpenBackupModal,
  onOpenCloudModal,
  onOpenInvitationsModal,
  onOpenAndroidModal,
  onOpenLicenseModal,
  onOpenUpdateModal,
  onOpenPrivacyModal,
  onOpenNotifications,
  onOpenSearch,
  onOpenAiSmartCapture,
  license,
  alertsCount = 0,
  hasUrgentAlerts = false,
  isOnline = true,
  cloudSyncStatus = 'NOT_CONNECTED',
  lastSyncTime = null,
  firebaseUser = null
}) => {
  const currentSite = sites.find(s => s.id === activeSiteId) || sites[0];
  const { language, languageInfo, setLanguage, t, availableLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const licenseStatus = LicenseService.getStatus(license);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const updateCheck = () => {
      const state = UpdateService.getCachedUpdateState();
      setHasUpdate(state.hasUpdate);
    };
    updateCheck();

    window.addEventListener('chantierpro_update_status_changed', updateCheck);
    return () => window.removeEventListener('chantierpro_update_status_changed', updateCheck);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 flex-wrap">
            {/* Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden border border-amber-400/40 shadow-xs shrink-0 bg-slate-950">
                <img src="/pwa-192x192.png" alt="ChantierPro Logo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>{t('app.name', 'ChantierPro')}</span>
                  </h1>
                  <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                    <Smartphone className="h-3 w-3" /> Android
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="hidden sm:inline">{t('app.subtitle', 'Gestion & Pointage Terrain')}</span>
                  <span className="inline-flex items-center gap-1 text-[10px]">
                    {isOnline ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {t('app.onlineStatus', 'Local + Synchro')}
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <WifiOff className="h-2.5 w-2.5" /> {t('app.offlineStatus', 'Hors-Ligne')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Site Selector, Search, Language & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-2xl justify-end">
              {/* Cloud Sync Reassurance Indicator */}
              <CloudSyncIndicator
                status={cloudSyncStatus}
                isOnline={isOnline}
                currentUser={firebaseUser}
                lastSyncTime={lastSyncTime}
                onClick={() => onOpenCloudModal?.()}
              />

              {/* Universal AI Smart Capture Button */}
              {onOpenAiSmartCapture && (
                <button
                  type="button"
                  id="btn-header-ai-capture"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenAiSmartCapture();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-black shadow-xs transition-all shrink-0 cursor-pointer border border-amber-400"
                  title="Scanner IA (Caméra, Reçus, Bons, Fichiers)"
                >
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Scan IA</span>
                  <Sparkles className="h-3 w-3 animate-pulse" />
                </button>
              )}

              {/* Role Switcher */}
              {userRole && onChangeRole && (
                <div className="relative group shrink-0">
                  <button className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold border border-slate-700 transition-all cursor-pointer">
                    {userRole === 'CLIENT' ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="hidden lg:inline text-emerald-400">Vue Client</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-amber-400" />
                        <span className="hidden lg:inline text-amber-400">Vue Éditeur</span>
                      </>
                    )}
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                      onClick={() => onChangeRole('CHEF_CHANTIER')}
                      className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${userRole !== 'CLIENT' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                    >
                      <Users className="h-4 w-4" /> Mode Éditeur
                    </button>
                    <button
                      onClick={() => onChangeRole('CLIENT')}
                      className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${userRole === 'CLIENT' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}
                    >
                      <ShieldCheck className="h-4 w-4" /> Mode Client
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Search Button */}
              {onOpenSearch && (
                <button
                  type="button"
                  id="btn-header-search"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenSearch();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold border border-slate-700 transition-all shrink-0 cursor-pointer"
                  title="Recherche globale (Ctrl+K)"
                >
                  <Search className="h-4 w-4 text-amber-400" />
                  <span className="hidden md:inline">Recherche</span>
                  <kbd className="hidden lg:inline-flex items-center px-1 text-[9px] font-mono font-bold bg-slate-900 text-slate-400 rounded border border-slate-700">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* Maintenance Notifications Bell */}
              {onOpenNotifications && (
                <button
                  type="button"
                  id="btn-maintenance-notifications"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenNotifications();
                  }}
                  className={`relative flex items-center justify-center p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                    alertsCount > 0
                      ? hasUrgentAlerts
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title={t('notifications.bellTooltip', 'Alertes & Entretien Matériel')}
                >
                  <Bell className="h-4 w-4" />
                  {alertsCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-black text-white ring-2 ring-slate-900 ${
                        hasUrgentAlerts ? 'bg-rose-600 animate-pulse' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {alertsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Quick Language Switcher */}
              <button
                type="button"
                id="btn-language-modal"
                onClick={() => {
                  triggerHaptic('light');
                  setLangModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 sm:py-2 text-xs font-bold border border-slate-700 transition-all shrink-0 cursor-pointer"
                title={t('app.switchLanguage', 'Changer de langue')}
              >
                <span className="text-sm">{languageInfo.flag}</span>
                <span className="hidden sm:inline font-bold">{languageInfo.nativeName}</span>
                <Globe className="h-3.5 w-3.5 text-slate-400 sm:hidden" />
              </button>

              {/* Dark / Light Theme Toggle (Chantier Nuit / Jour) */}
              <button
                type="button"
                id="btn-theme-toggle"
                onClick={() => {
                  triggerHaptic('light');
                  toggleTheme();
                }}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs font-bold border transition-all shrink-0 cursor-pointer shadow-2xs group ${
                  isDark
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                }`}
                title={isDark ? t('app.theme.light', 'Mode Clair (Plein Soleil)') : t('app.theme.dark', 'Mode Sombre (Chantier Nuit)')}
                aria-label={isDark ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
              >
                {isDark ? (
                  <>
                    <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                    <span className="hidden sm:inline font-bold text-amber-300">
                      Clair
                    </span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 group-hover:-rotate-12 transition-transform" />
                    <span className="hidden sm:inline font-bold text-slate-300">
                      Sombre
                    </span>
                  </>
                )}
              </button>

              {onOpenAndroidModal && (
                <button
                  type="button"
                  id="btn-android-modal"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenAndroidModal();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold shadow-xs border border-emerald-400/30 transition-all shrink-0 cursor-pointer"
                  title="Installer sur Android / Télécharger APK & Code Source Android Studio"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('app.androidInstall', 'App Android & APK')}</span>
                  <span className="md:hidden">APK</span>
                </button>
              )}

              {onOpenLicenseModal && (
                <button
                  type="button"
                  id="btn-header-license"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenLicenseModal();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold border transition-all shrink-0 cursor-pointer shadow-xs ${
                    licenseStatus.isExpired
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 font-black shadow-rose-900/40 animate-pulse'
                      : licenseStatus.isTrial
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300'
                  }`}
                  title={licenseStatus.isExpired ? "30 jours écoulés : Seul le Pointage reste actif - Cliquez pour activer la licence complète" : "Licence Commerciale & Activation"}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">
                    {licenseStatus.isExpired
                      ? 'Pointage Seul (30j)'
                      : licenseStatus.isTrial
                        ? `Essai (${licenseStatus.daysRemaining}j)`
                        : 'Licence Pro'}
                  </span>
                  <span className="lg:hidden">
                    {licenseStatus.isExpired
                      ? 'Pointage seul'
                      : licenseStatus.isTrial
                        ? `${licenseStatus.daysRemaining}j`
                        : 'Pro'}
                  </span>
                </button>
              )}

              <div className="relative flex-1 max-w-[130px] sm:max-w-[170px]">
                <select
                  id="siteSel"
                  value={activeSiteId || ''}
                  onChange={e => {
                    triggerHaptic('light');
                    onSelectSite(e.target.value);
                  }}
                  className="w-full truncate rounded-xl bg-slate-800 border border-slate-700 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {currentSite && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    if (licenseStatus.isExpired && onOpenLicenseModal) {
                      onOpenLicenseModal();
                      return;
                    }
                    onOpenSiteModal(currentSite);
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                  title={licenseStatus.isExpired ? "Accès verrouillé - Période d'essai terminée" : t('app.editSite', 'Modifier les paramètres du chantier actif')}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              <button
                id="add-site-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  if (licenseStatus.isExpired && onOpenLicenseModal) {
                    onOpenLicenseModal();
                    return;
                  }
                  onOpenSiteModal();
                }}
                className={`flex items-center gap-1 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer ${
                  licenseStatus.isExpired
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
                title={licenseStatus.isExpired ? "Accès verrouillé - Période d'essai terminée" : t('app.addSite', '+ Chantier')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">{t('app.addSite', '+ Chantier')}</span>
              </button>

              {onOpenInvitationsModal && (
                <button
                  id="open-invitations-btn"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenInvitationsModal();
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Gérer les invitations & accès clients"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden xl:inline text-xs font-bold">Invitations</span>
                </button>
              )}

              <button
                id="open-backup-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenBackupModal();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-all border border-slate-700 cursor-pointer shadow-2xs font-bold text-xs shrink-0"
                title="Exporter / Importer mes données (JSON)"
              >
                <Database className="h-4 w-4 text-amber-400" />
                <span className="hidden xs:inline">Données JSON</span>
              </button>
            </div>
          </div>

          {/* Site Details Sub-bar */}
          {currentSite && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-4 overflow-x-auto">
              <div className="flex items-center gap-3 shrink-0">
                {currentSite.client && (
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">{t('app.client', 'Client')} :</span>
                    <strong className="text-slate-200 font-semibold">{currentSite.client}</strong>
                  </span>
                )}
                {currentSite.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-300">{currentSite.address}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {currentSite.supervisor && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <HardHat className="h-3 w-3 text-amber-500" />
                    <span className="text-slate-300 font-medium">{currentSite.supervisor}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● {t('app.statusActive', 'En cours')}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </>
  );
};

