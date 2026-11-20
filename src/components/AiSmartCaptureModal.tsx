import React, { useState, useRef, useEffect } from 'react';
import { ChantierDb, Site, DailyExpense, Worker, Material, Equipment, SiteLog, AttendanceRecord, TabType } from '../types';
import { aiService, AiUniversalScanResponse } from '../services/aiService';
import { formatCurrency, getTodayDateString } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Camera,
  Upload,
  FileText,
  Sparkles,
  X,
  Check,
  RotateCw,
  RefreshCw,
  HandCoins,
  ClipboardCheck,
  Boxes,
  Truck,
  BookOpen,
  UserPlus,
  AlertCircle,
  Loader2,
  FileUp,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  Eye
} from 'lucide-react';

interface AiSmartCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  activeSite: Site;
  onUpdateDb: (updated: ChantierDb) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectTab?: (tab: TabType) => void;
  currency: string;
  defaultCategory?: 'auto' | 'expense' | 'attendance' | 'material' | 'equipment' | 'log' | 'worker';
}

type CaptureSource = 'camera' | 'upload' | 'file';

export const AiSmartCaptureModal: React.FC<AiSmartCaptureModalProps> = ({
  isOpen,
  onClose,
  db,
  activeSite,
  onUpdateDb,
  onNavigateTab,
  onSelectTab,
  currency,
  defaultCategory = 'auto'
}) => {
  const { t } = useLanguage();

  // Source selection
  const [source, setSource] = useState<CaptureSource>('camera');
  const [targetCategory, setTargetCategory] = useState<'auto' | 'expense' | 'attendance' | 'material' | 'equipment' | 'log' | 'worker'>(defaultCategory);
  const [userHint, setUserHint] = useState('');

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Captured / Uploaded data
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');

  // AI Processing State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<AiUniversalScanResponse['result'] | null>(null);

  // Editable Form States for Result
  const [detectedType, setDetectedType] = useState<'expense' | 'attendance' | 'material' | 'equipment' | 'log' | 'worker'>('expense');
  const [editedData, setEditedData] = useState<any>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Start Camera Stream
  const startCamera = async (facingMode: 'environment' | 'user' = cameraFacing) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("La caméra n'est pas supportée sur ce navigateur ou cet environnement.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.");
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Flip Camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Capture Image from Camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHaptic('medium');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewImage(dataUrl);
      setFileMime('image/jpeg');
      setFileName(`Capture_Camera_${new Date().getTime()}.jpg`);
      stopCamera();
    }
  };

  // Handle File Input Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('light');
    setFileName(file.name);
    setFileMime(file.type || 'application/octet-stream');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
        setFileContent(null);
      };
      reader.readAsDataURL(file);
    } else {
      // Text or Document file
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFileContent(text);
        setPreviewImage(null);
      };
      reader.readAsText(file);
    }
  };

  // Run AI Universal Ingestion
  const handleRunAiAnalysis = async () => {
    if (!previewImage && !fileContent) {
      setScanError("Veuillez d'abord prendre une photo ou sélectionner un fichier.");
      return;
    }

    try {
      setIsScanning(true);
      setScanError(null);
      setScanResult(null);
      setSaveSuccess(false);
      triggerHaptic('medium');

      const response = await aiService.universalScan({
        imageBase64: previewImage || undefined,
        textContent: fileContent || undefined,
        mimeType: fileMime,
        userHint: userHint.trim() || undefined,
        targetCategory: targetCategory
      });

      if (response.success && response.result) {
        setScanResult(response.result);
        const type = response.result.detectedType || 'expense';
        setDetectedType(type);
        setEditedData(response.result.extractedData?.[type] || {});
        triggerHaptic('success');
      } else {
        setScanError(response.error || "L'IA n'a pas pu interpréter ce document.");
      }
    } catch (err: any) {
      setScanError(err?.message || "Erreur lors de la communication avec le serveur IA.");
    } finally {
      setIsScanning(false);
    }
  };

  // Save Extracted Entity into Database
  const handleSaveToDatabase = () => {
    try {
      triggerHaptic('success');
      const today = getTodayDateString();

      if (detectedType === 'expense') {
        const nextExpSeq = (db.seq?.exp || 0) + 1;
        const newExpense: DailyExpense = {
          id: `exp_${Date.now()}`,
          site: activeSite.id,
          date: editedData.date || today,
          category: editedData.category || 'Divers & Urgences',
          beneficiary: editedData.beneficiary || 'Fournisseur',
          amount: Number(editedData.amount) || 0,
          paymentMethod: editedData.paymentMethod || 'Espèces (Caisse)',
          receiptRef: editedData.receiptRef || `FAC-${nextExpSeq}`,
          note: editedData.summary || editedData.items?.map((i: any) => `${i.name} (${i.quantity})`).join(', ') || ''
        };

        const updatedExpenses = [newExpense, ...(db.expenses || [])];
        const updatedSeq = { ...db.seq, exp: nextExpSeq };
        onUpdateDb({ ...db, expenses: updatedExpenses, seq: updatedSeq });
      } else if (detectedType === 'attendance') {
        const targetDate = editedData.date || today;
        const siteAtt = { ...(db.attendance[activeSite.id] || {}) };
        const currentRecords = [...(siteAtt[targetDate] || [])];

        const recognizedWorkers: any[] = editedData.workers || [];
        recognizedWorkers.forEach(rw => {
          // Find matching worker by name or create
          let existing = db.workers.find(w => w.site === activeSite.id && w.name.toLowerCase().includes(rw.name?.toLowerCase()));
          if (existing) {
            const idx = currentRecords.findIndex(r => r.workerId === existing!.id);
            if (idx >= 0) {
              currentRecords[idx] = { ...currentRecords[idx], status: rw.status || 'P', hSup: Number(rw.hSup) || 0 };
            } else {
              currentRecords.push({ workerId: existing.id, status: rw.status || 'P', hSup: Number(rw.hSup) || 0 });
            }
          }
        });

        siteAtt[targetDate] = currentRecords;
        onUpdateDb({ ...db, attendance: { ...db.attendance, [activeSite.id]: siteAtt } });
      } else if (detectedType === 'material') {
        const nextMatSeq = (db.seq?.mat || 0) + 1;
        const newMat: Material = {
          id: `mat_${Date.now()}`,
          site: activeSite.id,
          name: editedData.name || 'Matériau livré',
          unit: editedData.unit || 'Sac',
          initStock: 0,
          received: Number(editedData.received) || 0,
          consumed: 0,
          unitPrice: Number(editedData.unitPrice) || 0,
          minAlert: 5,
          category: editedData.category || 'Gros Œuvre'
        };

        const updatedMaterials = [newMat, ...(db.materials || [])];
        const updatedSeq = { ...db.seq, mat: nextMatSeq };
        onUpdateDb({ ...db, materials: updatedMaterials, seq: updatedSeq });
      } else if (detectedType === 'equipment') {
        const nextEqSeq = (db.seq?.eq || 0) + 1;
        const newEq: Equipment = {
          id: `eq_${Date.now()}`,
          site: activeSite.id,
          name: editedData.name || 'Matériel de chantier',
          brand: editedData.brand || 'BTP',
          hours: Number(editedData.hours) || 0,
          fuel: 100,
          maintDue: 250,
          status: 'ok',
          notes: editedData.notes || ''
        };

        const updatedEq = [newEq, ...(db.equipment || [])];
        const updatedSeq = { ...db.seq, eq: nextEqSeq };
        onUpdateDb({ ...db, equipment: updatedEq, seq: updatedSeq });
      } else if (detectedType === 'log') {
        const newLog: SiteLog = {
          id: `log_${Date.now()}`,
          site: activeSite.id,
          date: editedData.date || today,
          temp: editedData.temp || 24,
          weather: editedData.weather || 'Ensoleillé',
          note: editedData.note || '',
          incidents: editedData.incidents || '',
          lostHours: Number(editedData.lostHours) || 0
        };

        const filtered = db.logs.filter(l => !(l.site === newLog.site && l.date === newLog.date));
        onUpdateDb({ ...db, logs: [...filtered, newLog] });
      } else if (detectedType === 'worker') {
        const nextWorkerSeq = (db.seq?.w || db.seq?.worker || 0) + 1;
        const newWorker: Worker = {
          id: `w_${Date.now()}`,
          site: activeSite.id,
          name: editedData.name || 'Nouvel ouvrier',
          craft: editedData.craft || 'Maçonnerie',
          rate: Number(editedData.rate) || 2800,
          rateType: 'jour',
          phone: editedData.phone || '',
          cin: editedData.cin || '',
          team: editedData.team || 'Équipe A — Gros Œuvre',
          active: true,
          notes: editedData.notes || '',
          recruitmentLevel: editedData.recruitmentLevel || 'Niveau 2 — Ouvrier Professionnel (OP1)',
          experienceYears: Number(editedData.experienceYears) || 3,
          skills: editedData.skills || ['Exécution autonome'],
          hireDate: getTodayDateString(),
          evaluationScore: 4.5
        };

        const updatedWorkers = [newWorker, ...(db.workers || [])];
        const updatedSeq = { ...db.seq, w: nextWorkerSeq };
        onUpdateDb({ ...db, workers: updatedWorkers, seq: updatedSeq });
      }

      setSaveSuccess(true);
    } catch (e: any) {
      console.error("Save entity error:", e);
      setScanError("Erreur lors de l'enregistrement dans la base.");
    }
  };

  // Reset & start over
  const handleReset = () => {
    setPreviewImage(null);
    setFileContent(null);
    setFileName(null);
    setScanResult(null);
    setScanError(null);
    setSaveSuccess(false);
    if (source === 'camera') {
      startCamera();
    }
  };

  // Handle source switch
  useEffect(() => {
    if (isOpen) {
      if (source === 'camera' && !previewImage) {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, source]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Acquisition & Scanner IA Chantier</span>
                <span className="text-[10px] uppercase font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                  Multimodal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Caméra, Photos & Documents analysés en temps réel par l'IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Choose Source Mode */}
          {!previewImage && !fileContent && !scanResult && (
            <>
              {/* Source Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSource('camera');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    source === 'camera'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Caméra Directe</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSource('upload');
                    stopCamera();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    source === 'upload'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Photo / Galerie</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSource('file');
                    stopCamera();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    source === 'file'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Fichier / Doc</span>
                </button>
              </div>

              {/* Source View Area */}
              {source === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl bg-slate-950 overflow-hidden aspect-4/3 flex items-center justify-center border border-slate-800 shadow-inner">
                    {cameraError ? (
                      <div className="text-center p-6 space-y-3">
                        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                        <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
                        >
                          Réessayer la caméra
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Target Overlay Lines */}
                        <div className="absolute inset-6 border-2 border-dashed border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                          <span className="text-[11px] font-bold text-white bg-slate-950/70 px-2.5 py-1 rounded-md backdrop-blur-xs">
                            Cadrez le document ou l'élément
                          </span>
                        </div>

                        {/* Camera Controls Overlay */}
                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 px-4">
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="p-3 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 backdrop-blur-xs border border-slate-700 cursor-pointer"
                            title="Changer de caméra"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="p-4 bg-amber-500 text-slate-950 rounded-full hover:bg-amber-400 font-black shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center justify-center border-4 border-white/20"
                            title="Prendre la photo"
                          >
                            <Camera className="w-6 h-6" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {(source === 'upload' || source === 'file') && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-amber-50/30">
                    <div className="p-4 bg-amber-500/10 text-amber-600 rounded-2xl mb-3">
                      {source === 'upload' ? <Upload className="w-8 h-8" /> : <FileUp className="w-8 h-8" />}
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">
                      {source === 'upload'
                        ? 'Cliquez pour choisir une photo ou glissez-la ici'
                        : 'Sélectionnez un document (PDF, TXT, CSV, Facture, Bon)'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Formats supportés : JPG, PNG, WEBP, PDF, TXT, CSV
                    </span>
                    <input
                      type="file"
                      accept={source === 'upload' ? 'image/*' : '*/*'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </>
          )}

          {/* STEP 2: Preview & Context Before Processing */}
          {(previewImage || fileContent) && !scanResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-500" />
                  Document prêt pour l'analyse IA
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reprendre / Changer
                </button>
              </div>

              {/* Preview Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-2 overflow-hidden flex items-center justify-center max-h-64">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Capture"
                    className="max-h-60 rounded-xl object-contain"
                  />
                ) : (
                  <div className="p-4 text-slate-200 text-xs font-mono max-h-56 overflow-y-auto w-full">
                    <p className="font-bold text-amber-400 mb-1">📄 {fileName}</p>
                    <pre className="whitespace-pre-wrap">{fileContent?.slice(0, 1000)}</pre>
                  </div>
                )}
              </div>

              {/* Optional Guidance / Hint Input */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Catégorie souhaitée
                    </label>
                    <select
                      value={targetCategory}
                      onChange={e => setTargetCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="auto">✨ Auto-détection par l'IA</option>
                      <option value="expense">💰 Dépense / Reçu de caisse</option>
                      <option value="attendance">📋 Pointage & Présences</option>
                      <option value="material">🧱 Matériaux / Bon de livraison</option>
                      <option value="equipment">🚜 Matériel & Engins</option>
                      <option value="log">📖 Journal de chantier</option>
                      <option value="worker">👷 Fiche Ouvrier / CIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Indication optionnelle
                    </label>
                    <input
                      type="text"
                      value={userHint}
                      onChange={e => setUserHint(e.target.value)}
                      placeholder="Ex: Facture carburant du 31 août..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-run-universal-scan"
                  onClick={handleRunAiAnalysis}
                  disabled={isScanning}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse et extraction IA en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Lancer l'extraction IA intelligente</span>
                    </>
                  )}
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Scan Results & Entity Editor */}
          {scanResult && (
            <div className="space-y-4">
              {/* Header result summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-emerald-950">
                        {scanResult.title || 'Document analysé avec succès'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md uppercase">
                        Confiance {Math.round((scanResult.confidence || 0.95) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      {scanResult.summary}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline shrink-0 cursor-pointer"
                >
                  Nouveau scan
                </button>
              </div>

              {/* Entity Type Selection */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-700 shrink-0 mr-1">Enregistrer sous :</span>
                {[
                  { id: 'expense', label: 'Dépense Caisse', icon: HandCoins },
                  { id: 'attendance', label: 'Pointage', icon: ClipboardCheck },
                  { id: 'material', label: 'Matériaux', icon: Boxes },
                  { id: 'equipment', label: 'Engin', icon: Truck },
                  { id: 'log', label: 'Journal', icon: BookOpen },
                  { id: 'worker', label: 'Ouvrier', icon: UserPlus }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setDetectedType(tab.id as any);
                        setEditedData(scanResult.extractedData?.[tab.id as keyof typeof scanResult.extractedData] || {});
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        detectedType === tab.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Entity Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                {detectedType === 'expense' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Fournisseur / Bénéficiaire</label>
                      <input
                        type="text"
                        value={editedData.beneficiary || ''}
                        onChange={e => setEditedData({ ...editedData, beneficiary: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Montant ({currency})</label>
                      <input
                        id="smart-capture-amount-input"
                        type="number"
                        name="montant"
                        min="1"
                        step="1"
                        placeholder="Ex: 2000"
                        value={editedData.amount || ''}
                        onChange={e => setEditedData({ ...editedData, amount: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-black text-amber-600 text-sm"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Catégorie</label>
                      <input
                        type="text"
                        value={editedData.category || 'Petit Outillage & Quincaillerie'}
                        onChange={e => setEditedData({ ...editedData, category: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Date</label>
                      <input
                        type="date"
                        value={editedData.date || getTodayDateString()}
                        onChange={e => setEditedData({ ...editedData, date: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {detectedType === 'attendance' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Date du pointage :</span>
                      <input
                        type="date"
                        value={editedData.date || getTodayDateString()}
                        onChange={e => setEditedData({ ...editedData, date: e.target.value })}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-900"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                      {(editedData.workers || []).map((w: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-900">{w.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {w.status === 'P' ? 'Présent' : w.status}
                            </span>
                            {w.hSup > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                +{w.hSup}h sup
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detectedType === 'material' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Désignation Matériau</label>
                      <input
                        type="text"
                        value={editedData.name || ''}
                        onChange={e => setEditedData({ ...editedData, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Quantité reçue</label>
                      <input
                        type="number"
                        value={editedData.received || ''}
                        onChange={e => setEditedData({ ...editedData, received: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Unité</label>
                      <input
                        type="text"
                        value={editedData.unit || 'Sac'}
                        onChange={e => setEditedData({ ...editedData, unit: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Fournisseur</label>
                      <input
                        type="text"
                        value={editedData.supplier || ''}
                        onChange={e => setEditedData({ ...editedData, supplier: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {detectedType === 'equipment' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nom du Matériel</label>
                      <input
                        type="text"
                        value={editedData.name || ''}
                        onChange={e => setEditedData({ ...editedData, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Compteur Heures</label>
                      <input
                        type="number"
                        value={editedData.hours || ''}
                        onChange={e => setEditedData({ ...editedData, hours: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {detectedType === 'log' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Avancement / Tâches exécutées</label>
                      <textarea
                        rows={3}
                        value={editedData.note || ''}
                        onChange={e => setEditedData({ ...editedData, note: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 font-medium text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {detectedType === 'worker' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nom & Prénom</label>
                      <input
                        type="text"
                        value={editedData.name || ''}
                        onChange={e => setEditedData({ ...editedData, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Corps d'état / Métier</label>
                      <input
                        type="text"
                        value={editedData.craft || 'Maçon'}
                        onChange={e => setEditedData({ ...editedData, craft: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {saveSuccess ? (
                <div className="bg-emerald-600 text-white p-4 rounded-2xl text-center space-y-2">
                  <p className="font-black text-sm">Données enregistrées avec succès dans ChantierPro !</p>
                  <div className="flex items-center justify-center gap-2">
                    {(onSelectTab || onNavigateTab) && (
                      <button
                        type="button"
                        onClick={() => {
                          const tabMapping: Record<string, any> = {
                            expense: 'caisse',
                            attendance: 'dash',
                            material: 'mat',
                            equipment: 'mat',
                            log: 'log',
                            worker: 'team'
                          };
                          const targetTab = tabMapping[detectedType] || 'dash';
                          if (onSelectTab) onSelectTab(targetTab);
                          else if (onNavigateTab) onNavigateTab(targetTab);
                          onClose();
                        }}
                        className="px-4 py-2 bg-white text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                      >
                        Consulter dans l'application &rarr;
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl hover:bg-emerald-900 cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Enregistrer dans le chantier</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
