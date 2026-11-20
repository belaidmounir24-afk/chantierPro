import React, { useState } from 'react';
import { Site, Material, Equipment, MaterialMovement } from '../types';
import { formatCurrency, formatNumber, exportMaterialsCSV } from '../utils/calculations';
import { calculateMaintenanceStatus } from '../utils/maintenanceNotifications';
import { MaterialHistoryModal } from './MaterialHistoryModal';
import {
  Boxes,
  Truck,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Fuel,
  Gauge,
  Wrench,
  Edit,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  History
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface MaterialsViewProps {
  site: Site;
  materials: Material[];
  equipment: Equipment[];
  materialMovements?: MaterialMovement[];
  onOpenMaterialModal: (material?: Material) => void;
  onOpenMovementModal: (material: Material, type: 'reception' | 'consommation') => void;
  onOpenEquipmentModal: (equipment?: Equipment) => void;
  onOpenMaintenanceModal?: (equipment: Equipment) => void;
  onUpdateEquipmentHours: (equipmentId: string, hours: number) => void;
  onUpdateEquipmentFuel: (equipmentId: string, fuel: number) => void;
  onDeleteMovement?: (movementId: string) => void;
  currency: string;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  site,
  materials,
  equipment,
  materialMovements = [],
  onOpenMaterialModal,
  onOpenMovementModal,
  onOpenEquipmentModal,
  onOpenMaintenanceModal,
  onUpdateEquipmentHours,
  onUpdateEquipmentFuel,
  onDeleteMovement,
  currency
}) => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'equipment'>('materials');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | 'alert' | 'ok'>('all');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<Material | null>(null);

  const handleOpenHistoryModal = (mat: Material) => {
    setSelectedMaterialForHistory(mat);
    setHistoryModalOpen(true);
  };

  const siteMaterials = materials.filter(m => m.site === site.id);
  const siteEquipment = equipment.filter(e => e.site === site.id);

  // Materials categories
  const categories = Array.from(new Set(siteMaterials.map(m => m.category || 'Gros Œuvre'))).sort();

  // Stock alerts
  const lowStockMaterials = siteMaterials.filter(m => {
    const remaining = m.received - m.consumed;
    return m.minAlert ? remaining <= m.minAlert : remaining <= 0;
  });

  // Maintenance alerts
  const dueMaintenanceEquipment = siteEquipment.filter(e => {
    const status = calculateMaintenanceStatus(e);
    return status.severity !== 'ok';
  });

  const filteredMaterials = siteMaterials.filter(m => {
    if (filterCategory && (m.category || 'Gros Œuvre') !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredEquipment = siteEquipment.filter(e => {
    const status = calculateMaintenanceStatus(e);
    if (equipmentFilter === 'alert' && status.severity === 'ok') return false;
    if (equipmentFilter === 'ok' && status.severity !== 'ok') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        (e.brand && e.brand.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleQuickHoursPrompt = (eq: Equipment) => {
    const input = prompt(`Mettre à jour le compteur d'heures pour ${eq.name} (actuel : ${eq.hours}h) :`, String(eq.hours));
    if (input !== null) {
      const val = parseFloat(input);
      if (!isNaN(val) && val >= 0) {
        onUpdateEquipmentHours(eq.id, val);
      }
    }
  };

  const handleQuickFuelPrompt = (eq: Equipment) => {
    const input = prompt(`Mettre à jour le carburant pour ${eq.name} (actuel : ${eq.fuel}L) :`, String(eq.fuel));
    if (input !== null) {
      const val = parseFloat(input);
      if (!isNaN(val) && val >= 0) {
        onUpdateEquipmentFuel(eq.id, val);
      }
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Top Switcher & Action Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-tabs toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="subtab-materials-btn"
            type="button"
            onClick={() => setActiveSubTab('materials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'materials'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-4 w-4 text-amber-500" />
            <span>Stock Matériaux ({siteMaterials.length})</span>
            {lowStockMaterials.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {lowStockMaterials.length}
              </span>
            )}
          </button>

          <button
            id="subtab-equipment-btn"
            type="button"
            onClick={() => setActiveSubTab('equipment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'equipment'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Engins & Matériel ({siteEquipment.length})</span>
            {dueMaintenanceEquipment.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {dueMaintenanceEquipment.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === 'materials' ? (
            <>
              <button
                id="export-materials-csv-btn"
                type="button"
                onClick={() => exportMaterialsCSV(site, siteMaterials)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold transition-colors border border-slate-200"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Stocks CSV
              </button>
              <button
                id="add-material-btn"
                type="button"
                onClick={() => onOpenMaterialModal()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                + Nouveau Matériau
              </button>
            </>
          ) : (
            <button
              id="add-equipment-btn"
              type="button"
              onClick={() => onOpenEquipmentModal()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              + Nouvel Engin
            </button>
          )}
        </div>
      </div>

      {/* MATERIALS TAB CONTENT */}
      {activeSubTab === 'materials' && (
        <div className="space-y-4">
          {/* Low stock alert banner */}
          {lowStockMaterials.length > 0 && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <strong className="font-bold">Alerte Réapprovisionnement nécessaire :</strong>{' '}
                  {lowStockMaterials.map(m => `${m.name} (${m.received - m.consumed} ${m.unit})`).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Search and Category Filter */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-materials-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un matériau (ciment, sable, acier...)"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
              >
                <option value="">Toutes les catégories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Materials Table & Cards */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3.5">Matériau</th>
                    <th className="p-3.5">Catégorie</th>
                    <th className="p-3.5 text-center">Cumul Reçu</th>
                    <th className="p-3.5 text-center">Cumul Consommé</th>
                    <th className="p-3.5 text-center font-extrabold text-slate-900">Stock Restant</th>
                    <th className="p-3.5 text-center">Niveau</th>
                    <th className="p-3.5 text-center">Mouvements Rapides</th>
                    <th className="p-3.5 text-center">Historique</th>
                    <th className="p-3.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        Aucun matériau trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map(mat => {
                      const remaining = mat.received - mat.consumed;
                      const isLow = mat.minAlert ? remaining <= mat.minAlert : remaining <= 0;
                      const usagePercent = mat.received > 0 ? Math.min(100, Math.round((mat.consumed / mat.received) * 100)) : 0;
                      const matMovementsCount = materialMovements.filter(
                        m => m.materialId === mat.id && (!m.site || m.site === site.id)
                      ).length;

                      return (
                        <tr
                          key={mat.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}
                        >
                          <td
                            className="p-3.5 font-bold text-slate-900 cursor-pointer"
                            onClick={() => handleOpenHistoryModal(mat)}
                            title="Cliquer pour afficher l'historique complet des mouvements"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">🧱</span>
                              <div>
                                <span className="hover:text-blue-600 transition-colors underline-offset-2 hover:underline">
                                  {mat.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal block">
                                  Unité : {mat.unit}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-medium text-slate-600">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {mat.category || 'Gros Œuvre'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-semibold text-slate-700">
                            {formatNumber(mat.received)} <span className="text-[10px] text-slate-400">{mat.unit}</span>
                          </td>

                          <td className="p-3.5 text-center font-semibold text-slate-700">
                            {formatNumber(mat.consumed)} <span className="text-[10px] text-slate-400">{mat.unit}</span>
                          </td>

                          <td
                            className="p-3.5 text-center cursor-pointer"
                            onClick={() => handleOpenHistoryModal(mat)}
                            title="Cliquer pour afficher l'historique complet des mouvements"
                          >
                            <span
                              className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                                isLow
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {formatNumber(remaining)} {mat.unit}
                            </span>
                            {isLow && (
                              <span className="text-[10px] text-rose-600 font-bold block mt-1">
                                ⚠️ Seuil min ({mat.minAlert || 0})
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center min-w-28">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {usagePercent}% consommé
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`reception-btn-${mat.id}`}
                                type="button"
                                onClick={() => onOpenMovementModal(mat, 'reception')}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold shadow-2xs transition-colors"
                                title="Enregistrer une réception fournisseur"
                              >
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                <span>+ Récep.</span>
                              </button>
                              <button
                                id={`conso-btn-${mat.id}`}
                                type="button"
                                onClick={() => onOpenMovementModal(mat, 'consommation')}
                                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 text-xs font-bold shadow-2xs transition-colors"
                                title="Enregistrer une consommation sur chantier"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                <span>− Conso.</span>
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              id={`history-btn-${mat.id}`}
                              type="button"
                              onClick={() => handleOpenHistoryModal(mat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-2xs group"
                              title={`Consulter l'historique complet des mouvements pour ${mat.name}`}
                            >
                              <History className="h-3.5 w-3.5 text-blue-600 group-hover:rotate-[-30deg] transition-transform" />
                              <span>Historique</span>
                              {matMovementsCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
                                  {matMovementsCount}
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => onOpenMaterialModal(mat)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier ce matériau"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT TAB CONTENT */}
      {activeSubTab === 'equipment' && (
        <div className="space-y-4">
          {/* Active Maintenance Alert Banner if issues exist */}
          {dueMaintenanceEquipment.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300 p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white font-bold animate-pulse shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {dueMaintenanceEquipment.length} {t('materials.equipmentAlertTitle', 'engin(s) nécessitent un entretien ou atteignent leur seuil')}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {t('materials.equipmentAlertDesc', 'Consultez les compteurs et enregistrez les vidanges/révisions pour réinitialiser le cycle.')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEquipmentFilter('alert')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {t('materials.filterDueOnly', 'Afficher les alertes')} ({dueMaintenanceEquipment.length})
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Parc d'Engins & Matériel de Chantier</span>
                  <span className="text-xs font-medium text-slate-500">({siteEquipment.length} engins)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Cliquez sur les valeurs de compteur ou carburant pour ajustement rapide
                </p>
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEquipmentFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    equipmentFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Tous ({siteEquipment.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentFilter('alert')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    equipmentFilter === 'alert'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span>Alertes ({dueMaintenanceEquipment.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentFilter('ok')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    equipmentFilter === 'ok'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>À jour ({siteEquipment.length - dueMaintenanceEquipment.length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3.5">Engin / Machine</th>
                    <th className="p-3.5">Marque / Réf</th>
                    <th className="p-3.5 text-center">Compteur Horamètre</th>
                    <th className="p-3.5 text-center">Carburant Réservoir</th>
                    <th className="p-3.5">Cycle & Progression Révision</th>
                    <th className="p-3.5 text-center">Statut Entretien</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {equipmentFilter === 'alert'
                          ? 'Aucune alerte d’entretien active sur ce chantier 🎉'
                          : 'Aucun engin enregistré pour ce chantier.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map(eq => {
                      const maintStatus = calculateMaintenanceStatus(eq);
                      const isUrgent = maintStatus.severity === 'urgent';
                      const isWarning = maintStatus.severity === 'warning';

                      return (
                        <tr
                          key={eq.id}
                          className={`transition-colors ${
                            isUrgent
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : isWarning
                              ? 'bg-amber-50/30 hover:bg-amber-50/60'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                                  isUrgent
                                    ? 'bg-rose-600 text-white'
                                    : isWarning
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                <Truck className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-sm block">{eq.name}</span>
                                {eq.notes && (
                                  <span className="text-[10px] font-normal text-slate-500 truncate max-w-xs block">
                                    {eq.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-medium text-slate-600">
                            {eq.brand || '—'}
                          </td>

                          <td
                            className="p-3.5 text-center cursor-pointer hover:bg-blue-50/50 transition-colors rounded-lg"
                            onClick={() => handleQuickHoursPrompt(eq)}
                            title="Cliquer pour ajuster le compteur horaire"
                          >
                            <span className="font-extrabold text-slate-900 text-sm">
                              {eq.hours} h
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold block">
                              ✏️ Modifier
                            </span>
                          </td>

                          <td
                            className="p-3.5 text-center cursor-pointer hover:bg-amber-50/50 transition-colors rounded-lg"
                            onClick={() => handleQuickFuelPrompt(eq)}
                            title="Cliquer pour ajuster le niveau de carburant"
                          >
                            <span className="font-extrabold text-slate-900 text-sm">
                              {eq.fuel} L
                            </span>
                            <span className="text-[10px] text-amber-600 font-bold block">
                              ✏️ Modifier
                            </span>
                          </td>

                          {/* Progress bar towards next cycle */}
                          <td className="p-3.5 min-w-[170px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                <span>Cycle {eq.maintDue}h</span>
                                <span
                                  className={
                                    isUrgent
                                      ? 'text-rose-600 font-bold'
                                      : isWarning
                                      ? 'text-amber-600 font-bold'
                                      : 'text-slate-700 font-bold'
                                  }
                                >
                                  {maintStatus.hoursRemaining <= 0
                                    ? `+${Math.abs(maintStatus.hoursRemaining)}h dépassé`
                                    : `Reste ${maintStatus.hoursRemaining}h`}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isUrgent
                                      ? 'bg-rose-600'
                                      : isWarning
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, maintStatus.percentOfCycle)}%` }}
                                />
                              </div>
                              {eq.nextMaintenanceDate && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-purple-600" />
                                  <span>Échéance : <strong>{eq.nextMaintenanceDate}</strong></span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            {isUrgent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>RÉVISION DÉPASSÉE</span>
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="h-3.5 w-3.5" />
                                <span>SEUIL ATTEINT</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>À JOUR</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenMaintenanceModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenMaintenanceModal(eq)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                                  title="Enregistrer une vidange ou révision"
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Entretien</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenEquipmentModal(eq)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifier la fiche engin"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Material Movements History Modal */}
      {selectedMaterialForHistory && (
        <MaterialHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          material={selectedMaterialForHistory}
          site={site}
          movements={materialMovements.filter(
            m => m.materialId === selectedMaterialForHistory.id && (!m.site || m.site === site.id)
          )}
          onOpenMovementModal={(mat, type) => {
            setHistoryModalOpen(false);
            onOpenMovementModal(mat, type);
          }}
          onDeleteMovement={onDeleteMovement}
          currency={currency}
        />
      )}
    </div>
  );
};
