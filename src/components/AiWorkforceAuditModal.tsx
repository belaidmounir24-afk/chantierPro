import React, { useState, useEffect } from 'react';
import { Site, Worker, RecruitmentLevel } from '../types';
import { RECRUITMENT_LEVELS } from '../services/storage';
import { aiService } from '../services/aiService';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import {
  Sparkles,
  Users,
  X,
  ShieldCheck,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Printer,
  FileText,
  Briefcase,
  Layers,
  HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiWorkforceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
  workers: Worker[];
  attendanceStats?: any;
  currency: string;
}

export const AiWorkforceAuditModal: React.FC<AiWorkforceAuditModalProps> = ({
  isOpen,
  onClose,
  site,
  workers,
  attendanceStats,
  currency
}) => {
  const [auditText, setAuditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteWorkers = workers.filter(w => w.site === site.id);

  // Statistics & Breakdown
  const levelCounts: Record<RecruitmentLevel, number> = {
    'Niveau 1 — Manœuvre / Débutant': 0,
    'Niveau 2 — Ouvrier Professionnel (OP1)': 0,
    'Niveau 3 — Compagnon Professionnel (OP2)': 0,
    'Niveau 4 — Maître Ouvrier / Chef d\'Équipe': 0
  };

  siteWorkers.forEach(w => {
    const lvl = w.recruitmentLevel || 'Niveau 2 — Ouvrier Professionnel (OP1)';
    if (levelCounts[lvl] !== undefined) {
      levelCounts[lvl]++;
    } else {
      levelCounts['Niveau 2 — Ouvrier Professionnel (OP1)']++;
    }
  });

  const totalWorkers = siteWorkers.length;
  const n4Count = levelCounts['Niveau 4 — Maître Ouvrier / Chef d\'Équipe'] || 0;
  const supervisionRatio = totalWorkers > 0 ? ((n4Count / totalWorkers) * 100).toFixed(0) : '0';

  const runAudit = async () => {
    setIsLoading(true);
    triggerHaptic();

    try {
      const res = await aiService.auditWorkersMatrix({
        site,
        workers: siteWorkers,
        attendanceStats,
        language: 'fr'
      });

      if (res.success && res.audit) {
        setAuditText(res.audit);
        triggerHaptic();
      }
    } catch (err: any) {
      console.error('Error running workforce audit:', err);
      setAuditText(`### ⚠️ Erreur lors de l'audit\n${err.message || 'Impossible de générer l\'audit des compétences'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !auditText && siteWorkers.length > 0) {
      runAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(auditText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    triggerHaptic();
  };

  return (
    <div
      id="ai-workforce-audit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-950 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Audit IA Effectif & Niveaux de Recrutement</h2>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-400/30">
                  RH BTP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pyramide des qualifications, taux d'encadrement & optimisation des compétences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAudit}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Réanalyser
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Workforce Hierarchy Matrix Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center justify-between">
              <span>Répartition Actuelle des Niveaux de Recrutement ({totalWorkers} ouvriers)</span>
              <span className="text-[11px] text-purple-700 font-bold">Taux encadrement : {supervisionRatio}%</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {RECRUITMENT_LEVELS.map(lvl => {
                const count = levelCounts[lvl.level] || 0;
                const pct = totalWorkers > 0 ? ((count / totalWorkers) * 100).toFixed(0) : '0';
                return (
                  <div key={lvl.level} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${lvl.badgeColor}`}>
                        {lvl.short}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {count} <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{lvl.expBenchmark}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Audit Report Content */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Rapport d'Audit & Plan d'Action RH Élaboré par l'IA
                </h4>
              </div>
              {auditText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                <p className="text-xs font-bold text-slate-600">
                  L'IA analyse la pyramide des qualifications et les compétences du chantier...
                </p>
              </div>
            ) : auditText ? (
              <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed">
                <ReactMarkdown>{auditText}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Cliquez sur "Réanalyser" pour lancer le diagnostic IA des effectifs.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <span className="text-[11px] text-slate-500">
            Conforme aux classifications conventionnelles BTP & Génie Civil
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer l'audit
          </button>
        </div>
      </div>
    </div>
  );
};
