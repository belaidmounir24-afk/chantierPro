import React, { useState } from 'react';
import { Site, Worker, Team, Advance, AttendanceRecord, AttendanceStatus, DailyExpense, SiteLog, Task, Material } from '../types';
import { formatCurrency, calculateWorkerNet, exportPayrollCSV, getTodayDateString } from '../utils/calculations';
import { WeeklyEvolutionChart } from './WeeklyEvolutionChart';
import { downloadPeriodReportPDF } from '../services/periodReportPdfService';
import { triggerHaptic } from '../utils/android';
import {
  BarChart3,
  Calendar,
  FileText,
  FileSpreadsheet,
  Printer,
  Users,
  Clock,
  HandCoins,
  Wallet,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Receipt,
  Layers,
  Download,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Share2,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

interface ReportsViewProps {
  site: Site;
  workers: Worker[];
  teams: Team[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  advances: Advance[];
  expenses?: DailyExpense[];
  logs?: SiteLog[];
  tasks?: Task[];
  materials?: Material[];
  onOpenPV: (date: string) => void;
  onOpenPeriodReport?: (startDate?: string, endDate?: string) => void;
  onOpenClientReport?: () => void;
  onUpdateAttendance: (date: string, records: AttendanceRecord[]) => void;
  currency: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  site,
  workers,
  teams,
  attendance,
  advances,
  expenses = [],
  logs = [],
  tasks = [],
  materials = [],
  onOpenPV,
  onOpenPeriodReport,
  onOpenClientReport,
  onUpdateAttendance,
  currency
}) => {
  const [selectedMonth, setSelectedMonth] = useState(getTodayDateString().slice(0, 7));
  const [quickDownloadSuccess, setQuickDownloadSuccess] = useState(false);
  const todayStr = getTodayDateString();

  const siteWorkers = workers.filter(w => w.site === site.id && w.active);
  const siteAttendance = attendance[site.id] || {};
  const todayRows: AttendanceRecord[] = siteAttendance[todayStr] || [];

  // Count days in selected month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysList: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    daysList.push(`${selectedMonth}-${String(i).padStart(2, '0')}`);
  }

  // Today stats
  const presentToday = todayRows.filter(r => r.status === 'P' || r.status === 'R').length;
  const overtimeToday = todayRows.reduce((s, r) => s + (Number(r.hSup) || 0), 0);

  // Month stats
  let totalAdvancesMonth = 0;
  let totalNetMonth = 0;
  let totalGrossMonth = 0;
  let totalOvertimeMonth = 0;

  siteWorkers.forEach(w => {
    const calc = calculateWorkerNet(w, siteAttendance, advances, selectedMonth);
    totalGrossMonth += calc.gross;
    totalAdvancesMonth += calc.advancesTotal;
    totalNetMonth += calc.net;
    totalOvertimeMonth += calc.stats.hoursOvertime;
  });

  const monthExpenses = expenses.filter(e => e.site === site.id && e.date.startsWith(selectedMonth));
  const totalExpensesMonth = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grandTotalCost = totalGrossMonth + totalExpensesMonth;

  const handleCellClick = (workerId: string, date: string) => {
    const dayRows = [...(siteAttendance[date] || [])];
    const existing = dayRows.find(r => r.workerId === workerId);
    const cycle: AttendanceStatus[] = ['A', 'P', 'R', 'J'];

    let nextStatus: AttendanceStatus = 'P';
    if (existing) {
      const idx = cycle.indexOf(existing.status);
      nextStatus = cycle[(idx + 1) % cycle.length];
      existing.status = nextStatus;
    } else {
      dayRows.push({ workerId, status: 'P', hSup: 0 });
    }

    onUpdateAttendance(date, dayRows);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 5 Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Effectif du jour</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{presentToday}</span>
            <span className="text-xs text-slate-400">/ {siteWorkers.length} ouvriers</span>
          </div>
        </div>

        <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="text-blue-100 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>HS Aujourd'hui</span>
            <Clock className="h-4 w-4 text-blue-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">+{overtimeToday}h</span>
            <span className="text-xs text-blue-200">({totalOvertimeMonth}h ce mois)</span>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-500 p-4 text-slate-950 shadow-sm flex flex-col justify-between">
          <div className="text-amber-950 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Acomptes versés</span>
            <HandCoins className="h-4 w-4 text-amber-950" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-950 font-mono">
            {formatCurrency(totalAdvancesMonth, currency)}
          </div>
        </div>

        <div className="rounded-2xl bg-rose-600 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="text-rose-100 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Dépenses Caisse</span>
            <Receipt className="h-4 w-4 text-rose-200" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">
            {formatCurrency(totalExpensesMonth, currency)}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Net total à payer</span>
            <Wallet className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">
            {formatCurrency(totalNetMonth, currency)}
          </div>
        </div>
      </div>

      {/* Action Buttons Card */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Mois d'analyse :</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-900 text-sm outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Progress Report Button (High Priority Feature) */}
            <button
              id="open-client-report-btn"
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                if (onOpenClientReport) {
                  onOpenClientReport();
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              title="Exporter et partager le rapport d'avancement officiel au client / maître d'ouvrage (PDF)"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              <span>📤 Rapport d'Avancement Client (PDF)</span>
            </button>

            {/* Comprehensive Period Report Button */}
            <button
              id="open-period-report-btn"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                const [y, m] = selectedMonth.split('-');
                const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
                const start = `${selectedMonth}-01`;
                const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
                if (onOpenPeriodReport) {
                  onOpenPeriodReport(start, end);
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-slate-950" />
              <span>📑 Rapport Interne Complet (PDF)</span>
            </button>

            {/* Direct Quick PDF Download */}
            <button
              id="quick-download-period-pdf-btn"
              type="button"
              onClick={() => {
                try {
                  triggerHaptic('medium');
                  const [y, m] = selectedMonth.split('-');
                  const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
                  const start = `${selectedMonth}-01`;
                  const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
                  downloadPeriodReportPDF({
                    site,
                    startDate: start,
                    endDate: end,
                    workers,
                    attendance,
                    expenses,
                    advances,
                    logs,
                    currency
                  });
                  setQuickDownloadSuccess(true);
                  setTimeout(() => setQuickDownloadSuccess(false), 3500);
                } catch (e) {
                  console.error(e);
                  alert('Erreur lors du téléchargement du rapport.');
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                quickDownloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Télécharger instantanément le rapport complet PDF pour le mois sélectionné"
            >
              {quickDownloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>Télécharger PDF ({selectedMonth})</span>
                </>
              )}
            </button>

            <button
              id="open-daily-pv-btn"
              type="button"
              onClick={() => onOpenPV(todayStr)}
              className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 text-xs font-bold border border-slate-200 transition-colors"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>PV du jour</span>
            </button>

            <button
              id="export-csv-reports-btn"
              type="button"
              onClick={() => exportPayrollCSV(site, siteWorkers, siteAttendance, advances, selectedMonth)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 text-xs font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Paie CSV</span>
            </button>
          </div>
        </div>

        {/* Client Progress Report Callout */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-800">
            <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-900 font-black">Rapport d'Avancement Spécial Client (Format PDF) :</strong>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Recommandé</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Exportez un document officiel sans les salaires confidentiels, prêt à être partagé avec votre client (lots achevés, synthèse météo, avancement global, et cadre de visa officiel).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (onOpenClientReport) onOpenClientReport();
            }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-black shadow-xs flex items-center gap-1.5 self-end sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <span>Partager au Client</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Informative Report Feature Callout */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="text-base">📑</span>
            <div>
              <strong className="text-slate-900">Rapport Périodique Consolidé :</strong>{' '}
              <span className="text-slate-600">
                Génère un dossier PDF complet intégrant <strong>le journal de chantier</strong> (météo, avancement, sécurité),{' '}
                <strong>les dépenses & acomptes</strong> de caisse, et <strong>le pointage du personnel</strong> pour toute période personnalisée.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenPeriodReport) onOpenPeriodReport();
            }}
            className="text-amber-700 hover:text-amber-800 font-extrabold flex items-center gap-1 self-end sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <span>Choisir une période</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Visualisation Recharts : Évolution Hebdomadaire des Dépenses et Acomptes */}
      <WeeklyEvolutionChart
        site={site}
        expenses={expenses}
        advances={advances}
        selectedMonth={selectedMonth}
        currency={currency}
      />

      {/* Matrice Mensuelle de Présence */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Matrice Mensuelle de Pointage — {selectedMonth}</span>
              <span className="text-[11px] font-normal text-slate-500">
                (Légende : P=Présent, R=Retard, A=Absent, C=Congé/Payé)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Cliquez sur une case pour changer instantanément le statut de l'ouvrier pour ce jour
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              P : Présent
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
              R : Retard
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
              A : Absent
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
              C : Congé
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="p-2.5 sticky left-0 bg-slate-100 z-10 min-w-36 border-r border-slate-200 shadow-xs">
                  Ouvrier
                </th>
                {daysList.map(d => {
                  const dayNum = d.slice(8);
                  const isCurrentDay = d === todayStr;
                  return (
                    <th
                      key={d}
                      className={`p-1 text-center min-w-7 border-r border-slate-200 ${
                        isCurrentDay ? 'bg-amber-100 text-amber-950 font-extrabold' : ''
                      }`}
                    >
                      {dayNum}
                    </th>
                  );
                })}
                <th className="p-2.5 text-center font-extrabold text-slate-900 border-l border-slate-200">
                  Jours P
                </th>
                <th className="p-2.5 text-center font-extrabold text-slate-900">
                  Adv %
                </th>
                <th className="p-2.5 text-right font-extrabold text-slate-900">
                  Net ({currency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {siteWorkers.map(w => {
                const calc = calculateWorkerNet(w, siteAttendance, advances, selectedMonth);
                const isWarn = calc.advPercentage >= 50;

                return (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-2.5 sticky left-0 bg-white z-10 font-bold text-slate-900 border-r border-slate-200 shadow-xs">
                      <div>{w.name}</div>
                      <div className="text-[10px] font-normal text-slate-400">{w.craft}</div>
                    </td>

                    {daysList.map(d => {
                      const recordsForDay = siteAttendance[d] || [];
                      const rec = recordsForDay.find(r => r.workerId === w.id);
                      const st = rec ? rec.status : '·';

                      const chipClasses: Record<string, string> = {
                        P: 'bg-emerald-500 text-white hover:bg-emerald-600',
                        R: 'bg-amber-500 text-slate-950 hover:bg-amber-600',
                        A: 'bg-rose-500 text-white hover:bg-rose-600',
                        J: 'bg-purple-600 text-white hover:bg-purple-700',
                        '·': 'text-slate-300 hover:bg-slate-100'
                      };

                      const label = st === 'J' ? 'C' : st;

                      return (
                        <td
                          key={d}
                          onClick={() => handleCellClick(w.id, d)}
                          className="p-0.5 text-center border-r border-slate-100 cursor-pointer"
                          title={`${w.name} — ${d} : cliquer pour modifier`}
                        >
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold transition-transform active:scale-90 ${
                              chipClasses[st] || chipClasses['·']
                            }`}
                          >
                            {label}
                          </span>
                        </td>
                      );
                    })}

                    <td className="p-2 text-center font-bold text-slate-900 border-l border-slate-200">
                      {calc.stats.regularDays}j
                    </td>

                    <td className={`p-2 text-center font-bold ${isWarn ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>
                      {Math.round(calc.advPercentage)}%
                    </td>

                    <td className="p-2 text-right font-extrabold text-emerald-700">
                      {formatCurrency(calc.net, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
