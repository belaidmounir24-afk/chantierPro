import React from 'react';
import { Site, DailyExpense } from '../types';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import { Printer, X, Receipt, Building2, Calendar, FileText, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: Site;
  expense?: DailyExpense | null;
  currency: string;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  isOpen,
  onClose,
  site,
  expense,
  currency
}) => {
  const { t } = useLanguage();
  if (!isOpen || !site || !expense) return null;

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const formattedDate = new Date(expense.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div
      id="expense-receipt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col print:border-none print:shadow-none print:max-w-full">
        {/* Top bar (hidden in print) */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold">
              Bon de Décaissement BTP
            </span>
            <span className="text-xs text-slate-400">Pièce justificative de caisse</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimer / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Voucher Content */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                  {site.name}
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Client : {site.client} {site.address && `· ${site.address}`}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase font-mono">
                BIF N° {expense.id.toUpperCase()}
              </span>
              <div className="text-xs text-slate-500 mt-1 capitalize">
                Date : <strong className="text-slate-800">{formattedDate}</strong>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Catégorie Dépense</span>
              <strong className="text-slate-900 text-xs">{expense.category}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Bénéficiaire / Fournisseur</span>
              <strong className="text-slate-900 text-xs">{expense.beneficiary || 'Non spécifié'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Mode de paiement</span>
              <strong className="text-slate-900 text-xs">{expense.paymentMethod}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">N° Facture / Reçu</span>
              <strong className="text-slate-800 font-mono text-xs">{expense.receiptRef || 'SANS TICKET'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Engagé / Payé par</span>
              <strong className="text-slate-900 text-xs">{expense.paidBy || site.supervisor || 'Chef de Chantier'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Statut Contrôle</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré & Validé
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white text-center space-y-1 shadow-inner">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Montant Total Décaissé
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white">
              {formatCurrency(expense.amount, currency)}
            </div>
            {expense.note && (
              <p className="text-xs text-slate-300 font-medium italic pt-1 max-w-md mx-auto">
                Motif détaillé : « {expense.note} »
              </p>
            )}
          </div>

          {/* Legal / Accountability Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Ce bon de décaissement est établi à titre de pièce comptable justificative interne pour la caisse de chantier.
              Toute dépense supérieure au seuil réglementaire doit être étayée de son ticket de caisse ou facture fournisseur originale.
            </p>
          </div>

          {/* Signatures & Official Stamp Grid */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6">
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center h-32 flex flex-col justify-between bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-600 uppercase">
                Le Bénéficiaire / Fournisseur
              </span>
              <span className="text-[10px] text-slate-400 italic">Signature & Date de remise</span>
            </div>

            <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center h-32 flex flex-col justify-between bg-slate-50/50 relative">
              <span className="text-[11px] font-bold text-slate-600 uppercase">
                Le Responsable de Chantier / Caisse
              </span>

              {/* Stamp Graphic */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                <div className="border-2 border-emerald-700 text-emerald-800 rounded-xl px-3 py-1 text-[11px] font-black uppercase tracking-widest rotate-[-8deg] shadow-xs">
                  VU & PAYÉ LE {expense.date}
                </div>
              </div>

              <span className="text-[10px] text-slate-400 italic">Visa & Signature</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100">
            <span>ChantierPro — Module Caisse & Traçabilité Financière</span>
            <span className="font-mono">ID: {expense.id} · {new Date().toISOString().slice(0, 19)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
