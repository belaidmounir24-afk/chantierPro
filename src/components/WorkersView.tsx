import React, { useState } from 'react';
import { Site, Worker, Team, Advance, AttendanceRecord, RecruitmentLevel } from '../types';
import { formatCurrency, calculateWorkerNet, exportPayrollCSV, getTodayDateString } from '../utils/calculations';
import { RECRUITMENT_LEVELS } from '../services/storage';
import { AiRecruitmentGeneratorModal } from './AiRecruitmentGeneratorModal';
import { AiWorkforceAuditModal } from './AiWorkforceAuditModal';
import { triggerHaptic } from '../utils/android';
import {
  Users,
  UserPlus,
  HandCoins,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Phone,
  CreditCard,
  Edit2,
  Calendar,
  DollarSign,
  Briefcase,
  TrendingUp,
  Wallet,
  Sparkles,
  Award,
  ShieldCheck,
  Star,
  Info,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Eye
} from 'lucide-react';

interface WorkersViewProps {
  site: Site;
  workers: Worker[];
  teams: Team[];
  advances: Advance[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  onOpenWorkerModal: (worker?: Worker) => void;
  onOpenAdvanceModal: (worker: Worker) => void;
  onBatchAddWorkers?: (newWorkers: Omit<Worker, 'id'>[]) => void;
  currency: string;
}

export const WorkersView: React.FC<WorkersViewProps> = ({
  site,
  workers,
  teams,
  advances,
  attendance,
  onOpenWorkerModal,
  onOpenAdvanceModal,
  onBatchAddWorkers,
  currency
}) => {
  const [selectedMonth, setSelectedMonth] = useState(getTodayDateString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCraft, setFilterCraft] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'payroll' | 'skills'>('payroll');

  // Modals
  const [isAiRecruitmentOpen, setIsAiRecruitmentOpen] = useState(false);
  const [isAiAuditOpen, setIsAiAuditOpen] = useState(false);
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<Worker | null>(null);

  const siteWorkers = workers.filter(w => w.site === site.id);
  const siteAttendance = attendance[site.id] || {};

  // Financial aggregates for this site & month
  let totalGross = 0;
  let totalAdvances = 0;
  let totalNet = 0;
  let totalHoursWorked = 0;
  let totalOvertimeHours = 0;

  siteWorkers.forEach(w => {
    const calc = calculateWorkerNet(w, siteAttendance, advances, selectedMonth);
    totalGross += calc.gross;
    totalAdvances += calc.advancesTotal;
    totalNet += calc.net;
    totalHoursWorked += calc.stats.effectiveHours;
    totalOvertimeHours += calc.stats.hoursOvertime;
  });

  const filteredWorkers = siteWorkers.filter(w => {
    if (filterTeam && w.team !== filterTeam) return false;
    if (filterCraft && w.craft !== filterCraft) return false;
    if (filterLevel && w.recruitmentLevel !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.craft.toLowerCase().includes(q) ||
        w.team.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q)) ||
        (w.cin && w.cin.includes(q)) ||
        (w.skills && w.skills.some(s => s.toLowerCase().includes(q))) ||
        (w.recruitmentLevel && w.recruitmentLevel.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    exportPayrollCSV(site, siteWorkers, siteAttendance, advances, selectedMonth);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Month & Action Banner */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Mois de paie :</span>
            <input
              id="payroll-month-picker"
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 text-sm outline-none cursor-pointer"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {siteWorkers.length} ouvriers enregistrés
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Workforce Audit button */}
          <button
            id="open-ai-audit-btn"
            type="button"
            onClick={() => {
              setIsAiAuditOpen(true);
              triggerHaptic();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 px-3.5 py-2 text-xs font-black transition-colors border border-purple-200 shadow-2xs cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            Audit IA Qualifications
          </button>

          {/* AI Mass Recruitment button */}
          <button
            id="open-ai-recruitment-btn"
            type="button"
            onClick={() => {
              setIsAiRecruitmentOpen(true);
              triggerHaptic();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white px-3.5 py-2 text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            Recruter par IA
          </button>

          <button
            id="export-payroll-csv-btn"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>

          <button
            id="add-worker-btn"
            type="button"
            onClick={() => onOpenWorkerModal()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-black shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            + Ouvrier
          </button>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Masse Salariale Brute</span>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalGross, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalHoursWorked}h cumulées (+{totalOvertimeHours}h HS)
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Total Acomptes Versés</span>
            <HandCoins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-amber-600">
            {formatCurrency(totalAdvances, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {totalGross > 0 ? Math.round((totalAdvances / totalGross) * 100) : 0}% de la masse brute
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm">
          <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Net à Payer (Restant)</span>
            <Wallet className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-white">
            {formatCurrency(totalNet, currency)}
          </div>
          <div className="text-[11px] text-emerald-200 mt-0.5">
            Solde net après déduction acomptes
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Volume Heures Travail</span>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-800">
            {totalHoursWorked}h
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Moyenne : {siteWorkers.length ? Math.round(totalHoursWorked / siteWorkers.length) : 0}h / ouvrier
          </div>
        </div>
      </div>

      {/* Main Table & Filter Card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* View Switcher & Filters */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-workers-list-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher nom, métier, qualification, compétence..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            {/* View Switcher Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDisplayMode('payroll')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    displayMode === 'payroll'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Tableau Paie & Pointage
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('skills')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    displayMode === 'skills'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="h-3.5 w-3.5 text-blue-600" />
                  Niveaux & Compétences IA
                </button>
              </div>

              {/* Dropdown Filters */}
              <select
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="">Toutes les équipes</option>
                {teams.filter(t => t.siteId === site.id).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>

              <select
                value={filterCraft}
                onChange={e => setFilterCraft(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="">Tous les métiers</option>
                {Array.from(new Set(siteWorkers.map(w => w.craft))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Filtrer par niveau BTP :</span>
            <button
              type="button"
              onClick={() => setFilterLevel('')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                filterLevel === ''
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tous ({siteWorkers.length})
            </button>
            {RECRUITMENT_LEVELS.map(lvl => {
              const count = siteWorkers.filter(w => w.recruitmentLevel === lvl.level).length;
              const isSelected = filterLevel === lvl.level;
              return (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => setFilterLevel(isSelected ? '' : lvl.level)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border ${lvl.badgeColor}`}>{lvl.short}</span>
                  <span className="text-[10px] opacity-75 font-semibold">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODE 1: PAYROLL TABLE */}
        {displayMode === 'payroll' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="p-3.5">Ouvrier & Qualification</th>
                  <th className="p-3.5">Corps d'état</th>
                  <th className="p-3.5">Taux / {currency}</th>
                  <th className="p-3.5 text-center">Jours pointés</th>
                  <th className="p-3.5 text-center">Heures (HS)</th>
                  <th className="p-3.5 text-right">Salaire Brut</th>
                  <th className="p-3.5 text-right">Acomptes</th>
                  <th className="p-3.5 text-right font-extrabold text-slate-900">Net à Payer</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Aucun ouvrier trouvé avec ces filtres.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map(worker => {
                    const calc = calculateWorkerNet(worker, siteAttendance, advances, selectedMonth);
                    const isHighAdvance = calc.advPercentage >= 50;
                    const isMedAdvance = calc.advPercentage >= 30 && calc.advPercentage < 50;
                    const lvlObj = RECRUITMENT_LEVELS.find(l => l.level === worker.recruitmentLevel) || RECRUITMENT_LEVELS[1];

                    return (
                      <tr
                        key={worker.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs">
                              {worker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900">{worker.name}</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${lvlObj.badgeColor}`}>
                                  {lvlObj.short}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {worker.team} {worker.phone ? `• ${worker.phone}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-medium text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold">
                            {worker.craft}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-slate-900">
                          {worker.rate} <span className="text-[10px] font-normal text-slate-500">/{worker.rateType}</span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="font-bold text-slate-900">{calc.stats.regularDays}j</span>
                          {calc.stats.paidLeaveDays > 0 && (
                            <span className="text-[10px] text-purple-600 block">+{calc.stats.paidLeaveDays}j congé</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="font-semibold text-slate-800">{calc.stats.totalHours}h</span>
                          {calc.stats.hoursOvertime > 0 && (
                            <span className="text-[10px] font-bold text-blue-600 block">
                              +{calc.stats.hoursOvertime}h HS
                            </span>
                          )}
                        </td>

                        <td
                          className="p-3.5 text-right font-bold text-slate-900 cursor-help"
                          title={`Montant au prorata : ${calc.stats.effectiveHours}h réelles × ${Math.round(calc.hourlyRate)} ${currency}/h`}
                        >
                          {formatCurrency(calc.gross, currency)}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-bold ${isHighAdvance ? 'text-rose-600' : isMedAdvance ? 'text-amber-600' : 'text-slate-800'}`}>
                              {formatCurrency(calc.advancesTotal, currency)}
                            </span>
                            {calc.advPercentage > 0 && (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-sm ${
                                  isHighAdvance
                                    ? 'bg-rose-100 text-rose-700'
                                    : isMedAdvance
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'text-slate-500'
                                }`}
                              >
                                {Math.round(calc.advPercentage)}% brut
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-black text-sm text-emerald-700 bg-emerald-50/40">
                          {formatCurrency(calc.net, currency)}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`advance-btn-${worker.id}`}
                              type="button"
                              onClick={() => onOpenAdvanceModal(worker)}
                              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Gérer les acomptes"
                            >
                              <HandCoins className="h-3.5 w-3.5" />
                              <span>Acompte</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerDetail(worker)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Voir la fiche RH & Compétences"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenWorkerModal(worker)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Modifier la fiche ouvrier"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
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
        )}

        {/* MODE 2: SKILLS & RECRUITMENT GRID */}
        {displayMode === 'skills' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                Aucun ouvrier ne correspond aux critères sélectionnés.
              </div>
            ) : (
              filteredWorkers.map(worker => {
                const lvlObj = RECRUITMENT_LEVELS.find(l => l.level === worker.recruitmentLevel) || RECRUITMENT_LEVELS[1];
                return (
                  <div
                    key={worker.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{worker.name}</h4>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${lvlObj.badgeColor}`}>
                              {lvlObj.short}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-blue-600 mt-0.5">
                            {worker.craft} • <span className="text-slate-500 font-medium">{worker.team}</span>
                          </div>
                        </div>

                        {worker.evaluationScore && (
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-xs font-black text-amber-900">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            {worker.evaluationScore.toFixed(1)}
                          </div>
                        )}
                      </div>

                      {/* Recruitment Level Description */}
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{lvlObj.description}</p>

                      {/* Key stats row */}
                      <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-slate-50 rounded-xl text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Expérience</span>
                          <span className="font-extrabold text-slate-800">{worker.experienceYears || 3} ans</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Rémunération</span>
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(worker.rate, currency)}/{worker.rateType}
                          </span>
                        </div>
                      </div>

                      {/* Skills Tags */}
                      {worker.skills && worker.skills.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Compétences
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {worker.skills.slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md"
                              >
                                {s}
                              </span>
                            ))}
                            {worker.skills.length > 4 && (
                              <span className="text-[10px] text-slate-400">+{worker.skills.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {worker.certifications && worker.certifications.length > 0 && (
                        <div className="mt-2.5">
                          <div className="flex flex-wrap gap-1">
                            {worker.certifications.map((c, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                              >
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Evaluation Summary Quote */}
                      {worker.aiEvaluationSummary && (
                        <div className="mt-3 bg-amber-50/70 p-2 rounded-xl border border-amber-200/70 text-[11px] text-slate-700 italic">
                          <div className="flex items-center gap-1 font-bold text-amber-900 not-italic text-[10px] mb-0.5">
                            <Sparkles className="h-3 w-3 text-amber-600" />
                            Avis IA :
                          </div>
                          "{worker.aiEvaluationSummary}"
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {worker.phone || worker.cin || 'Fiche active'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedWorkerDetail(worker)}
                          className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                        >
                          Détails
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenWorkerModal(worker)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          Modifier
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Individual Worker Profile Details Modal */}
      {selectedWorkerDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs"
          onClick={() => setSelectedWorkerDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {selectedWorkerDetail.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">{selectedWorkerDetail.name}</h3>
                  <p className="text-xs font-bold text-blue-600">
                    {selectedWorkerDetail.craft} • {selectedWorkerDetail.team}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkerDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Level Banner */}
            {(() => {
              const lvlObj = RECRUITMENT_LEVELS.find(l => l.level === selectedWorkerDetail.recruitmentLevel) || RECRUITMENT_LEVELS[1];
              return (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${lvlObj.badgeColor}`}>
                      {lvlObj.short} — {lvlObj.level.split('—')[1] || lvlObj.level}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{lvlObj.expBenchmark}</span>
                  </div>
                  <p className="text-xs text-slate-600">{lvlObj.description}</p>
                </div>
              );
            })()}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Taux Rémunération</span>
                <span className="font-black text-slate-900">
                  {formatCurrency(selectedWorkerDetail.rate, currency)} / {selectedWorkerDetail.rateType}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Expérience BTP</span>
                <span className="font-black text-slate-900">{selectedWorkerDetail.experienceYears || 3} ans</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Téléphone</span>
                <span className="font-bold text-slate-900">{selectedWorkerDetail.phone || 'Non renseigné'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">N° CIN / Matricule</span>
                <span className="font-bold text-slate-900">{selectedWorkerDetail.cin || 'Non renseigné'}</span>
              </div>
            </div>

            {/* Skills & Certifications */}
            {selectedWorkerDetail.skills && selectedWorkerDetail.skills.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Compétences techniques
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedWorkerDetail.skills.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedWorkerDetail.certifications && selectedWorkerDetail.certifications.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Certifications & Habilitations
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedWorkerDetail.certifications.map((c, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {selectedWorkerDetail.aiEvaluationSummary && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Synthèse d'Évaluation RH par l'IA
                </div>
                <p className="text-slate-700 leading-relaxed italic">
                  "{selectedWorkerDetail.aiEvaluationSummary}"
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const w = selectedWorkerDetail;
                  setSelectedWorkerDetail(null);
                  onOpenWorkerModal(w);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Modifier cette fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Mass Recruitment Modal */}
      {isAiRecruitmentOpen && (
        <AiRecruitmentGeneratorModal
          isOpen={isAiRecruitmentOpen}
          onClose={() => setIsAiRecruitmentOpen(false)}
          site={site}
          teams={teams}
          currency={currency}
          onAddWorkers={newWorkers => {
            if (onBatchAddWorkers) {
              onBatchAddWorkers(newWorkers);
            }
          }}
        />
      )}

      {/* AI Workforce Audit Modal */}
      {isAiAuditOpen && (
        <AiWorkforceAuditModal
          isOpen={isAiAuditOpen}
          onClose={() => setIsAiAuditOpen(false)}
          site={site}
          workers={workers}
          attendanceStats={siteAttendance}
          currency={currency}
        />
      )}
    </div>
  );
};
