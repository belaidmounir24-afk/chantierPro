import React, { useState, useEffect } from 'react';
import { DailyExpense, ExpenseCategory, Site } from '../types';
import { EXPENSE_CATEGORIES, getTodayDateString } from '../services/storage';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import {
  X,
  Receipt,
  Fuel,
  Wrench,
  Truck,
  UtensilsCrossed,
  Layers,
  Settings,
  FileSpreadsheet,
  HelpCircle,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: Site;
  expense?: DailyExpense | null;
  defaultDate?: string;
  onSaveExpense: (expense: Omit<DailyExpense, 'id'>, editId?: string) => void;
  currency: string;
}

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  'Carburant & Énergie': <Fuel className="h-4 w-4 text-amber-500" />,
  'Petit Outillage & Quincaillerie': <Wrench className="h-4 w-4 text-blue-500" />,
  'Transport & Déchargement': <Truck className="h-4 w-4 text-emerald-500" />,
  'Restauration & Eau': <UtensilsCrossed className="h-4 w-4 text-rose-500" />,
  'Location Matériel': <Layers className="h-4 w-4 text-purple-500" />,
  'Entretien & Réparations': <Settings className="h-4 w-4 text-orange-500" />,
  'Frais Administratifs': <FileSpreadsheet className="h-4 w-4 text-cyan-500" />,
  'Divers & Urgences': <HelpCircle className="h-4 w-4 text-slate-500" />
};

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  site,
  expense,
  defaultDate,
  onSaveExpense,
  currency
}) => {
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [category, setCategory] = useState<ExpenseCategory>('Carburant & Énergie');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<DailyExpense['paymentMethod']>('Espèces (Caisse)');
  const [beneficiary, setBeneficiary] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [paidBy, setPaidBy] = useState(site?.supervisor || 'Chef de chantier');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setCategory(expense.category);
      setAmount(expense.amount);
      setPaymentMethod(expense.paymentMethod);
      setBeneficiary(expense.beneficiary || '');
      setReceiptRef(expense.receiptRef || '');
      setPaidBy(expense.paidBy || site?.supervisor || '');
      setNote(expense.note || '');
    } else {
      setDate(defaultDate || getTodayDateString());
      setCategory('Carburant & Énergie');
      setAmount('');
      setPaymentMethod('Espèces (Caisse)');
      setBeneficiary('');
      setReceiptRef('');
      setPaidBy(site?.supervisor || 'Chef de chantier');
      setNote('');
    }
  }, [expense, defaultDate, site, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    triggerHaptic('success');
    onSaveExpense(
      {
        site: site.id,
        date,
        category,
        amount: numAmount,
        paymentMethod,
        beneficiary: beneficiary.trim() || undefined,
        receiptRef: receiptRef.trim() || undefined,
        paidBy: paidBy.trim() || undefined,
        note: note.trim() || undefined
      },
      expense ? expense.id : undefined
    );

    onClose();
  };

  return (
    <div
      id="expense-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4.5 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {expense ? 'Modifier la Dépense' : 'Enregistrer une Dépense Journalière'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {site.name} · Caisse de chantier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Amount & Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                Montant ({currency}) *
              </label>
              <div className="relative">
                <input
                  id="expense-amount-input"
                  type="number"
                  name="montant"
                  min="1"
                  step="1"
                  required
                  placeholder="Ex: 2000"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-black text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  {currency}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[500, 1000, 2000, 5000, 10000].map(val => (
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Date de la dépense *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Catégorie de Dépense *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCategory(cat);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Beneficiary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                Mode de règlement
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as DailyExpense['paymentMethod'])}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
              >
                <option value="Espèces (Caisse)">💵 Espèces (Caisse de régie)</option>
                <option value="Carte">💳 Carte bancaire</option>
                <option value="Virement">🏦 Virement bancaire</option>
                <option value="Chèque">📑 Chèque de chantier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Bénéficiaire / Fournisseur
              </label>
              <input
                type="text"
                placeholder="Ex: Station Naftal, Quincaillerie..."
                value={beneficiary}
                onChange={e => setBeneficiary(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Receipt Ref & Paid By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                N° Justificatif / Facture / Bon
              </label>
              <input
                type="text"
                placeholder="Ex: TKT-1049, FAC-2026/02"
                value={receiptRef}
                onChange={e => setReceiptRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Payé par / Responsable
              </label>
              <input
                type="text"
                placeholder="Ex: Chef de chantier"
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Note / Motif */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Motif & Détails de la dépense
            </label>
            <textarea
              rows={2}
              placeholder="Ex: 50L Gasoil pour le dumper + disques diamant pour découpe..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-xs"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {expense ? 'Mettre à jour' : 'Enregistrer la Dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
