import React, { useState, useEffect } from 'react';
import { Site, CashAudit } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import { Scale, CheckCircle2, AlertTriangle, X, Check, Calculator, ShieldCheck, Printer, ArrowRight } from 'lucide-react';

interface CashAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audit: CashAudit) => void;
  site: Site;
  theoreticalBalance: number;
  currency: string;
}

// Denominations for bill count / billetage
const DENOMINATIONS = [
  { value: 2000, label: 'Billets 2 000' },
  { value: 1000, label: 'Billets 1 000' },
  { value: 500, label: 'Billets 500' },
  { value: 200, label: 'Billets / Pièces 200' },
  { value: 100, label: 'Pièces 100' },
  { value: 50, label: 'Pièces 50' },
  { value: 20, label: 'Pièces 20' },
  { value: 10, label: 'Monnaie Divers' }
];

export const CashAuditModal: React.FC<CashAuditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  site,
  theoreticalBalance,
  currency
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(getTodayDateString());
  const [auditedBy, setAuditedBy] = useState(site.supervisor || '');
  const [notes, setNotes] = useState('');
  const [billCounts, setBillCounts] = useState<Record<number, number>>({
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });
  const [manualCount, setManualCount] = useState<string>('');
  const [useDetailBreakdown, setUseDetailBreakdown] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateString());
      setAuditedBy(site.supervisor || '');
      setNotes('');
      setManualCount(String(Math.max(0, theoreticalBalance)));
    }
  }, [isOpen, site.supervisor, theoreticalBalance]);

  if (!isOpen) return null;

  // Calculate total from bill counts
  const totalFromBreakdown = DENOMINATIONS.reduce((sum, d) => {
    const count = billCounts[d.value] || 0;
    return sum + count * d.value;
  }, 0);

  const physicalCashCounted = useDetailBreakdown ? totalFromBreakdown : parseFloat(manualCount) || 0;
  const difference = physicalCashCounted - theoreticalBalance;
  const isExact = Math.abs(difference) < 0.01;
  const isSurplus = difference > 0.01;
  const isDeficit = difference < -0.01;

  const handleCountChange = (val: number, countStr: string) => {
    const c = parseInt(countStr, 10);
    setBillCounts(prev => ({
      ...prev,
      [val]: isNaN(c) || c < 0 ? 0 : c
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAudit: CashAudit = {
      id: `aud_${Date.now()}`,
      site: site.id,
      date,
      theoreticalBalance,
      countedPhysicalCash: physicalCashCounted,
      difference,
      auditedBy: auditedBy.trim() || site.supervisor || 'Chef de Chantier',
      notes: notes.trim() || undefined,
      status: isExact ? 'conforme' : 'ecart',
      breakdown: useDetailBreakdown ? (billCounts as any) : undefined
    };

    triggerHaptic('medium');
    onSave(newAudit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {t('transactions.cashAuditTitle', 'Rapprochement & Arrêté de Caisse')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('transactions.cashAuditSubtitle', 'Contrôle physique des espèces & Billetage')} · {site.name}
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('transactions.theoreticalBalance', 'Solde Théorique')}
              </span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                {formatCurrency(theoreticalBalance, currency)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-800">
                {t('transactions.physicalCounted', 'Espèces Comptées')}
              </span>
              <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
                {formatCurrency(physicalCashCounted, currency)}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                isExact
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : isSurplus
                  ? 'bg-blue-50 border-blue-200 text-blue-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider">
                {isExact ? 'Écart (Parfait)' : isSurplus ? 'Excédent Caisse' : 'Déficit Caisse'}
              </span>
              <span className="text-base font-black font-mono mt-0.5 block">
                {difference > 0 ? `+${formatCurrency(difference, currency)}` : formatCurrency(difference, currency)}
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 pl-2">Méthode de comptage :</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setUseDetailBreakdown(true)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  useDetailBreakdown ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💵 Billetage Détaillé
              </button>
              <button
                type="button"
                onClick={() => setUseDetailBreakdown(false)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  !useDetailBreakdown ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ✏️ Montant Global
              </button>
            </div>
          </div>

          {/* Billetage Breakdown Table */}
          {useDetailBreakdown ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between text-[11px] font-black text-slate-600 uppercase">
                <span>Coupure / Dénomination</span>
                <span className="text-center w-20">Quantité</span>
                <span className="text-right w-24">Sous-Total ({currency})</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto text-xs">
                {DENOMINATIONS.map(d => {
                  const count = billCounts[d.value] || 0;
                  const subTotal = count * d.value;
                  return (
                    <div key={d.value} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/80">
                      <span className="font-semibold text-slate-800">{d.label}</span>
                      <div className="w-20 text-center">
                        <input
                          type="number"
                          min="0"
                          value={count || ''}
                          placeholder="0"
                          onChange={e => handleCountChange(d.value, e.target.value)}
                          className="w-16 text-center font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg py-1 px-1 outline-none focus:border-amber-500"
                        />
                      </div>
                      <span className="w-24 text-right font-mono font-bold text-slate-700">
                        {subTotal.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Montant total compté en caisse ({currency}) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={manualCount}
                onChange={e => setManualCount(e.target.value)}
                className="w-full text-xl font-black font-mono text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Audit Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('common.date', 'Date du contrôle')} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('transactions.auditedBy', 'Audité par (Responsable)')} *
              </label>
              <input
                type="text"
                required
                value={auditedBy}
                onChange={e => setAuditedBy(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('common.notes', 'Observations / Justification d’écart')}
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Caisse rigoureusement exacte. Clôture effectuée avant approvisionnement quinzaine..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:bg-white resize-none"
            />
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              {t('transactions.saveAudit', 'Valider le PV d’Arrêté de Caisse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
