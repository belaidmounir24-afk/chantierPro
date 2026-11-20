import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Smartphone,
  Share2,
  ArrowUpCircle,
  X,
  Radio,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Check,
  Send,
  Key
} from 'lucide-react';
import {
  UpdateService,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_DATE,
  UpdateCheckResult
} from '../services/updateService';
import { triggerHaptic } from '../utils/android';
import { PermissionService } from '../services/permissionService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAndroidModal?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onOpenAndroidModal
}) => {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [autoUpdate, setAutoUpdate] = useState<boolean>(true);
  const [lastCheckFormatted, setLastCheckFormatted] = useState<string>('');
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Broadcast state for owner
  const [newVersionInput, setNewVersionInput] = useState('');
  const [newNoteInput, setNewNoteInput] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const refreshState = () => {
    const cached = UpdateService.getCachedUpdateState();
    const lastCheck = UpdateService.getLastCheckTime();
    setAutoUpdate(UpdateService.isAutoUpdateEnabled());
    setIsOwner(PermissionService.isOwnerAuthenticated());

    if (lastCheck > 0) {
      const d = new Date(lastCheck);
      setLastCheckFormatted(
        `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      );
    } else {
      setLastCheckFormatted('Jamais vérifié');
    }

    setUpdateResult({
      hasUpdate: cached.hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: cached.latestVersion,
      buildDate: CURRENT_BUILD_DATE,
      releaseNotes: cached.releaseNotes.length > 0 ? cached.releaseNotes : [
        "Option de mise à jour instantanée pour toutes les applications partagées",
        "Synchronisation automatique et purge transparente des caches de navigation",
        "Protection absolue des données et fiches chantiers locales",
        "Améliorations de performance et mode hors-ligne Android renforcé"
      ],
      checkedAt: new Date().toISOString(),
      isServiceWorkerWaiting: false
    });
  };

  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
      refreshState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckNow = async () => {
    triggerHaptic('medium');
    setChecking(true);
    setBroadcastSuccess(null);
    try {
      const res = await UpdateService.checkForUpdate(true);
      setUpdateResult(res);
      refreshState();
      triggerHaptic(res.hasUpdate ? 'warning' : 'success');
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    triggerHaptic('warning');
    setUpdating(true);
    try {
      await UpdateService.applyUpdate();
    } catch (err) {
      console.error(err);
      setUpdating(false);
    }
  };

  const handleToggleAutoUpdate = () => {
    triggerHaptic('light');
    const next = !autoUpdate;
    setAutoUpdate(next);
    UpdateService.setAutoUpdateEnabled(next);
  };

  const handleBroadcastRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput.trim()) return;
    triggerHaptic('medium');
    setIsBroadcasting(true);
    try {
      const notes = newNoteInput.trim() ? newNoteInput.split('\n').map(s => s.trim()).filter(Boolean) : [
        "Nouvelle mise à jour diffusée par l'administrateur du chantier",
        "Actualisation immédiate des fonctionnalités et des données"
      ];
      const ok = await UpdateService.broadcastUpdate(newVersionInput.trim(), notes);
      if (ok) {
        triggerHaptic('success');
        setBroadcastSuccess(`Version ${newVersionInput} diffusée avec succès à toutes les applications partagées !`);
        setNewVersionInput('');
        setNewNoteInput('');
        refreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const hasUpdate = updateResult?.hasUpdate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg border ${
              hasUpdate
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {hasUpdate ? <ArrowUpCircle className="h-6 w-6" /> : <RefreshCw className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Mise à Jour de l'Application
                </h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                  hasUpdate
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {hasUpdate ? 'MAJ Disponible' : 'À jour'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Option de mise à jour pour toutes les applications partagées (PWA & Web)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border transition-all ${
            hasUpdate
              ? 'bg-gradient-to-br from-amber-950/50 via-slate-800/80 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-950/20'
              : 'bg-slate-800/60 border-slate-700/80'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400 font-medium">Version actuelle installée</div>
                <div className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <span>v{CURRENT_APP_VERSION}</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({CURRENT_BUILD_DATE})</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">Dernière version disponible</div>
                <div className={`text-lg font-black mt-0.5 ${hasUpdate ? 'text-amber-400' : 'text-emerald-400'}`}>
                  v{updateResult?.latestVersion || CURRENT_APP_VERSION}
                </div>
              </div>
            </div>

            {hasUpdate ? (
              <div className="mt-4 pt-3 border-t border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Une nouvelle version est prête pour votre application et vos partages !</span>
                </div>
                <p className="text-xs text-slate-300">
                  La mise à jour actualise les scripts et composants tout en conservant scrupuleusement l'ensemble de vos données de chantiers, pointages et historiques locaux.
                </p>
                <button
                  type="button"
                  onClick={handleApplyUpdate}
                  disabled={updating}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                  {updating ? 'Mise à jour en cours...' : 'Mettre à jour maintenant (Instantané)'}
                </button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Votre application dispose des toutes dernières fonctionnalités.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckNow}
                  disabled={checking}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Recherche...' : 'Re-vérifier'}
                </button>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">Dernière vérification</div>
                <div className="text-[11px] text-slate-400">{lastCheckFormatted}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckNow}
              disabled={checking}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Vérification...' : 'Vérifier maintenant'}
            </button>
          </div>

          {/* Auto Update Setting */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Mises à jour automatiques en tâche de fond</div>
                <div className="text-[11px] text-slate-400">
                  Détecte automatiquement les nouvelles versions et affiche une alerte discrète
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoUpdate}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                autoUpdate
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {autoUpdate ? 'Activé ✓' : 'Désactivé'}
            </button>
          </div>

          {/* How Shared Apps Update Guide */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="h-4 w-4" /> Fonctionnement sur toutes les applications partagées
            </h4>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Lien partagé universel :</strong> Toute personne qui ouvre votre lien partagé bénéficie automatiquement de cette option de mise à jour dans l'en-tête et le pied de page.
              </li>
              <li>
                <strong className="text-white">Smartphones Android installés :</strong> Les applications enregistrées sur l'écran d'accueil utilisent le Service Worker avec rafraîchissement automatique à chaque connexion.
              </li>
              <li>
                <strong className="text-white">Sauvegarde préservée :</strong> Les mises à jour n'effacent jamais les ouvriers, les chantiers, ni les pointages stockés sur les téléphones.
              </li>
            </ul>

            {onOpenAndroidModal && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onClose();
                    onOpenAndroidModal();
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer underline"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Voir les options d'installation Android</span>
                </button>
              </div>
            )}
          </div>

          {/* Release Notes */}
          {updateResult?.releaseNotes && updateResult.releaseNotes.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Nouveautés & Améliorations de la version
              </h4>
              <ul className="space-y-1.5">
                {updateResult.releaseNotes.map((note, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Owner-Only: Broadcast update to all shared apps */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Radio className="h-4 w-4" /> Diffuser une mise à jour à toutes les applications partagées
                </h4>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-400/30">
                  Propriétaire
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Vous pouvez diffuser immédiatement un signal de nouvelle version vers le serveur. Tous les utilisateurs et appareils partagés recevront l'alerte de mise à jour instantanément.
              </p>

              {broadcastSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{broadcastSuccess}</span>
                </div>
              )}

              <form onSubmit={handleBroadcastRelease} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Numéro de nouvelle version (ex. 4.3.1)
                  </label>
                  <input
                    type="text"
                    value={newVersionInput}
                    onChange={e => setNewVersionInput(e.target.value)}
                    placeholder="4.3.1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Notes de version (une ligne par note)
                  </label>
                  <textarea
                    rows={2}
                    value={newNoteInput}
                    onChange={e => setNewNoteInput(e.target.value)}
                    placeholder="Améliorations des pointages&#10;Correctif de synchronisation"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBroadcasting || !newVersionInput.trim()}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isBroadcasting ? 'Diffusion...' : 'Diffuser la mise à jour aux partages'}
                </button>
              </form>

              {/* Direct link to Administrator Application */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-[11px] text-slate-400">Générateur de clés & télédiffusion :</span>
                <a
                  href="/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Ouvrir l'Application Administrateur</span>
                </a>
              </div>
            </div>
          )}

          {/* Hard Reset / Cache Recovery */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-300">Réinitialiser le cache navigateur</div>
              <div className="text-[10px] text-slate-500">Force le téléchargement des derniers scripts sans toucher aux données</div>
            </div>
            <button
              type="button"
              onClick={handleApplyUpdate}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Purger le cache
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] text-slate-400">
              Système de mise à jour sécurisé OTA (Over-The-Air)
            </span>
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
