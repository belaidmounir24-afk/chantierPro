import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Copy, Check, Send, Download, Upload, Trash2, X, RefreshCw, Smartphone, Award, Lock, Unlock, Phone } from 'lucide-react';
import { LicenseService, SUBSCRIPTION_CONFIG } from '../services/licenseService';
import { triggerHaptic } from '../utils/android';
import { downloadFile } from '../utils/calculations';

interface GeneratedLicenseRecord {
  id: string;
  key: string;
  planId: string;
  planName: string;
  prefix: string;
  price: string;
  priceNum: number;
  days: number;
  createdAt: string;
  expiresAt: string;
  clientName: string;
  companyName: string;
  clientPhone?: string;
  clientEmail?: string;
}

const STORAGE_KEY = 'chantierpro_admin_license_registry_v1';
const AUTH_KEY = 'chantierpro_admin_unlocked';
const DEFAULT_ADMIN_PASSWORD = 'CP-Admin#2026!Mounir$Key';
const PWD_STORAGE_KEY = 'chantierpro_admin_custom_password';

interface AdminLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLicenseModal: React.FC<AdminLicenseModalProps> = ({ isOpen, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [currentKey, setCurrentKey] = useState<GeneratedLicenseRecord | null>(null);
  const [registry, setRegistry] = useState<GeneratedLicenseRecord[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const auth = sessionStorage.getItem(AUTH_KEY);
        if (auth === 'true') {
          setIsUnlocked(true);
        }
      } catch {}
      loadRegistry();
    }
  }, [isOpen]);

  const loadRegistry = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setRegistry(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveRegistry = (updated: GeneratedLicenseRecord[]) => {
    setRegistry(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const storedPwd = localStorage.getItem(PWD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
    if (passwordInput.trim() === storedPwd.trim() || passwordInput.trim() === DEFAULT_ADMIN_PASSWORD) {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem(AUTH_KEY, 'true');
      } catch {}
      triggerHaptic('success');
    } else {
      setAuthError('Mot de passe administrateur incorrect.');
      triggerHaptic('error');
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');

    const cleanCompany = companyName.trim() || 'Entreprise BTP';
    const cleanClient = clientName.trim() || 'Client BTP';
    const cleanPhone = clientPhone.trim();

    const generated = LicenseService.generateKey('1_year', cleanCompany || cleanClient);
    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const record: GeneratedLicenseRecord = {
      id: 'lic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      key: generated.key,
      planId: '1_year',
      planName: generated.planName,
      prefix: generated.prefix,
      price: generated.price,
      priceNum: 5500,
      days: 365,
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      clientName: cleanClient,
      companyName: cleanCompany,
      clientPhone: cleanPhone
    };

    setCurrentKey(record);
    const updated = [record, ...registry];
    saveRegistry(updated);
  };

  const buildWhatsappMessage = (rec: GeneratedLicenseRecord) => {
    const origin = window.location.origin;
    const directActivationLink = `${origin}/?key=${encodeURIComponent(rec.key)}`;
    const salutation = rec.clientName && rec.clientName !== 'Client BTP' ? `Bonjour ${rec.clientName},` : 'Bonjour,';
    const compLine = rec.companyName && rec.companyName !== 'Entreprise BTP' ? `Pour l'entreprise : ${rec.companyName}\n` : '';

    return `${salutation}

Voici votre clé d'activation officielle pour l'application ChantierPro BTP :

🏗️ FORMULE : ${rec.planName}
💰 TARIF ANNUEL : 5 500 DA / an (12 mois complets)
⏳ VALIDITÉ : 365 jours
💳 RÈGLEMENT : BaridiMob / CCP / Espèces
${compLine}🔑 CLÉ DE LICENCE OFFICIELLE :
👉 ${rec.key}

Lien d'activation immédiate :
${directActivationLink}`;
  };

  const copyToClipboard = (text: string, type: 'key' | 'msg') => {
    navigator.clipboard.writeText(text);
    triggerHaptic('success');
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const handleExportRegistry = () => {
    const json = JSON.stringify(registry, null, 2);
    downloadFile(`ChantierPro_Registre_Licences_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
  };

  const handleImportRegistry = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          saveRegistry(parsed);
          triggerHaptic('success');
        }
      } catch (err) {
        alert('Format JSON de registre invalide');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteLicense = (id: string) => {
    if (confirm('Supprimer cette clé de l\'historique ?')) {
      const updated = registry.filter(r => r.id !== id);
      saveRegistry(updated);
    }
  };

  const filteredRegistry = registry.filter(r => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.key.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                  Administration Exclusive
                </span>
                <span className="text-xs text-slate-400 font-mono">belaidmounir24@gmail.com</span>
              </div>
              <h2 className="text-lg font-black text-white">
                ChantierPro — Générateur Officiel de Licences
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {!isUnlocked ? (
            /* PASSWORD UNLOCK SCREEN */
            <div className="max-w-md mx-auto py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Accès Réservé au Propriétaire</h3>
              <p className="text-xs text-slate-400">
                Veuillez saisir votre mot de passe administrateur pour déverrouiller la génération de clés.
              </p>
              <form onSubmit={handleUnlock} className="space-y-3 pt-2">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Mot de passe administrateur..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-amber-400 outline-none"
                  autoFocus
                />
                {authError && (
                  <p className="text-xs font-semibold text-rose-400">{authError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" /> Déverrouiller le Générateur
                </button>
              </form>
            </div>
          ) : (
            /* GENERATOR PANEL */
            <div className="space-y-6">
              {/* TOP STATS & QUICK LINKS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 font-medium">Clés émises</span>
                  <div className="text-xl font-black text-amber-400">{registry.length}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 font-medium">Chiffre d'Affaires</span>
                  <div className="text-xl font-black text-emerald-400">
                    {(registry.length * 5500).toLocaleString('fr-FR')} DA
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 font-medium">Tarif Officiel</span>
                  <div className="text-xl font-black text-white">5 500 DA / an</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-center">
                  <a
                    href="/admin-license.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Ouvrir page autonome ↗
                  </a>
                  <a
                    href="/download-admin-license"
                    className="text-[10px] text-slate-400 hover:text-white mt-1"
                  >
                    Télécharger .html
                  </a>
                </div>
              </div>

              {/* GENERATE FORM */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4" /> Nouvelle Clé d'Activation — 5 500 DA (365 jours)
                </h3>
                <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom du client</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Mohamed Khelifi"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Entreprise BTP</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: SARL BTP Travaux"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Téléphone WhatsApp</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: 0697 12 34 56"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="sm:col-span-3 pt-1">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Key className="w-4 h-4" /> Générer la Clé d'Activation Officielle (5 500 DA)
                    </button>
                  </div>
                </form>

                {/* CURRENT KEY RESULT CARD */}
                {currentKey && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Clé Générée avec Succès pour {currentKey.companyName || currentKey.clientName}
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Valide jusqu'au {new Date(currentKey.expiresAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
                      <span className="font-mono text-base sm:text-xl font-black text-amber-300 tracking-wider select-all">
                        {currentKey.key}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentKey.key, 'key')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(buildWhatsappMessage(currentKey), 'msg')}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{copiedMessage ? 'Message Copié !' : 'Copier le Message WhatsApp Complet'}</span>
                      </button>

                      {currentKey.clientPhone && (
                        <a
                          href={`https://wa.me/${currentKey.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildWhatsappMessage(currentKey))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" /> Envoyer directement sur WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* REGISTRY HISTORY */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Historique des Licences Émises ({filteredRegistry.length})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filtrer client, clé..."
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none w-40 sm:w-56"
                    />
                    <button
                      type="button"
                      onClick={handleExportRegistry}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 border border-slate-700"
                      title="Exporter registre JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <label
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
                      title="Importer registre JSON"
                    >
                      <Upload className="w-4 h-4" />
                      <input type="file" accept=".json" onChange={handleImportRegistry} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredRegistry.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 italic">
                        Aucune licence émise pour le moment.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/80 text-slate-400 font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Client / Société</th>
                            <th className="p-2.5">Clé</th>
                            <th className="p-2.5">Tarif</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredRegistry.map((lic) => (
                            <tr key={lic.id} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                {new Date(lic.createdAt).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-white">{lic.companyName || lic.clientName}</div>
                                {lic.clientPhone && <div className="text-[10px] text-slate-400">{lic.clientPhone}</div>}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-amber-300 select-all">
                                {lic.key}
                              </td>
                              <td className="p-2.5 font-semibold text-emerald-400">{lic.price}</td>
                              <td className="p-2.5 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(lic.key, 'key')}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="Copier la clé"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLicense(lic.id)}
                                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-rose-400"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Générateur Administrateur Mounir Belaid — ChantierPro Algérie</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
