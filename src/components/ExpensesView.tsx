import React, { useState, useMemo } from 'react';
import { Site, Worker, Advance, DailyExpense, ExpenseCategory, AttendanceRecord, CashInflow, CashAudit } from '../types';
import { EXPENSE_CATEGORIES } from '../services/storage';
import { formatCurrency, getTodayDateString, downloadFile, calculateWorkerNet } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Receipt,
  HandCoins,
  Plus,
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Printer,
  Fuel,
  Wrench,
  Truck,
  UtensilsCrossed,
  Layers,
  Settings,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Wallet,
  Users,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  BookOpen,
  PieChart,
  ShieldCheck,
  Download,
  Building2,
  Clock,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ExpensesViewProps {
  site: Site;
  expenses: DailyExpense[];
  advances: Advance[];
  cashInflows?: CashInflow[];
  cashAudits?: CashAudit[];
  workers: Worker[];
  attendance?: Record<string, Record<string, AttendanceRecord[]>>;
  onOpenExpenseModal: (expense?: DailyExpense, defaultDate?: string) => void;
  onOpenAdvanceModal: (worker: Worker) => void;
  onOpenInflowModal?: (inflow?: CashInflow) => void;
  onOpenAuditModal?: () => void;
  onOpenReceiptModal?: (worker: Worker, advance: Advance) => void;
  onOpenExpenseReceiptModal?: (expense: DailyExpense) => void;
  onPrintAdvanceReceipt?: (advance: Advance, worker: Worker) => void;
  onOpenAiScanner?: () => void;
  onDeleteExpense: (id: string) => void;
  onDeleteAdvance: (id: string) => void;
  onDeleteInflow?: (id: string) => void;
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

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  site,
  expenses = [],
  advances = [],
  cashInflows = [],
  cashAudits = [],
  workers,
  attendance = {},
  onOpenExpenseModal,
  onOpenAdvanceModal,
  onOpenInflowModal,
  onOpenAuditModal,
  onOpenReceiptModal,
  onOpenExpenseReceiptModal,
  onPrintAdvanceReceipt,
  onOpenAiScanner,
  onDeleteExpense,
  onDeleteAdvance,
  onDeleteInflow,
  currency
}) => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'journal' | 'expenses' | 'advances'>('summary');
  const [selectedMonth, setSelectedMonth] = useState(getTodayDateString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTransactionType, setFilterTransactionType] = useState<'all' | 'inflow' | 'expense' | 'advance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState('');

  const todayStr = getTodayDateString();

  // Site filtered data
  const siteExpenses = expenses.filter(e => e.site === site.id);
  const siteAdvances = advances.filter(a => a.site === site.id);
  const siteInflows = cashInflows.filter(i => i.site === site.id);
  const siteAudits = cashAudits.filter(a => a.site === site.id);
  const siteWorkers = workers.filter(w => w.site === site.id);

  // Month filtered data
  const monthExpenses = siteExpenses.filter(e => e.date.startsWith(selectedMonth));
  const monthAdvances = siteAdvances.filter(a => a.date.startsWith(selectedMonth));
  const monthInflows = siteInflows.filter(i => i.date.startsWith(selectedMonth));

  // Global totals for site
  const totalAllInflows = siteInflows.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalAllExpenses = siteExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalAllAdvances = siteAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalAllDisbursed = totalAllExpenses + totalAllAdvances;
  const currentCashBalance = totalAllInflows - totalAllDisbursed;

  // Month totals
  const monthInflowsTotal = monthInflows.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthAdvancesTotal = monthAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const monthTotalDisbursed = monthExpensesTotal + monthAdvancesTotal;
  const monthNetFlow = monthInflowsTotal - monthTotalDisbursed;

  // Today totals
  const todayExpensesTotal = siteExpenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const todayAdvancesTotal = siteAdvances
    .filter(a => a.date === todayStr)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Category breakdown for selected month
  const categoryTotals: Record<string, number> = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    categoryTotals[cat] = monthExpenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  // Unified General Ledger (Grand Livre des Mouvements)
  const unifiedTransactions = useMemo(() => {
    const list: {
      id: string;
      originalId: string;
      date: string;
      type: 'inflow' | 'expense' | 'advance';
      label: string;
      categoryOrSource: string;
      beneficiaryOrWorker: string;
      method: string;
      ref?: string;
      amount: number;
      isDebit: boolean; // false = entrée (+), true = sortie (-)
      rawExpense?: DailyExpense;
      rawAdvance?: Advance;
      rawInflow?: CashInflow;
    }[] = [];

    siteInflows.forEach(inf => {
      list.push({
        id: `inf_${inf.id}`,
        originalId: inf.id,
        date: inf.date,
        type: 'inflow',
        label: t('transactions.cashInflowLabel', 'Dotation / Approvisionnement Caisse'),
        categoryOrSource: inf.source,
        beneficiaryOrWorker: inf.receivedBy || site.supervisor || 'Responsable',
        method: inf.paymentMethod || 'Virement',
        ref: inf.reference,
        amount: inf.amount,
        isDebit: false,
        rawInflow: inf
      });
    });

    siteExpenses.forEach(exp => {
      list.push({
        id: `exp_${exp.id}`,
        originalId: exp.id,
        date: exp.date,
        type: 'expense',
        label: exp.note || exp.category,
        categoryOrSource: exp.category,
        beneficiaryOrWorker: exp.beneficiary || 'Fournisseur',
        method: exp.paymentMethod,
        ref: exp.receiptRef,
        amount: exp.amount,
        isDebit: true,
        rawExpense: exp
      });
    });

    siteAdvances.forEach(adv => {
      const worker = siteWorkers.find(w => w.id === adv.workerId);
      list.push({
        id: `adv_${adv.id}`,
        originalId: adv.id,
        date: adv.date,
        type: 'advance',
        label: `${t('attendance.advance', 'Acompte')} : ${worker?.name || 'Ouvrier'} (${worker?.craft || ''})`,
        categoryOrSource: 'Acompte sur Salaire',
        beneficiaryOrWorker: worker?.name || 'Ouvrier',
        method: adv.method,
        ref: adv.id.toUpperCase(),
        amount: adv.amount,
        isDebit: true,
        rawAdvance: adv
      });
    });

    // Sort ascending by date for running balance calculation
    list.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let running = 0;
    const withBalance = list.map(item => {
      if (item.isDebit) {
        running -= item.amount;
      } else {
        running += item.amount;
      }
      return {
        ...item,
        balanceAfter: running
      };
    });

    // Return reverse for newest first display
    return withBalance.reverse();
  }, [siteInflows, siteExpenses, siteAdvances, siteWorkers, site.supervisor, t]);

  // Filtered ledger
  const filteredLedger = unifiedTransactions.filter(item => {
    if (!item.date.startsWith(selectedMonth)) return false;
    if (filterTransactionType !== 'all' && item.type !== filterTransactionType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.categoryOrSource.toLowerCase().includes(q) ||
        item.beneficiaryOrWorker.toLowerCase().includes(q) ||
        (item.ref && item.ref.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered expenses list
  const filteredExpenses = monthExpenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (e.beneficiary && e.beneficiary.toLowerCase().includes(q)) ||
        (e.note && e.note.toLowerCase().includes(q)) ||
        (e.receiptRef && e.receiptRef.toLowerCase().includes(q)) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered advances list
  const filteredAdvances = monthAdvances.filter(a => {
    if (selectedWorkerFilter && a.workerId !== selectedWorkerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const worker = siteWorkers.find(w => w.id === a.workerId);
      return (
        (worker && worker.name.toLowerCase().includes(q)) ||
        (worker && worker.craft.toLowerCase().includes(q)) ||
        (a.note && a.note.toLowerCase().includes(q)) ||
        a.method.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export Grand-Livre Journal CSV
  const handleExportJournalCSV = () => {
    triggerHaptic('light');
    let csv = `JOURNAL GÉNÉRAL DE TRÉSORERIE & CAISSE - ${site.name}\n`;
    csv += `Période: ${selectedMonth};Devise: ${currency};Date d'extraction: ${todayStr};Solde actuel: ${currentCashBalance} ${currency}\n\n`;
    csv += `Date;Réf Transaction;Type Flux;Libellé / Motif;Catégorie / Source;Tiers / Bénéficiaire;Mode de Règlement;Entrée (Crédit);Sortie (Débit);Solde Cumulé (${currency})\n`;

    // Export in chronological order
    const chronoSorted = [...filteredLedger].reverse();
    chronoSorted.forEach(tx => {
      const inVal = tx.isDebit ? '' : String(tx.amount);
      const outVal = tx.isDebit ? String(tx.amount) : '';
      csv += `"${tx.date}";"${tx.ref || tx.originalId}";"${tx.type.toUpperCase()}";"${tx.label.replace(/"/g, '""')}";"${tx.categoryOrSource}";"${tx.beneficiaryOrWorker}";"${tx.method}";"${inVal}";"${outVal}";"${tx.balanceAfter}"\n`;
    });

    csv += `\n;;;TOTAL DU MOIS;;;;"${monthInflowsTotal}";"${monthTotalDisbursed}";"${currentCashBalance}"\n`;
    downloadFile(
      `ChantierPro_Journal_Caisse_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}.csv`,
      csv,
      'text/csv'
    );
  };

  // Export Expenses CSV
  const handleExportExpensesCSV = () => {
    triggerHaptic('light');
    let csv = `REGISTRE DES DÉPENSES DE CAISSE - ${site.name}\n`;
    csv += `Mois: ${selectedMonth};Devise: ${currency};Date d'extraction: ${todayStr}\n\n`;
    csv += `ID;Date;Catégorie;Montant (${currency});Mode de paiement;Bénéficiaire;N° Justificatif;Payé par;Détails / Motif\n`;

    monthExpenses.forEach(e => {
      csv += `"${e.id}";"${e.date}";"${e.category}";"${e.amount}";"${e.paymentMethod}";"${e.beneficiary || ''}";"${e.receiptRef || ''}";"${e.paidBy || ''}";"${e.note || ''}"\n`;
    });

    csv += `\n;;TOTAL DÉPENSES;"${monthExpensesTotal}";;;;;\n`;
    downloadFile(
      `ChantierPro_Depenses_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}.csv`,
      csv,
      'text/csv'
    );
  };

  // Export Advances CSV
  const handleExportAdvancesCSV = () => {
    triggerHaptic('light');
    let csv = `REGISTRE DES ACOMPTES OUVRIERS - ${site.name}\n`;
    csv += `Mois: ${selectedMonth};Devise: ${currency};Date d'extraction: ${todayStr}\n\n`;
    csv += `ID Acompte;Date;ID Ouvrier;Nom Ouvrier;Corps d'état;Équipe;Montant (${currency});Mode de versement;Motif\n`;

    monthAdvances.forEach(a => {
      const w = siteWorkers.find(worker => worker.id === a.workerId);
      csv += `"${a.id}";"${a.date}";"${a.workerId}";"${w?.name || 'Inconnu'}";"${w?.craft || ''}";"${w?.team || ''}";"${a.amount}";"${a.method}";"${a.note || ''}"\n`;
    });

    csv += `\n;;;;;TOTAL ACOMPTES;"${monthAdvancesTotal}";;\n`;
    downloadFile(
      `ChantierPro_Acomptes_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}.csv`,
      csv,
      'text/csv'
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 4 Professional KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Solde de Caisse Actuel */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-white shadow-md flex flex-col justify-between border border-slate-800 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-amber-400" />
              {t('transactions.cashBalance', 'Solde de Caisse')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                currentCashBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {currentCashBalance >= 0 ? '● Actif' : '● Négatif'}
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {formatCurrency(currentCashBalance, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Entrées nettes : {formatCurrency(totalAllInflows, currency)}</span>
            </div>
          </div>
        </div>

        {/* Total Décaissements Mois */}
        <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
              {t('expenses.totalDisbursed', 'Sorties du Mois')}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 font-mono">{selectedMonth}</span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">
              {formatCurrency(monthTotalDisbursed, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Dépenses : {formatCurrency(monthExpensesTotal, currency)}</span>
              <span>Acomptes : {formatCurrency(monthAdvancesTotal, currency)}</span>
            </div>
          </div>
        </div>

        {/* Approvisionnements du Mois */}
        <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              {t('transactions.inflowsMonth', 'Dotations du Mois')}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +{monthInflows.length} flux
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
              {formatCurrency(monthInflowsTotal, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Flux net mensuel :{' '}
              <strong className={monthNetFlow >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                {monthNetFlow >= 0 ? `+${formatCurrency(monthNetFlow, currency)}` : formatCurrency(monthNetFlow, currency)}
              </strong>
            </div>
          </div>
        </div>

        {/* Dépenses du Jour */}
        <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              {t('expenses.todayDisbursed', 'Sorties Aujourd’hui')}
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {todayStr.slice(8)} {new Date().toLocaleString('fr-FR', { month: 'short' })}
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {formatCurrency(todayExpensesTotal + todayAdvancesTotal, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Achats : {formatCurrency(todayExpensesTotal, currency)}</span>
              <span>Acomptes : {formatCurrency(todayAdvancesTotal, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation & Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSubTab('summary');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PieChart className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('transactions.tabSummary', 'Synthèse & Trésorerie')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSubTab('journal');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'journal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              <span>{t('transactions.tabJournal', 'Grand Livre de Caisse')}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                {unifiedTransactions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSubTab('expenses');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'expenses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('transactions.tabExpenses', 'Dépenses')}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                {monthExpenses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSubTab('advances');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'advances'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <HandCoins className="h-3.5 w-3.5 text-amber-600" />
              <span>{t('transactions.tabAdvances', 'Acomptes')}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                {monthAdvances.length}
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Approvisionner Caisse */}
            {onOpenInflowModal && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenInflowModal();
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Ajouter une entrée de fonds / dotation caisse"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span>+ Dotation Caisse</span>
              </button>
            )}

            {/* Dépense */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onOpenExpenseModal();
              }}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Dépense</span>
            </button>

            {/* Scanner Facture IA */}
            {onOpenAiScanner && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenAiScanner();
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Scanner un reçu ou facture avec l'intelligence artificielle"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Scanner IA</span>
              </button>
            )}

            {/* Acompte */}
            {siteWorkers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenAdvanceModal(siteWorkers[0]);
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <HandCoins className="h-3.5 w-3.5" />
                <span>+ Acompte</span>
              </button>
            )}

            {/* Rapprochement / Billetage */}
            {onOpenAuditModal && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenAuditModal();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                title="Effectuer un contrôle / arrêté physique de caisse"
              >
                <Scale className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden sm:inline">Arrêté de Caisse</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar (Month, Search, Categories, Export) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Month picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-mono text-xs"
              />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('common.search', 'Rechercher pièce, tiers, libellé...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Type selector for Journal */}
            {activeSubTab === 'journal' && (
              <select
                value={filterTransactionType}
                onChange={e => setFilterTransactionType(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
              >
                <option value="all">Tous les flux</option>
                <option value="inflow">🟢 Entrées (+ Dotations)</option>
                <option value="expense">🔴 Dépenses (- Achats)</option>
                <option value="advance">🟠 Acomptes (- Salaires)</option>
              </select>
            )}

            {/* Category selector for Expenses tab */}
            {activeSubTab === 'expenses' && (
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 max-w-[180px] truncate"
              >
                <option value="">Toutes les catégories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Worker filter for Advances tab */}
            {activeSubTab === 'advances' && (
              <select
                value={selectedWorkerFilter}
                onChange={e => setSelectedWorkerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 max-w-[180px] truncate"
              >
                <option value="">Tous les ouvriers</option>
                {siteWorkers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.craft})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Export CSV buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={
                activeSubTab === 'journal' || activeSubTab === 'summary'
                  ? handleExportJournalCSV
                  : activeSubTab === 'expenses'
                  ? handleExportExpensesCSV
                  : handleExportAdvancesCSV
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Synthèse & Dashboard de Trésorerie */}
        {activeSubTab === 'summary' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Financial Health Summary Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-amber-400">
                    Arrêté de Trésorerie de Chantier
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Certifié Conforme
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl">
                  {currentCashBalance >= 15000
                    ? 'Niveau de caisse suffisant pour couvrir les dépenses courantes et les acomptes prévisionnels.'
                    : 'Attention : le solde de caisse est bas. Prévoyez une demande de dotation de caisse auprès de la direction.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {onOpenAuditModal && (
                  <button
                    type="button"
                    onClick={onOpenAuditModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    <Scale className="h-4 w-4" />
                    Arrêté Physique / Billetage
                  </button>
                )}
              </div>
            </div>

            {/* 2-Column: Category Breakdown + Recent Financial Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <PieChart className="h-4 w-4 text-amber-500" />
                    Répartition des Dépenses par Poste ({selectedMonth})
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {formatCurrency(monthExpensesTotal, currency)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const amount = categoryTotals[cat] || 0;
                    const pct = monthExpensesTotal > 0 ? (amount / monthExpensesTotal) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            {CATEGORY_ICONS[cat]}
                            <span>{cat}</span>
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-500 text-[11px]">{pct.toFixed(0)}%</span>
                            <span className="font-bold text-slate-900">{formatCurrency(amount, currency)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(amount > 0 ? 3 : 0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Latest Cash Audits & Inflows */}
              <div className="space-y-4">
                {/* Last Cash Audits */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Derniers Arrêtés de Caisse Effectués
                    </h3>
                    <span className="text-xs text-slate-500 font-semibold">{siteAudits.length} contrôles</span>
                  </div>

                  {siteAudits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Aucun arrêté physique de caisse enregistré. Cliquez sur « Arrêté de Caisse » pour démarrer un contrôle.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                      {siteAudits.slice(0, 4).map(aud => (
                        <div key={aud.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Date : {aud.date}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  aud.status === 'conforme'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {aud.status === 'conforme' ? '✓ Conforme' : '⚠️ Écart constaté'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Par : {aud.auditedBy} · Espèces : {formatCurrency(aud.countedPhysicalCash, currency)}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block">Écart</span>
                            <strong
                              className={`text-xs ${
                                aud.difference === 0
                                  ? 'text-emerald-600'
                                  : aud.difference > 0
                                  ? 'text-blue-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {aud.difference > 0 ? `+${aud.difference}` : aud.difference} {currency}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Shortcuts */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">
                      Accédez au <strong>Grand Livre</strong> pour auditer chaque ligne de transaction avec solde progressif.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('journal')}
                    className="flex items-center gap-1 font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                  >
                    <span>Voir le Journal</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Grand Livre Général des Flux (Unified Journal) */}
        {activeSubTab === 'journal' && (
          <div className="overflow-x-auto">
            {filteredLedger.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Aucun mouvement de caisse trouvé pour le mois sélectionné ({selectedMonth}).
                </p>
                <p className="text-xs text-slate-400">
                  Utilisez les boutons ci-dessus pour approvisionner la caisse, enregistrer des dépenses ou des acomptes.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Réf / Pièce</th>
                    <th className="py-3 px-3">Nature du Flux</th>
                    <th className="py-3 px-3">Libellé / Détails</th>
                    <th className="py-3 px-3">Tiers / Bénéficiaire</th>
                    <th className="py-3 px-3">Règlement</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Entrée (Crédit)</th>
                    <th className="py-3 px-3 text-right text-rose-700">Sortie (Débit)</th>
                    <th className="py-3 px-4 text-right font-black text-slate-900">Solde Cumulé</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map(tx => {
                    const isInflow = tx.type === 'inflow';
                    const isExpense = tx.type === 'expense';
                    const isAdvance = tx.type === 'advance';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {tx.date}
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold">
                            {tx.ref || tx.originalId.slice(0, 8)}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {isInflow && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> Dotation
                            </span>
                          )}
                          {isExpense && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <ArrowUpRight className="h-3 w-3 text-rose-600" /> Achat / Dépense
                            </span>
                          )}
                          {isAdvance && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <HandCoins className="h-3 w-3 text-amber-700" /> Acompte Salarié
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-900 font-medium max-w-xs truncate" title={tx.label}>
                          {tx.label}
                        </td>

                        <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                          {tx.beneficiaryOrWorker}
                        </td>

                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {tx.method}
                        </td>

                        {/* Entrée */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                          {isInflow ? `+${formatCurrency(tx.amount, currency)}` : '—'}
                        </td>

                        {/* Sortie */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {!isInflow ? `-${formatCurrency(tx.amount, currency)}` : '—'}
                        </td>

                        {/* Solde Cumulé */}
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          <span
                            className={
                              (tx.balanceAfter || 0) >= 0 ? 'text-slate-900' : 'text-rose-600 font-extrabold'
                            }
                          >
                            {formatCurrency(tx.balanceAfter || 0, currency)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isExpense && tx.rawExpense && onOpenExpenseReceiptModal && (
                              <button
                                type="button"
                                onClick={() => onOpenExpenseReceiptModal(tx.rawExpense!)}
                                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Imprimer le bon de décaissement"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {isAdvance && tx.rawAdvance && onOpenReceiptModal && (
                              <button
                                type="button"
                                onClick={() => {
                                  const worker = siteWorkers.find(w => w.id === tx.rawAdvance!.workerId);
                                  if (worker) onOpenReceiptModal(worker, tx.rawAdvance!);
                                }}
                                className="p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                                title="Imprimer le bon d'acompte avec signature"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {isExpense && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Voulez-vous supprimer cette dépense de caisse ?')) {
                                    onDeleteExpense(tx.originalId);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {isAdvance && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Voulez-vous supprimer cet acompte ?')) {
                                    onDeleteAdvance(tx.originalId);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {isInflow && onDeleteInflow && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Voulez-vous supprimer cette dotation de caisse ?')) {
                                    onDeleteInflow(tx.originalId);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Dépenses de Chantier Détail */}
        {activeSubTab === 'expenses' && (
          <div className="overflow-x-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Receipt className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Aucune dépense enregistrée pour ce filtre.</p>
                <button
                  type="button"
                  onClick={() => onOpenExpenseModal()}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-amber-400 text-xs font-bold shadow-xs hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Enregistrer une dépense</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-3">Bénéficiaire / Fournisseur</th>
                    <th className="py-3 px-3">N° Ticket / Facture</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Payé par</th>
                    <th className="py-3 px-3">Motif / Détail</th>
                    <th className="py-3 px-3 text-right">Montant ({currency})</th>
                    <th className="py-3 px-4 text-center">Bons & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">{exp.date}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {CATEGORY_ICONS[exp.category]}
                          <span>{exp.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{exp.beneficiary || 'Non spécifié'}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {exp.receiptRef ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px]">
                            {exp.receiptRef}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">{exp.paymentMethod}</td>
                      <td className="py-3 px-3 text-slate-600">{exp.paidBy || site.supervisor || '—'}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={exp.note || ''}>
                        {exp.note || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(exp.amount, currency)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenExpenseReceiptModal && (
                            <button
                              type="button"
                              onClick={() => onOpenExpenseReceiptModal(exp)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title="Générer et imprimer le bon de décaissement"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenExpenseModal(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Voulez-vous supprimer cette dépense ?')) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Acomptes Salariés Détail */}
        {activeSubTab === 'advances' && (
          <div className="overflow-x-auto">
            {filteredAdvances.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <HandCoins className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Aucun acompte versé pour ce filtre.</p>
                {siteWorkers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenAdvanceModal(siteWorkers[0])}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-xs hover:bg-amber-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Verser un acompte</span>
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Ouvrier Bénéficiaire</th>
                    <th className="py-3 px-3">Corps d'État</th>
                    <th className="py-3 px-3">Équipe</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Motif déclaré</th>
                    <th className="py-3 px-3 text-center">Décharge Signée</th>
                    <th className="py-3 px-3 text-right">Montant Acompte ({currency})</th>
                    <th className="py-3 px-4 text-center">Reçu & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdvances.map(adv => {
                    const worker = siteWorkers.find(w => w.id === adv.workerId);
                    return (
                      <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">{adv.date}</td>
                        <td className="py-3 px-3 font-black text-slate-900">{worker?.name || 'Ouvrier Inconnu'}</td>
                        <td className="py-3 px-3 text-slate-700">{worker?.craft || '—'}</td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{worker?.team || '—'}</td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{adv.method}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{adv.note || 'Acompte quinzaine'}</td>
                        <td className="py-3 px-3 text-center">
                          {adv.signature ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Signé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(adv.amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {onOpenReceiptModal && worker && (
                              <button
                                type="button"
                                onClick={() => onOpenReceiptModal(worker, adv)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition-all"
                                title="Ouvrir le bon officiel avec signature et QR"
                              >
                                <Printer className="h-3.5 w-3.5 text-amber-700" />
                                <span>Reçu Officiel</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Voulez-vous supprimer cet acompte ?')) {
                                  onDeleteAdvance(adv.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer Summary Bar */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">
              Total Mouvements du Mois :{' '}
              <strong className="font-mono text-slate-900">
                {monthExpenses.length + monthAdvances.length + monthInflows.length} opérations
              </strong>
            </span>
            <span>·</span>
            <span>
              Total Décaissé :{' '}
              <strong className="font-mono text-rose-600">{formatCurrency(monthTotalDisbursed, currency)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">ChantierPro — Traçabilité Comptable BTP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
