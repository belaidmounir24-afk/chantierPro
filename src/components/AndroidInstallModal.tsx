import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  WifiOff,
  Zap,
  ShieldCheck,
  X,
  Sparkles,
  Sun,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Mail
} from 'lucide-react';
import QRCode from 'qrcode';
import { triggerHaptic, isAndroidDevice, isStandaloneMode, requestWakeLock } from '../utils/android';
import { UpdateService, CURRENT_APP_VERSION } from '../services/updateService';
import { getPublicAppUrl } from '../utils/appUrl';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled: () => void;
  onOpenPrivacy?: () => void;
  onOpenLicense?: () => void;
  onOpenUpdateModal?: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
  onOpenPrivacy,
  onOpenLicense,
  onOpenUpdateModal
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'qr' | 'updates'>('install');
  const [isUpdatingNow, setIsUpdatingNow] = useState(false);
  
  const isAndroid = isAndroidDevice();
  const isInstalled = isStandaloneMode() || installedSuccess;
  const currentAppUrl = getPublicAppUrl();

  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
      // Generate QR Code for fast Android Camera scan
      QRCode.toDataURL(currentAppUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code error', err));
    }
  }, [isOpen, currentAppUrl]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          triggerHaptic('success');
          setInstalledSuccess(true);
          onInstalled();
        }
      } catch (err) {
        console.error('Install prompt error', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  const handleToggleWakeLock = async () => {
    triggerHaptic('light');
    if (!wakeLockActive) {
      const ok = await requestWakeLock();
      if (ok) setWakeLockActive(true);
    } else {
      setWakeLockActive(false);
    }
  };

  const handleCopyLink = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(currentAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    triggerHaptic('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ChantierPro — Application Android BTP',
          text: 'Installer l\'application ChantierPro sur votre téléphone Android pour le pointage et la gestion de chantier.',
          url: currentAppUrl
        });
      } catch {
        // Ignored
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400/40 shrink-0 bg-slate-950">
              <img src="/pwa-192x192.png" alt="ChantierPro Icon" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">ChantierPro Android</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
                  App Native
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Icône officielle & installation pour smartphone Android
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('install');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Installation Directe
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('qr');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Scanner QR
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('updates');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Mises à Jour
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* TAB 1: Direct Install */}
          {activeTab === 'install' && (
            <>
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Application installée avec succès</h4>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      ChantierPro s'exécute en mode natif autonome Android, avec stockage local et accès instantané depuis votre écran d'accueil.
                    </p>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">Installation en 1 clic disponible</h4>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Votre appareil Android est prêt à installer ChantierPro comme une véritable application native.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {isInstalling ? 'Installation en cours...' : 'Installer sur cet appareil Android'}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Installer sur votre smartphone Android
                  </h4>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                    <li>
                      Sur votre téléphone Android, ouvrez l'application dans <strong className="text-white">Google Chrome</strong>.
                    </li>
                    <li>
                      Appuyez sur le menu <strong className="text-white">⋮ (3 points verticaux)</strong> en haut à droite.
                    </li>
                    <li>
                      Sélectionnez <strong className="text-white">« Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »).
                    </li>
                    <li>
                      L'icône <strong className="text-amber-400">ChantierPro</strong> apparaîtra directement parmi vos applications Android avec lancement autonome plein écran et hors-ligne !
                    </li>
                  </ol>
                </div>
              )}

              {/* Android Home Screen Icon Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Aperçu sur l'écran d'accueil Android :</span>
                  <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">Icône 3D BTP</span>
                </div>
                <div className="flex items-center justify-center py-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex flex-col items-center gap-2 group">
                    <div className="relative">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 transition-transform group-hover:scale-105">
                        <img src="/pwa-192x192.png" alt="ChantierPro App Icon" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-slate-950 font-black border-2 border-slate-900">
                        ✓
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-200 tracking-tight">ChantierPro</span>
                  </div>
                </div>
              </div>

              {/* Quick Link Share Box */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Lien d'accès pour votre téléphone :</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Share2 className="h-3 w-3" />
                      Partager
                    </button>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400 truncate select-all">
                  {currentAppUrl}
                </div>
              </div>

              {/* Android Feature Highlights */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-2">
                  <WifiOff className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">100% Hors-Ligne</div>
                    <div className="text-[10px] text-slate-400">Fonctionne sans réseau 4G/5G</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-start gap-2">
                  <Zap className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">Retour Haptique</div>
                    <div className="text-[10px] text-slate-400">Vibrations lors du pointage</div>
                  </div>
                </div>
              </div>
            </>
          )}
          {/* TAB 2: QR Code Fast Scan */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code Android" className="h-48 w-48 rounded-lg" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                    Génération du QR Code...
                  </div>
                )}
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-white">Scannez avec l'appareil photo Android</h4>
                <p className="text-xs text-slate-400">
                  Ouvrez l'appareil photo de votre smartphone Android et pointez-le vers ce QR Code pour ouvrir et installer l'application instantanément.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Updates & Synchronization */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-800/80 to-slate-900 border border-amber-500/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Mise à Jour de Toutes les Applications Partagées</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Version installée : <strong className="text-amber-400">v{CURRENT_APP_VERSION}</strong>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  Toute application partagée (sur les téléphones Android de vos chefs d'équipe, collaborateurs ou ouvriers) se synchronise en continu avec le serveur. En cas de nouvelle version publiée, l'application se met à jour en 1 clic sans aucune perte de données locales.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      triggerHaptic('warning');
                      setIsUpdatingNow(true);
                      await UpdateService.applyUpdate();
                    }}
                    disabled={isUpdatingNow}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isUpdatingNow ? 'animate-spin' : ''}`} />
                    {isUpdatingNow ? 'Mise à jour en cours...' : 'Forcer la mise à jour maintenant'}
                  </button>

                  {onOpenUpdateModal && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        onClose();
                        onOpenUpdateModal();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Détails de version & Historique
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2.5">
                <h5 className="text-xs font-bold text-slate-200">Règles de mise à jour automatique :</h5>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-amber-400">PWA installée sur Android :</strong> Vérifie automatiquement les nouvelles versions à chaque ouverture et en arrière-plan.</li>
                  <li><strong className="text-amber-400">Lien web partagé :</strong> Rafraîchit les composants et avertit l'utilisateur dès qu'un correctif est disponible.</li>
                  <li><strong className="text-amber-400">Mode 100% hors-ligne préservé :</strong> L'application continue de fonctionner sur les chantiers même sans réseau 4G.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Screen WakeLock Tool */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sun className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Mode Chantier Écran Allumé</div>
                <div className="text-[10px] text-slate-400">
                  Empêche la mise en veille pendant le pointage
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleWakeLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wakeLockActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {wakeLockActive ? 'Actif ✓' : 'Activer'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              {isAndroid ? '📱 Android OS Détecté' : '🌐 Mode Mobile & PWA Ready'}
            </span>
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenPrivacy();
                }}
                className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors underline cursor-pointer"
              >
                Confidentialité
              </button>
            )}
            {onOpenLicense && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenLicense();
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium underline cursor-pointer"
              >
                Licence & Tarifs
              </button>
            )}
            <a
              href="mailto:belaidmounir24@gmail.com?subject=Contact%20depuis%20l'application&body=Bonjour,%20je%20souhaite%20vous%20contacter%20concernant%20l'application."
              className="text-[11px] text-slate-300 hover:text-amber-400 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3 h-3 text-amber-400" />
              <span>Contacter le propriétaire</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
