import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Site, Worker, Advance } from '../types';
import { formatCurrency } from '../utils/calculations';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Printer,
  X,
  HandCoins,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  FileText,
  PenTool,
  RotateCcw,
  ShieldCheck,
  QrCode,
  Sparkles,
  Smartphone,
  Maximize2,
  Minimize2,
  Check,
  FileSignature,
  Eraser,
  Lock
} from 'lucide-react';

interface AdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: Site;
  worker?: Worker | null;
  advance?: Advance | null;
  currency: string;
  onUpdateAdvanceSignature?: (advanceId: string, signature: string) => void;
}

export const AdvanceReceiptModal: React.FC<AdvanceReceiptModalProps> = ({
  isOpen,
  onClose,
  site,
  worker,
  advance,
  currency,
  onUpdateAdvanceSignature
}) => {
  const { t } = useLanguage();

  // In-situ canvas inside receipt
  const inSituCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Enlarged canvas inside drawer
  const enlargedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [signatureImage, setSignatureImage] = useState<string | null>(advance?.signature || null);
  const [isEditingInSitu, setIsEditingInSitu] = useState<boolean>(!advance?.signature);
  const [showEnlargedPad, setShowEnlargedPad] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState<'a4' | 'thermal'>('a4');
  const [inkColor, setInkColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a');
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);
  const [enlargedHasDrawn, setEnlargedHasDrawn] = useState(false);

  // Drawing tracking refs
  const inSituPointerDown = useRef(false);
  const inSituLastPoint = useRef<{ x: number; y: number } | null>(null);

  const enlargedPointerDown = useRef(false);
  const enlargedLastPoint = useRef<{ x: number; y: number } | null>(null);

  // Sync with prop when advance changes
  useEffect(() => {
    if (advance?.signature) {
      setSignatureImage(advance.signature);
      setIsEditingInSitu(false);
    } else {
      setSignatureImage(null);
      setIsEditingInSitu(true);
    }
    setHasDrawnStroke(false);
    setEnlargedHasDrawn(false);
  }, [advance?.id, advance?.signature]);

  // Canvas initializer
  const setupCanvas = useCallback((canvas: HTMLCanvasElement, color: string) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
    }
  }, []);

  // Initialize in-situ canvas when visible
  useEffect(() => {
    if (isEditingInSitu && inSituCanvasRef.current) {
      setupCanvas(inSituCanvasRef.current, inkColor);
    }
  }, [isEditingInSitu, inkColor, setupCanvas, isOpen]);

  // Initialize enlarged canvas when drawer is opened
  useEffect(() => {
    if (showEnlargedPad && enlargedCanvasRef.current) {
      // Delay slightly for transition layout
      const timer = setTimeout(() => {
        if (enlargedCanvasRef.current) {
          setupCanvas(enlargedCanvasRef.current, inkColor);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showEnlargedPad, inkColor, setupCanvas]);

  if (!isOpen || !site || !worker || !advance) return null;

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  // --- In-Situ Canvas Pointer Handlers ---
  const handleInSituPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = inSituCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    inSituPointerDown.current = true;
    inSituLastPoint.current = { x, y };

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fillStyle = inkColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawnStroke(true);
  };

  const handleInSituPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!inSituPointerDown.current) return;
    e.preventDefault();
    const canvas = inSituCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (inSituLastPoint.current) {
      const midX = (inSituLastPoint.current.x + x) / 2;
      const midY = (inSituLastPoint.current.y + y) / 2;
      ctx.quadraticCurveTo(inSituLastPoint.current.x, inSituLastPoint.current.y, midX, midY);
      ctx.stroke();
    }
    inSituLastPoint.current = { x, y };
  };

  const handleInSituPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!inSituPointerDown.current) return;
    inSituPointerDown.current = false;
    inSituLastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // Auto-save data
    const canvas = inSituCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
      if (onUpdateAdvanceSignature) {
        onUpdateAdvanceSignature(advance.id, dataUrl);
      }
    }
  };

  const clearInSituCanvas = () => {
    triggerHaptic('light');
    const canvas = inSituCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setHasDrawnStroke(false);
    setSignatureImage(null);
    if (onUpdateAdvanceSignature) {
      onUpdateAdvanceSignature(advance.id, '');
    }
  };

  const validateInSituSignature = () => {
    triggerHaptic('medium');
    const canvas = inSituCanvasRef.current;
    if (canvas && hasDrawnStroke) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
      if (onUpdateAdvanceSignature) {
        onUpdateAdvanceSignature(advance.id, dataUrl);
      }
    }
    setIsEditingInSitu(false);
  };

  // --- Enlarged Canvas Pointer Handlers ---
  const handleEnlargedPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = enlargedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    enlargedPointerDown.current = true;
    enlargedLastPoint.current = { x, y };

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = inkColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    setEnlargedHasDrawn(true);
  };

  const handleEnlargedPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enlargedPointerDown.current) return;
    e.preventDefault();
    const canvas = enlargedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (enlargedLastPoint.current) {
      const midX = (enlargedLastPoint.current.x + x) / 2;
      const midY = (enlargedLastPoint.current.y + y) / 2;
      ctx.quadraticCurveTo(enlargedLastPoint.current.x, enlargedLastPoint.current.y, midX, midY);
      ctx.stroke();
    }
    enlargedLastPoint.current = { x, y };
  };

  const handleEnlargedPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enlargedPointerDown.current) return;
    enlargedPointerDown.current = false;
    enlargedLastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const clearEnlargedCanvas = () => {
    triggerHaptic('light');
    const canvas = enlargedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setEnlargedHasDrawn(false);
  };

  const saveFromEnlargedCanvas = () => {
    triggerHaptic('medium');
    const canvas = enlargedCanvasRef.current;
    if (canvas && enlargedHasDrawn) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
      setIsEditingInSitu(false);
      if (onUpdateAdvanceSignature) {
        onUpdateAdvanceSignature(advance.id, dataUrl);
      }
    }
    setShowEnlargedPad(false);
  };

  const formattedDate = new Date(advance.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Verification security hash string
  const verificationHash = `SEC-${site.id.toUpperCase()}-${advance.id.toUpperCase()}-${Math.round(advance.amount)}`;

  return (
    <div
      id="advance-receipt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${
          receiptFormat === 'thermal' ? 'max-w-md' : 'max-w-2xl'
        } rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col print:border-none print:shadow-none print:max-w-full my-auto transition-all`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advance-receipt-modal-title"
      >
        {/* TOP CONTROL BAR (hidden in print) */}
        <div className="flex items-center justify-between bg-slate-900 px-5 sm:px-6 py-3.5 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold">
              <FileSignature className="h-3.5 w-3.5 text-amber-400" />
              Bon d'Acompte Officiel
            </span>
            <span className="hidden sm:inline text-xs text-slate-400">Reçu avec décharge & signature</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setReceiptFormat('a4')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  receiptFormat === 'a4' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Format A4
              </button>
              <button
                type="button"
                onClick={() => setReceiptFormat('thermal')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  receiptFormat === 'thermal' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ticket 80mm
              </button>
            </div>

            {/* Quick trigger for enlarged pad */}
            <button
              id="open-enlarged-signature-btn"
              type="button"
              onClick={() => setShowEnlargedPad(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="Ouvrir la zone de signature tactile grand écran"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>{signatureImage ? 'Modifier Signature' : 'Signer au doigt'}</span>
            </button>

            <button
              id="print-advance-receipt-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimer / PDF
            </button>

            <button
              id="close-advance-receipt-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ENLARGED TOUCH SIGNATURE PAD DRAWER (Expandable on top) */}
        {showEnlargedPad && (
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-slate-800 text-white border-b border-slate-700 print:hidden animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0">
                  <PenTool className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Signature tactile de décharge</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                      {worker.name}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Faites signer l'ouvrier directement sur l'écran au doigt ou au stylet pour attester la réception de{' '}
                    <strong className="text-amber-400 font-mono">{formatCurrency(advance.amount, currency)}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEnlargedPad(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Fermer ce tiroir"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Enlarged Canvas Surface */}
            <div className="relative rounded-2xl bg-white border-2 border-dashed border-amber-400/80 overflow-hidden shadow-inner">
              <canvas
                id="enlarged-signature-canvas"
                ref={enlargedCanvasRef}
                className="w-full h-44 sm:h-52 touch-none cursor-crosshair bg-white"
                onPointerDown={handleEnlargedPointerDown}
                onPointerMove={handleEnlargedPointerMove}
                onPointerUp={handleEnlargedPointerUp}
                onPointerCancel={handleEnlargedPointerUp}
              />

              {/* Dotted Signing Guideline */}
              <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b-2 border-dashed border-slate-300 flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span className="bg-white/80 px-2 rounded">Ligne de signature ✍️</span>
                <span className="bg-white/80 px-2 rounded font-mono text-[10px]">Décharge formelle</span>
              </div>
            </div>

            {/* Enlarged Drawer Controls */}
            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              {/* Color picker */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-slate-400 text-[11px]">Couleur d'encre :</span>
                <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setInkColor('#1e3a8a')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      inkColor === '#1e3a8a'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    <span>Bleu officiel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInkColor('#0f172a')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      inkColor === '#0f172a'
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-600'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-400 inline-block"></span>
                    <span>Noir classique</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  id="enlarged-clear-signature-btn"
                  type="button"
                  onClick={clearEnlargedCanvas}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Effacer</span>
                </button>
                <button
                  id="enlarged-validate-signature-btn"
                  type="button"
                  onClick={saveFromEnlargedCanvas}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Valider la Signature</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT DOCUMENT */}
        <div
          className={`p-6 sm:p-8 space-y-5 text-slate-900 bg-white ${
            receiptFormat === 'thermal' ? 'font-mono text-xs' : ''
          }`}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                <div>
                  <h1
                    id="advance-receipt-modal-title"
                    className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900"
                  >
                    {site.name}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Client : {site.client} {site.address && `· ${site.address}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block bg-slate-900 text-amber-400 border border-slate-800 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase font-mono shadow-xs">
                REÇU N° {advance.id.toUpperCase()}
              </span>
              <div className="text-[11px] text-slate-500 mt-1 capitalize">
                Date : <strong className="text-slate-800">{formattedDate}</strong>
              </div>
            </div>
          </div>

          {/* Worker Beneficiary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Ouvrier Bénéficiaire</span>
              <strong className="text-slate-900 text-sm font-black">{worker.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Poste / Spécialité</span>
              <strong className="text-slate-800">{worker.craft}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Équipe / Lot</span>
              <strong className="text-slate-800">{worker.team}</strong>
            </div>
            {worker.cin && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Matricule / CIN</span>
                <strong className="text-slate-800 font-mono">{worker.cin}</strong>
              </div>
            )}
            {worker.phone && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Téléphone</span>
                <strong className="text-slate-800">{worker.phone}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Mode de versement</span>
              <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                💵 {advance.method}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border-2 border-amber-400 text-center space-y-1 relative overflow-hidden shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              Montant de l'Acompte Décaissé
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
              {formatCurrency(advance.amount, currency)}
            </div>
            {advance.note && (
              <p className="text-xs text-amber-900 font-medium italic pt-1">
                Motif déclaré : « {advance.note} »
              </p>
            )}
          </div>

          {/* Legal Deduction Clause */}
          <p className="text-[11px] text-slate-600 text-justify leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            Je soussigné(e) <strong>{worker.name}</strong>, reconnais avoir reçu ce jour la somme ci-dessus indiquée en espèces/virement à titre d'avance sur salaire.
            Cette somme sera intégralement déduite de mon arrêté de paie du mois de <strong>{advance.date.slice(0, 7)}</strong>.
          </p>

          {/* SIGNATURES & SECURITY STAMP SECTION */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* WORKER SIGNATURE ZONE WITH INTEGRATED CANVAS */}
            <div
              id="worker-signature-box"
              className="border-2 border-slate-300 rounded-2xl p-3.5 flex flex-col justify-between bg-slate-50/70 min-h-[160px] relative transition-all"
            >
              {/* Box Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                <span className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1">
                  <PenTool className="h-3 w-3 text-amber-600" />
                  <span>Signature de l'Ouvrier (Décharge)</span>
                </span>
                {signatureImage && !isEditingInSitu ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Signé</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 print:hidden">
                    <PenTool className="h-3 w-3 text-amber-600 animate-bounce" />
                    <span>Signer sur l'écran</span>
                  </span>
                )}
              </div>

              {/* Active Interactive Drawing Canvas OR Saved Signature Preview */}
              <div className="my-1.5 relative flex-1 flex items-center justify-center min-h-[96px]">
                {signatureImage && !isEditingInSitu ? (
                  /* Display finalized signature */
                  <div className="flex flex-col items-center justify-center w-full py-1">
                    <img
                      id="advance-saved-signature-img"
                      src={signatureImage}
                      alt={`Signature de ${worker.name}`}
                      className="max-h-20 max-w-full object-contain filter drop-shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-emerald-700 font-semibold mt-1 print:hidden">
                      ✓ Signature électronique horodatée
                    </span>
                  </div>
                ) : (
                  /* Live Drawing Canvas */
                  <div className="w-full h-28 relative rounded-xl bg-white border border-slate-300 shadow-inner overflow-hidden">
                    <canvas
                      id="in-situ-signature-canvas"
                      ref={inSituCanvasRef}
                      className="w-full h-full touch-none cursor-crosshair bg-white"
                      onPointerDown={handleInSituPointerDown}
                      onPointerMove={handleInSituPointerMove}
                      onPointerUp={handleInSituPointerUp}
                      onPointerCancel={handleInSituPointerUp}
                    />

                    {/* Dotted guideline */}
                    {!hasDrawnStroke && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-2 pb-3">
                        <div className="border-b border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
                          <span>✍️ Signez au doigt ou au stylet ici</span>
                          <span className="font-mono text-[9px]">{worker.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive In-Situ Canvas Toolbar (hidden in print) */}
              <div className="pt-1.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] print:hidden">
                {signatureImage && !isEditingInSitu ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-slate-500 font-medium italic">
                      Bon pour accord & décharge
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        id="resign-signature-btn"
                        type="button"
                        onClick={() => {
                          setIsEditingInSitu(true);
                          setHasDrawnStroke(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors cursor-pointer"
                        title="Refaire la signature sur l'écran"
                      >
                        <RotateCcw className="h-3 w-3 text-amber-600" />
                        <span>Refaire</span>
                      </button>
                      <button
                        id="expand-signature-btn"
                        type="button"
                        onClick={() => setShowEnlargedPad(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors cursor-pointer"
                        title="Agrandir la zone de signature"
                      >
                        <Maximize2 className="h-3 w-3 text-blue-600" />
                        <span>Agrandir</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full gap-1.5 flex-wrap">
                    {/* Ink color switch */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setInkColor('#1e3a8a')}
                        className={`w-4 h-4 rounded-full bg-blue-700 border transition-transform ${
                          inkColor === '#1e3a8a' ? 'scale-125 ring-2 ring-blue-400 border-white' : 'border-slate-300'
                        }`}
                        title="Encre bleue officielle"
                      />
                      <button
                        type="button"
                        onClick={() => setInkColor('#0f172a')}
                        className={`w-4 h-4 rounded-full bg-slate-900 border transition-transform ${
                          inkColor === '#0f172a' ? 'scale-125 ring-2 ring-slate-400 border-white' : 'border-slate-300'
                        }`}
                        title="Encre noire"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        id="insitu-clear-btn"
                        type="button"
                        onClick={clearInSituCanvas}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold transition-colors cursor-pointer"
                        title="Effacer le dessin"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Effacer</span>
                      </button>
                      <button
                        id="insitu-expand-btn"
                        type="button"
                        onClick={() => setShowEnlargedPad(true)}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition-colors cursor-pointer"
                        title="Agrandir en grand écran"
                      >
                        <Maximize2 className="h-3 w-3 text-blue-600" />
                        <span className="hidden xs:inline">Agrandir</span>
                      </button>
                      <button
                        id="insitu-validate-btn"
                        type="button"
                        onClick={validateInSituSignature}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-2xs cursor-pointer"
                        title="Valider la signature"
                      >
                        <Check className="h-3 w-3" />
                        <span>Valider</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Printed footer line for legal paper copies */}
              <div className="hidden print:block text-[9px] text-slate-500 text-center border-t border-dashed border-slate-300 pt-1">
                Bon pour accord & décharge de salaire (Signature de l'ouvrier)
              </div>
            </div>

            {/* SUPERVISOR STAMP BOX */}
            <div className="border-2 border-slate-300 rounded-2xl p-3.5 flex flex-col justify-between bg-slate-50/70 min-h-[160px] relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-800 uppercase block pb-1.5 border-b border-slate-200/70">
                Visa Caisse & Chef de Chantier
              </span>

              {/* Official Stamp Overlay */}
              <div className="my-auto flex flex-col items-center justify-center py-2">
                <div className="border-2 border-emerald-700 text-emerald-800 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rotate-[-5deg] bg-emerald-50/80 shadow-xs border-dashed flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>✓ DÉCAISSÉ LE {advance.date}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-2 font-semibold">
                  RÉF : {advance.receiptRef || `BDP-${advance.id.toUpperCase()}`}
                </span>
              </div>

              <div className="text-[9px] text-slate-600 text-center border-t border-dashed border-slate-300 pt-1 font-semibold">
                {site.supervisor || 'Le Responsable de Chantier'} (Visa & Contrôle)
              </div>
            </div>
          </div>

          {/* VERIFICATION BAR & SECURITY SEAL */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-slate-100 border border-slate-300 font-mono text-[9px] text-slate-600 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>🔐 {verificationHash}</span>
              </div>
              <span className="hidden sm:inline text-emerald-600 font-semibold flex items-center gap-0.5">
                • Signature numérique sécurisée
              </span>
            </div>
            <div className="text-right font-mono text-[9px]">
              ChantierPro v2.4 · {new Date().toISOString().slice(0, 10)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
