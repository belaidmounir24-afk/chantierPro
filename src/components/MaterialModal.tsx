import React, { useState, useEffect } from 'react';
import { Material } from '../types';
import { UNITS_LIST } from '../services/storage';
import { X, PackagePlus, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Omit<Material, 'id'>, editId?: string) => void;
  editingMaterial?: Material | null;
  siteId: string;
  currency: string;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMaterial,
  siteId,
  currency
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gros Œuvre');
  const [unit, setUnit] = useState(UNITS_LIST[0]);
  const [initStock, setInitStock] = useState<number>(0);
  const [received, setReceived] = useState<number>(0);
  const [consumed, setConsumed] = useState<number>(0);
  const [minAlert, setMinAlert] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');

  useEffect(() => {
    if (editingMaterial) {
      setName(editingMaterial.name);
      setCategory(editingMaterial.category || 'Gros Œuvre');
      setUnit(editingMaterial.unit);
      setInitStock(editingMaterial.initStock);
      setReceived(editingMaterial.received);
      setConsumed(editingMaterial.consumed);
      setMinAlert(editingMaterial.minAlert || 10);
      setUnitPrice(editingMaterial.unitPrice || '');
    } else {
      setName('');
      setCategory('Gros Œuvre');
      setUnit(UNITS_LIST[0]);
      setInitStock(0);
      setReceived(0);
      setConsumed(0);
      setMinAlert(10);
      setUnitPrice('');
    }
  }, [editingMaterial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(
      {
        site: siteId,
        name: name.trim(),
        category: category.trim(),
        unit: unit.trim(),
        initStock: Number(initStock) || 0,
        received: editingMaterial ? Number(received) || 0 : Number(initStock) || 0,
        consumed: editingMaterial ? Number(consumed) || 0 : 0,
        minAlert: Number(minAlert) || 0,
        unitPrice: unitPrice === '' ? undefined : Number(unitPrice)
      },
      editingMaterial?.id
    );
    onClose();
  };

  return (
    <div
      id="material-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingMaterial ? 'Modifier le matériau' : 'Ajouter un matériau au stock'}
              </h2>
              <p className="text-xs text-slate-400">
                Suivi des approvisionnements & seuils d'alerte
              </p>
            </div>
          </div>
          <button
            id="close-material-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Désignation du Matériau *
            </label>
            <input
              id="material-name-input"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Ciment CPJ 42.5 ou Sable 0/4"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Catégorie
              </label>
              <select
                id="material-category-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
              >
                <option value="Gros Œuvre">Gros Œuvre / Liants</option>
                <option value="Granulats">Granulats (Sable, Gravier)</option>
                <option value="Armatures">Armatures & Aciers</option>
                <option value="Maçonnerie">Briques / Parpaings</option>
                <option value="Finition">Plâtre / Peinture / Enduit</option>
                <option value="Plomberie & Fluides">Plomberie & Fluides</option>
                <option value="Électricité">Électricité & Câblage</option>
                <option value="Bois & Coffrage">Bois & Étais de coffrage</option>
                <option value="Autre">Autre consommable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unité de mesure *
              </label>
              <select
                id="material-unit-select"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
              >
                {UNITS_LIST.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Stock initial ({unit})
              </label>
              <input
                id="material-init-input"
                type="number"
                min="0"
                step="any"
                value={initStock}
                onChange={e => setInitStock(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Seuil d'alerte stock bas ({unit})
              </label>
              <input
                id="material-minalert-input"
                type="number"
                min="0"
                step="any"
                value={minAlert}
                onChange={e => setMinAlert(Number(e.target.value))}
                placeholder="10"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Prix unitaire estimé ({currency} / {unit})
            </label>
            <input
              id="material-price-input"
              type="number"
              min="0"
              step="any"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 650"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
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
              id="save-material-btn"
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:shadow-lg transition-all"
            >
              {editingMaterial ? 'Mettre à jour' : 'Ajouter au stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  type: 'reception' | 'consommation';
  onConfirm: (materialId: string, quantity: number, note?: string) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  material,
  type,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [note, setNote] = useState('');

  if (!isOpen || !material) return null;

  const currentRemaining = material.received - material.consumed;
  const isReception = type === 'reception';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;

    if (!isReception && qty > currentRemaining) {
      alert(`Stock insuffisant ! Le stock actuel est de ${currentRemaining} ${material.unit}.`);
      return;
    }

    onConfirm(material.id, qty, note.trim() || undefined);
    setQuantity('');
    setNote('');
    onClose();
  };

  return (
    <div
      id="movement-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            isReception ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-bold">
              {isReception ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isReception ? 'Réception Matériau' : 'Sortie / Consommation'}
              </h2>
              <p className="text-xs text-white/80">
                {material.name} (Stock: {currentRemaining} {material.unit})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Quantité {isReception ? 'réceptionnée' : 'consommée'} ({material.unit}) *
            </label>
            <input
              id="movement-quantity-input"
              type="number"
              required
              autoFocus
              min="0.1"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={`Ex: 50 ${material.unit}`}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-lg font-bold text-slate-900 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {isReception ? 'N° Bon de livraison / Fournisseur' : 'Zone de destination / Ouvrage'}
            </label>
            <input
              id="movement-note-input"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isReception ? 'Ex: BL N°4492 - Cimenterie Lafarge' : 'Ex: Coulage voiles R+3'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              id="confirm-movement-btn"
              type="submit"
              className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all ${
                isReception ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirmer le mouvement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
