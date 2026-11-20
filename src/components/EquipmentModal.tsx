import React, { useState, useEffect } from 'react';
import { Equipment } from '../types';
import { X, Truck, Gauge, Fuel, Wrench, CheckCircle2 } from 'lucide-react';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Omit<Equipment, 'id'>, editId?: string) => void;
  editingEquipment?: Equipment | null;
  siteId: string;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEquipment,
  siteId
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [hours, setHours] = useState<number>(0);
  const [fuel, setFuel] = useState<number>(0);
  const [maintDue, setMaintDue] = useState<number>(250);
  const [lastMaintHours, setLastMaintHours] = useState<number>(0);
  const [maintThresholdHours, setMaintThresholdHours] = useState<number>(25);
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>('');
  const [status, setStatus] = useState<'ok' | 'a_reviser' | 'en_panne'>('ok');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (editingEquipment) {
      setName(editingEquipment.name);
      setBrand(editingEquipment.brand || '');
      setHours(editingEquipment.hours);
      setFuel(editingEquipment.fuel);
      setMaintDue(editingEquipment.maintDue);
      setLastMaintHours(editingEquipment.lastMaintHours || 0);
      setMaintThresholdHours(editingEquipment.maintThresholdHours ?? 25);
      setNextMaintenanceDate(editingEquipment.nextMaintenanceDate || '');
      setStatus(editingEquipment.status || 'ok');
      setNotes(editingEquipment.notes || '');
    } else {
      setName('');
      setBrand('');
      setHours(0);
      setFuel(0);
      setMaintDue(250);
      setLastMaintHours(0);
      setMaintThresholdHours(25);
      setNextMaintenanceDate('');
      setStatus('ok');
      setNotes('');
    }
  }, [editingEquipment, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(
      {
        site: siteId,
        name: name.trim(),
        brand: brand.trim() || undefined,
        hours: Number(hours) || 0,
        fuel: Number(fuel) || 0,
        maintDue: Number(maintDue) || 250,
        lastMaintHours: Number(lastMaintHours) || 0,
        maintThresholdHours: Number(maintThresholdHours) || 25,
        nextMaintenanceDate: nextMaintenanceDate.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        maintenanceHistory: editingEquipment?.maintenanceHistory
      },
      editingEquipment?.id
    );
    onClose();
  };

  return (
    <div
      id="equipment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingEquipment ? 'Modifier l’engin' : 'Ajouter un engin ou matériel'}
              </h2>
              <p className="text-xs text-slate-400">
                Suivi horamètre, carburant & périodicité d'entretien
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nom / Type d'Engin *
            </label>
            <input
              id="equipment-name-input"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Pelle Hydraulique CAT 320D ou Bétonnière 350L"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Marque / Modèle
              </label>
              <input
                id="equipment-brand-input"
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Ex: Caterpillar, SDMO, IMER"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                État opérationnel
              </label>
              <select
                id="equipment-status-select"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
              >
                <option value="ok">🟢 Opérationnel</option>
                <option value="a_reviser">🟡 Révision à prévoir</option>
                <option value="en_panne">🔴 En panne / Arrêt</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Compteur horaire actuel (Heures) *
              </label>
              <div className="relative">
                <Gauge className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="equipment-hours-input"
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Niveau Carburant (Litres)
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="equipment-fuel-input"
                  type="number"
                  min="0"
                  step="any"
                  value={fuel}
                  onChange={e => setFuel(Number(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Périodicité Révision (Heures) *
              </label>
              <div className="relative">
                <Wrench className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="equipment-maint-input"
                  type="number"
                  required
                  min="10"
                  step="10"
                  value={maintDue}
                  onChange={e => setMaintDue(Number(e.target.value))}
                  placeholder="250"
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Dernière vidange / révision à (Heures)
              </label>
              <input
                id="equipment-lastmaint-input"
                type="number"
                min="0"
                step="any"
                value={lastMaintHours}
                onChange={e => setLastMaintHours(Number(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Seuil d'alerte anticipée (Heures restantes)
              </label>
              <input
                id="equipment-threshold-input"
                type="number"
                min="1"
                step="5"
                value={maintThresholdHours}
                onChange={e => setMaintThresholdHours(Number(e.target.value))}
                placeholder="25"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Déclenche l'alerte in-app dès qu'il reste {maintThresholdHours}h avant révision
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date Limite / Prochain Contrôle Technique
              </label>
              <input
                id="equipment-nextdate-input"
                type="date"
                value={nextMaintenanceDate}
                onChange={e => setNextMaintenanceDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Notes & Spécifications Entretien
            </label>
            <textarea
              id="equipment-notes-input"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Huile 15W40, filtre réf FT-89, graissage hebdomadaire cardans."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              id="save-equipment-btn"
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:shadow-lg transition-all"
            >
              {editingEquipment ? 'Mettre à jour' : 'Ajouter l’engin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
