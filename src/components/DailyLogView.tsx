import React, { useState, useEffect } from 'react';
import { Site, SiteLog, Worker, AttendanceRecord, DailyExpense } from '../types';
import { getTodayDateString, WEATHER_OPTIONS } from '../services/storage';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { aiService } from '../services/aiService';
import { downloadDailyPVPDF } from '../services/dailyReportPdfService';
import {
  BookOpen,
  Calendar,
  CloudSun,
  Thermometer,
  ClockAlert,
  FileText,
  ShieldCheck,
  Camera,
  Trash2,
  Save,
  CheckCircle,
  Eye,
  Plus,
  Sparkles,
  Receipt,
  DollarSign,
  Loader2,
  Lock,
  Download,
  Share2
} from 'lucide-react';

interface DailyLogViewProps {
  site: Site;
  logs: SiteLog[];
  workers: Worker[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  expenses?: DailyExpense[];
  isExpired?: boolean;
  onSaveLog: (log: SiteLog) => void;
  onOpenPV: (date: string) => void;
  onOpenPeriodReport?: () => void;
  onOpenClientReport?: () => void;
  onOpenExpenseModal?: (expense?: DailyExpense, defaultDate?: string) => void;
  onDeleteExpense?: (id: string) => void;
  currency?: string;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  site,
  logs,
  workers,
  attendance,
  expenses = [],
  isExpired,
  onSaveLog,
  onOpenPV,
  onOpenPeriodReport,
  onOpenClientReport,
  onOpenExpenseModal,
  onDeleteExpense,
  currency = 'DZD'
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [temp, setTemp] = useState<number | string>(24);
  const [weather, setWeather] = useState<SiteLog['weather']>('Ensoleillé');
  const [lostHours, setLostHours] = useState<number | string>(0);
  const [note, setNote] = useState('');
  const [incidents, setIncidents] = useState('R.A.S. Port des EPI vérifié. Aucun accident à signaler.');
  const [signedBy, setSignedBy] = useState(site?.supervisor || 'Chef de chantier');
  const [photos, setPhotos] = useState<{ id: string; url: string; caption?: string }[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiLog = async () => {
    try {
      setAiGenerating(true);
      setAiError(null);
      triggerHaptic('medium');

      const siteAttendance = attendance[site?.id || '']?.[selectedDate] || [];
      const siteExpenses = (expenses || []).filter(e => e.site === site?.id && e.date === selectedDate);
      const existingLog = logs.find(l => l.site === site?.id && l.date === selectedDate);

      const res = await aiService.generateDailyReport({
        site,
        date: selectedDate,
        attendance: siteAttendance,
        expenses: siteExpenses,
        materials: [],
        log: existingLog || {
          id: 'temp',
          site: site?.id || '',
          date: selectedDate,
          temp,
          weather,
          lostHours: Number(lostHours) || 0,
          note,
          incidents
        },
        weather: `${weather} (${temp}°C)`
      });

      if (res.success && res.report) {
        setNote(prev => (prev ? `${prev}\n\n--- SYNTHÈSE IA DU PV DU ${selectedDate} ---\n${res.report}` : res.report!));
        triggerHaptic('success');
      } else {
        setAiError(res.error || 'Erreur lors de la génération IA.');
      }
    } catch (err: any) {
      setAiError(err?.message || 'Serveur IA indisponible');
    } finally {
      setAiGenerating(false);
    }
  };

  // Load existing log for selected date
  useEffect(() => {
    if (!site?.id) return;
    const existing = logs.find(l => l.site === site.id && l.date === selectedDate);
    if (existing) {
      setTemp(existing.temp);
      setWeather(existing.weather);
      setLostHours(existing.lostHours);
      setNote(existing.note);
      setIncidents(existing.incidents || '');
      setSignedBy(existing.signedBy || site?.supervisor || '');
      setPhotos(existing.photos || []);
    } else {
      setTemp(24);
      setWeather('Ensoleillé');
      setLostHours(0);
      setNote('');
      setIncidents('R.A.S. Port des EPI vérifié à la prise de poste.');
      setSignedBy(site?.supervisor || '');
      setPhotos([]);
    }
    setSavedSuccess(false);
  }, [selectedDate, site?.id, logs]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const url = ev.target?.result as string;
        setPhotos(prev => [
          ...prev,
          {
            id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            url,
            caption: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: SiteLog = {
      id: `log_${selectedDate}_${site.id}`,
      site: site.id,
      date: selectedDate,
      temp: temp === '' ? 20 : Number(temp),
      weather,
      lostHours: lostHours === '' ? 0 : Number(lostHours),
      note: note.trim(),
      incidents: incidents.trim(),
      signedBy: signedBy.trim() || undefined,
      photos
    };

    onSaveLog(newLog);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const addPresetTag = (text: string) => {
    setNote(prev => (prev ? `${prev}\n• ${text}` : `• ${text}`));
  };

  // Past logs sorted by date descending
  const siteLogs = logs
    .filter(l => l.site === site.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 pb-8">
      {/* Form Card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* Card Header */}
        <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Journal de Chantier Quotidien
              </h2>
              <p className="text-xs text-slate-400">
                Rapport d'activité, météo, sécurité & avancement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Client Report Export / Share */}
            {onOpenClientReport && (
              <button
                id="open-client-report-from-log-btn"
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenClientReport();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                title="Partager le rapport d'avancement des travaux avec le client (PDF)"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-200" />
                Partager au Client (PDF)
              </button>
            )}

            {/* Direct Daily PV PDF Download */}
            <button
              id="download-daily-pv-pdf-btn"
              type="button"
              onClick={() => {
                try {
                  triggerHaptic('medium');
                  const currentDayLog = logs.find(l => l.site === site.id && l.date === selectedDate) || {
                    id: `log_${selectedDate}_${site.id}`,
                    site: site.id,
                    date: selectedDate,
                    temp: temp === '' ? 20 : Number(temp),
                    weather,
                    lostHours: lostHours === '' ? 0 : Number(lostHours),
                    note: note.trim(),
                    incidents: incidents.trim(),
                    signedBy: signedBy.trim() || undefined,
                    photos
                  };
                  downloadDailyPVPDF({
                    site,
                    date: selectedDate,
                    attendance: attendance[site.id]?.[selectedDate] || [],
                    workers,
                    log: currentDayLog,
                    expenses,
                    currency
                  });
                  setPdfDownloadSuccess(true);
                  setTimeout(() => setPdfDownloadSuccess(false), 3500);
                } catch (err) {
                  console.error(err);
                  alert('Erreur lors du téléchargement du PV PDF.');
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                pdfDownloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title="Télécharger directement le PV de cette journée en fichier PDF"
            >
              {pdfDownloadSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 text-white" />
                  <span>PDF Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>Télécharger PV (PDF)</span>
                </>
              )}
            </button>

            <button
              id="view-pv-modal-btn"
              type="button"
              onClick={() => onOpenPV(selectedDate)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 text-xs font-bold transition-colors border border-slate-700"
            >
              <Eye className="h-4 w-4 text-amber-400" />
              Générer PV de Journée
            </button>
            {onOpenPeriodReport && (
              <button
                id="open-period-report-from-log-btn"
                type="button"
                onClick={onOpenPeriodReport}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-slate-950" />
                Rapport Période (PDF)
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Top Date & Weather Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Date du Journal *
              </label>
              <input
                id="log-date-input"
                type="date"
                required
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <CloudSun className="h-3.5 w-3.5 text-amber-500" />
                Météo / Conditions *
              </label>
              <select
                id="log-weather-select"
                value={weather}
                onChange={e => setWeather(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
              >
                {WEATHER_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                Température (°C)
              </label>
              <input
                id="log-temp-input"
                type="number"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="24"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <ClockAlert className="h-3.5 w-3.5 text-rose-600" />
                Heures Perdues (Intempéries)
              </label>
              <input
                id="log-losthours-input"
                type="number"
                min="0"
                step="0.5"
                value={lostHours}
                onChange={e => setLostHours(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Avancement des travaux */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" />
                Avancement des Travaux / Tâches exécutées *
              </label>

              <button
                type="button"
                id="btn-ai-assist-log"
                onClick={handleGenerateAiLog}
                disabled={aiGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                title="Rédiger automatiquement le compte-rendu journalier avec l'IA"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Rédaction IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Rédiger avec l'IA</span>
                  </>
                )}
              </button>
            </div>
            {aiError && (
              <p className="text-[11px] font-semibold text-rose-600 mb-1">{aiError}</p>
            )}

            {/* Quick tags */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[11px] text-slate-400">Raccourcis :</span>
              {[
                'Coulage dalle béton B25',
                'Coffrage des voiles et poteaux',
                'Ferraillage armatures Ø12/Ø16',
                'Maçonnerie briques R+2',
                'Passage fourreaux & tuyauterie',
                'Pose plâtre et enduit',
                'Réception centrale à béton'
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addPresetTag(tag)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 text-[11px] font-semibold transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              id="log-note-textarea"
              required
              rows={4}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Décrivez les ouvrages réalisés, zones du chantier traitées, coulages, livraisons notables..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Sécurité et Incidents */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Sécurité, Hygiène & Visites (CTC, Maître d'œuvre...)
            </label>
            <textarea
              id="log-incidents-textarea"
              rows={2}
              value={incidents}
              onChange={e => setIncidents(e.target.value)}
              placeholder="Contrôle des EPI, visites d'inspection, sécurité des fouilles..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          {/* Photos du Chantier */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-purple-600" />
                Photos du Chantier ({photos.length})
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Prenez une photo sur le terrain ou importez depuis la galerie
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-3">
              {photos.map(p => (
                <div
                  key={p.id}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                >
                  <img
                    src={p.url}
                    alt={p.caption || 'Photo chantier'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/20 aspect-square cursor-pointer transition-colors p-2 text-center">
                <Camera className="h-6 w-6 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">Prendre photo</span>
                <span className="text-[10px] text-slate-400">ou importer</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Dépenses Journalières de la date sélectionnée */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Dépenses & Achats du Jour ({selectedDate})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Caisse de chantier, tickets d'essence, quincaillerie d'urgence et repas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(() => {
                  const dayExpenses = expenses.filter(e => e.site === site.id && e.date === selectedDate);
                  const dayTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  return (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Dépenses</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {formatCurrency(dayTotal, currency)}
                      </span>
                    </div>
                  );
                })()}

                {onOpenExpenseModal && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onOpenExpenseModal(undefined, selectedDate);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter Dépense
                  </button>
                )}
              </div>
            </div>

            {/* List of day expenses */}
            {(() => {
              const dayExpenses = expenses.filter(e => e.site === site.id && e.date === selectedDate);
              if (dayExpenses.length === 0) {
                return (
                  <div className="text-center py-3 bg-white rounded-xl border border-dashed border-amber-300 text-slate-500 text-xs">
                    Aucune dépense enregistrée pour la journée du {selectedDate}.
                  </div>
                );
              }

              return (
                <div className="space-y-1.5">
                  {dayExpenses.map(exp => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/80 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 font-bold text-[11px]">
                          {exp.category}
                        </span>
                        <div>
                          <strong className="text-slate-900">{exp.beneficiary || 'Dépense de caisse'}</strong>
                          {exp.note && <span className="text-slate-500 ml-2">· {exp.note}</span>}
                          {exp.receiptRef && (
                            <span className="text-[10px] font-mono text-slate-400 ml-2">
                              [{exp.receiptRef}]
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {formatCurrency(exp.amount, currency)}
                        </span>
                        {onDeleteExpense && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('warning');
                              if (window.confirm('Supprimer cette dépense ?')) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer"
                            title="Supprimer la dépense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Signature & Validation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Rédigé par (Conducteur / Chef de Chantier)
              </label>
              <input
                id="log-signedby-input"
                type="text"
                value={signedBy}
                onChange={e => setSignedBy(e.target.value)}
                placeholder="Ex: Ing. Mourad Khelifi"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-end justify-end">
              <button
                id="save-daily-log-btn"
                type="submit"
                disabled={isExpired}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-md transition-all ${isExpired ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
              >
                {isExpired ? <Lock className="h-4 w-4 text-slate-500" /> : <Save className="h-4 w-4 text-amber-400" />}
                Enregistrer le Journal de Chantier
              </button>
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Le journal de la journée du {selectedDate} a été sauvegardé avec succès !</span>
            </div>
          )}
        </form>
      </div>

      {/* Historical Logs List */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Historique des Journaux de Chantier ({siteLogs.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {siteLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucun journal de chantier enregistré pour ce site pour le moment.
            </div>
          ) : (
            siteLogs.map(l => (
              <div
                key={l.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {l.date}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {l.weather} • {l.temp}°C
                    </span>
                    {l.lostHours > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {l.lostHours}h intempéries
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                    {l.note}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(l.date);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Consulter / Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPV(l.date)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    PV Journalier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      downloadDailyPVPDF({
                        site,
                        date: l.date,
                        attendance: attendance[site.id]?.[l.date] || [],
                        workers,
                        log: l,
                        expenses,
                        currency
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1"
                    title="Télécharger ce PV en PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-700" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
