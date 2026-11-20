import React, { useState, useEffect } from 'react';
import { Equipment, MaintenanceRecord, Site, DailyExpense } from '../types';
import { Wrench, X, CheckCircle2, Calendar, Gauge, DollarSign, User, FileText, Sparkles } from 'lucide-react';
import { getTodayDateString, formatCurrency } from '../utils/calculations';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/android';

interface MaintenanceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMaintenance: (
    record: MaintenanceRecord,
    updatedEquipment: Equipment,
    createExpense?: Omit<DailyExpense, 'id'>
  ) => void;
  equipment: Equipment | null;
  site: Site;
  currency: string;
}

export const MaintenanceLogModal: React.FC<MaintenanceLogModalProps> = ({
  isOpen,
  onClose,
  onSaveMaintenance,
  equipment,
  site,
  currency
}) => {
  const { t } = useLanguage();

  const [date, setDate] = useState(getTodayDateString());
  const [hoursAtMaintenance, setHoursAtMaintenance] = useState<number>(0);
  const [type, setType] = useState<MaintenanceRecord['type']>('vidange');
  const [cost, setCost] = useState<string>('');
  const [technician, setTechnician] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');
  const [nextScheduledDate, setNextScheduledDate] = useState('');
  const [autoAddExpense, setAutoAddExpense] = useState(true);

  useEffect(() => {
    if (equipment && isOpen) {
      setDate(getTodayDateString());
      setHoursAtMaintenance(equipment.hours || 0);
      setType('vidange');
      setCost('');
      setTechnician(site.supervisor || '');
      setReceiptRef('');
      setNotes(`Vidange huile moteur & remplacement filtres (${equipment.maintDue}h)`);
      
      // Suggest next date in 3 months
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setNextScheduledDate(d.toISOString().split('T')[0]);
      setAutoAddExpense(true);
    }
  }, [equipment, isOpen, site]);

  if (!isOpen || !equipment) return null;

  const nextMaintCycleHours = hoursAtMaintenance + (equipment.maintDue || 250);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    triggerHaptic('success');

    const recordId = `maint_${Date.now()}`;
    const parsedCost = cost ? parseFloat(cost) : undefined;

    const maintenanceRecord: MaintenanceRecord = {
      id: recordId,
      equipmentId: equipment.id,
      site: site.id,
      date,
      hoursAtMaintenance: Number(hoursAtMaintenance) || equipment.hours,
      type,
      cost: parsedCost,
      technician: technician.trim() || undefined,
      receiptRef: receiptRef.trim() || undefined,
      notes: notes.trim() || undefined,
      nextScheduledHours: nextMaintCycleHours,
      nextScheduledDate: nextScheduledDate.trim() || undefined
    };

    const updatedEquipment: Equipment = {
      ...equipment,
      hours: Math.max(equipment.hours, Number(hoursAtMaintenance)),
      lastMaintHours: Number(hoursAtMaintenance),
      status: 'ok',
      nextMaintenanceDate: nextScheduledDate.trim() || undefined,
      maintenanceHistory: [maintenanceRecord, ...(equipment.maintenanceHistory || [])]
    };

    let expenseToCreate: Omit<DailyExpense, 'id'> | undefined = undefined;
    if (autoAddExpense && parsedCost && parsedCost > 0) {
      expenseToCreate = {
        site: site.id,
        date,
        category: 'Entretien & Réparations',
        amount: parsedCost,
        paymentMethod: 'Espèces (Caisse)',
        beneficiary: technician.trim() || 'Garage / Fournisseur Pièces',
        receiptRef: receiptRef.trim() || `ENT-${equipment.name.substring(0, 4).toUpperCase()}`,
        paidBy: site.supervisor || 'Chef de chantier',
        note: `Entretien ${type} sur ${equipment.name} (${hoursAtMaintenance}h) : ${notes}`
      };
    }

    onSaveMaintenance(maintenanceRecord, updatedEquipment, expenseToCreate);
    onClose();
  };

  return (
    <div
      id="maintenance-log-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{t('maintenance.recordTitle', 'Enregistrer un Entretien / Révision')}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {equipment.name} {equipment.brand ? `(${equipment.brand})` : ''} • {site.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Machine summary pill */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Compteur actuel : {equipment.hours} h</span>
                <span className="text-slate-600 block">Périodicité d'entretien : tous les {equipment.maintDue} h</span>
              </div>
            </div>
            <span className="bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
              Prochaine vidange : {nextMaintCycleHours} h
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.date', "Date de l'intervention *")}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="maint-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.horameter', 'Compteur au moment de la révision *')}
              </label>
              <div className="relative">
                <Gauge className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="maint-hours-input"
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={hoursAtMaintenance}
                  onChange={e => setHoursAtMaintenance(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.type', 'Nature des Travaux *')}
              </label>
              <select
                id="maint-type-select"
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
              >
                <option value="vidange">🛢️ Vidange Huile Moteur & Filtres</option>
                <option value="revision_generale">⚙️ Révision Générale Périodique</option>
                <option value="filtres">🧴 Remplacement Filtres Air/Gazole</option>
                <option value="graissage">🧈 Graissage & Niveaux Hydrauliques</option>
                <option value="reparation">🔧 Réparation / Dépannage Pièces</option>
                <option value="controle_technique">📋 Contrôle Technique & Sécurité</option>
                <option value="autre">✨ Autre Entretien</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.technician', 'Intervenant / Mécanicien / Garage')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="maint-tech-input"
                  type="text"
                  value={technician}
                  onChange={e => setTechnician(e.target.value)}
                  placeholder="Ex: Mécanicien chantier, Garage SARL Auto"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.cost', `Coût Total (${currency})`)}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="maint-cost-input"
                  type="number"
                  name="montant"
                  min="0"
                  step="any"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="Ex: 8500"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('maintenance.receiptRef', 'N° Facture / Bon de Réparation')}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="maint-ref-input"
                  type="text"
                  value={receiptRef}
                  onChange={e => setReceiptRef(e.target.value)}
                  placeholder="Ex: FACT-2026-089"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('maintenance.nextDate', 'Prochaine Échéance Programmée (Date Limite / Contrôle)')}
            </label>
            <input
              id="maint-nextdate-input"
              type="date"
              value={nextScheduledDate}
              onChange={e => setNextScheduledDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('maintenance.notes', 'Détails & Pièces Remplacées')}
            </label>
            <textarea
              id="maint-notes-textarea"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Remplacement filtre à huile, filtre à carburant, 15L huile 15W40, contrôle freins."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Auto-expense integration toggle */}
          {Number(cost) > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-3">
              <label htmlFor="auto-add-expense-cb" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="auto-add-expense-cb"
                  type="checkbox"
                  checked={autoAddExpense}
                  onChange={e => setAutoAddExpense(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-semibold text-emerald-950">
                  {t('maintenance.autoExpenseNotice', 'Enregistrer automatiquement ce montant dans les Dépenses de Caisse')}
                </span>
              </label>
              <span className="text-xs font-black text-emerald-700">
                {formatCurrency(Number(cost), currency)}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t('common.cancel', 'Annuler')}
            </button>
            <button
              id="save-maintenance-log-btn"
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('maintenance.validateBtn', "Valider l'Entretien & Réinitialiser le Cycle")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
