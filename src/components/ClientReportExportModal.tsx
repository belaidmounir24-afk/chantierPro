import React, { useState } from 'react';
import { Site, Task, SiteLog, Material } from '../types';
import {
  downloadClientProgressReportPDF,
  shareClientProgressReportPDF,
  formatDateFr
} from '../services/clientReportPdfService';
import { triggerHaptic } from '../utils/android';
import {
  FileText,
  Download,
  Share2,
  Printer,
  X,
  Calendar,
  CheckCircle2,
  CheckSquare,
  MessageSquare,
  Building2,
  Layers,
  Sparkles,
  ShieldCheck,
  Package,
  FileCheck,
  Send,
  Loader2
} from 'lucide-react';

interface ClientReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
  tasks?: Task[];
  logs?: SiteLog[];
  materials?: Material[];
  currency?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export const ClientReportExportModal: React.FC<ClientReportExportModalProps> = ({
  isOpen,
  onClose,
  site,
  tasks = [],
  logs = [],
  materials = [],
  currency = 'DZD',
  initialStartDate,
  initialEndDate
}) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(initialStartDate || firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(initialEndDate || todayStr);
  const [recipientName, setRecipientName] = useState<string>(site.client || 'Maître d\'Ouvrage');
  const [notesForClient, setNotesForClient] = useState<string>(
    'Madame, Monsieur, veuillez trouver ci-joint l\'état d\'avancement de vos travaux. L\'ensemble des opérations se déroule conformément aux prescriptions techniques et aux règles de l\'art.'
  );

  const [sections, setSections] = useState({
    summary: true,
    tasks: true,
    logs: true,
    materials: false,
    signatures: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset periods
  const applyPreset = (preset: 'month' | 'week' | 'all' | 'last30') => {
    triggerHaptic('light');
    const now = new Date();
    if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(first);
      setEndDate(last);
    } else if (preset === 'week') {
      const curr = new Date();
      const day = curr.getDay();
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(curr.setDate(diff)).toISOString().split('T')[0];
      setStartDate(monday);
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate(site.startDate || '2026-01-01');
      setEndDate(site.endDate || todayStr);
    }
  };

  const siteTasks = tasks.filter(t => t.siteId === site.id);
  const periodLogs = logs.filter(l => l.site === site.id && l.date >= startDate && l.date <= endDate);
  const overallProgress = siteTasks.length > 0
    ? Math.round(siteTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / siteTasks.length)
    : 0;

  const handleDownload = () => {
    try {
      setIsGenerating(true);
      triggerHaptic('medium');
      downloadClientProgressReportPDF({
        site,
        startDate,
        endDate,
        tasks: siteTasks,
        logs: periodLogs,
        materials,
        recipientName,
        notesForClient,
        currency,
        includeSections: sections
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du fichier PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      triggerHaptic('medium');
      const res = await shareClientProgressReportPDF({
        site,
        startDate,
        endDate,
        tasks: siteTasks,
        logs: periodLogs,
        materials,
        recipientName,
        notesForClient,
        currency,
        includeSections: sections
      });

      if (res.success) {
        if (res.method === 'web-share') {
          setShareStatus('Partagé avec succès !');
        } else {
          setShareStatus('PDF téléchargé ! Prêt pour envoi.');
        }
        setTimeout(() => setShareStatus(null), 3500);
      } else if (res.error) {
        setShareStatus(res.error);
        setTimeout(() => setShareStatus(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    triggerHaptic('light');
    const cleanSiteName = site.name.replace(/[^a-zA-Z0-9]/g, '_');
    const msg = `Bonjour ${recipientName},\n\nVeuillez trouver le rapport d'avancement officiel du chantier *${site.name}* (Avancement global: *${overallProgress}%*).\n\nPériode: du ${formatDateFr(startDate)} au ${formatDateFr(endDate)}.\nÉdité par: ${site.supervisor || 'Le Chef de Chantier'}.\n\nDocument PDF ChantierPro.`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b-2 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Export Professionnel BTP
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Rapport d'Avancement Client (PDF)
              </h2>
              <p className="text-xs text-slate-300">
                Chantier : <span className="font-bold text-amber-400">{site.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Avancement Global
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">
                {overallProgress}%
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                Lots Répertoriés
              </div>
              <div className="text-2xl font-black text-blue-600 mt-0.5">
                {siteTasks.length}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Lots Terminés
              </div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">
                {siteTasks.filter(t => t.status === 'COMPLETEE').length}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Journaux Renseignés
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {periodLogs.length}
              </div>
            </div>
          </div>

          {/* Period Range Selection */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                Période d'Analyse à Exporter
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('month')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Ce mois
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('week')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cette semaine
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last30')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  30 jours
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Tout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Du (Date de début) :</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Au (Date de fin) :</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Client Recipient & Message */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Destinataire / Nom du Client ou Maître d'Ouvrage
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Ex: Société ABC / M. le Maître d'Ouvrage"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                Note d'accompagnement du Chef de Chantier (Insérée dans le PDF)
              </label>
              <textarea
                rows={2}
                value={notesForClient}
                onChange={e => setNotesForClient(e.target.value)}
                placeholder="Ajoutez vos commentaires sur l'avancement, les points forts ou les prochaines étapes..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>

          {/* Section Toggles */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Sections à inclure dans le Rapport Client
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sections.summary}
                  onChange={e => setSections({ ...sections, summary: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Synthèse & Indicateurs d'Avancement</div>
                  <div className="text-[10px] text-slate-500">Pourcentage global, barres visuelles, métriques</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sections.tasks}
                  onChange={e => setSections({ ...sections, tasks: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Détail des Lots & Tâches</div>
                  <div className="text-[10px] text-slate-500">Statut des travaux, échéances, visa client</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sections.logs}
                  onChange={e => setSections({ ...sections, logs: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Journal des Travaux Réalisés</div>
                  <div className="text-[10px] text-slate-500">Activités du jour, météo, sécurité & EPI</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sections.signatures}
                  onChange={e => setSections({ ...sections, signatures: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Zone de Visa & Signatures</div>
                  <div className="text-[10px] text-slate-500">Visas Chef de Chantier & Accord Client</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Génération PDF vectoriel instantanée (format A4 léger)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Préparer le message WhatsApp pour le client"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Message WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Partager directement via le menu système (WhatsApp, Gmail, etc.)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partager PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Création du PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>PDF Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Télécharger le Rapport (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {shareStatus && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-4 py-2 text-center border-t border-emerald-200">
            {shareStatus}
          </div>
        )}
      </div>
    </div>
  );
};
