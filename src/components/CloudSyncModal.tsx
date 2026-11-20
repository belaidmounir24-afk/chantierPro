import React, { useState, useEffect } from 'react';
import { ChantierDb, Site } from '../types';
import { 
  auth, 
  loginWithGoogle, 
  loginWithCredentials, 
  registerWithCredentials, 
  logoutUser, 
  syncLocalDbToCloud, 
  restoreDbFromCloud,
  CloudSyncStatus
} from '../services/firebase';
import { 
  exportSitesExcel, 
  exportWorkersExcel, 
  exportExpensesExcel, 
  exportProjectPdf 
} from '../services/exportService';
import { StorageService } from '../services/storage';
import { triggerHaptic } from '../utils/android';
import { 
  X, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  ShieldCheck, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  LogOut, 
  LogIn, 
  User, 
  Smartphone, 
  AlertCircle, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Database,
  ArrowDownToLine,
  Lock
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  onUpdateDb: (newDb: ChantierDb) => void;
  syncStatus: CloudSyncStatus;
  lastSyncTime: string | null;
  isOnline: boolean;
  onTriggerSync: () => Promise<void>;
  activeSite?: Site;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  syncStatus,
  lastSyncTime,
  isOnline,
  onTriggerSync,
  activeSite
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGoogleLogin = async () => {
    triggerHaptic('medium');
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
      triggerHaptic('success');
      showToast('success', `Connecté avec succès : ${user.displayName || user.email}`);
      // Immediate backup after login
      await onTriggerSync();
    } catch (err: any) {
      console.error('Google auth error', err);
      setAuthError(err.message || 'Échec de la connexion Google');
      triggerHaptic('error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailOrPhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    triggerHaptic('medium');
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'login') {
        const user = await loginWithCredentials(identifier, password);
        setCurrentUser(user);
        triggerHaptic('success');
        showToast('success', `Bienvenue ! Vos données sont en cours de synchronisation.`);
      } else {
        const user = await registerWithCredentials(identifier, password, fullName, companyName);
        setCurrentUser(user);
        triggerHaptic('success');
        showToast('success', `Compte créé avec succès ! Vos données sont désormais sauvegardées.`);
      }
      await onTriggerSync();
    } catch (err: any) {
      console.error('Credentials auth error', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setAuthError('Identifiant ou mot de passe incorrect.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Ce compte existe déjà. Veuillez choisir "Connexion".');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setAuthError(err.message || 'Une erreur est survenue lors de l\'authentification.');
      }
      triggerHaptic('error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    triggerHaptic('light');
    try {
      await logoutUser();
      setCurrentUser(null);
      showToast('success', 'Déconnecté du compte Cloud.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSync = async () => {
    triggerHaptic('medium');
    setManualSyncLoading(true);
    try {
      await onTriggerSync();
      showToast('success', 'Toutes vos données ont été sauvegardées sur le Cloud avec succès !');
      triggerHaptic('success');
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la synchronisation.');
      triggerHaptic('error');
    } finally {
      setManualSyncLoading(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!window.confirm("Attention : Cette action va remplacer les données locales par la sauvegarde Cloud la plus récente. Souhaitez-vous continuer ?")) {
      return;
    }
    triggerHaptic('warning');
    setRestoreLoading(true);
    try {
      const res = await restoreDbFromCloud();
      if (res.restored) {
        onUpdateDb(res.db);
        triggerHaptic('success');
        showToast('success', `Données restaurées depuis le Cloud (${new Date(res.timestamp || '').toLocaleString('fr-FR')})`);
      } else {
        showToast('error', 'Aucune sauvegarde Cloud trouvée pour ce compte.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la récupération.');
      triggerHaptic('error');
    } finally {
      setRestoreLoading(false);
    }
  };

  const siteForPdf = activeSite || db.sites[0];
  const totalExpenses = (db.expenses || []).filter(e => e.site === siteForPdf.id).reduce((s, e) => s + (e.amount || 0), 0);
  const totalAdvances = (db.advances || []).filter(a => a.site === siteForPdf.id).reduce((s, a) => s + (a.amount || 0), 0);
  const workersCount = db.workers.filter(w => w.site === siteForPdf.id).length;

  return (
    <div
      id="cloud-sync-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-md">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Sécurité Cloud & Sauvegarde</h2>
                <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Anti-Perte Téléphone
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Protégez vos chantiers, ouvriers et caisse contre la perte ou la casse
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {toastMessage && (
            <div
              className={`flex items-center gap-2.5 text-xs font-bold p-3 rounded-xl border animate-in fade-in ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Reassurance Banner */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
                <span>Vos données sont sécurisées en ligne</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h3>
              <p className="text-[12px] text-emerald-800 mt-0.5 leading-relaxed">
                Si votre smartphone Android tombe, se casse ou est volé, <strong>vos chantiers ne sont pas perdus</strong>. Installez l'application sur votre nouvel appareil et reconnectez-vous pour tout restaurer en 1 seconde.
              </p>
            </div>
          </div>

          {/* Sync Status Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Connexion</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-emerald-600" />
                    <span>En ligne (4G / WiFi)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-amber-600" />
                    <span>Mode Hors-Ligne</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Statut Cloud</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                {syncStatus === 'SYNCING' ? (
                  <>
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    <span>Synchronisation...</span>
                  </>
                ) : currentUser ? (
                  <>
                    <CloudCheck className="h-4 w-4 text-emerald-600" />
                    <span>Données à jour</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 text-slate-400" />
                    <span>Non connecté</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Dernière Sauvegarde</span>
              <div className="text-xs font-black text-slate-900 truncate">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Jamais'}
              </div>
            </div>
          </div>

          {/* User Account Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="h-4 w-4 text-amber-500" />
                Compte Utilisateur & Authentification
              </h3>
              {currentUser && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Se déconnecter
                </button>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {currentUser.displayName || 'Chef de Chantier'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {currentUser.email || 'Connecté via Google'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Actif & Protégé
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {authError && (
                  <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* 1-Click Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Connexion 1-Clic avec Google (Android)</span>
                </button>

                <div className="relative flex items-center justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white px-2 relative z-10">OU PAR TÉLÉPHONE / EMAIL</span>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                </div>

                {/* Email / Phone Form */}
                <form onSubmit={handleEmailOrPhoneAuth} className="space-y-3">
                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Se Connecter
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Créer un Compte
                    </button>
                  </div>

                  {authMode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Votre nom complet (ex: Karim Haddad)"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Entreprise BTP (optionnel)"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="N° Téléphone (ex: 0550123456) ou Email"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Mot de passe (min 6 caractères)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {authLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : authMode === 'login' ? (
                      <LogIn className="h-4 w-4 text-amber-400" />
                    ) : (
                      <User className="h-4 w-4 text-amber-400" />
                    )}
                    <span>{authMode === 'login' ? 'Connexion au Compte' : 'Créer mon Compte & Sauvegarder'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Cloud Action Buttons */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Actions Cloud & Restauration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={manualSyncLoading || !currentUser}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  !currentUser
                    ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                  <Cloud className={`h-5 w-5 ${manualSyncLoading ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold">Sauvegarder Maintenant</div>
                  <div className="text-[10px] text-slate-500">Envoyer les modifications au serveur</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleRestoreFromCloud}
                disabled={restoreLoading || !currentUser}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  !currentUser
                    ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                    : 'border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-950'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                  <ArrowDownToLine className={`h-5 w-5 ${restoreLoading ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold">Restaurer les Données</div>
                  <div className="text-[10px] text-slate-500">Récupérer sur ce nouveau téléphone</div>
                </div>
              </button>
            </div>
          </div>

          {/* Data Export Options (Excel, PDF, Backup) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Download className="h-4 w-4 text-blue-600" />
              Exports Données Terrain (PDF & Excel)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  exportProjectPdf(siteForPdf, workersCount, totalExpenses, totalAdvances);
                  showToast('success', 'Fiche PDF officielle générée !');
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4 text-rose-600 shrink-0" />
                <div className="text-left">
                  <div>Synthèse Officielle (PDF)</div>
                  <div className="text-[10px] font-normal text-slate-500">Fiche de chantier imprimable</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  exportSitesExcel(db.sites);
                  showToast('success', 'Export Excel des chantiers téléchargé !');
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div>Chantiers & Clients (Excel)</div>
                  <div className="text-[10px] font-normal text-slate-500">Liste projets et budgets</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  exportWorkersExcel(db.workers);
                  showToast('success', 'Export Excel des ouvriers téléchargé !');
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div>Liste Ouvriers (Excel)</div>
                  <div className="text-[10px] font-normal text-slate-500">Effectifs, métiers, tarifs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  exportExpensesExcel(db.expenses || [], siteForPdf.name);
                  showToast('success', 'Export Excel des dépenses téléchargé !');
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div>Caisse & Dépenses (Excel)</div>
                  <div className="text-[10px] font-normal text-slate-500">Factures, tickets, achats</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-600" />
            Chiffrement Firestore 256 bits
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
