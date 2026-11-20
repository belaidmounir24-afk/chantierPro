import React, { useState, useEffect, useRef } from 'react';
import { Worker, RateType, Team, RecruitmentLevel } from '../types';
import { CRAFTS_LIST, RECRUITMENT_LEVELS } from '../services/storage';
import { aiService } from '../services/aiService';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import {
  X,
  UserPlus,
  Phone,
  CreditCard,
  Sparkles,
  Award,
  ShieldCheck,
  Briefcase,
  Star,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Camera,
  CheckCircle2,
  Loader2,
  Info,
  DollarSign,
  TrendingUp,
  HeartPulse
} from 'lucide-react';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (worker: Omit<Worker, 'id'>, editId?: string) => void;
  editingWorker?: Worker | null;
  siteId: string;
  teams: Team[];
  currency: string;
}

const COMMON_SKILLS_BY_CRAFT: Record<string, string[]> = {
  'Maçonnerie': ['Pose briques & parpaings', 'Enduit traditionnel', 'Chapes ciment', 'Coffrage linteaux'],
  'Coffrage': ['Coffrage traditionnel bois', 'Banches métalliques', 'Lecture plans BA', 'Pose étaiement'],
  'Ferraillage': ['Façonnage aciers HA', 'Ligature rapide', 'Pose armatures poutres/poteaux', 'Enrobage béton'],
  'Plomberie & Sanitaire': ['Réseau PER & multicouche', 'Cuivre & soudo-brasure', 'Évacuations PVC', 'Appareillage sanitaire'],
  'Électricité & Réseaux': ['Tirage câbles', 'Câblage TGBT', 'Mise à la terre', 'Appareillage & éclairage'],
  'Peinture & Enduit': ['Ratissage enduit fin', 'Peinture rouleau/airless', 'Ponçage & apprêt', 'Bandes placo'],
  'Carrelage & Revêtement': ['Pose scellée/collée', 'Faïence murale', 'Calepinage & joints', 'Grands formats'],
  'Manœuvre & Aide': ['Approvisionnement', 'Gâchage bétonnière', 'Nettoyage chantier', 'Manutention']
};

const COMMON_CERTIFICATIONS = [
  'CACES R482 (Engins)',
  'CACES R486 (Nacelle)',
  'Habilitation Électrique B0/H0/B1/B2V',
  'Montage Échafaudage R408',
  'SST (Sauveteur Secouriste du Travail)',
  'Travaux en Hauteur & Harnais',
  'Sensibilisation Sécurité BTP'
];

export const WorkerModal: React.FC<WorkerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingWorker,
  siteId,
  teams,
  currency
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'recruitment' | 'admin'>('profile');
  
  // Core Fields
  const [name, setName] = useState('');
  const [craft, setCraft] = useState(CRAFTS_LIST[0]);
  const [customCraft, setCustomCraft] = useState('');
  const [rate, setRate] = useState<number>(2800);
  const [rateType, setRateType] = useState<RateType>('jour');
  const [team, setTeam] = useState(teams[0]?.name || 'Équipe A — Gros Œuvre');
  const [phone, setPhone] = useState('');
  const [cin, setCin] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  // Recruitment & AI Enhanced Fields
  const [recruitmentLevel, setRecruitmentLevel] = useState<RecruitmentLevel>('Niveau 2 — Ouvrier Professionnel (OP1)');
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertInput, setNewCertInput] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Inconnu');
  const [evaluationScore, setEvaluationScore] = useState<number>(4.5);
  const [aiEvaluationSummary, setAiEvaluationSummary] = useState('');
  const [aiSalaryRecommendation, setAiSalaryRecommendation] = useState<{
    minRate: number;
    maxRate: number;
    marketAverage: number;
    justification: string;
  } | null>(null);

  // AI Assistant Drawer State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWorker) {
      setName(editingWorker.name);
      if (CRAFTS_LIST.includes(editingWorker.craft)) {
        setCraft(editingWorker.craft);
        setCustomCraft('');
      } else {
        setCraft('Autre');
        setCustomCraft(editingWorker.craft);
      }
      setRate(editingWorker.rate);
      setRateType(editingWorker.rateType);
      setTeam(editingWorker.team);
      setPhone(editingWorker.phone || '');
      setCin(editingWorker.cin || '');
      setNotes(editingWorker.notes || '');
      setActive(editingWorker.active);

      setRecruitmentLevel(editingWorker.recruitmentLevel || 'Niveau 2 — Ouvrier Professionnel (OP1)');
      setExperienceYears(editingWorker.experienceYears || 3);
      setSkills(editingWorker.skills || []);
      setCertifications(editingWorker.certifications || []);
      setHireDate(editingWorker.hireDate || '');
      setEmergencyContact(editingWorker.emergencyContact || '');
      setBloodGroup(editingWorker.bloodGroup || 'Inconnu');
      setEvaluationScore(editingWorker.evaluationScore || 4.5);
      setAiEvaluationSummary(editingWorker.aiEvaluationSummary || '');
      setAiSalaryRecommendation(editingWorker.aiSalaryRecommendation || null);
    } else {
      setName('');
      setCraft(CRAFTS_LIST[0]);
      setCustomCraft('');
      setRate(2800);
      setRateType('jour');
      setTeam(teams[0]?.name || 'Équipe A — Gros Œuvre');
      setPhone('');
      setCin('');
      setNotes('');
      setActive(true);

      setRecruitmentLevel('Niveau 2 — Ouvrier Professionnel (OP1)');
      setExperienceYears(3);
      setSkills(['Exécution autonome', 'Respect des consignes sécurité']);
      setCertifications([]);
      setHireDate(new Date().toISOString().slice(0, 10));
      setEmergencyContact('');
      setBloodGroup('Inconnu');
      setEvaluationScore(4.5);
      setAiEvaluationSummary('');
      setAiSalaryRecommendation(null);
    }
    setShowAiAssistant(false);
    setAiSuccessMessage('');
  }, [editingWorker, isOpen, teams]);

  if (!isOpen) return null;

  const handleAddSkill = (skillToAdd?: string) => {
    const val = (skillToAdd || newSkillInput).trim();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleAddCert = (certToAdd?: string) => {
    const val = (certToAdd || newCertInput).trim();
    if (val && !certifications.includes(val)) {
      setCertifications([...certifications, val]);
      setNewCertInput('');
    }
  };

  const handleRemoveCert = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  // Run AI Evaluation & Auto-complete
  const handleRunAiEvaluation = async (inputOverride?: string, imageBase64?: string) => {
    const textToAnalyze = inputOverride || aiPrompt.trim() || `${name} ${craft} ${notes} ${experienceYears} ans exp`;
    if (!textToAnalyze && !imageBase64) return;

    setIsAiEvaluating(true);
    setAiSuccessMessage('');
    triggerHaptic();

    try {
      const response = await aiService.evaluateWorker({
        inputContent: textToAnalyze,
        imageBase64,
        currency,
        existingWorker: {
          name,
          craft: craft === 'Autre' && customCraft ? customCraft : craft,
          rate,
          team,
          phone,
          cin,
          recruitmentLevel,
          experienceYears
        }
      });

      if (response.success && response.data) {
        const data = response.data;
        if (data.name) setName(data.name);
        if (data.craft) {
          if (CRAFTS_LIST.includes(data.craft)) {
            setCraft(data.craft);
            setCustomCraft('');
          } else {
            setCraft('Autre');
            setCustomCraft(data.craft);
          }
        }
        if (data.recruitmentLevel) setRecruitmentLevel(data.recruitmentLevel);
        if (data.experienceYears !== undefined) setExperienceYears(Number(data.experienceYears));
        if (data.rate !== undefined && data.rate > 0) setRate(Number(data.rate));
        if (data.phone) setPhone(data.phone);
        if (data.cin) setCin(data.cin);
        if (data.team) setTeam(data.team);
        if (data.emergencyContact) setEmergencyContact(data.emergencyContact);
        if (data.bloodGroup) setBloodGroup(data.bloodGroup);
        if (data.skills && Array.isArray(data.skills)) {
          setSkills(Array.from(new Set([...skills, ...data.skills])));
        }
        if (data.certifications && Array.isArray(data.certifications)) {
          setCertifications(Array.from(new Set([...certifications, ...data.certifications])));
        }
        if (data.evaluationScore) setEvaluationScore(data.evaluationScore);
        if (data.aiEvaluationSummary) setAiEvaluationSummary(data.aiEvaluationSummary);
        if (data.aiSalaryRecommendation) setAiSalaryRecommendation(data.aiSalaryRecommendation);
        if (data.notes) setNotes(data.notes);

        setAiSuccessMessage('Fiche ouvrier & niveau de recrutement complétés par l’IA !');
        triggerHaptic();
      }
    } catch (err: any) {
      console.error('AI Evaluation error:', err);
      alert(`Erreur IA : ${err.message || 'Impossible d\'évaluer le profil'}`);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleRunAiEvaluation(`Document importé: ${file.name}`, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCraft = craft === 'Autre' && customCraft.trim() ? customCraft.trim() : craft;

    onSave(
      {
        site: siteId,
        name: name.trim(),
        craft: finalCraft,
        rate: Number(rate) || 0,
        rateType,
        team: team.trim(),
        phone: phone.trim() || undefined,
        cin: cin.trim() || undefined,
        notes: notes.trim() || undefined,
        active,
        recruitmentLevel,
        experienceYears: Number(experienceYears) || 0,
        skills: skills.length > 0 ? skills : undefined,
        certifications: certifications.length > 0 ? certifications : undefined,
        hireDate: hireDate || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        bloodGroup: bloodGroup !== 'Inconnu' ? bloodGroup : undefined,
        evaluationScore,
        aiEvaluationSummary: aiEvaluationSummary.trim() || undefined,
        aiSalaryRecommendation: aiSalaryRecommendation || undefined
      },
      editingWorker?.id
    );
    onClose();
  };

  const selectedLevelObj = RECRUITMENT_LEVELS.find(l => l.level === recruitmentLevel) || RECRUITMENT_LEVELS[1];

  return (
    <div
      id="worker-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  {editingWorker ? 'Modifier la Fiche Ouvrier' : 'Recruter & Ajouter un Ouvrier'}
                </h2>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  IA Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Classification BTP N1 à N4, compétences & grille salariale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="toggle-ai-assistant-btn"
              type="button"
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showAiAssistant
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showAiAssistant ? 'Fermer IA' : 'Assistant IA'}
            </button>
            <button
              id="close-worker-modal-btn"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* AI Assistant Smart Box */}
        {showAiAssistant && (
          <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border-b border-amber-200/60 p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
                Assistant IA de Recrutement & Évaluation de Profil
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Collez un CV, des notes ou importez un document</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ex: Mourad Kaci, 8 ans d'exp maçonnerie/coffrage, CACES nacelle, permis B, rigoureux..."
                className="flex-1 bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAiEvaluating}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  title="Scanner ou importer un CV / pièce d'identité"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  Doc/Photo
                </button>
                <button
                  type="button"
                  onClick={() => handleRunAiEvaluation()}
                  disabled={isAiEvaluating || !aiPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-blue-600 hover:from-amber-600 hover:to-blue-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isAiEvaluating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-Remplir
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiSuccessMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {aiSuccessMessage}
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            1. Profil & Affectation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recruitment')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'recruitment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            2. Niveau & Compétences IA
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]">
              {selectedLevelObj.short}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'admin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            3. Contact & Sécurité
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nom et Prénom *
                </label>
                <input
                  id="worker-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Karim Benali"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Corps d'état / Métier *
                  </label>
                  <select
                    id="worker-craft-select"
                    value={craft}
                    onChange={e => setCraft(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none cursor-pointer"
                  >
                    {CRAFTS_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Autre">+ Autre spécialité...</option>
                  </select>
                  {craft === 'Autre' && (
                    <input
                      type="text"
                      required
                      value={customCraft}
                      onChange={e => setCustomCraft(e.target.value)}
                      placeholder="Préciser le métier..."
                      className="mt-2 w-full rounded-xl border border-blue-300 px-3 py-2 text-sm text-slate-900 outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Équipe assignée *
                  </label>
                  <input
                    id="worker-team-input"
                    type="text"
                    list="teams-list"
                    required
                    value={team}
                    onChange={e => setTeam(e.target.value)}
                    placeholder="Ex: Équipe A — Gros Œuvre"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
                  />
                  <datalist id="teams-list">
                    {teams.map(t => (
                      <option key={t.id} value={t.name} />
                    ))}
                    <option value="Équipe A — Gros Œuvre" />
                    <option value="Équipe B — Second Œuvre" />
                    <option value="Équipe C — Finitions & Fluides" />
                    <option value="Équipe Sous-traitance" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Taux de rémunération ({currency}) *
                    </label>
                    {aiSalaryRecommendation && (
                      <span className="text-[11px] font-bold text-blue-600">
                        IA : {formatCurrency(aiSalaryRecommendation.marketAverage, currency)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="worker-rate-input"
                      type="number"
                      required
                      min="0"
                      step="50"
                      value={rate}
                      onChange={e => setRate(Number(e.target.value))}
                      placeholder="2800"
                      className="w-full rounded-xl border border-slate-300 pl-3.5 pr-14 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                      {currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Type de rémunération
                  </label>
                  <select
                    id="worker-rateType-select"
                    value={rateType}
                    onChange={e => setRateType(e.target.value as RateType)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none cursor-pointer"
                  >
                    <option value="jour">Par Journée (Base 8 heures)</option>
                    <option value="heure">Par Heure travaillée</option>
                  </select>
                </div>
              </div>

              {/* AI Salary Justification if available */}
              {aiSalaryRecommendation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    Recommandation Salariale IA (Fourchette marché : {formatCurrency(aiSalaryRecommendation.minRate, currency)} - {formatCurrency(aiSalaryRecommendation.maxRate, currency)})
                  </div>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    {aiSalaryRecommendation.justification}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="worker-active-toggle"
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="worker-active-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Ouvrier actuellement actif et déployé sur le chantier
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Recruitment Level & Skills */}
          {activeTab === 'recruitment' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Recruitment Level Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Niveau de Recrutement & Qualification BTP *</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Grille standard BTP</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RECRUITMENT_LEVELS.map(lvl => {
                    const isSelected = recruitmentLevel === lvl.level;
                    return (
                      <div
                        key={lvl.level}
                        onClick={() => {
                          setRecruitmentLevel(lvl.level);
                          triggerHaptic();
                        }}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${lvl.badgeColor}`}>
                            {lvl.short}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{lvl.expBenchmark}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{lvl.description}</p>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Experience & Evaluation Score */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Années d'expérience BTP
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="45"
                      value={experienceYears}
                      onChange={e => setExperienceYears(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
                    />
                    <span className="absolute right-3.5 top-2 text-xs font-bold text-slate-500">ans</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Note d'évaluation technique (sur 5)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={evaluationScore}
                      onChange={e => setEvaluationScore(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-black text-slate-900 w-12 text-right">
                      ★ {evaluationScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Compétences techniques clés
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={e => setNewSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Ajouter une compétence (ex: Coffrage banches, Lecture de plan...)"
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Skill Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Aucune compétence ajoutée</span>
                  )}
                </div>

                {/* Quick suggestions based on craft */}
                {COMMON_SKILLS_BY_CRAFT[craft] && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold">Suggestions {craft} : </span>
                    {COMMON_SKILLS_BY_CRAFT[craft].map((cs, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddSkill(cs)}
                        className="inline-block text-blue-600 hover:underline mr-2 cursor-pointer"
                      >
                        + {cs}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications & Habilitations */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Certifications & Habilitations Sécurité
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCertInput}
                    onChange={e => setNewCertInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCert();
                      }
                    }}
                    placeholder="Ex: CACES R482, Habilitation Électrique B2V..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCert()}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {certifications.map((c, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      {c}
                      <button
                        type="button"
                        onClick={() => handleRemoveCert(idx)}
                        className="text-emerald-500 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {certifications.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Aucune habilitation enregistrée</span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex flex-wrap gap-1">
                  <span className="font-bold">Habilitations courantes : </span>
                  {COMMON_CERTIFICATIONS.slice(0, 4).map((cc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddCert(cc)}
                      className="text-emerald-700 hover:underline mr-2 cursor-pointer"
                    >
                      + {cc}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Evaluation Summary */}
              {aiEvaluationSummary && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Synthèse d'Évaluation IA
                  </div>
                  <textarea
                    rows={2}
                    value={aiEvaluationSummary}
                    onChange={e => setAiEvaluationSummary(e.target.value)}
                    className="w-full bg-white/80 border border-amber-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Admin & Safety */}
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Numéro de Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="worker-phone-input"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="06 61 22 33 44"
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    N° Carte Nationale / Matricule
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="worker-cin-input"
                      type="text"
                      value={cin}
                      onChange={e => setCin(e.target.value)}
                      placeholder="Ex: 09182371"
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contact d'urgence & Parenté
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="Ex: 06 50 11 22 33 (Épouse / Frère)"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Groupe Sanguin
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="Inconnu">Inconnu / Non renseigné</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date d'embauche sur le chantier
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={e => setHireDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Remarques / Observations
                  </label>
                  <input
                    id="worker-notes-input"
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex: Permis CACES nacelle, chef adjoint"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${selectedLevelObj.badgeColor}`}>
                {selectedLevelObj.short}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="save-worker-btn"
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {editingWorker ? 'Enregistrer les modifications' : 'Valider le recrutement'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
