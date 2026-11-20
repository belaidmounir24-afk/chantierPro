import React, { useState } from 'react';
import { Site, Worker, Team, AttendanceRecord, AttendanceStatus, Advance, DailyExpense } from '../types';
import { getTodayDateString } from '../services/storage';
import { formatCurrency, calculateDailyWorkerPay } from '../utils/calculations';
import { DashboardCharts } from './DashboardCharts';
import {
  Calendar,
  Check,
  Clock,
  ClockAlert,
  UserX,
  Plus,
  Minus,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  MapPin,
  Flame,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  HandCoins,
  BarChart3,
  ClipboardCheck,
  Camera,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import { WeeklyPlanningModal } from './WeeklyPlanningModal';

interface AttendanceViewProps {
  site: Site;
  workers: Worker[];
  teams: Team[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  advances?: Advance[];
  expenses?: DailyExpense[];
  onUpdateAttendance: (date: string, records: AttendanceRecord[]) => void;
  onOpenWorkerModal: (worker?: Worker) => void;
  onOpenAdvanceModal?: (worker: Worker) => void;
  onOpenAiSmartCapture?: () => void;
  onSelectTab?: (tab: any) => void;
  currency: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  site,
  workers,
  teams,
  attendance,
  advances = [],
  expenses = [],
  onUpdateAttendance,
  onOpenWorkerModal,
  onOpenAdvanceModal,
  onOpenAiSmartCapture,
  onSelectTab,
  currency
}) => {
  const { t, isRTL } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'analytics'>('attendance');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCraft, setFilterCraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsSimulated, setGpsSimulated] = useState(true);
  const [stepperStep, setStepperStep] = useState<0.5 | 1>(0.5);
  const [isWeeklyPlanningOpen, setIsWeeklyPlanningOpen] = useState(false);

  // Active workers for this site
  const siteWorkers = workers.filter(w => w.site === site.id && w.active);
  const siteAttendance = attendance[site.id] || {};
  const currentRecords: AttendanceRecord[] = siteAttendance[selectedDate] || [];

  const craftsList = Array.from(new Set(siteWorkers.map(w => w.craft))).sort();

  // Helper to get status for worker
  const getRecord = (workerId: string): AttendanceRecord => {
    return currentRecords.find(r => r.workerId === workerId) || { workerId, status: 'A', hSup: 0, absenceHours: 0 };
  };

  // Status counts
  const presentCount = currentRecords.filter(r => r.status === 'P').length;
  const lateCount = currentRecords.filter(r => r.status === 'R').length;
  const absentCount = siteWorkers.length - (presentCount + lateCount + currentRecords.filter(r => r.status === 'J').length);
  const leaveCount = currentRecords.filter(r => r.status === 'J').length;
  const totalOvertime = currentRecords.reduce((sum, r) => sum + (Number(r.hSup) || 0), 0);
  const totalAbsenceHours = currentRecords.reduce((sum, r) => sum + (Number(r.absenceHours) || 0), 0);

  // Cycle status: A -> P -> R -> J -> A
  const cycleStatus = (status: AttendanceStatus): AttendanceStatus => {
    const sequence: AttendanceStatus[] = ['A', 'P', 'R', 'J'];
    const idx = sequence.indexOf(status);
    return sequence[(idx + 1) % sequence.length];
  };

  const handleSetStatus = (workerId: string, status: AttendanceStatus) => {
    triggerHaptic(status === 'P' || status === 'R' ? 'success' : 'light');
    const updated = [...currentRecords];
    const idx = updated.findIndex(r => r.workerId === workerId);
    if (idx >= 0) {
      const existing = updated[idx];
      let newAbsence = existing.absenceHours ?? 0;
      if (status === 'P' || status === 'J') {
        newAbsence = 0;
      } else if (status === 'R' && newAbsence === 0) {
        newAbsence = 1; // Préréglage rapide 1h pour retard
      } else if (status === 'A' && newAbsence === 0) {
        newAbsence = 8; // Journée complète pour absence
      }
      updated[idx] = { ...existing, status, absenceHours: newAbsence };
    } else {
      const defaultAbsence = status === 'A' ? 8 : status === 'R' ? 1 : 0;
      updated.push({ workerId, status, hSup: 0, absenceHours: defaultAbsence });
    }
    onUpdateAttendance(selectedDate, updated);

    // If all workers now marked as P, trigger confetti
    const newPresentCount = updated.filter(r => r.status === 'P' || r.status === 'R').length;
    if (newPresentCount === siteWorkers.length && siteWorkers.length > 0) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleToggleStatus = (workerId: string) => {
    triggerHaptic('light');
    const current = getRecord(workerId);
    const next = cycleStatus(current.status);
    handleSetStatus(workerId, next);
  };

  const handleSetOvertime = (workerId: string, hSup: number) => {
    triggerHaptic('light');
    const updated = [...currentRecords];
    const idx = updated.findIndex(r => r.workerId === workerId);
    const cleanHSup = Math.max(0, Math.round(Number(hSup) * 10) / 10);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], hSup: cleanHSup };
    } else {
      updated.push({ workerId, status: 'P', hSup: cleanHSup, absenceHours: 0 });
    }
    onUpdateAttendance(selectedDate, updated);
  };

  const handleSetAbsence = (workerId: string, hours: number) => {
    triggerHaptic('light');
    const updated = [...currentRecords];
    const idx = updated.findIndex(r => r.workerId === workerId);
    const cleanHours = Math.max(0, Math.round(Number(hours) * 10) / 10);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], absenceHours: cleanHours };
    } else {
      updated.push({
        workerId,
        status: cleanHours >= 8 ? 'A' : 'R',
        hSup: 0,
        absenceHours: cleanHours
      });
    }
    onUpdateAttendance(selectedDate, updated);
  };

  const handleBatchMark = (status: AttendanceStatus) => {
    triggerHaptic('medium');
    const updated = [...currentRecords];
    filteredWorkers.forEach(w => {
      const idx = updated.findIndex(r => r.workerId === w.id);
      const defaultAbsence = status === 'A' ? 8 : status === 'R' ? 1 : 0;
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          status,
          absenceHours: status === 'P' || status === 'J' ? 0 : (updated[idx].absenceHours || defaultAbsence)
        };
      } else {
        updated.push({
          workerId: w.id,
          status,
          hSup: 0,
          absenceHours: defaultAbsence
        });
      }
    });
    onUpdateAttendance(selectedDate, updated);

    if (status === 'P') {
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
      } catch (e) {
        // ignore
      }
    }
  };

  const changeDateByDays = (delta: number) => {
    try {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + delta);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + delta);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
      }
    } catch {
      setSelectedDate(getTodayDateString());
    }
  };

  // Filtered workers list
  const filteredWorkers = siteWorkers.filter(w => {
    if (filterTeam && w.team !== filterTeam) return false;
    if (filterCraft && w.craft !== filterCraft) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return w.name.toLowerCase().includes(q) || w.craft.toLowerCase().includes(q) || w.team.toLowerCase().includes(q);
    }
    return true;
  });

  const isToday = selectedDate === getTodayDateString();

  return (
    <div className="space-y-5 pb-8">
      {/* Top Main Navigation Mode: Pointage vs Graphiques Récapitulatifs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            id="tab-pointage-direct"
            onClick={() => {
              triggerHaptic('light');
              setActiveSubTab('attendance');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'attendance'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Pointage & Présences</span>
          </button>

          <button
            type="button"
            id="tab-graphiques-analytics"
            onClick={() => {
              triggerHaptic('light');
              setActiveSubTab('analytics');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Graphiques & Statistiques</span>
            <span className="hidden xs:inline text-[9px] font-black uppercase px-1.5 py-0.2 bg-slate-900 text-amber-400 rounded-sm">
              Recharts
            </span>
          </button>
        </div>

        {/* Quick AI Smart Capture Action */}
        {onOpenAiSmartCapture && (
          <button
            type="button"
            id="btn-quick-ai-capture"
            onClick={() => {
              triggerHaptic('medium');
              onOpenAiSmartCapture();
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-amber-400"
          >
            <Camera className="w-4 h-4" />
            <span>Scan IA (Caméra / Photos / Doc)</span>
            <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
          </button>
        )}
      </div>

      {/* ANALYTICS SUBTAB: Full Recharts Dashboard */}
      {activeSubTab === 'analytics' && (
        <DashboardCharts
          site={site}
          workers={workers}
          teams={teams}
          attendance={attendance}
          expenses={expenses}
          advances={advances}
          currency={currency}
          onOpenWorkerModal={onOpenWorkerModal}
          onSelectTab={onSelectTab}
        />
      )}

      {/* ATTENDANCE SUBTAB: Daily attendance view */}
      {activeSubTab === 'attendance' && (
        <>
          {/* Top Banner with Date navigation & Site Status */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  id="prev-date-btn"
                  type="button"
                  onClick={() => changeDateByDays(-1)}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                  title="Jour précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1 text-sm font-bold text-slate-800">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <input
                    id="attendance-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer text-sm"
                  />
                </div>
                <button
                  id="next-date-btn"
                  type="button"
                  onClick={() => changeDateByDays(1)}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                  title="Jour suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 text-xs font-bold transition-colors"
                >
                  Aujourd'hui
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-weekly-planning-pdf"
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsWeeklyPlanningOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer border border-slate-700"
                title="Générer et exporter le planning hebdomadaire récapitulatif des ouvriers en PDF (A4 Paysage)"
              >
                <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('attendance.weeklyPlanningPdf', 'Planning Hebdo PDF')}</span>
                <span className="hidden xs:inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                  A4
                </span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Rayon GPS : {site.radius || 150}m</span>
              </div>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="text-slate-500">
                {siteWorkers.length} ouvriers inscrits
              </span>
            </div>
          </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-100 text-xs font-bold uppercase tracking-wider">
            <span>{t('attendance.present', 'Présents (P)')}</span>
            <CheckCircle className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{presentCount}</span>
            <span className="text-xs text-emerald-200 font-medium">
              / {siteWorkers.length} ({siteWorkers.length ? Math.round((presentCount / siteWorkers.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-500 p-4 text-slate-950 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-950 text-xs font-bold uppercase tracking-wider">
            <span>{t('attendance.late', 'Retards (R)')}</span>
            <Clock className="h-4 w-4 text-amber-950" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{lateCount}</span>
            <span className="text-xs text-amber-900 font-semibold">signalés</span>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-600 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-100 text-xs font-bold uppercase tracking-wider">
            <span>{t('attendance.absent', 'Absents (A)')}</span>
            <UserX className="h-4 w-4 text-rose-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{Math.max(0, absentCount)}</span>
            <span className="text-xs text-rose-200 font-medium">non présents</span>
          </div>
        </div>

        <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-100 text-xs font-bold uppercase tracking-wider">
            <span>{t('attendance.overtime', 'Heures Supp. (HS)')}</span>
            <Flame className="h-4 w-4 text-blue-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">+{totalOvertime}h</span>
            <span className="text-xs text-blue-200 font-medium">validées</span>
          </div>
        </div>

        <div className="rounded-2xl bg-orange-600 p-4 text-white shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-orange-100 text-xs font-bold uppercase tracking-wider">
            <span>{t('attendance.absenceHours', 'Heures Abs./Retard (HA)')}</span>
            <ClockAlert className="h-4 w-4 text-orange-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{totalAbsenceHours > 0 ? `-${totalAbsenceHours}h` : '0h'}</span>
            <span className="text-xs text-orange-200 font-medium">
              {totalAbsenceHours > 0 ? 'à déduire' : 'aucune déduction'}
            </span>
          </div>
        </div>
      </div>

      {/* Pointage Card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* Card Header with Filters & Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{t('attendance.sheetTitle', 'Feuille de Pointage')}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-semibold">
                  {filteredWorkers.length} {t('attendance.workersShown', 'ouvriers affichés')}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {t('attendance.sheetDesc', 'Cliquez sur le badge pour cycler le statut ou utilisez les boutons rapides')}
              </p>
            </div>

            {/* Batch actions & Stepper step switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-bold px-1.5">Pas :</span>
                <button
                  type="button"
                  onClick={() => setStepperStep(0.5)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    stepperStep === 0.5
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Incrémenter/Décrémenter par pas de 30 min (0.5h)"
                >
                  0.5h
                </button>
                <button
                  type="button"
                  onClick={() => setStepperStep(1)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    stepperStep === 1
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Incrémenter/Décrémenter par pas de 1 heure"
                >
                  1h
                </button>
              </div>

              <button
                id="btn-sheet-weekly-planning-pdf"
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsWeeklyPlanningOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Générer le planning hebdomadaire récapitulatif des ouvriers (PDF A4 Paysage)"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Planning Hebdo</span>
              </button>

              <button
                id="mark-all-present-btn"
                type="button"
                onClick={() => handleBatchMark('P')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                {t('attendance.markAllPresent', 'Tout marquer Présent')}
              </button>
              <button
                id="mark-all-absent-btn"
                type="button"
                onClick={() => handleBatchMark('A')}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 text-xs font-bold transition-colors"
              >
                <UserX className="h-3.5 w-3.5" />
                {t('attendance.markAllAbsent', 'Tout Absent')}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-worker-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <select
                id="filter-team-select"
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="">— Toutes les équipes —</option>
                {teams.filter(t => t.siteId === site.id).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
                {/* Fallback teams */}
                <option value="Équipe A — Gros Œuvre">Équipe A — Gros Œuvre</option>
                <option value="Équipe B — Second Œuvre">Équipe B — Second Œuvre</option>
                <option value="Équipe C — Finitions & Fluides">Équipe C — Finitions & Fluides</option>
              </select>
            </div>

            <div>
              <select
                id="filter-craft-select"
                value={filterCraft}
                onChange={e => setFilterCraft(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="">— Tous les corps d'état —</option>
                {craftsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Worker Cards List */}
        <div className="p-4 sm:p-5 space-y-3">
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucun ouvrier ne correspond aux critères sélectionnés.
            </div>
          ) : (
            filteredWorkers.map(worker => {
              const record = getRecord(worker.id);
              const status = record.status;
              const hSup = record.hSup || 0;
              const absenceHours = Number(record.absenceHours) || 0;
              const dailyPay = calculateDailyWorkerPay(worker, record);

              const statusConfigs: Record<AttendanceStatus, { label: string; badgeClass: string; bgClass: string }> = {
                P: {
                  label: 'PRÉSENT',
                  badgeClass: 'bg-emerald-500 text-white hover:bg-emerald-600',
                  bgClass: 'border-emerald-200 bg-emerald-50/30'
                },
                R: {
                  label: 'RETARD',
                  badgeClass: 'bg-amber-500 text-slate-950 hover:bg-amber-600',
                  bgClass: 'border-amber-300 bg-amber-50/50 shadow-xs ring-1 ring-amber-300/40'
                },
                A: {
                  label: 'ABSENT',
                  badgeClass: 'bg-rose-500 text-white hover:bg-rose-600',
                  bgClass: 'border-rose-300 bg-rose-50/30'
                },
                J: {
                  label: 'CONGÉ / PAYÉ',
                  badgeClass: 'bg-purple-600 text-white hover:bg-purple-700',
                  bgClass: 'border-purple-200 bg-purple-50/30'
                }
              };

              const currentCfg = statusConfigs[status] || statusConfigs.A;

              return (
                <div
                  key={worker.id}
                  id={`worker-attendance-row-${worker.id}`}
                  className={`rounded-xl border p-3 sm:p-4 transition-all duration-150 flex flex-col justify-between gap-3 ${currentCfg.bgClass}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-center gap-3 min-w-48">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white ${
                          status === 'P' ? 'bg-emerald-600' : status === 'R' ? 'bg-amber-500 text-slate-900' : status === 'J' ? 'bg-purple-600' : 'bg-slate-700'
                        }`}
                      >
                        {worker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{worker.name}</span>
                          {worker.phone && (
                            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                              {worker.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{worker.craft}</span>
                          <span>•</span>
                          <span>{worker.team}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Fast Status Toggles */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        id={`status-toggle-${worker.id}`}
                        type="button"
                        onClick={() => handleToggleStatus(worker.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider shadow-xs transition-transform active:scale-95 cursor-pointer min-w-32 text-center ${currentCfg.badgeClass}`}
                        title="Cliquer pour changer le statut (P / R / A / C)"
                      >
                        {currentCfg.label}
                      </button>

                      {/* Quick status 1-click pills */}
                      <div className="hidden sm:flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200">
                        {(['P', 'R', 'A', 'J'] as AttendanceStatus[]).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleSetStatus(worker.id, st)}
                            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              status === st
                                ? st === 'P'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'R'
                                  ? 'bg-amber-500 text-slate-950'
                                  : st === 'A'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-purple-600 text-white'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st === 'J' ? 'C' : st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Overtime HS, Absence HA & Acompte shortcut */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200 flex-wrap sm:flex-nowrap">
                      {/* Acompte quick button */}
                      {onOpenAdvanceModal && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            onOpenAdvanceModal(worker);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            advances.filter(a => a.workerId === worker.id && a.date.startsWith(selectedDate.slice(0, 7))).length > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Verser un acompte / Gérer les avances"
                        >
                          <HandCoins className="h-3.5 w-3.5 text-amber-600" />
                          <span>Acompte</span>
                          {(() => {
                            const workerAdvTotal = advances
                              .filter(a => a.workerId === worker.id && a.date.startsWith(selectedDate.slice(0, 7)))
                              .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
                            if (workerAdvTotal > 0) {
                              return (
                                <span className="ml-0.5 px-1 rounded bg-amber-200/70 text-amber-950 font-black text-[10px]">
                                  {formatCurrency(workerAdvTotal, currency)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </button>
                      )}

                      {/* HS: Heures Supplémentaires Stepper */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-600" title="Heures supplémentaires">HS :</span>
                        <div className="flex items-center bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSetOvertime(worker.id, Math.max(0, hSup - stepperStep))}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                            title={`-${stepperStep}h`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            id={`worker-hsup-input-${worker.id}`}
                            type="number"
                            min="0"
                            max="12"
                            step={stepperStep}
                            value={hSup === 0 ? '' : hSup}
                            onChange={e => handleSetOvertime(worker.id, parseFloat(e.target.value) || 0)}
                            placeholder="0h"
                            className="w-11 text-center text-xs font-bold text-slate-900 outline-none py-1 bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetOvertime(worker.id, hSup + stepperStep)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                            title={`+${stepperStep}h`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* HA: Heures d'absence / Retard Stepper */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs font-bold ${
                              absenceHours > 0
                                ? status === 'R'
                                  ? 'text-amber-800'
                                  : 'text-rose-800'
                                : 'text-slate-600'
                            }`}
                            title="Heures d'absence ou retard à déduire de la paie"
                          >
                            HA :
                          </span>
                          <button
                            type="button"
                            onClick={() => setStepperStep(s => (s === 0.5 ? 1 : 0.5))}
                            className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 cursor-pointer transition-colors"
                            title="Basculer le pas d'incrémentation (0.5h ou 1h)"
                          >
                            ±{stepperStep}h
                          </button>
                        </div>

                        <div
                          className={`flex items-center rounded-lg border overflow-hidden shadow-2xs transition-all ${
                            status === 'R' || status === 'A'
                              ? status === 'R'
                                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 text-amber-950 font-bold'
                                : 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40 text-rose-950 font-bold'
                              : absenceHours > 0
                              ? 'bg-amber-50/80 border-amber-300 text-amber-900 font-bold'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSetAbsence(worker.id, Math.max(0, absenceHours - stepperStep))}
                            className="px-2 py-1 text-slate-500 hover:bg-black/5 text-xs font-bold"
                            title={`-${stepperStep}h absence`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            id={`worker-ha-input-${worker.id}`}
                            type="number"
                            min="0"
                            max="24"
                            step={stepperStep}
                            value={absenceHours === 0 ? '' : absenceHours}
                            onChange={e => handleSetAbsence(worker.id, parseFloat(e.target.value) || 0)}
                            placeholder="0h"
                            className={`w-11 text-center text-xs font-bold outline-none py-1 bg-transparent ${
                              absenceHours > 0
                                ? status === 'R'
                                  ? 'text-amber-900 font-extrabold'
                                  : 'text-rose-900 font-extrabold'
                                : 'text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSetAbsence(worker.id, absenceHours + stepperStep)}
                            className="px-2 py-1 text-slate-500 hover:bg-black/5 text-xs font-bold"
                            title={`+${stepperStep}h absence`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Daily Pay & Rate estimation based on real hours prorata */}
                      <div className="text-right min-w-24">
                        <div
                          className="text-xs font-black text-slate-900"
                          title={`Montant calculé au prorata : ${dailyPay.effectiveHours}h réelles × ${Math.round(dailyPay.hourlyRate)} ${currency}/h`}
                        >
                          {dailyPay.gross > 0 ? formatCurrency(dailyPay.gross, currency) : `0 ${currency}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {dailyPay.effectiveHours}h réelles ({Math.round(dailyPay.hourlyRate)} {currency}/h)
                        </div>
                        {dailyPay.absenceDeduction > 0 ? (
                          <div className="text-[10px] font-bold text-rose-600 flex items-center justify-end gap-0.5">
                            <span>-{formatCurrency(dailyPay.absenceDeduction, currency)}</span>
                            <span className="text-[9px] text-slate-400">(-{dailyPay.absenceHours}h)</span>
                          </div>
                        ) : dailyPay.hSup > 0 ? (
                          <div className="text-[10px] font-bold text-blue-600">
                            +{formatCurrency(Math.round(dailyPay.hSup * dailyPay.hourlyRate), currency)} (+{dailyPay.hSup}h HS)
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Quick Absence / Retard Input Pills (Active when status is RETARD or ABSENT or has absence) */}
                  {(status === 'R' || status === 'A' || absenceHours > 0) && (
                    <div className="mt-1 pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            status === 'R'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{status === 'R' ? 'Saisie Retard :' : 'Saisie Absence :'}</span>
                        </span>

                        {status === 'R' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 0.5)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 0.5
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 ring-1 ring-amber-400'
                                  : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                              }`}
                            >
                              30 min
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 1)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 1
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 ring-1 ring-amber-400'
                                  : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                              }`}
                            >
                              1h
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 2)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 2
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 ring-1 ring-amber-400'
                                  : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                              }`}
                            >
                              2h
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 3)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 3
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 ring-1 ring-amber-400'
                                  : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                              }`}
                            >
                              3h
                            </button>
                          </>
                        )}

                        {status === 'A' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 4)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 4
                                  ? 'bg-rose-600 text-white border-rose-700 ring-1 ring-rose-500'
                                  : 'bg-white border-rose-300 text-rose-900 hover:bg-rose-100'
                              }`}
                            >
                              Demi-journée (4h)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 8)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 8
                                  ? 'bg-rose-600 text-white border-rose-700 ring-1 ring-rose-500'
                                  : 'bg-white border-rose-300 text-rose-900 hover:bg-rose-100'
                              }`}
                            >
                              Journée entière (8h)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAbsence(worker.id, 2)}
                              className={`px-2 py-0.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                absenceHours === 2
                                  ? 'bg-rose-600 text-white border-rose-700 ring-1 ring-rose-500'
                                  : 'bg-white border-rose-300 text-rose-900 hover:bg-rose-100'
                              }`}
                            >
                              2h
                            </button>
                          </>
                        )}

                        {absenceHours > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetAbsence(worker.id, 0)}
                            className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 text-xs font-semibold ml-1 cursor-pointer"
                            title="Effacer les heures d'absence"
                          >
                            Effacer (0h)
                          </button>
                        )}
                      </div>

                      {dailyPay.absenceDeduction > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          <span>Déduction : -{formatCurrency(dailyPay.absenceDeduction, currency)}</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({absenceHours}h à {Math.round(dailyPay.hourlyRate)} {currency}/h)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      </>
      )}

      {/* Weekly Planning PDF Modal */}
      <WeeklyPlanningModal
        isOpen={isWeeklyPlanningOpen}
        onClose={() => setIsWeeklyPlanningOpen(false)}
        site={site}
        workers={workers}
        teams={teams}
        attendance={attendance}
        initialDate={selectedDate}
        currency={currency}
      />
    </div>
  );
};
