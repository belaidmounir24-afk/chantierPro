import React, { useState, useEffect } from 'react';
import { Site, CashInflow } from '../types';
import { getTodayDateString } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowDownLeft, X, Check, Building2, Calendar, DollarSign, FileText, UserCheck, ShieldCheck } from 'lucide-react';

interface CashInflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inflow: CashInflow) => void;
  site: Site;
  inflow?: CashInflow | null;
  currency: string;
}

const INFLOW_SOURCES = [
  'Trésorerie Centrale (Direction)',
  'Virement Bancaire Société',
  'Avance / Acompte Client',
  'Apport Chef de Chantier',
  'Remboursement / Restitution',
  'Autre Dotation de Caisse'
];

export const CashInflowModal: React.FC<CashInflowModalProps> = ({
  isOpen,
  onClose,
  onSave,
  site,
  inflow,
  currency
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(INFLOW_SOURCES[0]);
  const [customSource, setCustomSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Virement' | 'Chèque'>('Virement');
  const [reference, setReference] = useState('');
  const [receivedBy, setReceivedBy] = useState(site.supervisor || '');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (inflow) {
      setDate(inflow.date);
      setAmount(String(inflow.amount));
      if (INFLOW_SOURCES.includes(inflow.source)) {
        setSource(inflow.source);
        setCustomSource('');
      } else {
        setSource('Autre Dotation de Caisse');
        setCustomSource(inflow.source);
      }
      setPaymentMethod(inflow.paymentMethod || 'Virement');
      setReference(inflow.reference || '');
      setReceivedBy(inflow.receivedBy || site.supervisor || '');
      setNote(inflow.note || '');
    } else {
      setDate(getTodayDateString());
      setAmount('');
      setSource(INFLOW_SOURCES[0]);
      setCustomSource('');
      setPaymentMethod('Virement');
      setReference(`DOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
      setReceivedBy(site.supervisor || '');
      setNote('');
    }
  }, [inflow, isOpen, site.supervisor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert(t('transactions.invalidAmount', 'Veuillez saisir un montant valide.'));
      return;
    }

    const finalSource = source === 'Autre Dotation de Caisse' && customSource.trim() ? customSource.trim() : source;

    const newInflow: CashInflow = {
      id: inflow?.id || `inf_${Date.now()}`,
      site: site.id,
      date,
      amount: numAmount,
      source: finalSource,
      paymentMethod,
      reference: reference.trim() || undefined,
      receivedBy: receivedBy.trim() || undefined,
      note: note.trim() || undefined
    };

    triggerHaptic('medium');
    onSave(newInflow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500 text-slate-950 shadow-md">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {inflow ? t('transactions.editInflow', 'Modifier Approvisionnement') : t('transactions.addInflow', 'Approvisionner la Caisse')}
              </h2>
              <p className="text-xs text-emerald-200/80">
                {t('transactions.inflowSubtitle', 'Enregistrement d’une entrée de fonds / dotation')} · {site.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Amount Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-950 mb-1.5">
              {t('transactions.inflowAmount', 'Montant Entrant')} ({currency}) *
            </label>
            <div className="relative">
              <input
                id="inflow-amount-input"
                type="number"
                name="montant"
                step="1"
                required
                min="1"
                placeholder="Ex: 50000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-black text-emerald-950 bg-white border border-emerald-400 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-xs"
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-800 uppercase">
                {currency}
              </span>
            </div>
          </div>

          {/* Date & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('common.date', 'Date d’encaissement')} *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('expenses.paymentMethod', 'Mode de versement')} *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="Espèces">💵 Espèces (Guichet / Coffre)</option>
                <option value="Virement">🏛️ Virement Bancaire</option>
                <option value="Chèque">📑 Chèque de Banque</option>
              </select>
            </div>
          </div>

          {/* Source / Provenance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('transactions.sourceOrigin', 'Provenance des fonds / Émetteur')} *
            </label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
            >
              {INFLOW_SOURCES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {source === 'Autre Dotation de Caisse' && (
              <input
                type="text"
                placeholder="Précisez la source exacte..."
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
                className="mt-2 w-full text-xs font-medium text-slate-800 bg-white border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Reference & Received By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('transactions.inflowRef', 'N° Pièce / Réf. Justificatif')}
              </label>
              <input
                type="text"
                placeholder="Ex: VIR-2026-0811, BORD-44"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('transactions.receivedBy', 'Réceptionné par')}
              </label>
              <input
                type="text"
                placeholder="Ex: Chef de Chantier, Caissier"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('common.notes', 'Motif / Remarques complémentaires')}
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Alimentation caisse pour achat fournitures urgentes et acomptes quinzaine..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {t('transactions.auditNotice', 'Cette entrée augmentera le solde théorique de la caisse et sera tracée dans le journal.')}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t('common.cancel', 'Annuler')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {inflow ? t('common.save', 'Enregistrer') : t('transactions.validateInflow', 'Valider l’Approvisionnement')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
