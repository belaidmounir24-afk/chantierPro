import React, { useState, useMemo } from 'react';
import {
  Site,
  Worker,
  AttendanceRecord,
  DailyExpense,
  Advance,
  SiteLog
} from '../types';
import { formatCurrency, calculateWorkerPeriodNet } from '../utils/calculations';
import { downloadPeriodReportPDF } from '../services/periodReportPdfService';
import { triggerHaptic } from '../utils/android';
import {
  FileText,
  Download,
  Printer,
  X,
  Calendar,
  Layers,
  CheckCircle2,
  Users,
  Clock,
  Receipt,
  Wallet,
  CloudSun,
  ShieldCheck,
  Building2,
  HardHat,
  Filter,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface PeriodReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
  workers: Worker[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  expenses?: DailyExpense[];
  advances?: Advance[];
  logs?: SiteLog[];
  currency?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export const PeriodReportModal: React.FC<PeriodReportModalProps> = ({
  isOpen,
  onClose,
  site,
  workers,
  attendance,
  expenses = [],
  advances = [],
  logs = [],
  currency = 'DZD',
  initialStartDate,
  initialEndDate
}) => {
  // Default to current month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
  const firstDayCurrentMonth = `${currentYear}-${currentMonthStr}-01`;
  const todayStr = `${currentYear}-${currentMonthStr}-${String(today.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(initialStartDate || firstDayCurrentMonth);
  const [endDate, setEndDate] = useState<string>(initialEndDate || todayStr);

  const [sections, setSections] = useState({
    summary: true,
    logs: true,
    expenses: true,
    attendance: true
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Quick Period Presets
  const applyPreset = (type: 'thisMonth' | 'lastMonth' | 'thisWeek' | 'lastWeek' | 'last30Days') => {
    triggerHaptic('light');
    const now = new Date();

    if (type === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (type === 'lastMonth') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (type === 'thisWeek') {
      const current = new Date();
      const day = current.getDay();
      const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(current.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const formatD = (dateObj: Date) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayNum = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayNum}`;
      };

      setStartDate(formatD(monday));
      setEndDate(formatD(sunday));
    } else if (type === 'lastWeek') {
      const current = new Date();
      const day = current.getDay();
      const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const monday = new Date(current.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const formatD = (dateObj: Date) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayNum = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayNum}`;
      };

      setStartDate(formatD(monday));
      setEndDate(formatD(sunday));
    } else if (type === 'last30Days') {
      const current = new Date();
      const past = new Date();
      past.setDate(current.getDate() - 30);

      const formatD = (dateObj: Date) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayNum = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayNum}`;
      };

      setStartDate(formatD(past));
      setEndDate(formatD(current));
    }
  };

  // Filtered dataset calculations
  const siteWorkers = useMemo(() => {
    return workers.filter(w => w.site === site.id && w.active);
  }, [workers, site.id]);

  const siteAttendance = useMemo(() => {
    return attendance[site.id] || {};
  }, [attendance, site.id]);

  const periodExpenses = useMemo(() => {
    return expenses
      .filter(e => e.site === site.id && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, site.id, startDate, endDate]);

  const periodAdvances = useMemo(() => {
    return advances
      .filter(a => a.site === site.id && a.date >= startDate && a.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [advances, site.id, startDate, endDate]);

  const periodLogs = useMemo(() => {
    return logs
      .filter(l => l.site === site.id && l.date >= startDate && l.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, site.id, startDate, endDate]);

  // Aggregate Stats
  const {
    workerSummaries,
    totalGross,
    totalAdvancesAmount,
    totalNet,
    totalOvertimeHours,
    totalNormalHours,
    totalWorkerDays
  } = useMemo(() => {
    let gross = 0;
    let advs = 0;
    let net = 0;
    let ot = 0;
    let normal = 0;
    let days = 0;

    const summaries = siteWorkers.map(w => {
      const calc = calculateWorkerPeriodNet(w, siteAttendance, periodAdvances, startDate, endDate);
      gross += calc.gross;
      advs += calc.advancesTotal;
      net += calc.net;
      ot += calc.stats.hoursOvertime;
      normal += calc.stats.hoursRegular;
      days += calc.stats.regularDays;
      return { worker: w, calc };
    });

    return {
      workerSummaries: summaries,
      totalGross: gross,
      totalAdvancesAmount: advs,
      totalNet: net,
      totalOvertimeHours: ot,
      totalNormalHours: normal,
      totalWorkerDays: days
    };
  }, [siteWorkers, siteAttendance, periodAdvances, startDate, endDate]);

  const totalExpensesAmount = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [periodExpenses]);

  // Handle PDF Generation & Download
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      triggerHaptic('medium');

      // Small tick to allow UI loader to render smoothly
      await new Promise(res => setTimeout(res, 100));

      downloadPeriodReportPDF({
        site,
        startDate,
        endDate,
        workers,
        attendance,
        expenses,
        advances,
        logs,
        currency,
        includeSections: sections
      });

      setDownloadSuccess(true);
      triggerHaptic('success');
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez vérifier les dates sélectionnées.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const daysDifference = useMemo(() => {
    try {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      const diffTime = e - s;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto print:shadow-none print:border-none print:m-0 print:w-full">
        
        {/* Controls Header - Hidden in Print */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-xs">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">
                  Rapport Complet de Période (PDF)
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Officiel BTP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chantier : <strong className="text-slate-200">{site.name}</strong> · Journal, Dépenses & Pointage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="download-period-report-pdf-btn"
              type="button"
              disabled={isGeneratingPdf || startDate > endDate}
              onClick={handleDownloadPdf}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  Génération en cours...
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  PDF Téléchargé !
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger le PDF (.pdf)
                </>
              )}
            </button>

            <button
              id="print-period-report-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2.5 text-xs font-bold border border-slate-700 transition-colors"
              title="Aperçu avant impression directe navigateur"
            >
              <Printer className="h-4 w-4 text-slate-300" />
              <span className="hidden sm:inline">Imprimer A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar - Date Range & Presets & Section Filters (Hidden in Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 space-y-3 print:hidden">
          {/* Presets & Dates */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Périodes :
              </span>
              <button
                type="button"
                onClick={() => applyPreset('thisMonth')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Ce mois-ci
              </button>
              <button
                type="button"
                onClick={() => applyPreset('lastMonth')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Mois précédent
              </button>
              <button
                type="button"
                onClick={() => applyPreset('thisWeek')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => applyPreset('lastWeek')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Semaine dernière
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last30Days')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                30 derniers jours
              </button>
            </div>

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Du :</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Au :</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                />
              </div>

              <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-900 rounded-lg">
                {daysDifference} jour{daysDifference > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Section Inclusions Checkboxes */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-500" /> Sections du rapport :
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sections.summary}
                onChange={e => setSections(s => ({ ...s, summary: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">Synthèse & KPIs</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sections.logs}
                onChange={e => setSections(s => ({ ...s, logs: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">1. Journal de chantier ({periodLogs.length})</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sections.expenses}
                onChange={e => setSections(s => ({ ...s, expenses: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">2. Dépenses & Acomptes ({periodExpenses.length + periodAdvances.length})</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sections.attendance}
                onChange={e => setSections(s => ({ ...s, attendance: e.target.checked }))}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">3. Pointage & Masse salariale ({siteWorkers.length})</span>
            </label>
          </div>

          {startDate > endDate && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="h-4 w-4" />
              La date de début doit être antérieure ou égale à la date de fin.
            </div>
          )}
        </div>

        {/* Report Preview Document (A4 Styling) */}
        <div className="p-4 sm:p-8 md:p-10 max-h-[72vh] overflow-y-auto bg-slate-100/60 text-slate-900 space-y-6 print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          
          {/* Main Paper Sheet */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-0">
            
            {/* Header / En-tête */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🏗️</span>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                        Rapport Périodique Complet de Chantier
                      </h1>
                      <p className="text-xs font-bold text-amber-600 tracking-wide mt-0.5">
                        ChantierPro · Suivi Technique, Financier et Main-d'œuvre
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                      Période du {formatDateDisplay(startDate)} au {formatDateDisplay(endDate)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({daysDifference} jours calendaires)
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right text-xs space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-64">
                  <div><span className="text-slate-500 font-medium">Chantier :</span> <strong className="text-slate-900 text-sm">{site.name}</strong></div>
                  <div><span className="text-slate-500 font-medium">Maître d'ouvrage :</span> <strong>{site.client || 'N/A'}</strong></div>
                  <div><span className="text-slate-500 font-medium">Localisation :</span> <strong>{site.address || 'N/A'}</strong></div>
                  <div><span className="text-slate-500 font-medium">Responsable de site :</span> <strong>{site.supervisor || 'Chef de chantier'}</strong></div>
                  <div><span className="text-slate-500 font-medium">Date d'édition :</span> <strong>{new Date().toLocaleDateString('fr-FR')}</strong></div>
                </div>
              </div>
            </div>

            {/* Executive Summary Cards */}
            {sections.summary && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-600" />
                    Synthèse Générale & Indicateurs Clés de la Période
                  </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-900 p-3.5 text-white flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Effectif & Jours</span>
                      <Users className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-white">{siteWorkers.length}</span>
                      <span className="text-xs text-slate-400 ml-1.5">ouvriers</span>
                      <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                        {totalWorkerDays} journées travaillées
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-600 p-3.5 text-white flex flex-col justify-between">
                    <div className="text-blue-100 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Volume Heures</span>
                      <Clock className="h-4 w-4 text-blue-200" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black text-white">{totalNormalHours + totalOvertimeHours}h</span>
                      <div className="text-[11px] text-blue-100 font-medium mt-0.5">
                        dont <strong className="text-amber-300">+{totalOvertimeHours}h</strong> sup.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-600 p-3.5 text-white flex flex-col justify-between">
                    <div className="text-rose-100 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Dépenses Caisse</span>
                      <Receipt className="h-4 w-4 text-rose-200" />
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-black text-white font-mono">
                        {formatCurrency(totalExpensesAmount, currency)}
                      </span>
                      <div className="text-[11px] text-rose-100 font-medium mt-0.5">
                        {periodExpenses.length} transactions enregistrées
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-600 p-3.5 text-white flex flex-col justify-between">
                    <div className="text-emerald-100 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Net Salaires</span>
                      <Wallet className="h-4 w-4 text-emerald-200" />
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-black text-white font-mono">
                        {formatCurrency(totalNet, currency)}
                      </span>
                      <div className="text-[11px] text-emerald-100 font-medium mt-0.5">
                        Acomptes: {formatCurrency(totalAdvancesAmount, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Journal de Chantier */}
            {sections.logs && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <CloudSun className="h-4 w-4 text-amber-500" />
                    1. Journal de Chantier — Activité Quotidienne ({periodLogs.length} rapports saisis)
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Météo · Heures d'arrêt · Travaux réalisés · Sécurité
                  </span>
                </div>

                {periodLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic text-center">
                    Aucun compte-rendu journalier renseigné pour cette période.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-[11px]">
                          <th className="p-2 border-r border-slate-800 w-24">Date</th>
                          <th className="p-2 border-r border-slate-800 w-32">Météo & Temp.</th>
                          <th className="p-2 border-r border-slate-800 w-24">Présents</th>
                          <th className="p-2 border-r border-slate-800">Tâches Exécutées & Avancement</th>
                          <th className="p-2 w-48">Sécurité & Incidents</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {periodLogs.map(log => {
                          const dayAttendance = siteAttendance[log.date] || [];
                          const pCount = dayAttendance.filter(r => r.status === 'P' || r.status === 'R').length;
                          const hsCount = dayAttendance.reduce((s, r) => s + (Number(r.hSup) || 0), 0);

                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                                {formatDateDisplay(log.date)}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <span>{log.weather || 'Dégagé'}</span>
                                  {log.temp && <span className="text-slate-500">({log.temp}°C)</span>}
                                </div>
                                {Number(log.lostHours) > 0 && (
                                  <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                                    Arrêt : {log.lostHours}h perdues
                                  </div>
                                )}
                              </td>
                              <td className="p-2 border-r border-slate-200 whitespace-nowrap">
                                <div className="font-bold text-slate-800">{pCount} ouvriers</div>
                                {hsCount > 0 && (
                                  <div className="text-[10px] text-blue-700 font-semibold">
                                    +{hsCount}h sup
                                  </div>
                                )}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
                                {log.note || 'Travaux réguliers exécutés conformément aux prévisions.'}
                              </td>
                              <td className="p-2 text-slate-600 text-[11px] leading-relaxed">
                                {log.incidents || 'R.A.S. — Port des EPI vérifié.'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Dépenses & Finances */}
            {sections.expenses && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-rose-600" />
                    2. Suivi Financier & Dépenses de Chantier
                  </h2>
                  <span className="text-xs font-extrabold text-rose-700 font-mono">
                    Total Dépenses : {formatCurrency(totalExpensesAmount, currency)}
                  </span>
                </div>

                {periodExpenses.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic text-center">
                    Aucune dépense enregistrée sur cette période.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead>
                        <tr className="bg-rose-700 text-white font-bold text-[11px]">
                          <th className="p-2 border-r border-rose-600 w-24">Date</th>
                          <th className="p-2 border-r border-rose-600">Catégorie</th>
                          <th className="p-2 border-r border-rose-600">Bénéficiaire / Fournisseur</th>
                          <th className="p-2 border-r border-rose-600">Motif & Justificatif</th>
                          <th className="p-2 border-r border-rose-600">Mode</th>
                          <th className="p-2 text-right w-28">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {periodExpenses.map(e => (
                          <tr key={e.id} className="hover:bg-rose-50/40 transition-colors">
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                              {formatDateDisplay(e.date)}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">
                              {e.category}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-800">
                              {e.beneficiary || '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600">
                              {e.note || e.receiptRef || '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700 text-[11px]">
                              {e.paymentMethod}
                            </td>
                            <td className="p-2 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                              {formatCurrency(e.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-rose-100 text-rose-950 font-black text-xs border-t-2 border-rose-300">
                          <td colSpan={4} className="p-2.5">
                            TOTAL DÉPENSES DE LA PÉRIODE ({periodExpenses.length} opérations)
                          </td>
                          <td colSpan={2} className="p-2.5 text-right font-mono text-sm">
                            {formatCurrency(totalExpensesAmount, currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Acomptes Versés durant la période */}
                {periodAdvances.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold text-amber-900 flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span>Acomptes versés aux ouvriers sur la période ({periodAdvances.length})</span>
                      <span className="font-mono font-black">{formatCurrency(totalAdvancesAmount, currency)}</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200">
                        <thead>
                          <tr className="bg-amber-700 text-white font-bold text-[11px]">
                            <th className="p-1.5 border-r border-amber-600 w-24">Date</th>
                            <th className="p-1.5 border-r border-amber-600">Ouvrier Bénéficiaire</th>
                            <th className="p-1.5 border-r border-amber-600">Motif / Justification</th>
                            <th className="p-1.5 border-r border-amber-600">Mode</th>
                            <th className="p-1.5 border-r border-amber-600">Validé par</th>
                            <th className="p-1.5 text-right w-28">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {periodAdvances.map(a => {
                            const w = siteWorkers.find(worker => worker.id === a.workerId);
                            return (
                              <tr key={a.id} className="hover:bg-amber-50/40">
                                <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                                  {formatDateDisplay(a.date)}
                                </td>
                                <td className="p-1.5 border-r border-slate-200 font-bold text-slate-800">
                                  {w?.name || a.workerId} <span className="font-normal text-slate-400 text-[10px]">({w?.craft})</span>
                                </td>
                                <td className="p-1.5 border-r border-slate-200 text-slate-600">
                                  {a.note || a.receiptRef || 'Acompte'}
                                </td>
                                <td className="p-1.5 border-r border-slate-200 text-slate-700">
                                  {a.method}
                                </td>
                                <td className="p-1.5 border-r border-slate-200 text-slate-500">
                                  {a.approvedBy || 'Chef de chantier'}
                                </td>
                                <td className="p-1.5 text-right font-black font-mono text-amber-800">
                                  {formatCurrency(a.amount, currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Pointage & Masse Salariale */}
            {sections.attendance && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-600" />
                    3. Pointage du Personnel & Bordereau de Paie de la Période
                  </h2>
                  <span className="text-xs font-extrabold text-emerald-700 font-mono">
                    Total Net : {formatCurrency(totalNet, currency)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-emerald-700 text-white font-bold text-[11px]">
                        <th className="p-2 border-r border-emerald-600 w-8 text-center">N°</th>
                        <th className="p-2 border-r border-emerald-600">Nom & Prénom</th>
                        <th className="p-2 border-r border-emerald-600">Corps d'état</th>
                        <th className="p-2 border-r border-emerald-600">Équipe</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-9" title="Jours Présent">P</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-9" title="Jours Retard">R</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-9" title="Jours Absent">A</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-9" title="Jours Congé/Payé">C</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-12" title="Heures Supplémentaires">HS</th>
                        <th className="p-2 border-r border-emerald-600 text-center w-14" title="Total Heures">Tot.H</th>
                        <th className="p-2 border-r border-emerald-600 text-right w-20">Taux</th>
                        <th className="p-2 border-r border-emerald-600 text-right w-24">Salaire Brut</th>
                        <th className="p-2 border-r border-emerald-600 text-right w-24">Acomptes</th>
                        <th className="p-2 text-right w-28">Net à Payer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {workerSummaries.map(({ worker, calc }, idx) => (
                        <tr key={worker.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-2 border-r border-slate-200 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                            {worker.name}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">{worker.craft}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-500">{worker.team || '—'}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-700">{calc.stats.regularDays}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-700">{calc.stats.lateDays}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-700">{calc.stats.absenceDays}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-purple-700">{calc.stats.paidLeaveDays}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700">
                            {calc.stats.hoursOvertime > 0 ? `+${calc.stats.hoursOvertime}h` : '0h'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-black text-slate-900">
                            {calc.stats.totalHours}h
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600 text-[11px]">
                            {formatCurrency(worker.rate, currency)}/{worker.rateType === 'heure' ? 'h' : 'j'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold text-slate-800">
                            {formatCurrency(calc.gross, currency)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(calc.advancesTotal, currency)}
                          </td>
                          <td className="p-2 text-right font-mono font-black text-emerald-800">
                            {formatCurrency(calc.net, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-100 text-emerald-950 font-black text-xs border-t-2 border-emerald-300">
                        <td colSpan={4} className="p-2.5">
                          TOTAUX GÉNÉRAUX ({siteWorkers.length} ouvriers)
                        </td>
                        <td className="p-2.5 text-center">{totalWorkerDays}</td>
                        <td colSpan={3} className="p-2.5"></td>
                        <td className="p-2.5 text-center font-mono">+{totalOvertimeHours}h</td>
                        <td className="p-2.5 text-center font-mono">{totalNormalHours + totalOvertimeHours}h</td>
                        <td className="p-2.5"></td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(totalGross, currency)}</td>
                        <td className="p-2.5 text-right font-mono text-amber-900">{formatCurrency(totalAdvancesAmount, currency)}</td>
                        <td className="p-2.5 text-right font-mono text-sm text-emerald-950">{formatCurrency(totalNet, currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Official Signatures */}
            <div className="pt-6 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between bg-slate-50/50">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Le Chef de Chantier
                  </span>
                  <span className="text-[11px] text-slate-400 italic">Signature & Date</span>
                </div>
                <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between bg-slate-50/50">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Le Conducteur de Travaux
                  </span>
                  <span className="text-[11px] text-slate-400 italic">Signature & Cachet</span>
                </div>
                <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between bg-slate-50/50">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Maître d'Œuvre / Direction
                  </span>
                  <span className="text-[11px] text-slate-400 italic">Visa & Observations</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Document officiel généré par ChantierPro · Conforme aux standards de gestion de chantier et de paie du BTP.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
