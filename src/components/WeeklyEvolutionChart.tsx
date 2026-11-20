import React, { useState, useMemo } from 'react';
import { DailyExpense, Advance, Site } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  LineChart,
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
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Layers,
  FileSpreadsheet,
  Receipt,
  HandCoins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { triggerHaptic } from '../utils/android';

export interface WeeklyDataPoint {
  weekKey: string;
  weekLabel: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
  expenses: number;
  advances: number;
  totalOutflow: number;
  expenseCount: number;
  advanceCount: number;
  percentChange?: number;
}

interface WeeklyEvolutionChartProps {
  site: Site;
  expenses: DailyExpense[];
  advances: Advance[];
  selectedMonth: string; // YYYY-MM
  currency: string;
}

type TimeframeOption = 'selected_month' | 'last_8_weeks' | 'last_12_weeks' | 'all_history';
type ChartType = 'composed' | 'area' | 'line' | 'table';

export const WeeklyEvolutionChart: React.FC<WeeklyEvolutionChartProps> = ({
  site,
  expenses,
  advances,
  selectedMonth,
  currency
}) => {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('selected_month');
  const [chartType, setChartType] = useState<ChartType>('composed');
  const [isStacked, setIsStacked] = useState<boolean>(true);

  // Filter expenses and advances for current site
  const siteExpenses = useMemo(() => {
    return (expenses || []).filter(e => e.site === site.id);
  }, [expenses, site.id]);

  const siteAdvances = useMemo(() => {
    return (advances || []).filter(a => a.site === site.id);
  }, [advances, site.id]);

  // Aggregate weekly data based on selected timeframe
  const weeklyData = useMemo<WeeklyDataPoint[]>(() => {
    const safeMonth = selectedMonth && selectedMonth.includes('-') ? selectedMonth : new Date().toISOString().slice(0, 7);

    if (timeframe === 'selected_month') {
      // Decompose selected month into 4-5 weeks
      const [yearStr, monthStr] = safeMonth.split('-');
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
      const daysInMonth = new Date(year, month, 0).getDate();

      const weeksDefinitions = [
        { num: 1, start: 1, end: 7, label: `Sem. 1 (01-07 ${getMonthShortName(month)})` },
        { num: 2, start: 8, end: 14, label: `Sem. 2 (08-14 ${getMonthShortName(month)})` },
        { num: 3, start: 15, end: 21, label: `Sem. 3 (15-21 ${getMonthShortName(month)})` },
        { num: 4, start: 22, end: 28, label: `Sem. 4 (22-28 ${getMonthShortName(month)})` }
      ];

      if (daysInMonth > 28) {
        weeksDefinitions.push({
          num: 5,
          start: 29,
          end: daysInMonth,
          label: `Sem. 5 (29-${daysInMonth} ${getMonthShortName(month)})`
        });
      }

      let prevTotal = 0;

      return weeksDefinitions.map((w, idx) => {
        const startStr = `${safeMonth}-${String(w.start).padStart(2, '0')}`;
        const endStr = `${safeMonth}-${String(w.end).padStart(2, '0')}`;

        // Matching expenses in range
        const matchingExp = siteExpenses.filter(e => e.date >= startStr && e.date <= endStr);
        const expTotal = matchingExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        // Matching advances in range
        const matchingAdv = siteAdvances.filter(a => a.date >= startStr && a.date <= endStr);
        const advTotal = matchingAdv.reduce((s, a) => s + (Number(a.amount) || 0), 0);

        const totalOutflow = expTotal + advTotal;
        let percentChange: number | undefined = undefined;

        if (idx > 0 && prevTotal > 0) {
          percentChange = Math.round(((totalOutflow - prevTotal) / prevTotal) * 100);
        }
        prevTotal = totalOutflow;

        return {
          weekKey: `S${w.num}`,
          weekLabel: w.label,
          shortLabel: `Sem. ${w.num}`,
          startDate: startStr,
          endDate: endStr,
          expenses: expTotal,
          advances: advTotal,
          totalOutflow,
          expenseCount: matchingExp.length,
          advanceCount: matchingAdv.length,
          percentChange
        };
      });
    }

    // Dynamic ISO weekly grouping for 8 weeks, 12 weeks, or all history
    const allDates: string[] = [
      ...siteExpenses.map(e => e.date),
      ...siteAdvances.map(a => a.date)
    ].filter(Boolean);

    if (allDates.length === 0) {
      // Fallback: Generate empty recent weeks
      const now = new Date();
      const fallbackWeeks: WeeklyDataPoint[] = [];
      const numWeeks = timeframe === 'last_8_weeks' ? 8 : timeframe === 'last_12_weeks' ? 12 : 6;

      for (let i = numWeeks - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const mon = getMonday(d);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);

        const startStr = formatDateISO(mon);
        const endStr = formatDateISO(sun);
        const label = `Sem. ${getISOWeek(mon)} (${formatDateShort(mon)} - ${formatDateShort(sun)})`;

        fallbackWeeks.push({
          weekKey: `W${getISOWeek(mon)}`,
          weekLabel: label,
          shortLabel: `S${getISOWeek(mon)}`,
          startDate: startStr,
          endDate: endStr,
          expenses: 0,
          advances: 0,
          totalOutflow: 0,
          expenseCount: 0,
          advanceCount: 0
        });
      }
      return fallbackWeeks;
    }

    // Determine min and max dates
    allDates.sort();
    const minDateStr = allDates[0];
    const maxDateStr = allDates[allDates.length - 1];

    let startDate = getMonday(new Date(minDateStr));
    const latestDate = new Date(maxDateStr);
    const today = new Date();
    const targetEnd = latestDate > today ? latestDate : today;
    const endDate = getSunday(targetEnd);

    // If last_8_weeks or last_12_weeks, shift start date accordingly
    if (timeframe === 'last_8_weeks') {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 7 * 7);
      startDate = getMonday(d);
    } else if (timeframe === 'last_12_weeks') {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 11 * 7);
      startDate = getMonday(d);
    }

    // Build weeks array
    const points: WeeklyDataPoint[] = [];
    const curr = new Date(startDate);
    let prevTotal = 0;
    let idx = 0;
    let loopGuard = 0;

    while (curr <= endDate && loopGuard < 120) {
      loopGuard++;
      const mon = new Date(curr);
      const sun = new Date(curr);
      sun.setDate(sun.getDate() + 6);

      const startStr = formatDateISO(mon);
      const endStr = formatDateISO(sun);
      const weekNum = getISOWeek(mon);
      const label = `Sem. ${weekNum} (${formatDateShort(mon)} - ${formatDateShort(sun)})`;

      const matchingExp = siteExpenses.filter(e => e.date >= startStr && e.date <= endStr);
      const expTotal = matchingExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const matchingAdv = siteAdvances.filter(a => a.date >= startStr && a.date <= endStr);
      const advTotal = matchingAdv.reduce((s, a) => s + (Number(a.amount) || 0), 0);

      const totalOutflow = expTotal + advTotal;
      let percentChange: number | undefined = undefined;

      if (idx > 0 && prevTotal > 0) {
        percentChange = Math.round(((totalOutflow - prevTotal) / prevTotal) * 100);
      }
      prevTotal = totalOutflow;

      points.push({
        weekKey: `S${weekNum}_${startStr.slice(5, 10)}`,
        weekLabel: label,
        shortLabel: `S${weekNum}`,
        startDate: startStr,
        endDate: endStr,
        expenses: expTotal,
        advances: advTotal,
        totalOutflow,
        expenseCount: matchingExp.length,
        advanceCount: matchingAdv.length,
        percentChange
      });

      curr.setDate(curr.getDate() + 7);
      idx++;
    }

    return points;
  }, [timeframe, selectedMonth, siteExpenses, siteAdvances]);

  // Aggregate Key Performance Metrics
  const summaryMetrics = useMemo(() => {
    const totalExp = weeklyData.reduce((s, w) => s + w.expenses, 0);
    const totalAdv = weeklyData.reduce((s, w) => s + w.advances, 0);
    const totalOutflow = totalExp + totalAdv;
    const avgWeekly = weeklyData.length > 0 ? Math.round(totalOutflow / weeklyData.length) : 0;

    let peakWeek = weeklyData[0] || null;
    weeklyData.forEach(w => {
      if (!peakWeek || w.totalOutflow > peakWeek.totalOutflow) {
        peakWeek = w;
      }
    });

    const expShare = totalOutflow > 0 ? Math.round((totalExp / totalOutflow) * 100) : 0;
    const advShare = totalOutflow > 0 ? Math.round((totalAdv / totalOutflow) * 100) : 0;

    return {
      totalExp,
      totalAdv,
      totalOutflow,
      avgWeekly,
      peakWeek,
      expShare,
      advShare
    };
  }, [weeklyData]);

  // CSV Export for weekly data
  const handleExportCSV = () => {
    triggerHaptic('success');
    const headers = [
      'Période',
      'Date Début',
      'Date Fin',
      `Dépenses Caisse (${currency})`,
      'Nb Dépenses',
      `Acomptes Salaires (${currency})`,
      'Nb Acomptes',
      `Total Sorties (${currency})`,
      'Évolution vs S-1 (%)'
    ];

    const rows = weeklyData.map(w => [
      `"${w.weekLabel}"`,
      w.startDate,
      w.endDate,
      w.expenses,
      w.expenseCount,
      w.advances,
      w.advanceCount,
      w.totalOutflow,
      w.percentChange !== undefined ? `${w.percentChange}%` : '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Evolution_Hebdomadaire_${site.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data: WeeklyDataPoint = payload[0]?.payload;
    if (!data) return null;

    const total = data.totalOutflow;
    const expPct = total > 0 ? Math.round((data.expenses / total) * 100) : 0;
    const advPct = total > 0 ? Math.round((data.advances / total) * 100) : 0;

    return (
      <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-2xl border border-slate-800 text-xs min-w-[220px] backdrop-blur-md">
        <div className="border-b border-slate-800 pb-2 mb-2.5">
          <div className="font-extrabold text-sm text-amber-400 flex items-center justify-between gap-2">
            <span>{data.weekLabel}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {data.startDate} au {data.endDate}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>Dépenses Caisse :</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white font-mono">
                {formatCurrency(data.expenses, currency)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {expPct}% • {data.expenseCount} op.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></span>
              <span>Acomptes Salaires :</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white font-mono">
                {formatCurrency(data.advances, currency)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {advPct}% • {data.advanceCount} op.
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between gap-4">
            <span className="font-black text-slate-200">Total Décaissé :</span>
            <div className="text-right">
              <span className="font-extrabold text-emerald-400 text-sm font-mono block">
                {formatCurrency(total, currency)}
              </span>
              {data.percentChange !== undefined && (
                <span
                  className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                    data.percentChange > 0
                      ? 'text-rose-400'
                      : data.percentChange < 0
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {data.percentChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {data.percentChange > 0 ? `+${data.percentChange}%` : `${data.percentChange}%`} vs S-1
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-bold shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{t('reports.weeklyTitle', 'Évolution Hebdomadaire des Décaissements')}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {site.name}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'reports.weeklySubtitle',
                  'Analyse comparative par semaine entre les dépenses de caisse et les acomptes versés'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action and Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTimeframe('selected_month');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === 'selected_month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Mois actif ({selectedMonth})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTimeframe('last_8_weeks');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === 'last_8_weeks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              8 Semaines
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTimeframe('last_12_weeks');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === 'last_12_weeks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              12 Semaines
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTimeframe('all_history');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === 'all_history'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Chart Display Mode Switcher */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setChartType('composed');
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'composed'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Barres & Courbe"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setChartType('area');
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Aires empilées"
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setChartType('table');
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Tableau récapitulatif"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Exporter les données hebdomadaires en CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="p-5 bg-white border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-900 p-3.5 text-white shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Total Décaissé</span>
              <Wallet className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 text-lg sm:text-xl font-extrabold font-mono text-white">
              {formatCurrency(summaryMetrics.totalOutflow, currency)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Sur {weeklyData.length} semaine(s)
            </span>
          </div>

          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-rose-950 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
              <span>Dépenses Caisse</span>
              <Receipt className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="mt-1.5 text-lg sm:text-xl font-black font-mono text-rose-900">
              {formatCurrency(summaryMetrics.totalExp, currency)}
            </div>
            <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
              {summaryMetrics.expShare}% du total
            </span>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-950 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
              <span>Acomptes Versés</span>
              <HandCoins className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1.5 text-lg sm:text-xl font-black font-mono text-amber-950">
              {formatCurrency(summaryMetrics.totalAdv, currency)}
            </div>
            <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
              {summaryMetrics.advShare}% du total
            </span>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3.5 text-blue-950 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
              <span>Moyenne / Semaine</span>
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="mt-1.5 text-lg sm:text-xl font-black font-mono text-blue-900">
              {formatCurrency(summaryMetrics.avgWeekly, currency)}
            </div>
            {summaryMetrics.peakWeek && (
              <span className="text-[10px] text-blue-700 truncate block mt-0.5">
                Pic: {summaryMetrics.peakWeek.shortLabel} ({formatCurrency(summaryMetrics.peakWeek.totalOutflow, currency)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-5">
        {chartType !== 'table' ? (
          <div className="space-y-3">
            {/* Chart toggle options */}
            {chartType === 'composed' && (
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 font-bold text-rose-600">
                    <span className="h-3 w-3 rounded bg-rose-500"></span> Dépenses Caisse
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-600">
                    <span className="h-3 w-3 rounded bg-amber-400"></span> Acomptes Salaires
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="h-1.5 w-4 rounded bg-slate-900"></span> Total Sorties
                  </span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={isStacked}
                    onChange={e => setIsStacked(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Empiler les barres</span>
                </label>
              </div>
            )}

            {/* Recharts Canvas */}
            <div className="w-full h-80 min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'composed' ? (
                  <ComposedChart data={weeklyData} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorExpBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="colorAdvBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      tickFormatter={val => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="expenses"
                      name="Dépenses Caisse"
                      fill="url(#colorExpBar)"
                      stackId={isStacked ? 'outflows' : undefined}
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey="advances"
                      name="Acomptes Salaires"
                      fill="url(#colorAdvBar)"
                      stackId={isStacked ? 'outflows' : undefined}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalOutflow"
                      name="Total Décaissé"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#0f172a', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#f59e0b', strokeWidth: 2, stroke: '#0f172a' }}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart data={weeklyData} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="areaExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="areaAdvances" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      tickFormatter={val => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Dépenses Caisse"
                      stroke="#e11d48"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#areaExpenses)"
                      stackId="areaStack"
                    />
                    <Area
                      type="monotone"
                      dataKey="advances"
                      name="Acomptes Salaires"
                      stroke="#d97706"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#areaAdvances)"
                      stackId="areaStack"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Table breakdown view */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Semaine</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3 text-right">Dépenses Caisse</th>
                  <th className="p-3 text-right">Acomptes Salaires</th>
                  <th className="p-3 text-right">Total Sorties</th>
                  <th className="p-3 text-center">Part Global</th>
                  <th className="p-3 text-right">Tendance S-1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklyData.map(w => {
                  const share =
                    summaryMetrics.totalOutflow > 0
                      ? Math.round((w.totalOutflow / summaryMetrics.totalOutflow) * 100)
                      : 0;

                  return (
                    <tr key={w.weekKey} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{w.shortLabel}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {w.startDate} → {w.endDate}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-700 font-mono">
                        {formatCurrency(w.expenses, currency)}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {w.expenseCount} opération(s)
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-amber-700 font-mono">
                        {formatCurrency(w.advances, currency)}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {w.advanceCount} acompte(s)
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900 font-mono text-sm">
                        {formatCurrency(w.totalOutflow, currency)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {share}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {w.percentChange !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              w.percentChange > 0
                                ? 'text-rose-600'
                                : w.percentChange < 0
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {w.percentChange > 0 ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {w.percentChange > 0 ? `+${w.percentChange}%` : `${w.percentChange}%`}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Date Helpers
function getMonthShortName(monthNum: number): string {
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return months[monthNum - 1] || '';
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
}

function getSunday(d: Date): Date {
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date();
  const day = date.getDay();
  const diff = date.getDate() + (day === 0 ? 0 : 7 - day);
  return new Date(date.setDate(diff));
}

function formatDateISO(d: Date): string {
  if (!d || isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function formatDateShort(d: Date): string {
  if (!d || isNaN(d.getTime())) return '--/--';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function getISOWeek(date: Date): number {
  if (!date || isNaN(date.getTime())) return 1;
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
