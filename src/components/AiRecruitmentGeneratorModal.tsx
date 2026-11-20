import React, { useState } from 'react';
import { Site, Worker, Team, RecruitmentLevel } from '../types';
import { CRAFTS_LIST, RECRUITMENT_LEVELS } from '../services/storage';
import { aiService } from '../services/aiService';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import {
  Sparkles,
  Users,
  X,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  Loader2,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AiRecruitmentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
  teams: Team[];
  currency: string;
  onAddWorkers: (newWorkers: Omit<Worker, 'id'>[]) => void;
}

const PRESET_CREWS = [
  {
    title: 'Équipe Gros Œuvre Complète',
    count: 6,
    crafts: ['Coffrage', 'Ferraillage', 'Maçonnerie', 'Manœuvre & Aide'],
    prompt: 'Équipe équilibrée de gros œuvre pour coulage poteaux et dalles avec 1 chef d’équipe N4, 2 coffreurs N3, 1 ferrailleur N3, 1 maçon N2 et 1 manœuvre N1.'
  },
  {
    title: 'Équipe Second Œuvre & Fluides',
    count: 5,
    crafts: ['Plomberie & Sanitaire', 'Électricité & Réseaux', 'Maçonnerie', 'Plâtrerie & Faux-plafond'],
    prompt: 'Équipe technique de second œuvre avec 1 électricien N3 qualifié H0B0, 1 plombier chauffagiste N3, 2 maçons finisseurs N2 et 1 aide N1.'
  },
  {
    title: 'Équipe Finitions & Revêtement',
    count: 4,
    crafts: ['Carrelage & Revêtement', 'Peinture & Enduit', 'Menuiserie Bois/Alu'],
    prompt: 'Équipe de finitions intérieures soignées : 2 carreleurs grand format N3, 1 peintre airless/enduit fin N2 et 1 menuisier N3.'
  },
  {
    title: 'Renfort Urgence Coulage Dalle',
    count: 4,
    crafts: ['Béton armé', 'Manœuvre & Aide', 'Coffrage'],
    prompt: 'Ouvriers robustes et expérimentés pour journée de coulage continu toupies et vibration béton.'
  }
];

export const AiRecruitmentGeneratorModal: React.FC<AiRecruitmentGeneratorModalProps> = ({
  isOpen,
  onClose,
  site,
  teams,
  currency,
  onAddWorkers
}) => {
  const [prompt, setPrompt] = useState(PRESET_CREWS[0].prompt);
  const [count, setCount] = useState<number>(6);
  const [selectedCrafts, setSelectedCrafts] = useState<string[]>(PRESET_CREWS[0].crafts);
  const [targetTeam, setTargetTeam] = useState<string>(teams[0]?.name || 'Équipe A — Gros Œuvre');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkers, setGeneratedWorkers] = useState<Partial<Worker>[]>([]);
  const [teamSummary, setTeamSummary] = useState('');

  if (!isOpen) return null;

  const toggleCraft = (craft: string) => {
    if (selectedCrafts.includes(craft)) {
      setSelectedCrafts(selectedCrafts.filter(c => c !== craft));
    } else {
      setSelectedCrafts([...selectedCrafts, craft]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    triggerHaptic();

    try {
      const res = await aiService.generateTeamWorkers({
        prompt: prompt.trim(),
        siteName: site.name,
        count,
        crafts: selectedCrafts,
        currency,
        language: 'fr'
      });

      if (res.success && res.data?.workers) {
        const workersWithTeam = res.data.workers.map(w => ({
          ...w,
          team: targetTeam,
          site: site.id,
          active: true
        }));
        setGeneratedWorkers(workersWithTeam);
        setTeamSummary(res.data.teamSummary || '');
        triggerHaptic();
      }
    } catch (err: any) {
      console.error('Error generating workers:', err);
      alert(`Erreur de génération : ${err.message || 'Impossible de générer l\'équipe'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveWorker = (index: number) => {
    setGeneratedWorkers(generatedWorkers.filter((_, i) => i !== index));
  };

  const handleImportAll = () => {
    if (generatedWorkers.length === 0) return;

    const formattedWorkers: Omit<Worker, 'id'>[] = generatedWorkers.map((w, idx) => ({
      site: site.id,
      name: w.name || `Ouvrier ${idx + 1}`,
      craft: w.craft || 'Maçonnerie',
      rate: Number(w.rate) || 2800,
      rateType: w.rateType || 'jour',
      team: w.team || targetTeam,
      phone: w.phone || undefined,
      cin: w.cin || undefined,
      active: true,
      notes: w.notes || undefined,
      recruitmentLevel: w.recruitmentLevel || 'Niveau 2 — Ouvrier Professionnel (OP1)',
      experienceYears: Number(w.experienceYears) || 3,
      skills: w.skills || ['Exécution autonome'],
      certifications: w.certifications || undefined,
      hireDate: new Date().toISOString().slice(0, 10),
      evaluationScore: w.evaluationScore || 4.5,
      aiEvaluationSummary: w.aiEvaluationSummary || undefined
    }));

    onAddWorkers(formattedWorkers);
    triggerHaptic();
    onClose();
  };

  return (
    <div
      id="ai-recruitment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Générateur d'Équipe & Recrutement IA</h2>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30">
                  IA BTP
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Générez des équipes complètes avec niveaux de recrutement, compétences et salaires de marché
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Modèles d'équipes prêts à l'emploi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_CREWS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setCount(preset.count);
                    setSelectedCrafts(preset.crafts);
                    triggerHaptic();
                  }}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                      {preset.title}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {preset.count} ouvriers
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{preset.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Description des besoins de recrutement / Consignes IA
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Décrivez les profils recherchés, qualifications requises, composition de l'équipe..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre d'ouvriers à recruter
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm font-black text-indigo-600 w-16 text-right">
                    {count} ouvriers
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Équipe d'affectation cible
                </label>
                <select
                  value={targetTeam}
                  onChange={e => setTargetTeam(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value="Équipe A — Gros Œuvre">Équipe A — Gros Œuvre</option>
                  <option value="Équipe B — Second Œuvre">Équipe B — Second Œuvre</option>
                  <option value="Équipe C — Finitions & Fluides">Équipe C — Finitions & Fluides</option>
                  <option value="Équipe Sous-traitance">Équipe Sous-traitance</option>
                </select>
              </div>
            </div>

            {/* Crafts Selector Chips */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Corps d'état à inclure en priorité
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CRAFTS_LIST.slice(0, 10).map(c => {
                  const isSelected = selectedCrafts.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCraft(c)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération des profils en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Générer les {count} Ouvriers avec l'IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Preview */}
          {generatedWorkers.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {generatedWorkers.length} Profils Ouvriers Générés
                  </h3>
                  {teamSummary && (
                    <p className="text-xs text-slate-500 mt-0.5">{teamSummary}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleImportAll}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Tout Intégrer au Chantier ({generatedWorkers.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {generatedWorkers.map((w, idx) => {
                  const lvlObj = RECRUITMENT_LEVELS.find(l => l.level === w.recruitmentLevel) || RECRUITMENT_LEVELS[1];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 relative hover:border-indigo-300 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveWorker(idx)}
                        className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Retirer cet ouvrier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="pr-6">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{w.name}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.2 rounded-md border ${lvlObj.badgeColor}`}>
                            {lvlObj.short}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-blue-600 flex items-center gap-2 mt-0.5">
                          <span>{w.craft}</span>
                          <span>•</span>
                          <span className="text-slate-500">{w.experienceYears || 3} ans exp</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700">
                          {formatCurrency(w.rate || 2800, currency)} / {w.rateType || 'jour'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">{w.phone || '06 -- -- -- --'}</span>
                      </div>

                      {/* Skills badges */}
                      {w.skills && w.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {w.skills.slice(0, 3).map((sk, sIdx) => (
                            <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {w.aiEvaluationSummary && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                          "{w.aiEvaluationSummary}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {generatedWorkers.length > 0 && (
            <button
              type="button"
              onClick={handleImportAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Confirmer l'ajout des {generatedWorkers.length} ouvriers
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
