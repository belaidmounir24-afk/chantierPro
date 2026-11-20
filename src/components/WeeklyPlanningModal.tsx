import React, { useState, useMemo } from 'react';
import { Site, Worker, Team, AttendanceRecord } from '../types';
import {
  WeekFormat,
  buildWeeklyPlanningData,
  downloadWeeklyPlanningPDF
} from '../services/weeklyPlanningPdfService';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import {
  CalendarDays,
  Download,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Users,
  Clock,
  Flame,
  Wallet,
  Building2,
  HardHat,
  Loader2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface WeeklyPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
  workers: Worker[];
  teams: Team[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  initialDate?: string;
  currency?: string;
}

export const WeeklyPlanningModal: React.FC<WeeklyPlanningModalProps> = ({
  isOpen,
  onClose,
  site,
  workers,
  teams,
  attendance,
  initialDate,
  currency = 'DZD'
}) => {
  const [selectedBaseDate, setSelectedBaseDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [weekFormat, setWeekFormat] = useState<WeekFormat>('sat-fri');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterCraft, setFilterCraft] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Compute planning data
  const planningData = useMemo(() => {
    return buildWeeklyPlanningData(
      site,
      workers,
      attendance,
      selectedBaseDate,
      weekFormat,
      currency,
      filterTeam,
      filterCraft
    );
  }, [site, workers, attendance, selectedBaseDate, weekFormat, currency, filterTeam, filterCraft]);

  if (!isOpen) return null;

  // Move week forward or backward
  const handleShiftWeek = (deltaDays: number) => {
    triggerHaptic('light');
    try {
      const parts = selectedBaseDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedBaseDate(`${y}-${m}-${day}`);
      }
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      triggerHaptic('medium');
      downloadWeeklyPlanningPDF(planningData);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du planning PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const craftsList = Array.from(
    new Set(workers.filter(w => w.site === site.id).map(w => w.craft))
  ).filter(Boolean).sort();

  const totalWeeklyHours = planningData.rows.reduce((s, r) => s + r.totalHours, 0);
  const totalWeeklyOvertime = planningData.rows.reduce((s, r) => s + r.totalOvertimeHours, 0);
  const totalWeeklyGross = planningData.rows.reduce((s, r) => s + r.weeklyGross, 0);

  return (
    <div
      id="weekly-planning-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden print:max-w-none print:max-h-none print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Planning Hebdomadaire des Ouvriers
                </h2>
                <span className="hidden sm:inline-flex items-center rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-black text-amber-300 border border-amber-400/30">
                  Export PDF Paysage A4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chantier : <span className="text-slate-200 font-bold">{site.name}</span> — Semaine du{' '}
                <span className="text-amber-400 font-semibold">{planningData.weekStartDate}</span> au{' '}
                <span className="text-amber-400 font-semibold">{planningData.weekEndDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              title="Imprimer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              id="btn-download-weekly-pdf-top"
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Génération...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>PDF Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Télécharger PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Toolbar & Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Week navigation & date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Semaine de référence
              </label>
              <div className="flex items-center bg-white rounded-xl border border-slate-300 p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleShiftWeek(weekFormat.includes('6') ? -6 : -7)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Semaine précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedBaseDate}
                  onChange={e => setSelectedBaseDate(e.target.value)}
                  className="w-full text-center text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleShiftWeek(weekFormat.includes('6') ? 6 : 7)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Semaine suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Week Format */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Format de la semaine
              </label>
              <select
                value={weekFormat}
                onChange={e => setWeekFormat(e.target.value as WeekFormat)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="sat-fri">Samedi → Vendredi (7j - BTP Algérie / MENA)</option>
                <option value="sat-thu">Samedi → Jeudi (6j ouvré)</option>
                <option value="mon-sun">Lundi → Dimanche (7j - International)</option>
                <option value="mon-sat">Lundi → Samedi (6j)</option>
              </select>
            </div>

            {/* Filter Team */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Filtrer par Équipe
              </label>
              <select
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="all">— Toutes les équipes ({site.name}) —</option>
                {teams.filter(t => t.siteId === site.id).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Craft */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Filtrer par Métier
              </label>
              <select
                value={filterCraft}
                onChange={e => setFilterCraft(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="all">— Tous les corps d'état —</option>
                {craftsList.map(craft => (
                  <option key={craft} value={craft}>{craft}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-900 text-xs font-black uppercase tracking-wider">
                <span>Effectif Hebdo</span>
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{planningData.rows.length}</span>
                <span className="text-xs text-indigo-800 font-semibold">ouvriers planifiés</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-900 text-xs font-black uppercase tracking-wider">
                <span>Heures Totales</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{totalWeeklyHours}h</span>
                <span className="text-xs text-blue-800 font-semibold">au prorata (8h/j)</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-950 text-xs font-black uppercase tracking-wider">
                <span>Heures Sup. (HS)</span>
                <Flame className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">+{totalWeeklyOvertime}h</span>
                <span className="text-xs text-amber-900 font-semibold">validées semaine</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-950 text-xs font-black uppercase tracking-wider">
                <span>Masse Salariale</span>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-900">
                  {formatCurrency(totalWeeklyGross, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="p-3 sticky left-0 bg-slate-900 z-10 w-44 min-w-44 border-r border-slate-800">
                      Ouvrier & Métier
                    </th>
                    <th className="p-2.5 text-center w-20 border-r border-slate-800">
                      Taux
                    </th>
                    {planningData.days.map(d => (
                      <th
                        key={d.date}
                        className="p-2.5 text-center min-w-16 border-r border-slate-800 font-black"
                      >
                        <div className="text-amber-400">{d.dayNameShort.toUpperCase()}</div>
                        <div className="text-[10px] text-slate-300 font-mono">{d.dayNumber}/{d.date.slice(5, 7)}</div>
                      </th>
                    ))}
                    <th className="p-2.5 text-center w-16 border-r border-slate-800 text-blue-300">
                      Tot. H
                    </th>
                    <th className="p-2.5 text-center w-14 border-r border-slate-800 text-amber-300">
                      HS
                    </th>
                    <th className="p-3 text-right w-24 font-black">
                      Total Brut
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {planningData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={planningData.days.length + 5} className="py-12 text-center text-slate-400 text-xs">
                        Aucun ouvrier actif ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    planningData.rows.map(row => (
                      <tr key={row.worker.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-2xs">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {row.worker.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700">{row.worker.craft}</span>
                            <span>•</span>
                            <span>{row.worker.team}</span>
                          </div>
                        </td>

                        <td className="p-2 text-center border-r border-slate-200 text-[11px] font-mono font-bold text-slate-700">
                          {row.worker.rate}
                          <span className="text-[9px] text-slate-400 font-normal">/{row.worker.rateType === 'heure' ? 'h' : 'j'}</span>
                        </td>

                        {row.daysData.map(dd => {
                          const st = dd.status;
                          return (
                            <td
                              key={dd.date}
                              className={`p-2 text-center border-r border-slate-200 transition-colors ${
                                st === 'P'
                                  ? 'bg-emerald-50/60'
                                  : st === 'R'
                                  ? 'bg-amber-50/80'
                                  : st === 'J'
                                  ? 'bg-purple-50/60'
                                  : st === 'A'
                                  ? 'bg-rose-50/60'
                                  : 'bg-slate-50/30'
                              }`}
                            >
                              {st === '—' ? (
                                <span className="text-slate-300 font-bold">—</span>
                              ) : st === 'P' ? (
                                <div className="leading-tight">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px]">
                                    P
                                  </span>
                                  <div className="text-[10px] font-bold text-emerald-950 mt-0.5">
                                    {dd.hours}h
                                  </div>
                                  {dd.hSup > 0 && (
                                    <div className="text-[9px] font-extrabold text-blue-600">
                                      +{dd.hSup}h
                                    </div>
                                  )}
                                  {dd.absenceHours > 0 && (
                                    <div className="text-[9px] font-bold text-rose-600">
                                      -{dd.absenceHours}h
                                    </div>
                                  )}
                                </div>
                              ) : st === 'R' ? (
                                <div className="leading-tight">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">
                                    R
                                  </span>
                                  <div className="text-[10px] font-bold text-amber-950 mt-0.5">
                                    {dd.hours}h
                                  </div>
                                  {dd.absenceHours > 0 && (
                                    <div className="text-[9px] font-bold text-rose-600">
                                      -{dd.absenceHours}h
                                    </div>
                                  )}
                                </div>
                              ) : st === 'J' ? (
                                <div className="leading-tight">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-600 text-white font-black text-[10px]">
                                    C
                                  </span>
                                  <div className="text-[10px] font-bold text-purple-950 mt-0.5">
                                    8h
                                  </div>
                                </div>
                              ) : (
                                <div className="leading-tight">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px]">
                                    ABS
                                  </span>
                                  {dd.hours > 0 && (
                                    <div className="text-[9px] font-bold text-rose-900 mt-0.5">
                                      {dd.hours}h
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-2 text-center border-r border-slate-200 font-black text-slate-900">
                          {row.totalHours}h
                        </td>

                        <td className="p-2 text-center border-r border-slate-200 font-extrabold text-blue-600">
                          {row.totalOvertimeHours > 0 ? `+${row.totalOvertimeHours}h` : '—'}
                        </td>

                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(row.weeklyGross, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer Totals */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-[11px]">
                    <td className="p-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-300">
                      TOTAUX GÉNÉRAUX
                    </td>
                    <td className="p-2 text-center border-r border-slate-300">
                      {planningData.rows.length} ouv.
                    </td>
                    {planningData.days.map(d => {
                      const presentCount = planningData.rows.filter(r => {
                        const rec = r.daysData.find(dd => dd.date === d.date);
                        return rec && (rec.status === 'P' || rec.status === 'R' || rec.status === 'J');
                      }).length;

                      const dayHours = planningData.rows.reduce((sum, r) => {
                        const rec = r.daysData.find(dd => dd.date === d.date);
                        return sum + (rec ? rec.hours : 0);
                      }, 0);

                      return (
                        <td key={d.date} className="p-2 text-center border-r border-slate-300 leading-tight">
                          <div className="font-extrabold text-emerald-700">{presentCount} P</div>
                          <div className="text-[10px] text-slate-500 font-mono">{dayHours}h</div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center border-r border-slate-300 text-blue-700">
                      {totalWeeklyHours}h
                    </td>
                    <td className="p-2 text-center border-r border-slate-300 text-amber-700">
                      +{totalWeeklyOvertime}h
                    </td>
                    <td className="p-3 text-right font-black text-slate-950">
                      {formatCurrency(totalWeeklyGross, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Document prêt à exporter en haute résolution A4 Paysage avec blocs de signature</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Fermer
            </button>

            <button
              id="btn-download-weekly-pdf-bottom"
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>PDF Généré avec Succès !</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Télécharger Planning PDF (A4 Paysage)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
