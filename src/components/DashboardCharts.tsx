import React, { useState, useMemo } from 'react';
import { Site, Worker, Team, AttendanceRecord, DailyExpense, Advance } from '../types';
import { formatCurrency, formatNumber, getTodayDateString } from '../utils/calculations';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  HandCoins,
  Receipt,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Layers,
  Sparkles,
  Award,
  ChevronDown
} from 'lucide-react';
import { triggerHaptic } from '../utils/android';

interface DashboardChartsProps {
  site: Site;
  workers: Worker[];
  teams: Team[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  expenses: DailyExpense[];
  advances: Advance[];
  currency: string;
  onOpenWorkerModal?: (worker: Worker) => void;
  onSelectTab?: (tab: any) => void;
}

const PALETTE = [
  '#f59e0b', // Amber 500
  '#3b82f6', // Blue 500
  '#10b981', // Emerald 500
  '#8b5cf6', // Purple 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#f97316', // Orange 500
  '#6366f1', // Indigo 500
  '#14b8a6', // Teal 500
  '#eab308'  // Yellow 500
];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  site,
  workers,
  teams,
  attendance,
  expenses = [],
  advances = [],
  currency,
  onOpenWorkerModal,
  onSelectTab
}) => {
  const { t, isRTL } = useLanguage();
  const todayStr = getTodayDateString();
  const currentMonthStr = todayStr.slice(0, 7);

  // Filter States
  const [timeframe, setTimeframe] = useState<'6m' | '12m' | 'all'>('6m');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedCraft, setSelectedCraft] = useState<string>('all');
  const [expenseChartType, setExpenseChartType] = useState<'composed' | 'bar' | 'area'>('composed');
  const [workerChartMetric, setWorkerChartMetric] = useState<'hours' | 'days' | 'overtime'>('hours');

  // Active site workers
  const siteWorkers = useMemo(() => {
    return workers.filter(w => w.site === site.id && w.active);
  }, [workers, site.id]);

  // Site attendance
  const siteAttendance = useMemo(() => {
    return attendance[site.id] || {};
  }, [attendance, site.id]);

  // Site expenses & advances
  const siteExpenses = useMemo(() => {
    return expenses.filter(e => e.site === site.id);
  }, [expenses, site.id]);

  const siteAdvances = useMemo(() => {
    return advances.filter(a => a.site === site.id);
  }, [advances, site.id]);

  // Crafts list
  const crafts = useMemo(() => {
    return Array.from(new Set(siteWorkers.map(w => w.craft))).filter(Boolean);
  }, [siteWorkers]);

  // Available months list from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthStr);
    
    siteExpenses.forEach(e => {
      if (e.date && e.date.length >= 7) monthsSet.add(e.date.slice(0, 7));
    });
    siteAdvances.forEach(a => {
      if (a.date && a.date.length >= 7) monthsSet.add(a.date.slice(0, 7));
    });
    Object.keys(siteAttendance).forEach(d => {
      if (d.length >= 7) monthsSet.add(d.slice(0, 7));
    });

    return Array.from(monthsSet).sort().reverse();
  }, [siteExpenses, siteAdvances, siteAttendance, currentMonthStr]);

  // 1. MONTHLY EXPENSES COMPUTATION
  const monthlyExpensesData = useMemo(() => {
    // Determine list of months based on timeframe
    let targetMonths: string[] = [];
    const now = new Date();

    if (timeframe === '6m') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        targetMonths.push(`${y}-${m}`);
      }
    } else if (timeframe === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        targetMonths.push(`${y}-${m}`);
      }
    } else {
      targetMonths = [...availableMonths].reverse();
    }

    return targetMonths.map(monthKey => {
      const monthExpenses = siteExpenses.filter(e => e.date && e.date.startsWith(monthKey));
      const monthAdvances = siteAdvances.filter(a => a.date && a.date.startsWith(monthKey));

      const expTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const advTotal = monthAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const grandTotal = expTotal + advTotal;

      // Label (ex: "Août 2026")
      const [y, m] = monthKey.split('-').map(Number);
      const dateObj = new Date(y, m - 1, 1);
      const label = dateObj.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

      return {
        monthKey,
        label,
        dépenses: expTotal,
        acomptes: advTotal,
        total: grandTotal,
        nombreDépenses: monthExpenses.length,
        nombreAcomptes: monthAdvances.length
      };
    });
  }, [siteExpenses, siteAdvances, timeframe, availableMonths]);

  // Expenses categories distribution for selected month
  const categoryDistribution = useMemo(() => {
    const monthExpenses = siteExpenses.filter(e => e.date && e.date.startsWith(selectedMonth));
    const catMap: Record<string, number> = {};

    monthExpenses.forEach(e => {
      const cat = e.category || 'Divers';
      catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
    });

    const monthAdvances = siteAdvances.filter(a => a.date && a.date.startsWith(selectedMonth));
    const advTotal = monthAdvances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    if (advTotal > 0) {
      catMap['Acomptes Ouvriers'] = advTotal;
    }

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [siteExpenses, siteAdvances, selectedMonth]);

  // Summary Metrics for Expenses
  const expenseMetrics = useMemo(() => {
    const totalCurrentMonth = monthlyExpensesData.find(d => d.monthKey === selectedMonth)?.total || 0;
    const totalAllPeriod = monthlyExpensesData.reduce((s, d) => s + d.total, 0);
    const averagePerMonth = monthlyExpensesData.length > 0 ? totalAllPeriod / monthlyExpensesData.length : 0;
    
    // Find peak month
    let peakMonth = monthlyExpensesData[0];
    monthlyExpensesData.forEach(d => {
      if (d.total > (peakMonth?.total || 0)) peakMonth = d;
    });

    return {
      totalCurrentMonth,
      totalAllPeriod,
      averagePerMonth,
      peakMonth
    };
  }, [monthlyExpensesData, selectedMonth]);

  // 2. WORKER WORKING TIME DISTRIBUTION COMPUTATION
  const workerTimeData = useMemo(() => {
    // Filter site workers by team and craft
    let filtered = siteWorkers;
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(w => w.team === selectedTeam);
    }
    if (selectedCraft !== 'all') {
      filtered = filtered.filter(w => w.craft === selectedCraft);
    }

    // Get all dates in selected month
    const datesInMonth = Object.keys(siteAttendance).filter(d => d.startsWith(selectedMonth));

    const result = filtered.map(worker => {
      let daysPresent = 0;
      let daysLate = 0;
      let daysAbsent = 0;
      let daysJustified = 0;
      let regularHours = 0;
      let overtimeHours = 0;
      let absenceHours = 0;

      datesInMonth.forEach(date => {
        const dayRecords = siteAttendance[date] || [];
        const record = dayRecords.find(r => r.workerId === worker.id);
        if (record) {
          const hSup = Number(record.hSup) || 0;
          const absence = Number(record.absenceHours) || 0;

          if (record.status === 'P') {
            daysPresent++;
            regularHours += Math.max(0, 8 - absence);
            absenceHours += absence;
          } else if (record.status === 'R') {
            daysLate++;
            daysPresent++;
            const effAbs = absence > 0 ? absence : 1;
            regularHours += Math.max(0, 8 - effAbs);
            absenceHours += effAbs;
          } else if (record.status === 'J') {
            daysJustified++;
            daysPresent++;
            regularHours += 8;
          } else if (record.status === 'A') {
            if (absence > 0 && absence < 8) {
              regularHours += Math.max(0, 8 - absence);
              absenceHours += absence;
              daysPresent += Math.round(((8 - absence) / 8) * 10) / 10;
            } else {
              daysAbsent++;
              absenceHours += absence > 0 ? absence : 8;
            }
          }

          overtimeHours += hSup;
        } else {
          daysAbsent++;
        }
      });

      // Standard work day = 8 hours (Calcul au prorata des heures réelles)
      const totalHours = regularHours + overtimeHours;
      const totalDays = Math.round(daysPresent * 10) / 10;

      return {
        id: worker.id,
        name: worker.name,
        craft: worker.craft || 'Ouvrier',
        team: worker.team || 'Équipe principale',
        heuresNormales: regularHours,
        heuresSup: overtimeHours,
        totalHeures: totalHours,
        joursPrésent: totalDays,
        joursRetard: daysLate,
        joursAbsent: daysAbsent,
        worker
      };
    });

    // Sort by total hours descending
    return result.sort((a, b) => b.totalHeures - a.totalHeures);
  }, [siteWorkers, siteAttendance, selectedMonth, selectedTeam, selectedCraft]);

  // Top workers by working time
  const topWorker = workerTimeData[0];
  const totalSiteHours = useMemo(() => {
    return workerTimeData.reduce((s, w) => s + w.totalHeures, 0);
  }, [workerTimeData]);

  const totalOvertimeHours = useMemo(() => {
    return workerTimeData.reduce((s, w) => s + w.heuresSup, 0);
  }, [workerTimeData]);

  const averageHoursPerWorker = useMemo(() => {
    return workerTimeData.length > 0 ? totalSiteHours / workerTimeData.length : 0;
  }, [workerTimeData, totalSiteHours]);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & TIMEFRAME SELECTOR */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/20 shrink-0">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Tableau de Bord & Métriques Chantier</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                Recharts Analytics
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Analyse visuelle des dépenses mensuelles et de la répartition du temps de travail
            </p>
          </div>
        </div>

        {/* Global Month Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Mois d'analyse :</span>
            <select
              id="select-dashboard-month"
              value={selectedMonth}
              onChange={e => {
                triggerHaptic('light');
                setSelectedMonth(e.target.value);
              }}
              className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer"
            >
              {availableMonths.map(m => {
                const [y, mm] = m.split('-').map(Number);
                const d = new Date(y, mm - 1, 1);
                const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            {(['6m', '12m', 'all'] as const).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTimeframe(tf);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf === '6m' ? '6 Mois' : tf === '12m' ? '12 Mois' : 'Tout'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Month Cost */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Dépenses ({selectedMonth})</span>
            <HandCoins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(expenseMetrics.totalCurrentMonth, currency)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Moyenne : {formatCurrency(expenseMetrics.averagePerMonth, currency)} / mois
            </p>
          </div>
        </div>

        {/* Total Working Hours */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Heures Travaillées</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {formatNumber(totalSiteHours)} h
            </span>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
              dont {totalOvertimeHours}h supplémentaires
            </p>
          </div>
        </div>

        {/* Active Workers */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Effectif Actif</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {workerTimeData.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Moy. {Math.round(averageHoursPerWorker)}h / ouvrier ce mois
            </p>
          </div>
        </div>

        {/* Top Worker */}
        <div className="rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 text-slate-950 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-900/80 text-xs font-bold uppercase tracking-wider">
            <span>Top Travailleur</span>
            <Award className="h-4 w-4 text-slate-950" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black truncate block">
              {topWorker ? topWorker.name : 'Aucun pointage'}
            </span>
            <p className="text-xs font-bold text-slate-900/90 mt-0.5">
              {topWorker ? `${topWorker.totalHeures}h cumulées (${topWorker.joursPrésent}j)` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE 1 : VISUALISATION DES DÉPENSES MENSUELLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monthly Expenses Chart (2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span>Évolution des Dépenses Mensuelles</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparatif des décaissements directs et des acomptes versés
              </p>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setExpenseChartType('composed')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  expenseChartType === 'composed'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mixte (Barres + Ligne)
              </button>
              <button
                type="button"
                onClick={() => setExpenseChartType('bar')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  expenseChartType === 'bar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Barres
              </button>
              <button
                type="button"
                onClick={() => setExpenseChartType('area')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  expenseChartType === 'area'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aires
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {expenseChartType === 'area' ? (
                <AreaChart data={monthlyExpensesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorAdv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="dépenses" name="Dépenses directes" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorDep)" />
                  <Area type="monotone" dataKey="acomptes" name="Acomptes versés" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAdv)" />
                </AreaChart>
              ) : expenseChartType === 'bar' ? (
                <BarChart data={monthlyExpensesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="dépenses" name="Dépenses directes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acomptes" name="Acomptes versés" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <ComposedChart data={monthlyExpensesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="dépenses" name="Dépenses directes" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="acomptes" name="Acomptes versés" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Line type="monotone" dataKey="total" name="Total Sorties" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (1 Column) */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <PieChartIcon className="h-4 w-4 text-purple-500" />
              <span>Répartition par Catégorie</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Mois sélectionné ({selectedMonth})
            </p>

            {categoryDistribution.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 text-center">
                Aucune dépense enregistrée sur ce mois
              </div>
            )}
          </div>

          {/* Mini legend list */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs mt-2 border-t border-slate-100 pt-2">
            {categoryDistribution.slice(0, 4).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900 shrink-0 ml-2">
                  {formatCurrency(cat.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRAPHIQUE 2 : RÉPARTITION DU TEMPS DE TRAVAIL PAR OUVRIER */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Répartition du Temps de Travail par Ouvrier</span>
            </h3>
            <p className="text-xs text-slate-500">
              Volume horaire normal et heures supplémentaires enregistrées sur le mois de {selectedMonth}
            </p>
          </div>

          {/* Filters for Workers Chart */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Team Filter */}
            {teams.length > 0 && (
              <select
                value={selectedTeam}
                onChange={e => {
                  triggerHaptic('light');
                  setSelectedTeam(e.target.value);
                }}
                className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Toutes les équipes</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}

            {/* Craft Filter */}
            {crafts.length > 0 && (
              <select
                value={selectedCraft}
                onChange={e => {
                  triggerHaptic('light');
                  setSelectedCraft(e.target.value);
                }}
                className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tous les corps d'état</option>
                {crafts.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Metric Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setWorkerChartMetric('hours')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  workerChartMetric === 'hours'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Heures Normales & Sup
              </button>
              <button
                type="button"
                onClick={() => setWorkerChartMetric('days')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  workerChartMetric === 'days'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jours Présents
              </button>
            </div>
          </div>
        </div>

        {/* Worker Time Distribution Bar Chart */}
        {workerTimeData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {workerChartMetric === 'hours' ? (
                <BarChart
                  data={workerTimeData.slice(0, 15)}
                  margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Heures (h)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any, name: any) => [`${value} h`, name === 'heuresNormales' ? 'Heures Normales' : 'Heures Sup']}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="heuresNormales" name="Heures Normales" fill="#3b82f6" stackId="hours" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="heuresSup" name="Heures Supplémentaires" fill="#f59e0b" stackId="hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart
                  data={workerTimeData.slice(0, 15)}
                  margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Jours (j)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`${value} jours`, 'Présence']}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="joursPrésent" name="Jours Pointés Présents" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            Aucun ouvrier correspondant aux filtres sélectionnés.
          </div>
        )}

        {/* Detailed Worker Working Time Leaderboard / Table */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Récapitulatif Détaillé ({workerTimeData.length} ouvriers)
            </span>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('team')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                Gérer les fiches de paie &rarr;
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ouvrier</th>
                  <th className="py-2.5 px-3">Corps d'état</th>
                  <th className="py-2.5 px-3 text-center">Jours Présents</th>
                  <th className="py-2.5 px-3 text-center">Heures Normales</th>
                  <th className="py-2.5 px-3 text-center">Heures Sup</th>
                  <th className="py-2.5 px-3 text-right">Total Heures</th>
                  <th className="py-2.5 px-3 text-right">Part Chantier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {workerTimeData.slice(0, 8).map((item, idx) => {
                  const share = totalSiteHours > 0 ? (item.totalHeures / totalSiteHours) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-black shrink-0">
                          {idx + 1}
                        </span>
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.craft}</td>
                      <td className="py-2 px-3 text-center font-semibold text-emerald-700">{item.joursPrésent} j</td>
                      <td className="py-2 px-3 text-center text-slate-700">{item.heuresNormales} h</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-600">
                        {item.heuresSup > 0 ? `+${item.heuresSup} h` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">{item.totalHeures} h</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
