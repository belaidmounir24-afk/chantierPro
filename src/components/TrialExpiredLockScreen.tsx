import React, { useState } from 'react';
import { AppLicense } from '../types';
import { LicenseService } from '../services/licenseService';
import { triggerHaptic } from '../utils/android';
import { Lock, Mail, ShieldAlert, Key, CheckCircle2, AlertTriangle, Download, ArrowRight, Copy, Check, MessageCircle, ClipboardCheck } from 'lucide-react';

interface TrialExpiredLockScreenProps {
  license?: AppLicense;
  onUpdateLicense: (newLicense: AppLicense) => void;
  onOpenSubscriptionModal: () => void;
  onOpenBackupModal: () => void;
  onGoToAttendance?: () => void;
  lockedTabName?: string;
}

export const TrialExpiredLockScreen: React.FC<TrialExpiredLockScreenProps> = ({
  license,
  onUpdateLicense,
  onOpenSubscriptionModal,
  onOpenBackupModal,
  onGoToAttendance,
  lockedTabName
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const ownerEmail = 'belaidmounir24@gmail.com';
  const mailtoSubject = encodeURIComponent("Demande d'activation de licence ChantierPro (5 500 DA)");
  const mailtoBody = encodeURIComponent(
    "Bonjour,\n\nMa période d'essai de 30 jours sur ChantierPro est terminée.\nJe souhaite souscrire à l'abonnement annuel unique de 5 500 DA et obtenir ma clé d'activation officielle.\n\nNom de l'entreprise :\nResponsable :"
  );
  const mailtoLink = `mailto:${ownerEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;
  const whatsappLink = "https://wa.me/213697296059?text=Bonjour,%20je%20souhaite%20commander%20l'abonnement%20annuel%20ChantierPro%20(5500%20DA)";

  const handleCopyEmail = () => {
    triggerHaptic('light');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ownerEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setActivationError('');
    setActivationSuccess('');

    if (!licenseKeyInput.trim()) {
      setActivationError('Veuillez saisir votre clé de licence.');
      return;
    }

    const res = LicenseService.verifyAndActivate(licenseKeyInput, clientName);
    if (res.success && res.license) {
      triggerHaptic('success');
      setActivationSuccess(`Licence validée avec succès (${res.license.planName}) ! Déblocage de ChantierPro...`);
      setTimeout(() => {
        onUpdateLicense(res.license!);
      }, 1200);
    } else {
      triggerHaptic('error');
      setActivationError(res.error || 'Clé de licence invalide.');
    }
  };

  const trialStartFormatted = (() => {
    const raw = license?.trialStartDate || LicenseService.getTrialStartDate();
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  })();

  return (
    <div id="trial-lock-screen" className="min-h-[75vh] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl bg-slate-900 border-2 border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Banner header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-b border-rose-500/30 p-6 sm:p-8 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-500 shadow-xl mb-4">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            {lockedTabName ? `Module « ${lockedTabName} » désactivé` : "Accès restreint • 30 jours écoulés"}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            {lockedTabName
              ? `Le module « ${lockedTabName} » nécessite une licence active`
              : "Votre période d'activation de 30 jours est terminée"}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            L'application est désactivée après 30 jours d'activation.{' '}
            <strong className="text-amber-400 font-bold">Seul le module Pointage journalier reste accessible gratuitement</strong>.
            Pour réactiver l'ensemble des modules professionnels (Tâches, Personnel & Paie, Caisse & Dépenses, Stocks de matériaux, Engins, Journal de bord et Rapports PDF), activez votre abonnement annuel (5 500 DA).
          </p>

          {onGoToAttendance && (
            <div className="mt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onGoToAttendance();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-slate-950" />
                <span>Continuer vers le Pointage gratuit</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          )}

          {trialStartFormatted && (
            <p className="mt-3 text-xs text-slate-400">
              Activation initiale le {trialStartFormatted} (période de 30 jours écoulée).
            </p>
          )}
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 space-y-6 bg-slate-900/90">
          
          {/* Main Action: Contact Owner */}
          <div className="bg-gradient-to-br from-amber-500/10 via-slate-800 to-amber-500/5 border border-amber-500/30 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Contact direct pour déblocage
                </span>
                <h2 className="text-lg font-bold text-white">
                  Contacter le propriétaire pour activer votre licence
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Obtenez votre clé d'activation officielle et reprenez instantanément le contrôle de vos chantiers.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <code className="text-xs font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg text-amber-300 border border-slate-700">
                    {ownerEmail}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors border border-slate-700 cursor-pointer"
                    title="Copier l'adresse email"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                <a
                  id="btn-lockscreen-whatsapp-owner"
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('medium')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Commander via WhatsApp</span>
                </a>

                <a
                  id="btn-lockscreen-contact-owner"
                  href={mailtoLink}
                  onClick={() => triggerHaptic('medium')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Commander via Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* Activation with Key Form */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
              <span>Vous avez déjà une clé de licence ?</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              Saisissez votre clé d'activation officielle (format <code className="text-amber-400 font-mono">CP1Y-XXXX-XXXX</code>) pour débloquer votre abonnement annuel (5 500 DA) :
            </p>

            <form onSubmit={handleActivate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    id="input-lockscreen-license-key"
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="CP1Y-XXXX-XXXX"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 outline-none uppercase"
                  />
                </div>
                <div>
                  <button
                    id="btn-lockscreen-activate-key"
                    type="submit"
                    className="w-full h-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Débloquer</span>
                  </button>
                </div>
              </div>

              <div>
                <input
                  id="input-lockscreen-company-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom de l'entreprise ou du titulaire (facultatif)"
                  className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-slate-500 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none"
                />
              </div>

              {activationError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{activationError}</span>
                </div>
              )}

              {activationSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-semibold">{activationSuccess}</span>
                </div>
              )}
            </form>
          </div>

          {/* Secondary Actions: Tarifs & Backup */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              id="btn-lockscreen-open-pricing"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSubscriptionModal();
              }}
              className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 py-2 px-3 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Consulter l'offre annuelle unique (5 500 DA) →
            </button>

            <button
              id="btn-lockscreen-open-backup"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenBackupModal();
              }}
              className="w-full sm:w-auto text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 py-2 px-3 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 cursor-pointer"
              title="Exporter vos données de chantier"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sauvegarder mes données (Export JSON)</span>
            </button>
          </div>

        </div>

        {/* Footer note */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 text-center text-[11px] text-slate-400">
          ChantierPro • Protection anti-contournement active • Système de licence locale sécurisée
        </div>

      </div>
    </div>
  );
};
