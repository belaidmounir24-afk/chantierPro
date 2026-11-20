import React, { useState } from 'react';
import { ChantierDb, Site, DailyExpense, SiteLog, TabType } from '../types';
import {
  Sparkles,
  Bot,
  FileCheck2,
  Calculator,
  ScanLine,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Building2,
  HardHat,
  Boxes,
  Truck,
  HandCoins,
  ArrowRight,
  Upload,
  Camera,
  Layers,
  Wrench,
  ShieldCheck,
  TrendingUp,
  FileText
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { triggerHaptic } from '../utils/android';
import { formatCurrency } from '../utils/calculations';
import { useLanguage } from '../i18n/LanguageContext';

interface AiPerformanceHubProps {
  db: ChantierDb;
  activeSite: Site;
  onUpdateDb: (updater: (prev: ChantierDb) => ChantierDb) => void;
  onSelectTab: (tab: TabType) => void;
  currency: string;
}

type AiSubTab = 'audit' | 'report' | 'copilot' | 'estimator' | 'scanner';

export const AiPerformanceHub: React.FC<AiPerformanceHubProps> = ({
  db,
  activeSite,
  onUpdateDb,
  onSelectTab,
  currency
}) => {
  const { t, language } = useLanguage();
  const [subTab, setSubTab] = useState<AiSubTab>('audit');

  // State for 1. Audit
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // State for 2. Daily Report
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportApplied, setReportApplied] = useState(false);

  // State for 3. Copilot Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `👋 Bonjour ! Je suis votre Copilot IA dédié au chantier **${activeSite.name}**.\n\nJe peux vous assister sur :\n- 📐 **Calculs de dosages** (béton C25/30, mortiers, armatures, treillis)\n- 🛡️ **Normes & Sécurité BTP** (DTU, port des EPI, travaux en hauteur, intempéries)\n- 🚜 **Diagnostic matériel** et cadences d'équipes\n\nQue souhaitez-vous optimiser aujourd'hui ?`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // State for 4. Estimator
  const [estimateDesc, setEstimateDesc] = useState('');
  const [estimateType, setEstimateType] = useState('Béton armé / Gros œuvre');
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateResult, setEstimateResult] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // State for 5. Scanner
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanData, setScanData] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSaved, setScanSaved] = useState(false);

  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerHaptic('light');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Run Audit
  const handleRunAudit = async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      triggerHaptic('medium');

      const siteWorkers = db.workers.filter(w => w.site === activeSite.id);
      const siteMaterials = db.materials.filter(m => m.site === activeSite.id);
      const siteEquipment = db.equipment.filter(e => e.site === activeSite.id);
      const siteExpenses = (db.expenses || []).filter(exp => exp.site === activeSite.id);
      const siteLogs = db.logs.filter(l => l.site === activeSite.id);

      // Compute quick stats
      const totalWorkers = siteWorkers.length;
      const activeWorkers = siteWorkers.filter(w => w.active).length;
      const lowStockCount = siteMaterials.filter(m => {
        const stock = (m.received || 0) - (m.consumed || 0);
        return m.minAlert ? stock <= m.minAlert : stock <= 0;
      }).length;
      const totalExpensesAmount = siteExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const stats = {
        totalWorkers,
        activeWorkers,
        lowStockCount,
        equipmentCount: siteEquipment.length,
        totalExpensesAmount,
        currency
      };

      const res = await aiService.runAudit({
        site: activeSite,
        stats,
        workers: siteWorkers,
        materials: siteMaterials,
        equipment: siteEquipment,
        expenses: siteExpenses,
        logs: siteLogs,
        language
      });

      if (res.success && res.analysis) {
        setAuditResult(res.analysis);
        triggerHaptic('success');
      } else {
        setAuditError(res.error || 'Impossible de générer l’audit.');
      }
    } catch (err: any) {
      setAuditError(err?.message || 'Erreur lors de la communication avec le serveur IA.');
    } finally {
      setAuditLoading(false);
    }
  };

  // 2. Run Daily Report Generator
  const handleGenerateDailyReport = async () => {
    try {
      setReportLoading(true);
      setReportError(null);
      setReportApplied(false);
      triggerHaptic('medium');

      const siteAttendance = db.attendance[activeSite.id]?.[reportDate] || [];
      const siteExpenses = (db.expenses || []).filter(e => e.site === activeSite.id && e.date === reportDate);
      const siteMovements = (db.materialMovements || []).filter(m => m.site === activeSite.id && m.date === reportDate);
      const existingLog = db.logs.find(l => l.site === activeSite.id && l.date === reportDate);

      const res = await aiService.generateDailyReport({
        site: activeSite,
        date: reportDate,
        attendance: siteAttendance,
        expenses: siteExpenses,
        materials: siteMovements,
        log: existingLog,
        weather: existingLog?.weather || 'Ensoleillé / Chantier opérationnel',
        language
      });

      if (res.success && res.report) {
        setReportResult(res.report);
        triggerHaptic('success');
      } else {
        setReportError(res.error || 'Erreur de génération du rapport.');
      }
    } catch (err: any) {
      setReportError(err?.message || 'Erreur lors de la génération du rapport.');
    } finally {
      setReportLoading(false);
    }
  };

  // Save report into Site Logs
  const handleApplyReportToLog = () => {
    if (!reportResult) return;
    triggerHaptic('medium');

    onUpdateDb(prev => {
      const existingIdx = prev.logs.findIndex(l => l.site === activeSite.id && l.date === reportDate);
      const updatedLogs = [...prev.logs];

      if (existingIdx >= 0) {
        updatedLogs[existingIdx] = {
          ...updatedLogs[existingIdx],
          note: `${updatedLogs[existingIdx].note ? updatedLogs[existingIdx].note + '\n\n' : ''}--- SYNTHÈSE IA DU PV DU ${reportDate} ---\n${reportResult}`
        };
      } else {
        const newLog: SiteLog = {
          id: `log_${Date.now()}`,
          site: activeSite.id,
          date: reportDate,
          temp: '22',
          weather: 'Ensoleillé',
          lostHours: 0,
          note: `--- RAPPORT DE CHANTIER GÉNÉRÉ PAR L'IA ---\n${reportResult}`,
          incidents: 'Aucun incident majeur'
        };
        updatedLogs.push(newLog);
      }

      return { ...prev, logs: updatedLogs };
    });

    setReportApplied(true);
  };

  // 3. Send Copilot message
  const handleSendChat = async (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    triggerHaptic('light');
    const newMessages = [...chatMessages, { role: 'user' as const, content: textToSend }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = `Chantier: ${activeSite.name}, Client: ${activeSite.client || 'N/A'}, Ville: ${activeSite.address || 'N/A'}`;
      const res = await aiService.sendMessage({
        messages: newMessages,
        siteContext: context,
        language
      });

      if (res.success && res.reply) {
        setChatMessages([...newMessages, { role: 'assistant', content: res.reply }]);
        triggerHaptic('light');
      } else {
        setChatMessages([
          ...newMessages,
          { role: 'assistant', content: `⚠️ ${res.error || 'Désolé, une erreur s’est produite.'}` }
        ]);
      }
    } catch (err: any) {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: `⚠️ Erreur de connexion : ${err?.message || 'Serveur indisponible'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 4. Estimate quantities
  const handleEstimate = async () => {
    if (!estimateDesc.trim() || estimateLoading) return;
    try {
      setEstimateLoading(true);
      setEstimateError(null);
      triggerHaptic('medium');

      const res = await aiService.estimateQuantities({
        description: estimateDesc,
        projectType: estimateType,
        currency,
        language
      });

      if (res.success && res.estimation) {
        setEstimateResult(res.estimation);
        triggerHaptic('success');
      } else {
        setEstimateError(res.error || 'Erreur lors du calcul.');
      }
    } catch (err: any) {
      setEstimateError(err?.message || 'Erreur lors du calcul d’estimation.');
    } finally {
      setEstimateLoading(false);
    }
  };

  // 5. Handle image upload for scanner
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setScanImageBase64(reader.result as string);
      setScanData(null);
      setScanSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleScanReceipt = async () => {
    if (!scanImageBase64 && !scanHint.trim()) return;
    try {
      setScanLoading(true);
      setScanError(null);
      setScanSaved(false);
      triggerHaptic('medium');

      const res = await aiService.scanReceipt({
        imageBase64: scanImageBase64 || undefined,
        textHint: scanHint
      });

      if (res.success && res.data) {
        setScanData(res.data);
        triggerHaptic('success');
      } else {
        setScanError(res.error || 'Impossible d’extraire les informations du document.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Erreur lors de l’analyse du reçu.');
    } finally {
      setScanLoading(false);
    }
  };

  // Save scanned receipt directly to Caisse
  const handleSaveToExpenses = () => {
    if (!scanData) return;
    triggerHaptic('medium');

    const newExpense: DailyExpense = {
      id: `exp_${Date.now()}`,
      site: activeSite.id,
      date: scanData.date || new Date().toISOString().split('T')[0],
      category: scanData.category || 'Petit Outillage & Quincaillerie',
      amount: Number(scanData.amount) || 0,
      paymentMethod: (scanData.paymentMethod as any) || 'Espèces (Caisse)',
      beneficiary: scanData.beneficiary || 'Fournisseur / Quincaillerie',
      receiptRef: scanData.receiptRef || `FACT-${Date.now().toString().slice(-4)}`,
      note: scanData.summary || 'Enregistré via Scanner IA ChantierPro',
      paidBy: activeSite.supervisor || 'Chef de Chantier',
      status: 'valide'
    };

    onUpdateDb(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), newExpense]
    }));

    setScanSaved(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {t('ai.title', 'Intelligence Artificielle Chantier & Performance')}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Bot className="w-3 h-3" />
                  Gemini Pro Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {t('ai.subtitle', 'Audit prédictif, génération de PV journalier, calculs de métrés et conseiller technique BTP.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{activeSite.name}</span>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSubTab('audit');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('ai.tab.audit', 'Audit & Diagnostic Pro')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSubTab('report');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'report'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{t('ai.tab.report', 'Générateur de PV Journalier')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSubTab('copilot');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'copilot'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t('ai.tab.copilot', 'Conseiller BTP Copilot')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSubTab('estimator');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'estimator'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>{t('ai.tab.estimator', 'Calculateur Quantités & Devis')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSubTab('scanner');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'scanner'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>{t('ai.tab.scanner', 'Scanner Reçus / Factures')}</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AUDIT & DIAGNOSTIC PRO */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Audit Global & Santé Opérationnelle du Chantier
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {t('ai.audit.desc', 'Diagnostic en temps réel sur les risques de dépassement, pointage, ruptures de stocks et calendrier d’entretien.')}
              </p>
            </div>

            <button
              type="button"
              id="btn-run-ai-audit"
              onClick={handleRunAudit}
              disabled={auditLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {auditLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('ai.audit.running', 'Analyse des données réelles du chantier...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('ai.audit.btn', 'Lancer l’Audit IA du Chantier')}</span>
                </>
              )}
            </button>
          </div>

          {auditError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{auditError}</span>
            </div>
          )}

          {auditResult ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Diagnostic IA Exécutif pour {activeSite.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(auditResult, 'audit')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {copiedId === 'audit' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le rapport</span>
                    </>
                  )}
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {auditResult}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Ressources Humaines</h3>
                <p className="text-[11px] text-slate-500">
                  Détection des absences répétées, taux d'encadrement par chef d'équipe et ratio acomptes/salaires.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Flux Matériaux</h3>
                <p className="text-[11px] text-slate-500">
                  Anticipation des ruptures de ciment/agrégats et calcul des cadences de consommation journalière.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Maintenance Engins</h3>
                <p className="text-[11px] text-slate-500">
                  Planification intelligente des vidanges, révisions et contrôle des niveaux de carburant.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Trésorerie & Caisse</h3>
                <p className="text-[11px] text-slate-500">
                  Suivi des décaissements du chef de chantier, détection des anomalies de tickets et dérive budgétaire.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DAILY REPORT GENERATOR */}
      {subTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-500" />
                Générateur Intelligent de Procès-Verbal Journalier
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Synthétise le pointage des effectifs, les bons de caisse, les livraisons et les conditions météo en un rapport exécutif.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <button
                type="button"
                id="btn-generate-ai-pv"
                onClick={handleGenerateDailyReport}
                disabled={reportLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {reportLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('ai.report.running', 'Rédaction...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('ai.report.btn', 'Générer le PV Journalier')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {reportError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{reportError}</span>
            </div>
          )}

          {reportResult && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>Rapport de Chantier du {reportDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyReportToLog}
                    disabled={reportApplied}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      reportApplied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{reportApplied ? 'Enregistré dans le Journal' : 'Insérer dans le Journal'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(reportResult, 'report')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    {copiedId === 'report' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50 p-4 rounded-xl border border-slate-100">
                {reportResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: COPILOT BTP CHAT */}
      {subTab === 'copilot' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[600px]">
          {/* Quick Prompt Chips */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sujets rapides :
            </span>
            <button
              type="button"
              onClick={() => handleSendChat(t('ai.copilot.prompt1', 'Calculer le dosage pour un béton armé C25/30'))}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 font-medium shrink-0 transition-colors"
            >
              📐 Dosage béton C25/30
            </button>
            <button
              type="button"
              onClick={() => handleSendChat(t('ai.copilot.prompt2', 'Règles de sécurité pour un coulage de nuit'))}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 font-medium shrink-0 transition-colors"
            >
              🌙 Sécurité coulage de nuit
            </button>
            <button
              type="button"
              onClick={() => handleSendChat(t('ai.copilot.prompt3', 'Diagnostic surchauffe moteur d\'une pelle'))}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 font-medium shrink-0 transition-colors"
            >
              🚜 Diagnostic surchauffe engin
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs font-black">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none shadow-xs font-medium'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <span>ChantierPro IA réfléchit et consulte les référentiels BTP...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendChat();
            }}
            className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={t('ai.copilot.placeholder', 'Posez une question technique (dosage béton, sécurité, norme DTU, rendement)...')}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: QUANTITIES ESTIMATOR */}
      {subTab === 'estimator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Calculateur Métreur IA & Estimation Prévisionnelle
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type d’ouvrage
                </label>
                <select
                  value={estimateType}
                  onChange={e => setEstimateType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Béton armé / Gros œuvre">Béton armé (Dalles, Voiles, Semelles)</option>
                  <option value="Maçonnerie / Murs">Maçonnerie (Parpaings, Briques, Mortier)</option>
                  <option value="Terrassement / Fouilles">Terrassement (Déblais, Remblais, Nivellement)</option>
                  <option value="Revêtements & Finitions">Revêtements (Chapes, Carrelage, Enduits)</option>
                  <option value="VRD & Assainissement">VRD & Réseaux d’assainissement</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description de l’ouvrage et dimensions
                </label>
                <input
                  type="text"
                  value={estimateDesc}
                  onChange={e => setEstimateDesc(e.target.value)}
                  placeholder={t('ai.estimator.placeholder', 'Exemple: Dalle béton de 150m² épaisseur 15cm avec treillis soudé ST25C')}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-run-estimate"
                onClick={handleEstimate}
                disabled={estimateLoading || !estimateDesc.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {estimateLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calcul des cubatures et ratios BTP...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    <span>{t('ai.estimator.btn', 'Calculer les Besoins en Matériaux')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {estimateError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{estimateError}</span>
            </div>
          )}

          {estimateResult && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Feuille de Métré et Devis Prévisionnel</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(estimateResult, 'estimate')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {copiedId === 'estimate' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le métré</span>
                    </>
                  )}
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50 p-4 rounded-xl border border-slate-100">
                {estimateResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: RECEIPT / INVOICE SCANNER */}
      {subTab === 'scanner' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-amber-500" />
              {t('ai.scanner.title', 'Extraction IA de Factures & Bons de Caisse')}
            </h2>
            <p className="text-xs text-slate-500">
              Prenez en photo un ticket de carburant, une quincaillerie ou un bon de béton. L'IA extrait automatiquement les montants et détails pour votre caisse.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Image Input Area */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-amber-400 transition-colors bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px]">
                {scanImageBase64 ? (
                  <div className="space-y-3">
                    <img
                      src={scanImageBase64}
                      alt="Facture / Bon"
                      className="max-h-48 rounded-xl mx-auto shadow-md border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setScanImageBase64(null)}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Supprimer l'image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="block text-xs font-bold text-slate-800">
                      {t('ai.scanner.upload', 'Importer ou Photographier un bon / facture')}
                    </span>
                    <span className="block text-[11px] text-slate-400">JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Text note or manual trigger */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Indice ou détail textuel (optionnel)
                  </label>
                  <textarea
                    value={scanHint}
                    onChange={e => setScanHint(e.target.value)}
                    placeholder="Ex: Achat de 20 disques à tronçonner chez Quincaillerie Centrale..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <button
                  type="button"
                  id="btn-scan-receipt"
                  onClick={handleScanReceipt}
                  disabled={scanLoading || (!scanImageBase64 && !scanHint.trim())}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {scanLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reconnaissance optique & extraction...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>{t('ai.scanner.process', 'Analyser avec l\'IA')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {scanError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {scanData && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Données Extraites du Document</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveToExpenses}
                  disabled={scanSaved}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    scanSaved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <HandCoins className="w-4 h-4" />
                  <span>{scanSaved ? '✅ Enregistré dans la Caisse' : 'Enregistrer dans la Caisse'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fournisseur / Bénéficiaire</span>
                  <p className="font-bold text-sm text-slate-900 mt-0.5">{scanData.beneficiary || 'Non spécifié'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Montant Total</span>
                  <p className="font-black text-sm text-amber-600 mt-0.5">
                    {formatCurrency(scanData.amount || 0, currency)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Catégorie Caisse</span>
                  <p className="font-bold text-xs text-slate-900 mt-0.5">{scanData.category || 'Petit Outillage'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">N° Bon / Date</span>
                  <p className="font-bold text-xs text-slate-900 mt-0.5">
                    {scanData.receiptRef || 'N/A'} · {scanData.date || 'Aujourd\'hui'}
                  </p>
                </div>
              </div>

              {scanData.summary && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 font-medium">
                  <strong>Description :</strong> {scanData.summary}
                </div>
              )}

              {scanData.items && scanData.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5">Article</th>
                        <th className="p-2.5">Qté</th>
                        <th className="p-2.5">P.U. ({currency})</th>
                        <th className="p-2.5 text-right">Total ({currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scanData.items.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium">{item.name}</td>
                          <td className="p-2.5 font-bold">{item.quantity} {item.unit || ''}</td>
                          <td className="p-2.5">{item.unitPrice || '-'}</td>
                          <td className="p-2.5 text-right font-black">{item.total || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
