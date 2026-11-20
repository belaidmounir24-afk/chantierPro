import React, { useState } from 'react';
import { ChantierDb } from '../types';
import { StorageService } from '../services/storage';
import { downloadFile } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { X, Download, Upload, Database, Coins, CheckCircle, AlertTriangle, Trash2, RotateCcw, Cloud, ShieldCheck, Smartphone } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  onUpdateDb: (newDb: ChantierDb) => void;
  onOpenCloudModal?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  onOpenCloudModal
}) => {
  const [currency, setCurrency] = useState(db.currency || 'DZD');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    triggerHaptic('light');
    const json = StorageService.exportJSON(db);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`ChantierPro_Sauvegarde_${date}.json`, json, 'application/json');
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

  return (
    <div
      id="backup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Sauvegarde & Paramètres</h2>
              <p className="text-xs text-slate-400">
                Export JSON, Restauration & Devise
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

        <div className="p-6 space-y-5">
          {actionSuccessMessage && (
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-3 rounded-xl animate-in fade-in">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Cloud Sync Reassurance Box */}
          {onOpenCloudModal && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <span>Sauvegarde Cloud Sécurisée</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md font-bold">Anti-Casse</span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              Devise globale de l'application
            </label>
            <select
              value={currency}
              onChange={e => handleCurrencyChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
            >
              <option value="DZD">DZD (Dinar Algérien)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MAD">MAD (Dirham Marocain)</option>
              <option value="TND">TND (Dinar Tunisien)</option>
              <option value="USD">USD ($)</option>
              <option value="XOF">FCFA (Franc CFA)</option>
            </select>
          </div>

          <hr className="border-slate-100" />

          {/* Export JSON */}
          <div className="space-y-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-amber-600" />
                Exporter / Importer mes données (JSON)
              </h3>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">Anti-Perte</span>
            </div>
            <p className="text-xs text-slate-600">
              Téléchargez une sauvegarde intégrale de vos chantiers, ouvriers, pointages, acomptes et matériaux pour les restaurer à tout moment sur n'importe quel appareil ou domaine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="export-backup-btn"
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-black shadow transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-amber-400" />
                <span>Exporter mes données (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-white hover:bg-amber-50/50 px-4 py-2 text-xs font-bold text-slate-900 cursor-pointer transition-colors shadow-2xs">
                <Upload className="h-4 w-4 text-amber-600" />
                <span>Importer mes données (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Télécharger la version autonome */}
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-slate-600 font-medium">Version sans serveur ni connexion :</span>
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
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 p-2.5 rounded-xl">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Toutes vos données ont été restaurées avec succès !</span>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 bg-rose-100/90 border border-rose-300 p-2.5 rounded-xl">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Réinitialisation / Suppression des comptes */}
          <div className="space-y-2.5 pt-1">
            {confirmClearOpen ? (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                      Supprimer tous les comptes & données ?
                    </h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      Cette action supprimera <strong>définitivement</strong> tous les chantiers, les comptes de caisse, les ouvriers, les pointages, les dépenses et les matériaux pour rendre l'application <strong>100% vierge</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    id="confirm-delete-all-accounts-btn"
                    type="button"
                    onClick={executeClearAll}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Oui, tout supprimer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
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
                <Trash2 className="h-4 w-4" />
                <span>Supprimer tous les comptes & données (Application vierge)</span>
              </button>
            )}

            {confirmResetOpen ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5 animate-in fade-in">
                <p className="text-xs text-amber-900 font-semibold">
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
                    className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
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
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
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
