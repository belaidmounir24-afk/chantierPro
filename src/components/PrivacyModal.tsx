import React from 'react';
import { X, ShieldCheck, Lock, Smartphone, Camera, Database, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/android';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Politique de Confidentialité
                <span className="text-[10px] uppercase font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Play Store & RGPD
                </span>
              </h2>
              <p className="text-xs text-slate-400">Protection intégrale de vos données de chantier</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm">
          
          {/* Top Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-800/60 to-slate-800/40 border border-amber-500/20 flex items-start gap-3.5">
            <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
              <strong className="text-white block font-semibold text-sm">Architecture Locale & Souveraine (Local-First)</strong>
              ChantierPro stocke vos données directement sur votre smartphone ou ordinateur. Vos pointages, salaires, photos de reçus et journaux de chantier ne sont ni vendus ni partagés avec des tiers publicitaires.
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Database className="h-4 w-4" />
              1. Données gérées sur le chantier
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              L'application enregistre localement les informations strictement nécessaires à la conduite de vos travaux :
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Liste des chantiers, adresses et noms de clients
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Équipes et ouvriers (rôles, pointages d'heures, acomptes et taux)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Dépenses de caisse, justificatifs, bons de matériaux et maintenance des engins
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              2. Permissions Android requises
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-amber-400" />
                  Appareil Photo (Caméra)
                </div>
                <div className="text-slate-400">
                  Strictement utilisé pour photographier les reçus, bons de livraison ou scanner les QR codes.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  Fichiers & Sauvegardes
                </div>
                <div className="text-slate-400">
                  Permet d'exporter et importer vos sauvegardes au format standard JSON à tout moment.
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              3. Vos droits & Propriété
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vous êtes le seul propriétaire de votre base de données. Vous pouvez exporter vos données sous forme de fichier de sauvegarde ou tout effacer en un clic via les paramètres de réinitialisation.
            </p>
          </div>

          {/* Section 4 : Contact */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Éditeur & Propriétaire de l'application :</span>
              <span className="text-xs text-amber-400 font-medium">belaidmounir24@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="mailto:belaidmounir24@gmail.com?subject=Contact%20depuis%20l'application&body=Bonjour,%20je%20souhaite%20vous%20contacter%20concernant%20l'application."
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shrink-0 shadow-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Contacter le propriétaire</span>
              </a>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors shrink-0"
              >
                <span>Page Web</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400">ChantierPro 2026 • Document légal Play Store</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
