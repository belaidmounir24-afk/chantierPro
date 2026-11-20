import React, { useState, useEffect } from 'react';
import { Site } from '../types';
import { X, Building2, MapPin, User, Calendar, Coins } from 'lucide-react';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: Omit<Site, 'id'>, editId?: string) => void;
  editingSite?: Site | null;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSite
}) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [radius, setRadius] = useState(150);
  const [budget, setBudget] = useState<number | ''>('');
  const [currency, setCurrency] = useState('DZD');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<'en_cours' | 'termine' | 'en_pause'>('en_cours');

  useEffect(() => {
    if (editingSite) {
      setName(editingSite.name);
      setClient(editingSite.client || '');
      setAddress(editingSite.address || '');
      setSupervisor(editingSite.supervisor || '');
      setRadius(editingSite.radius || 150);
      setBudget(editingSite.budget || '');
      setCurrency(editingSite.currency || 'DZD');
      setStartDate(editingSite.startDate || '');
      setStatus(editingSite.status || 'en_cours');
    } else {
      setName('');
      setClient('');
      setAddress('');
      setSupervisor('');
      setRadius(150);
      setBudget('');
      setCurrency('DZD');
      setStartDate(new Date().toISOString().slice(0, 10));
      setStatus('en_cours');
    }
  }, [editingSite, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      {
        name: name.trim(),
        client: client.trim(),
        address: address.trim(),
        supervisor: supervisor.trim(),
        radius: Number(radius) || 150,
        budget: budget === '' ? undefined : Number(budget),
        currency,
        startDate: startDate || undefined,
        status
      },
      editingSite?.id
    );
    onClose();
  };

  return (
    <div
      id="site-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-900 font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingSite ? 'Modifier le chantier' : 'Nouveau Chantier'}
              </h2>
              <p className="text-xs text-slate-400">
                Paramètres généraux & localisation
              </p>
            </div>
          </div>
          <button
            id="close-site-modal-btn"
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
              Nom du Chantier *
            </label>
            <input
              id="site-name-input"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Résidence Les Oliviers — R+3"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Client / Maître d'ouvrage
              </label>
              <input
                id="site-client-input"
                type="text"
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="Ex: Promotion El-Boustan"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Conducteur / Chef de Chantier
              </label>
              <input
                id="site-supervisor-input"
                type="text"
                value={supervisor}
                onChange={e => setSupervisor(e.target.value)}
                placeholder="Ex: Ing. Mourad Khelifi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Adresse / Localisation
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="site-address-input"
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex: Lotissement 14, Zone Ouest, Blida"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Rayon GPS (mètres)
              </label>
              <input
                id="site-radius-input"
                type="number"
                min="20"
                max="5000"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date de début
              </label>
              <input
                id="site-startdate-input"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Statut
              </label>
              <select
                id="site-status-select"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              >
                <option value="en_cours">🟢 En cours</option>
                <option value="en_pause">🟠 En pause</option>
                <option value="termine">🔵 Terminé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Budget prévisionnel
              </label>
              <input
                id="site-budget-input"
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 85000000"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Devise
              </label>
              <select
                id="site-currency-select"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
              >
                <option value="DZD">DZD (Dinar Algérien)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MAD">MAD (Dirham)</option>
                <option value="TND">TND (Dinar Tunisien)</option>
                <option value="USD">USD ($)</option>
                <option value="XOF">FCFA (Franc CFA)</option>
              </select>
            </div>
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
              id="save-site-btn"
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-md hover:shadow-lg transition-all"
            >
              {editingSite ? 'Enregistrer les modifications' : 'Créer le chantier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
