import React, { useState } from 'react';
import { AppLicense } from '../types';
import { 
  X, 
  CheckCircle2, 
  Shield, 
  AlertTriangle, 
  Key, 
  ArrowRight, 
  Zap, 
  Mail, 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink,
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { triggerHaptic } from '../utils/android';
import { LicenseService, SUBSCRIPTION_CONFIG } from '../services/licenseService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  license?: AppLicense;
  onUpdateLicense: (newLicense: AppLicense) => void;
  onOpenPrivacy?: () => void;
  onOpenAdminLicenseModal?: () => void;
}

const SINGLE_PLAN = {
  id: '1_year',
  title: 'Abonnement Annuel ChantierPro BTP',
  price: '5 500 DA',
  priceNumeric: 5500,
  currency: 'DA',
  periodText: 'Pour 12 mois d\'accès complet (soit environ 458 DA / mois)',
  durationText: '365 jours de validité illimitée',
  badge: '⭐ OFFRE UNIQUE & COMPLÈTE · 1 AN',
  billingNote: 'Paiement unique annuel • Sans engagement • Aucun renouvellement automatique masqué'
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  license,
  onUpdateLicense,
  onOpenPrivacy,
  onOpenAdminLicenseModal
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [view, setView] = useState<'plans' | 'activation'>('plans');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<'whatsapp' | 'email' | 'phone' | null>(null);

  if (!isOpen) return null;

  const handleActivate = () => {
    setError('');
    setSuccessMsg('');
    if (!keyInput.trim()) {
      setError('Veuillez entrer une clé de licence.');
      return;
    }
    const res = LicenseService.verifyAndActivate(keyInput);
    if (res.success && res.license) {
      setSuccessMsg(`Félicitations ! Licence ${res.license.planName} activée avec succès.`);
      triggerHaptic('success');
      onUpdateLicense(res.license);
      setTimeout(() => {
        onClose();
        setView('plans');
        setOrderModalOpen(false);
        setSuccessMsg('');
        setKeyInput('');
      }, 2000);
    } else {
      setError(res.error || 'Erreur lors de l\'activation.');
      triggerHaptic('error');
    }
  };

  const licStatus = LicenseService.getStatus(license);
  const isExpired = licStatus.isExpired;

  const ownerPhone = '+213697296059';
  const ownerPhoneDisplay = '0697 29 60 59';
  const ownerEmail = 'belaidmounir24@gmail.com';

  const whatsappUrl = `https://wa.me/213697296059?text=${encodeURIComponent(
    `Bonjour Mounir, je souhaite commander l'Abonnement Annuel ChantierPro BTP (5 500 DA / an). Merci de m'indiquer les modalités de règlement (BaridiMob / CCP / Espèces) pour recevoir ma clé d'activation.`
  )}`;

  const emailUrl = `mailto:${ownerEmail}?subject=${encodeURIComponent(
    `Commande Abonnement ChantierPro BTP (5 500 DA)`
  )}&body=${encodeURIComponent(
    `Bonjour,\n\nJe souhaite souscrire à l'Abonnement Annuel ChantierPro BTP au tarif unique de 5 500 DA / an.\n\nMerci de me transmettre les coordonnées BaridiMob / CCP pour effectuer le règlement et recevoir ma clé d'activation.\n\nNom de l'entreprise BTP :\nNom du responsable :\nNuméro de téléphone :`
  )}`;

  const handleCopyText = (text: string, field: 'whatsapp' | 'email' | 'phone') => {
    triggerHaptic('light');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">ChantierPro BTP Algérie</h2>
              <p className="text-xs sm:text-sm text-slate-400">Application professionnelle de gestion de chantiers</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          
          {/* Banner if Expired */}
          {isExpired && (
            <div className="p-4 sm:p-5 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-rose-400 text-sm sm:text-base">
                    Période d'activation de 30 jours écoulée
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    L'application est en mode restreint : <strong className="text-amber-400">seul le module Pointage journalier reste accessible gratuitement</strong>. Activez votre licence annuelle complète (5 500 DA) pour réactiver l'ensemble des modules (Tâches, Paie, Caisse, Matériaux, Journal et Rapports PDF).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setOrderModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Activer l'abonnement</span>
              </button>
            </div>
          )}

          {/* Nav switcher between Offer and Activation */}
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-800/90 rounded-full p-1 border border-slate-700">
              <button
                onClick={() => { triggerHaptic('light'); setView('plans'); }}
                className={`px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  view === 'plans' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Formule Unique (5 500 DA)
              </button>
              <button
                onClick={() => { triggerHaptic('light'); setView('activation'); }}
                className={`px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  view === 'activation' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                J'ai déjà une clé
              </button>
            </div>
          </div>

          {view === 'plans' ? (
            <div className="space-y-6">
              
              {/* UNIQUE PLAN CARD */}
              <div className="bg-gradient-to-b from-slate-800 to-slate-850 rounded-3xl border-2 border-amber-500 shadow-2xl shadow-amber-500/10 p-6 sm:p-8 relative">
                
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{SINGLE_PLAN.badge}</span>
                </div>

                <div className="text-center mt-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {SINGLE_PLAN.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-300/90 font-medium mt-1">
                    {SINGLE_PLAN.durationText}
                  </p>
                </div>

                {/* Price Display */}
                <div className="my-6 text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                      {SINGLE_PLAN.price}
                    </span>
                    <span className="text-base sm:text-lg text-slate-300 font-semibold">
                      / an
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {SINGLE_PLAN.periodText}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium mt-1">
                    {SINGLE_PLAN.billingNote}
                  </p>
                </div>

                {/* Features List */}
                <div className="bg-slate-900/70 rounded-2xl p-4 sm:p-5 border border-slate-700/80 mb-6 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                    Tout est inclus en illimité :
                  </span>
                  {SUBSCRIPTION_CONFIG.FEATURES.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                      <div className="mt-0.5 bg-emerald-500/20 p-1 rounded-full shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Main Action Button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      setOrderModalOpen(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-amber-500/20"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Activer mon Abonnement (5 500 DA)</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-400 pt-1">
                    <span>💳 Règlement : BaridiMob • Virement CCP • Espèces</span>
                    <span className="hidden sm:inline">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setView('activation');
                      }}
                      className="text-amber-400 hover:underline cursor-pointer font-semibold"
                    >
                      Vous avez déjà une clé ? Cliquez ici
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-6 py-2">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-inner">
                  <Key className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Activer votre licence officielle</h3>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Saisissez la clé reçue après validation de votre règlement pour débloquer votre accès annuel.
                </p>
              </div>

              <div className="bg-slate-800/90 rounded-2xl p-6 border border-slate-700 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Clé d'activation (Format CP1Y-XXXX-XXXX)
                  </label>
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                    placeholder="CP1Y-XXXX-XXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-base uppercase"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleActivate}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-base transition-colors flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Key className="w-5 h-5" />
                  Valider et Débloquer
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setView('plans');
                    }}
                    className="text-xs text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>← Revenir à l'offre unique (5 500 DA)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/60 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Paiement direct sécurisé • Essai 30 jours • Tarif unique 5 500 DA/an</span>
          </div>
          <div className="flex items-center gap-4">
            {onOpenAdminLicenseModal && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onClose();
                  onOpenAdminLicenseModal();
                }}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Générateur de clés d'activation (belaidmounir24@gmail.com)"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Admin Licences</span>
              </button>
            )}
            {onOpenPrivacy && (
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenPrivacy();
                }}
                className="hover:text-white transition-colors underline cursor-pointer"
              >
                Conditions & Confidentialité
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE COMMANDE DIRECTE (WHATSAPP & EMAIL & BARIDIMOB) */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative">
            
            <button
              onClick={() => {
                triggerHaptic('light');
                setOrderModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">Activer l'Abonnement Annuel</h3>
                <p className="text-xs text-slate-400">Règlement direct (BaridiMob, CCP, Espèces) & envoi immédiat</p>
              </div>
            </div>

            {/* Plan Recap Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Formule Unique</span>
                <h4 className="text-base font-bold text-white">{SINGLE_PLAN.title}</h4>
                <p className="text-xs text-slate-400">{SINGLE_PLAN.durationText}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{SINGLE_PLAN.price}</div>
                <div className="text-[11px] text-emerald-400 font-semibold">12 mois complets</div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pour régler vos <strong className="text-amber-400">5 500 DA</strong> et recevoir immédiatement votre clé d'activation officielle, contactez directement l'administrateur <strong className="text-white">Mounir Belaid</strong> :
            </p>

            {/* DIRECT ORDER OPTIONS */}
            <div className="space-y-3">
              
              {/* BUTTON 1: WHATSAPP */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('medium')}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base transition-all flex items-center justify-between shadow-xl shadow-emerald-950/40 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>Commander via WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                    <div className="text-xs text-emerald-100 font-normal">
                      0697 29 60 59 • Réponses & clé instantanées
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
              </a>

              {/* BUTTON 2: EMAIL */}
              <a
                href={emailUrl}
                onClick={() => triggerHaptic('medium')}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm sm:text-base transition-all flex items-center justify-between shadow-xl shadow-blue-950/40 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>Commander via Email (Gmail)</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                    <div className="text-xs text-blue-100 font-normal">
                      belaidmounir24@gmail.com
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
              </a>

            </div>

            {/* Quick Contacts Copy */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <span>Coordonnées directes :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(ownerPhoneDisplay, 'phone')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors border border-slate-700 cursor-pointer"
                    title="Copier le téléphone"
                  >
                    {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'phone' ? 'Copié !' : ownerPhoneDisplay}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(ownerEmail, 'email')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors border border-slate-700 cursor-pointer"
                    title="Copier l'email"
                  >
                    {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'email' ? 'Email copié !' : ownerEmail}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Validation sécurisée via BaridiMob, CCP ou espèces en Algérie. Pas de carte bancaire étrangère requise.
                </span>
              </div>
            </div>

            {/* Cancel / Back button */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setOrderModalOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
