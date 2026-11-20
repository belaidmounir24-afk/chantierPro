import React, { useState } from 'react';
import { Worker, Advance, AttendanceRecord } from '../types';
import { formatCurrency, calculateWorkerNet, getTodayDateString } from '../utils/calculations';
import { X, HandCoins, AlertTriangle, Trash2, Calendar, CheckCircle2 } from 'lucide-react';

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  advances: Advance[];
  onAddAdvance: (advance: Omit<Advance, 'id'>) => void;
  onDeleteAdvance: (advanceId: string) => void;
  siteAttendance: Record<string, AttendanceRecord[]> | undefined;
  monthPrefix: string;
  currency: string;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  isOpen,
  onClose,
  worker,
  advances,
  onAddAdvance,
  onDeleteAdvance,
  siteAttendance,
  monthPrefix,
  currency
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(getTodayDateString());
  const [method, setMethod] = useState<'Espèces' | 'Virement' | 'Chèque' | 'Autre'>('Espèces');
  const [note, setNote] = useState('');

  if (!isOpen || !worker) return null;

  const workerAdvances = advances.filter(
    a => a.site === worker.site && a.workerId === worker.id && a.date.startsWith(monthPrefix)
  );

  const calc = calculateWorkerNet(worker, siteAttendance, advances, monthPrefix);
  const potentialNewAdvances = calc.advancesTotal + (Number(amount) || 0);
  const potentialPercentage = calc.gross > 0 ? (potentialNewAdvances / calc.gross) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    onAddAdvance({
      site: worker.site,
      workerId: worker.id,
      date,
      amount: numAmount,
      method,
      note: note.trim() || undefined
    });

    setAmount('');
    setNote('');
  };

  return (
    <div
      id="advance-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-amber-500 px-6 py-4 text-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-amber-400 font-bold">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Gestion des Acomptes — {worker.name}
              </h2>
              <p className="text-xs font-semibold text-slate-800">
                {worker.craft} · {worker.team}
              </p>
            </div>
          </div>
          <button
            id="close-advance-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-900 hover:bg-amber-600/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Situation financière du mois */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Situation mois ({monthPrefix})
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Brut cumulé</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(calc.gross, currency)}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {calc.stats.regularDays}j ({calc.stats.totalHours}h)
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Acomptes versés</span>
                <span className={`text-sm font-bold ${calc.advPercentage > 50 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {formatCurrency(calc.advancesTotal, currency)}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  {Math.round(calc.advPercentage)}% du brut
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Net restant</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatCurrency(calc.net, currency)}
                </span>
                <span className="text-[11px] text-slate-400 block">à régler</span>
              </div>
            </div>

            {calc.advPercentage >= 50 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  Attention : Les acomptes dépassent 50% du salaire brut cumulé ce mois-ci !
                </span>
              </div>
            )}
          </div>

          {/* Formulaire ajout acompte */}
          <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <HandCoins className="h-4 w-4 text-amber-600" />
              Verser un nouvel acompte
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant ({currency}) *
                </label>
                <input
                  id="advance-amount-input"
                  type="number"
                  name="montant"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 2000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000, 2000, 3000, 5000, 10000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                        amount === val
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      {val.toLocaleString('fr-FR')} {currency}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date de versement *
                </label>
                <input
                  id="advance-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 bg-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mode de règlement
                </label>
                <select
                  id="advance-method-select"
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
                >
                  <option value="Espèces">💵 Espèces (Main à main)</option>
                  <option value="Virement">🏦 Virement bancaire / CCP</option>
                  <option value="Chèque">📜 Chèque</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motif / Note
                </label>
                <input
                  id="advance-note-input"
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex: Acompte fête, avance transport"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 bg-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {potentialPercentage > 50 && amount !== '' && (
              <div className="text-xs font-bold text-rose-700 bg-rose-100/80 px-3 py-1.5 rounded-lg">
                ⚠️ Avec cet ajout, le total des acomptes atteindra {Math.round(potentialPercentage)}% du brut !
              </div>
            )}

            <div className="pt-1">
              <button
                id="submit-advance-btn"
                type="submit"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-bold text-slate-950 shadow transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider & Enregistrer l'Acompte
              </button>
            </div>
          </form>

          {/* Historique des acomptes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Historique des versements ({workerAdvances.length})
              </span>
              <span className="text-xs font-bold text-slate-500">
                Total: {formatCurrency(calc.advancesTotal, currency)}
              </span>
            </div>

            {workerAdvances.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aucun acompte enregistré pour ce mois.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {workerAdvances.map(adv => (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(adv.amount, currency)}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {adv.method}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{adv.date}</span>
                        {adv.note && <span>• {adv.note}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAdvance(adv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer cet acompte"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
