import React, { useState, useMemo } from 'react';
import { Material, MaterialMovement, Site } from '../types';
import { formatNumber, formatCurrency, downloadFile } from '../utils/calculations';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  X,
  FileSpreadsheet,
  Package,
  Boxes,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Layers,
  ArrowUpDown,
  Tag,
  Clock
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface MaterialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  site: Site;
  movements: MaterialMovement[];
  onOpenMovementModal?: (material: Material, type: 'reception' | 'consommation') => void;
  onDeleteMovement?: (movementId: string) => void;
  currency?: string;
}

interface EnrichedMovement extends MaterialMovement {
  runningBalance: number;
}

export const MaterialHistoryModal: React.FC<MaterialHistoryModalProps> = ({
  isOpen,
  onClose,
  material,
  site,
  movements,
  onOpenMovementModal,
  onDeleteMovement,
  currency = 'DZD'
}) => {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'reception' | 'consommation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // If modal is closed or no material selected, don't render
  if (!isOpen || !material) return null;

  const currentRemaining = material.received - material.consumed;
  const isLowStock = material.minAlert ? currentRemaining <= material.minAlert : currentRemaining <= 0;
  const isOutOfStock = currentRemaining <= 0;
  const usagePercent =
    material.received > 0 ? Math.min(100, Math.round((material.consumed / material.received) * 100)) : 0;
  const stockFinancialValue = material.unitPrice ? currentRemaining * material.unitPrice : undefined;

  // Filter movements for this specific material and site
  const materialMovements = useMemo(() => {
    return (movements || []).filter(
      m => m.materialId === material.id && (!m.site || m.site === site.id)
    );
  }, [movements, material.id, site.id]);

  // Compute chronologically enriched movements with running balance
  const chronologicalMovements = useMemo<EnrichedMovement[]>(() => {
    // Sort strictly chronological (oldest to newest) to compute balance
    const sorted = [...materialMovements].sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.id || '').localeCompare(b.id || '');
    });

    let currentBal = material.initStock || 0;
    const enriched: EnrichedMovement[] = [];

    for (const mov of sorted) {
      if (mov.type === 'reception') {
        currentBal += mov.quantity;
      } else {
        currentBal -= mov.quantity;
      }
      enriched.push({
        ...mov,
        runningBalance: Math.round(currentBal * 100) / 100
      });
    }

    return enriched;
  }, [materialMovements, material.initStock]);

  // Counts for tabs
  const receptionCount = materialMovements.filter(m => m.type === 'reception').length;
  const consommationCount = materialMovements.filter(m => m.type === 'consommation').length;
  const totalReceptionsQty = materialMovements
    .filter(m => m.type === 'reception')
    .reduce((sum, m) => sum + m.quantity, 0);
  const totalConsommationsQty = materialMovements
    .filter(m => m.type === 'consommation')
    .reduce((sum, m) => sum + m.quantity, 0);

  // Filter and sort for display
  const displayedMovements = useMemo(() => {
    let result = [...chronologicalMovements];

    if (filterType !== 'all') {
      result = result.filter(m => m.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => {
        return (
          (m.note && m.note.toLowerCase().includes(q)) ||
          (m.bonRef && m.bonRef.toLowerCase().includes(q)) ||
          (m.date && m.date.includes(q)) ||
          String(m.quantity).includes(q)
        );
      });
    }

    // Sort order
    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [chronologicalMovements, filterType, searchQuery, sortOrder]);

  // CSV Export handler
  const handleExportCSV = () => {
    let csv = `HISTORIQUE DES MOUVEMENTS DE STOCK - ${material.name}\n`;
    csv += `Chantier: ${site.name};Catégorie: ${material.category || 'Général'};Unité: ${material.unit};Devise: ${currency}\n`;
    csv += `Stock Initial: ${material.initStock} ${material.unit};Cumul Reçu: ${material.received} ${material.unit};Cumul Consommé: ${material.consumed} ${material.unit};Stock Restant Actuel: ${currentRemaining} ${material.unit}\n`;
    csv += `Date d'extraction: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    csv += `Date;Type de Mouvement;Quantité;Unité;N° Bon / Réf;Notes & Affectation;Solde Après Mouvement\n`;

    chronologicalMovements.forEach(m => {
      const typeLabel = m.type === 'reception' ? 'ENTREE_RECEPTION' : 'SORTIE_CONSOMMATION';
      const qtySign = m.type === 'reception' ? `+${m.quantity}` : `-${m.quantity}`;
      csv += `"${m.date}";"${typeLabel}";"${qtySign}";"${material.unit}";"${m.bonRef || ''}";"${(m.note || '').replace(/"/g, '""')}";"${m.runningBalance}"\n`;
    });

    const safeName = material.name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadFile(
      `ChantierPro_Mouvements_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id: string) => {
    if (onDeleteMovement) {
      onDeleteMovement(id);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div
      id="material-history-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-history-title"
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-4.5 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shrink-0">
                <History className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="material-history-title"
                    className="text-lg font-black tracking-tight text-white truncate"
                  >
                    Historique des Mouvements
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700">
                    {material.category || 'Gros Œuvre'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-xs font-mono font-medium">
                    Unité : {material.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5">
                  <span className="font-semibold text-white">{material.name}</span> • Chantier :{' '}
                  <span className="text-slate-200 font-medium">{site.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-xs"
                title="Exporter l'historique complet en CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-xs"
                title="Imprimer cette fiche d'historique"
              >
                <Printer className="h-3.5 w-3.5 text-blue-400" />
                <span>Imprimer</span>
              </button>
              <button
                id="close-history-modal-btn"
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer (Échap)"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Stock Restant Actuel */}
            <div
              className={`rounded-xl p-3.5 border transition-all ${
                isOutOfStock
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : isLowStock
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-80">
                <span>Stock Restant</span>
                {isOutOfStock ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-800 text-[10px] font-black">
                    Rupture
                  </span>
                ) : isLowStock ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                    Alerte min ({material.minAlert})
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-black">
                    Stock OK
                  </span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1">
                {formatNumber(currentRemaining)}{' '}
                <span className="text-xs font-semibold opacity-75">{material.unit}</span>
              </div>
              <div className="text-[11px] opacity-75 mt-0.5">
                {stockFinancialValue !== undefined && (
                  <span>
                    Valeur : <strong>{formatCurrency(stockFinancialValue, currency)}</strong>
                  </span>
                )}
                {stockFinancialValue === undefined && (
                  <span>Seuil min d'alerte : {material.minAlert || 0} {material.unit}</span>
                )}
              </div>
            </div>

            {/* 2. Cumul Réceptions */}
            <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                  Total Réceptionné
                </span>
                <span className="text-slate-400 font-mono text-[10px]">{receptionCount} bons</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                +{formatNumber(material.received)}{' '}
                <span className="text-xs font-semibold text-slate-400">{material.unit}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Initial: {formatNumber(material.initStock)} + Mouvements: {formatNumber(totalReceptionsQty)}
              </div>
            </div>

            {/* 3. Cumul Consommations */}
            <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1 text-rose-700">
                  <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                  Total Consommé
                </span>
                <span className="text-slate-400 font-mono text-[10px]">{consommationCount} sorties</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                −{formatNumber(material.consumed)}{' '}
                <span className="text-xs font-semibold text-slate-400">{material.unit}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Taux de consommation : <strong>{usagePercent}%</strong>
              </div>
            </div>

            {/* 4. Stock Initial & Prix Unitaire */}
            <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                  Stock Départ
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {materialMovements.length} act.
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatNumber(material.initStock)}{' '}
                <span className="text-xs font-semibold text-slate-400">{material.unit}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {material.unitPrice ? (
                  <span>P.U. : {formatCurrency(material.unitPrice, currency)} / {material.unit}</span>
                ) : (
                  <span>Aucun prix unitaire renseigné</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="p-4 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs: All / Receptions / Consommations */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({materialMovements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('reception')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'reception'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>+ Réceptions ({receptionCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('consommation')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'consommation'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>− Sorties ({consommationCount})</span>
            </button>
          </div>

          {/* Search & Sort Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="search-history-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="N° bon, motif, date..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors shrink-0"
              title={sortOrder === 'desc' ? 'Plus récent en premier' : 'Plus ancien en premier'}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">
                {sortOrder === 'desc' ? 'Récent d’abord' : 'Ancien d’abord'}
              </span>
            </button>
          </div>
        </div>

        {/* MOVEMENTS TABLE / LIST BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
          {displayedMovements.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
                <Package className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {searchQuery || filterType !== 'all'
                  ? 'Aucun mouvement ne correspond aux filtres appliqués'
                  : 'Aucun mouvement spécifique enregistré pour ce matériau'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                {searchQuery || filterType !== 'all'
                  ? 'Essayez de modifier votre recherche ou de sélectionner le filtre "Tous".'
                  : `Le stock actuel (${currentRemaining} ${material.unit}) correspond au stock initial. Vous pouvez dès maintenant enregistrer une entrée fournisseur ou une sortie vers le chantier.`}
              </p>
              {onOpenMovementModal && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMovementModal(material, 'reception');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>+ Première Réception</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMovementModal(material, 'consommation');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>− Première Consommation</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Type de Mouvement</th>
                      <th className="p-3.5 text-right">Quantité</th>
                      <th className="p-3.5">N° Bon / Référence</th>
                      <th className="p-3.5">Détails & Destination</th>
                      <th className="p-3.5 text-center">Solde Reconstitué</th>
                      {onDeleteMovement && <th className="p-3.5 text-center w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedMovements.map(mov => {
                      const isReception = mov.type === 'reception';

                      return (
                        <tr
                          key={mov.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isReception ? 'hover:bg-emerald-50/20' : 'hover:bg-rose-50/20'
                          }`}
                        >
                          {/* Date */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{mov.date}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isReception ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Entrée / Réception</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                                <span>Sortie / Chantier</span>
                              </span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span
                              className={`text-sm font-black ${
                                isReception ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isReception ? '+' : '−'}
                              {formatNumber(mov.quantity)}{' '}
                              <span className="text-[11px] font-semibold text-slate-500">
                                {material.unit}
                              </span>
                            </span>
                          </td>

                          {/* Reference / Bon */}
                          <td className="p-3.5">
                            {mov.bonRef ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold border border-slate-200">
                                <FileText className="h-3 w-3 text-slate-500" />
                                <span>{mov.bonRef}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Non spécifié</span>
                            )}
                          </td>

                          {/* Note / Details */}
                          <td className="p-3.5 max-w-xs">
                            {mov.note ? (
                              <span className="text-slate-700 font-medium leading-snug line-clamp-2">
                                {mov.note}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* Running Balance */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-extrabold text-slate-800 text-xs border border-slate-200">
                              {formatNumber(mov.runningBalance)}{' '}
                              <span className="text-[10px] text-slate-500 font-normal">
                                {material.unit}
                              </span>
                            </span>
                          </td>

                          {/* Delete Action (if enabled) */}
                          {onDeleteMovement && (
                            <td className="p-3.5 text-center">
                              {confirmDeleteId === mov.id ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(mov.id)}
                                    className="p-1 rounded-md bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700"
                                    title="Confirmer la suppression"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 rounded-md bg-slate-200 text-slate-700 text-[10px] hover:bg-slate-300"
                                    title="Annuler"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(mov.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer ce mouvement"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Total : <strong>{displayedMovements.length}</strong> mouvement(s) affiché(s)
            </span>
            <span>•</span>
            <span>
              Solde actuel :{' '}
              <strong className={isLowStock ? 'text-rose-600' : 'text-slate-900'}>
                {formatNumber(currentRemaining)} {material.unit}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            {onOpenMovementModal && (
              <>
                <button
                  id="history-add-reception-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMovementModal(material, 'reception');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>+ Réception</span>
                </button>
                <button
                  id="history-add-conso-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMovementModal(material, 'consommation');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>− Consommation</span>
                </button>
              </>
            )}

            <button
              id="history-close-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
