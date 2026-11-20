import React, { useState, useEffect } from 'react';
import { ChantierDb } from '../types';
import { StorageService } from '../services/storage';
import { downloadFile } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { X, Download, Upload, Database, Coins, CheckCircle, AlertTriangle, Trash2, RotateCcw, Cloud, Smartphone, FileText, ShieldCheck } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  onUpdateDb: (newDb: ChantierDb) => void;
  onOpenCloudModal?: () => void;
  onOpenPeriodReport?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  onOpenCloudModal,
  onOpenPeriodReport
}) => {
  const [currency, setCurrency] = useState(db.currency || 'DZD');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [hasExportedJson, setHasExportedJson] = useState<boolean>(false);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrency(db.currency || 'DZD');
      setImportError(null);
      setImportSuccess(false);
      setConfirmClearOpen(false);
      setConfirmResetOpen(false);
      setActionSuccessMessage(null);
      setAcknowledgedBackup(false);
    }
  }, [isOpen, db.currency]);

  if (!isOpen) return null;

  const handleExport = () => {
    triggerHaptic('light');
    const json = StorageService.exportJSON(db);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`ChantierPro_Sauvegarde_${date}.json`, json, 'application/json');
    setHasExportedJson(true);
    setAcknowledgedBackup(true);
    setActionSuccessMessage('Sauvegarde JSON téléchargée avec succès ! Vos données sont sécurisées.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    setActionSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = StorageService.importJSON(text);
        onUpdateDb(imported);
        setImportSuccess(true);
        triggerHaptic('success');
      } catch (err: any) {
        setImportError(err.message || 'Erreur lors de la lecture du fichier JSON');
        triggerHaptic('error');
      }
    };
    reader.readAsText(file);
  };

  const executeReset = () => {
    triggerHaptic('medium');
    const resetDb = StorageService.reset();
    onUpdateDb(resetDb);
    setConfirmResetOpen(false);
    setActionSuccessMessage('Données de démonstration rechargées avec succès !');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const executeClearAll = () => {
    if (!hasExportedJson && !acknowledgedBackup) return;
    triggerHaptic('warning');
    const emptyDb = StorageService.createEmptyDb(currency, db.license);
    onUpdateDb(emptyDb);
    setConfirmClearOpen(false);
    setActionSuccessMessage('Tous les comptes et données ont été supprimés avec succès ! Application 100% vierge.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    const updated = { ...db, currency: newCurr };
    StorageService.save(updated);
    onUpdateDb(updated);
  };

  const canDeleteAll = hasExportedJson || acknowledgedBackup;

  return (
    <div
      id="backup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto">
        <div className="flex items-center justify-between bg-slate-900 px-5 sm:px-6 py-4 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Sauvegarde & Paramètres</h2>
              <p className="text-xs text-slate-400">
                Export JSON, PDF, Restauration & Comptes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {actionSuccessMessage && (
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl animate-in fade-in">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Cloud Sync Reassurance Box */}
          {onOpenCloudModal && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 flex-wrap">
                    <span>Sauvegarde Cloud Sécurisée</span>
                    <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded-md font-bold">Anti-Casse</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300/80">
                    Synchronisation automatique en cas de perte du téléphone
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCloudModal();
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 transition-colors"
              >
                Gérer Cloud
              </button>
            </div>
          )}

          {/* Devise principale */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              Devise globale de l'application
            </label>
            <select
              value={currency}
              onChange={e => handleCurrencyChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:border-blue-600 outline-none"
            >
              <option value="DZD">DZD (Dinar Algérien)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MAD">MAD (Dirham Marocain)</option>
              <option value="TND">TND (Dinar Tunisien)</option>
              <option value="USD">USD ($)</option>
              <option value="XOF">FCFA (Franc CFA)</option>
            </select>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Export JSON & PDF */}
          <div className="space-y-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Exporter / Importer mes données (JSON)
              </h3>
              <span className="text-[10px] bg-amber-200 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold shrink-0">Anti-Perte</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Téléchargez une sauvegarde intégrale de vos chantiers, ouvriers, pointages, acomptes et matériaux pour les restaurer à tout moment sur n'importe quel appareil ou domaine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="export-backup-btn"
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white px-4 py-2.5 text-xs font-black shadow transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-amber-400 dark:text-slate-950" />
                <span>Exporter mes données (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-white dark:bg-slate-800 hover:bg-amber-50/50 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer transition-colors shadow-2xs">
                <Upload className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Importer mes données (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {onOpenPeriodReport && (
              <button
                id="open-pdf-from-backup-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenPeriodReport();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                <span>Générer le Rapport Officiel (/pdf)</span>
              </button>
            )}

            {/* Télécharger la version autonome */}
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Version sans serveur ni connexion :</span>
              <a
                href="/download-standalone"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                download="ChantierPro-Autonome-Hors-Ligne.html"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Télécharger HTML Autonome</span>
              </a>
            </div>

            {importSuccess && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-2.5 rounded-xl">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Toutes vos données ont été restaurées avec succès !</span>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 p-2.5 rounded-xl">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Réinitialisation / Suppression des comptes */}
          <div className="space-y-2.5 pt-1 pb-1">
            {confirmClearOpen ? (
              <div id="confirm-delete-panel" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-wide">
                      SUPPRIMER TOUS LES COMPTES & DONNÉES ?
                    </h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                      Cette action supprimera <strong>définitivement</strong> tous les chantiers, les comptes de caisse, les ouvriers, les pointages, les dépenses et les matériaux pour rendre l'application <strong>100% vierge</strong>.
                    </p>
                  </div>
                </div>

                {/* Sauvegarde JSON préalable obligatoire / recommandée */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
                      Sauvegarde JSON obligatoire avant suppression
                    </span>
                    {hasExportedJson && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                        Sauvegardé ✓
                      </span>
                    )}
                  </div>

                  {!hasExportedJson && (
                    <button
                      id="mandatory-export-before-delete-btn"
                      type="button"
                      onClick={handleExport}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>1. Exporter la sauvegarde JSON maintenant</span>
                    </button>
                  )}

                  <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer select-none pt-0.5">
                    <input
                      id="ack-backup-checkbox"
                      type="checkbox"
                      checked={canDeleteAll}
                      onChange={e => setAcknowledgedBackup(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>J'ai sauvegardé mes données JSON (ou je confirme vouloir tout effacer).</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    id="confirm-delete-all-accounts-btn"
                    type="button"
                    disabled={!canDeleteAll}
                    onClick={executeClearAll}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      canDeleteAll
                        ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                        : 'bg-rose-300 dark:bg-rose-900/50 text-white/70 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Oui, tout supprimer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="clear-all-data-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setConfirmClearOpen(true);
                  setConfirmResetOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-3 text-xs font-bold shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>SUPPRIMER TOUS LES COMPTES & DONNÉES</span>
              </button>
            )}

            {confirmResetOpen ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in fade-in">
                <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                  Recharger les données de démonstration avec exemples de chantiers, ouvriers et caisse ?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={executeReset}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Oui, recharger démo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="reset-demo-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setConfirmResetOpen(true);
                  setConfirmClearOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Recharger les données de démonstration</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
