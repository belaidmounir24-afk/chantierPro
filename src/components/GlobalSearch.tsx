import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChantierDb, Site, Worker, Material, Equipment, DailyExpense, TabType } from '../types';
import {
  Search,
  X,
  Users,
  Boxes,
  Truck,
  HandCoins,
  Building2,
  ArrowRight,
  UserPlus,
  Wrench,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Tag,
  MapPin,
  Clock,
  Gauge,
  CornerDownLeft,
  Sparkles,
  Download,
  FileText,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { calculateMaintenanceStatus } from '../utils/maintenanceNotifications';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';

export type SearchCategory = 'all' | 'ai' | 'workers' | 'materials' | 'equipment' | 'expenses' | 'sites';

export interface SearchResultItem {
  id: string;
  type: 'worker' | 'material' | 'equipment' | 'expense' | 'site' | 'ai' | 'command';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: 'amber' | 'blue' | 'purple' | 'emerald' | 'rose' | 'slate';
  siteName: string;
  siteId: string;
  meta: string;
  isAlert?: boolean;
  raw?: Worker | Material | Equipment | DailyExpense | Site | any;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  activeSiteId: string;
  onSelectSite: (siteId: string) => void;
  onSelectTab: (tab: TabType) => void;
  onOpenWorkerModal?: (worker?: Worker) => void;
  onOpenAdvanceModal?: (worker: Worker) => void;
  onOpenMaterialModal?: (material?: Material) => void;
  onOpenMovementModal?: (material: Material, type: 'reception' | 'consommation') => void;
  onOpenEquipmentModal?: (equipment?: Equipment) => void;
  onOpenMaintenanceModal?: (equipment: Equipment) => void;
  onOpenExpenseModal?: (expense?: DailyExpense) => void;
  onQuickExport?: () => void;
  onQuickPdf?: () => void;
  onOpenBackupModal?: () => void;
  currency?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  db,
  activeSiteId,
  onSelectSite,
  onSelectTab,
  onOpenWorkerModal,
  onOpenAdvanceModal,
  onOpenMaterialModal,
  onOpenMovementModal,
  onOpenEquipmentModal,
  onOpenMaintenanceModal,
  onOpenExpenseModal,
  onQuickExport,
  onQuickPdf,
  onOpenBackupModal,
  currency = 'DZD'
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open & reset state
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setCategory('all');
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K / Escape / Arrow navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Ensure scroll follows selectedIndex
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Build searchable index
  const siteMap = useMemo(() => {
    const map: Record<string, string> = {};
    db.sites.forEach(s => {
      map[s.id] = s.name;
    });
    return map;
  }, [db.sites]);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    db.teams.forEach(tm => {
      map[tm.id] = tm.name;
    });
    return map;
  }, [db.teams]);

  // Compute all matching items
  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // 0. Quick Slash Commands (/exporter, /pdf, /supprimer)
    if (category === 'all') {
      const commands = [
        {
          id: 'cmd_exporter',
          title: '/exporter — Sauvegarde Intégrale JSON',
          subtitle: 'Télécharge immédiatement la sauvegarde JSON de tous vos chantiers et comptes',
          badgeText: 'Commande /exporter',
          badgeColor: 'emerald' as const,
          keywords: '/exporter exporter sauvegarde json backup donnees',
          meta: 'Sécurité des données'
        },
        {
          id: 'cmd_pdf',
          title: '/pdf — Générer & Imprimer le Rapport PDF',
          subtitle: 'Ouvre le rapport officiel prêt à imprimer ou enregistrer en PDF (rafraîchit le rendu)',
          badgeText: 'Commande /pdf',
          badgeColor: 'rose' as const,
          keywords: '/pdf pdf rapport imprimer export',
          meta: 'Rapport & Impression'
        },
        {
          id: 'cmd_backup_modal',
          title: 'Sauvegarde & Supprimer tous les comptes',
          subtitle: 'Ouvre la fenêtre Sauvegarde JSON, HTML Autonome et Réinitialisation des comptes',
          badgeText: 'Gestion Comptes',
          badgeColor: 'amber' as const,
          keywords: '/supprimer supprimer comptes reset reinitialiser vierge backup autonome',
          meta: 'Paramètres & Comptes'
        }
      ];

      commands.forEach(cmd => {
        if (q && (cmd.keywords.includes(q) || cmd.title.toLowerCase().includes(q) || q.startsWith('/'))) {
          items.push({
            id: cmd.id,
            type: 'command',
            title: cmd.title,
            subtitle: cmd.subtitle,
            badgeText: cmd.badgeText,
            badgeColor: cmd.badgeColor,
            siteName: siteMap[activeSiteId] || 'Chantier Actif',
            siteId: activeSiteId,
            meta: cmd.meta,
            raw: { commandId: cmd.id }
          });
        }
      });
    }

    // 1. Workers
    if (category === 'all' || category === 'workers') {
      db.workers.forEach(w => {
        const teamName = w.team ? (teamMap[w.team] || w.team) : '';
        const siteName = siteMap[w.site] || 'Chantier';
        const matchString = `${w.name} ${w.craft || ''} ${w.phone || ''} ${w.cin || ''} ${teamName} ${siteName} ${w.notes || ''}`.toLowerCase();

        if (!q || matchString.includes(q)) {
          items.push({
            id: `w_${w.id}`,
            type: 'worker',
            title: w.name,
            subtitle: `${w.craft || 'Ouvrier'} · ${teamName || 'Sans équipe'}`,
            badgeText: w.active ? (w.rateType === 'jour' ? `${w.rate} ${currency}/j` : `${w.rate} ${currency}/h`) : 'Inactif',
            badgeColor: w.active ? 'blue' : 'slate',
            siteName,
            siteId: w.site,
            meta: w.phone ? `Tél: ${w.phone}` : (w.cin ? `CIN: ${w.cin}` : ''),
            raw: w
          });
        }
      });
    }

    // 2. Materials
    if (category === 'all' || category === 'materials') {
      db.materials.forEach(m => {
        const siteName = siteMap[m.site] || 'Chantier';
        const stock = (m.received || 0) - (m.consumed || 0);
        const isAlert = m.minAlert ? stock <= m.minAlert : stock <= 0;
        const matchString = `${m.name} ${m.category || ''} ${siteName}`.toLowerCase();

        if (!q || matchString.includes(q)) {
          items.push({
            id: `m_${m.id}`,
            type: 'material',
            title: m.name,
            subtitle: `${m.category || 'Général'} · Stock chantier`,
            badgeText: `${stock} ${m.unit}`,
            badgeColor: isAlert ? 'rose' : 'emerald',
            siteName,
            siteId: m.site,
            isAlert,
            meta: isAlert ? `⚠️ Seuil critique (${m.minAlert || 0} ${m.unit})` : `P.U.: ${m.unitPrice || 0} ${currency}`,
            raw: m
          });
        }
      });
    }

    // 3. Equipment / Engins
    if (category === 'all' || category === 'equipment') {
      db.equipment.forEach(e => {
        const siteName = siteMap[e.site] || 'Chantier';
        const status = calculateMaintenanceStatus(e);
        const matchString = `${e.name} ${e.brand || ''} ${e.notes || ''} ${siteName}`.toLowerCase();

        if (!q || matchString.includes(q)) {
          items.push({
            id: `e_${e.id}`,
            type: 'equipment',
            title: e.name,
            subtitle: `${e.brand || 'Engin / Matériel'} · Fréquence: ${e.maintDue || 250}h`,
            badgeText: status.severity === 'urgent' ? 'Alerte Entretien' : status.severity === 'warning' ? 'Entretien Proche' : 'Opérationnel',
            badgeColor: status.severity === 'urgent' ? 'rose' : status.severity === 'warning' ? 'amber' : 'purple',
            siteName,
            siteId: e.site,
            isAlert: status.severity === 'urgent',
            meta: `${e.hours || 0} h compteur · Carburant: ${e.fuel || 0}%`,
            raw: e
          });
        }
      });
    }

    // 4. Caisse & Dépenses
    if (category === 'all' || category === 'expenses') {
      (db.expenses || []).slice(-50).forEach(exp => {
        const siteName = siteMap[exp.site] || 'Chantier';
        const matchString = `${exp.category} ${exp.beneficiary || ''} ${exp.note || ''} ${exp.paymentMethod || ''} ${siteName} ${exp.receiptRef || ''}`.toLowerCase();

        if (!q || matchString.includes(q)) {
          items.push({
            id: `exp_${exp.id}`,
            type: 'expense',
            title: exp.note ? `${exp.category} - ${exp.note}` : exp.category,
            subtitle: `${exp.category} · ${exp.beneficiary ? `Bénéficiaire: ${exp.beneficiary}` : exp.date}`,
            badgeText: formatCurrency(exp.amount, currency),
            badgeColor: 'amber',
            siteName,
            siteId: exp.site,
            meta: `${exp.date} · ${exp.paymentMethod || 'Espèces'}`,
            raw: exp
          });
        }
      });
    }

    // 5. Sites / Chantiers
    if (category === 'all' || category === 'sites') {
      db.sites.forEach(s => {
        const matchString = `${s.name} ${s.client || ''} ${s.address || ''} ${s.supervisor || ''}`.toLowerCase();

        if (!q || matchString.includes(q)) {
          items.push({
            id: `s_${s.id}`,
            type: 'site',
            title: s.name,
            subtitle: s.client ? `Client: ${s.client}` : (s.address || 'Chantier'),
            badgeText: s.id === activeSiteId ? 'Chantier Actif' : 'Chantier',
            badgeColor: s.id === activeSiteId ? 'emerald' : 'slate',
            siteName: s.name,
            siteId: s.id,
            meta: s.supervisor ? `Resp: ${s.supervisor}` : (s.address || ''),
            raw: s
          });
        }
      });
    }

    // 6. AI Tools & Features
    if (category === 'all' || category === 'ai') {
      const aiTools = [
        {
          id: 'ai_audit',
          title: 'Audit & Diagnostic IA Chantier',
          subtitle: 'Analyse 360° des présences, consommations, finances et prédictions de risques',
          keywords: 'ia ai audit diagnostic sante risques previsions meteo gemini intelligence'
        },
        {
          id: 'ai_report',
          title: 'Générateur de PV Journalier IA',
          subtitle: 'Rédige le procès-verbal de chantier exécutif à partir des pointages et dépenses',
          keywords: 'ia ai pv journal rapport compte rendu journalier rediger'
        },
        {
          id: 'ai_copilot',
          title: 'Copilot & Conseiller BTP IA',
          subtitle: 'Assistant expert en dosages béton, DTU, normes de sécurité et cadences',
          keywords: 'ia ai copilot chat dosage beton calcul regles dtu securite assistant'
        },
        {
          id: 'ai_estimator',
          title: 'Calculateur Quantités & Devis IA',
          subtitle: 'Calcul des métrés béton, ciment, acier, sable et temps de travail prévisionnel',
          keywords: 'ia ai devis quantites metree cubature materiaux beton acier'
        },
        {
          id: 'ai_scanner',
          title: 'Scanner IA Factures & Bons de Caisse',
          subtitle: 'Extraction OCR automatique des tickets de carburant et quincaillerie',
          keywords: 'ia ai scanner facture recu ticket bon caisse extraction ocr'
        }
      ];

      aiTools.forEach(tool => {
        if (!q || tool.title.toLowerCase().includes(q) || tool.keywords.includes(q)) {
          items.push({
            id: tool.id,
            type: 'ai',
            title: tool.title,
            subtitle: tool.subtitle,
            badgeText: 'Moteur IA',
            badgeColor: 'amber',
            siteName: siteMap[activeSiteId] || 'Chantier Actif',
            siteId: activeSiteId,
            meta: 'Gemini Pro BTP',
            raw: { toolId: tool.id }
          });
        }
      });
    }

    return items;
  }, [db, query, category, siteMap, teamMap, currency, activeSiteId]);

  // Counts by category
  const counts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let wCount = 0;
    let mCount = 0;
    let eCount = 0;
    let expCount = 0;
    let sCount = 0;
    let aiCount = 5;

    db.workers.forEach(w => {
      const match = `${w.name} ${w.craft || ''} ${w.phone || ''} ${w.cin || ''}`.toLowerCase();
      if (!q || match.includes(q)) wCount++;
    });

    db.materials.forEach(m => {
      const match = `${m.name} ${m.category || ''}`.toLowerCase();
      if (!q || match.includes(q)) mCount++;
    });

    db.equipment.forEach(e => {
      const match = `${e.name} ${e.brand || ''}`.toLowerCase();
      if (!q || match.includes(q)) eCount++;
    });

    (db.expenses || []).forEach(exp => {
      const match = `${exp.category} ${exp.beneficiary || ''} ${exp.note || ''}`.toLowerCase();
      if (!q || match.includes(q)) expCount++;
    });

    db.sites.forEach(s => {
      const match = `${s.name} ${s.client || ''} ${s.address || ''}`.toLowerCase();
      if (!q || match.includes(q)) sCount++;
    });

    return {
      all: wCount + mCount + eCount + expCount + sCount + (q ? (q.includes('ia') || q.includes('ai') ? 5 : 2) : 5),
      ai: aiCount,
      workers: wCount,
      materials: mCount,
      equipment: eCount,
      expenses: expCount,
      sites: sCount
    };
  }, [db, query]);

  // Selection handler
  const handleSelectItem = (item: SearchResultItem) => {
    triggerHaptic('medium');
    // Switch site if item belongs to another site
    if (item.siteId && item.siteId !== activeSiteId) {
      onSelectSite(item.siteId);
    }

    switch (item.type) {
      case 'command':
        if (item.id === 'cmd_exporter' && onQuickExport) {
          onQuickExport();
        } else if (item.id === 'cmd_pdf' && onQuickPdf) {
          onQuickPdf();
        } else if (item.id === 'cmd_backup_modal' && onOpenBackupModal) {
          onOpenBackupModal();
        }
        break;
      case 'worker':
        onSelectTab('team');
        break;
      case 'material':
        onSelectTab('mat');
        break;
      case 'equipment':
        onSelectTab('mat');
        break;
      case 'expense':
        onSelectTab('caisse');
        break;
      case 'site':
        onSelectTab('dash');
        break;
      case 'ai':
        onSelectTab('ai');
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-16 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div
        id="global-search-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t('search.placeholder', 'Rechercher un ouvrier, un matériel, un engin, une dépense...')}
            className="flex-1 bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 focus:outline-none text-sm sm:text-base font-semibold"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-x-auto text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('common.all', 'Tous')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('ai');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'ai'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>IA & Outils</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.ai})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('workers');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'workers'
                ? 'bg-blue-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('nav.payroll', 'Ouvriers')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.workers})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('materials');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'materials'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{t('nav.materials', 'Matériaux')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.materials})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('equipment');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'equipment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{t('search.equipment', 'Engins & Matériel')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.equipment})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('expenses');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'expenses'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>{t('nav.expenses', 'Caisse')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.expenses})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('sites');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              category === 'sites'
                ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('app.site', 'Chantiers')}</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.sites})</span>
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {results.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('search.noResults', 'Aucun résultat trouvé')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {t('search.noResultsDesc', 'Essayez avec un nom d\'ouvrier, un matériau, une immatriculation ou un libellé de dépense.')}
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon by Type */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'worker'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : item.type === 'material'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : item.type === 'equipment'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          : item.type === 'expense'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : item.type === 'ai'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                          : item.type === 'command'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.type === 'worker' && <Users className="w-5 h-5" />}
                      {item.type === 'material' && <Boxes className="w-5 h-5" />}
                      {item.type === 'equipment' && <Truck className="w-5 h-5" />}
                      {item.type === 'expense' && <HandCoins className="w-5 h-5" />}
                      {item.type === 'site' && <Building2 className="w-5 h-5" />}
                      {item.type === 'ai' && <Sparkles className="w-5 h-5" />}
                      {item.type === 'command' && (
                        item.id === 'cmd_exporter' ? <Download className="w-5 h-5" /> :
                        item.id === 'cmd_pdf' ? <FileText className="w-5 h-5" /> :
                        <Trash2 className="w-5 h-5" />
                      )}
                    </div>

                    {/* Titles */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>

                        {/* Type Tag */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${
                            item.badgeColor === 'rose'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : item.badgeColor === 'emerald'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : item.badgeColor === 'blue'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : item.badgeColor === 'purple'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : item.badgeColor === 'amber'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {item.badgeText}
                        </span>

                        {/* Site Badge */}
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{item.siteName}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <span>{item.subtitle}</span>
                        {item.meta && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className={item.isAlert ? 'text-rose-500 font-bold' : ''}>{item.meta}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct Context Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {item.type === 'worker' && onOpenAdvanceModal && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          if (item.siteId !== activeSiteId) onSelectSite(item.siteId);
                          onOpenAdvanceModal(item.raw as Worker);
                          onClose();
                        }}
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
                        title="Verser un acompte à cet ouvrier"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>Acompte</span>
                      </button>
                    )}

                    {item.type === 'material' && onOpenMovementModal && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          if (item.siteId !== activeSiteId) onSelectSite(item.siteId);
                          onOpenMovementModal(item.raw as Material, 'reception');
                          onClose();
                        }}
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                        title="Entrée de stock"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>+ Stock</span>
                      </button>
                    )}

                    {item.type === 'equipment' && onOpenMaintenanceModal && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          if (item.siteId !== activeSiteId) onSelectSite(item.siteId);
                          onOpenMaintenanceModal(item.raw as Equipment);
                          onClose();
                        }}
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25 transition-colors"
                        title="Enregistrer un entretien"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Entretien</span>
                      </button>
                    )}

                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">↓</kbd>
              <span>{t('search.navigate', 'Naviguer')}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">↵</kbd>
              <span>{t('search.open', 'Ouvrir')}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
