import React, { useState } from 'react';
import { ChantierDb, ProjectInvitation, Site } from '../types';
import { StorageService } from '../services/storage';
import { triggerHaptic } from '../utils/android';
import { 
  X, 
  UserPlus, 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  ExternalLink, 
  Phone, 
  Clock, 
  Cloud,
  Share2
} from 'lucide-react';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ChantierDb;
  onUpdateDb: (updated: ChantierDb) => void;
  activeSite?: Site;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  activeSite
}) => {
  const [siteId, setSiteId] = useState<string>(activeSite?.id || db.sites[0]?.id || '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientRole, setRecipientRole] = useState<ProjectInvitation['recipientRole']>('Client / Maître d\'Ouvrage');
  const [notes, setNotes] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSite = db.sites.find(s => s.id === siteId) || db.sites[0];
  const invitations = (db.invitations || []).filter(inv => !siteId || inv.siteId === siteId);

  const generateToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CHP-${res}`;
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    triggerHaptic('success');
    const newInvitation: ProjectInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      siteId: currentSite.id,
      siteName: currentSite.name,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientRole,
      token: generateToken(),
      status: 'active',
      createdAt: new Date().toISOString(),
      notes: notes.trim()
    };

    const updatedInvitations = [newInvitation, ...(db.invitations || [])];
    const updatedDb = { ...db, invitations: updatedInvitations };
    StorageService.save(updatedDb);
    onUpdateDb(updatedDb);

    setRecipientName('');
    setRecipientPhone('');
    setNotes('');
    setSuccessMessage(`Invitation pour "${newInvitation.recipientName}" générée et sauvegardée !`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDelete = (id: string) => {
    triggerHaptic('light');
    const updated = (db.invitations || []).filter(i => i.id !== id);
    const updatedDb = { ...db, invitations: updated };
    StorageService.save(updatedDb);
    onUpdateDb(updatedDb);
  };

  const handleCopyLink = (inv: ProjectInvitation) => {
    triggerHaptic('light');
    const shareUrl = `${window.location.origin}/?invitation=${inv.token}&site=${inv.siteId}`;
    const text = `Bonjour ${inv.recipientName}, voici votre accès sécurisé au chantier "${inv.siteName}" : ${shareUrl} (Code d'accès : ${inv.token})`;
    
    navigator.clipboard.writeText(text);
    setCopiedToken(inv.token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleShareWhatsApp = (inv: ProjectInvitation) => {
    triggerHaptic('medium');
    const shareUrl = `${window.location.origin}/?invitation=${inv.token}&site=${inv.siteId}`;
    const text = encodeURIComponent(
      `🏗️ *ChantierPro — Suivi de Chantier*\n\nBonjour *${inv.recipientName}*,\nVous êtes invité(e) en tant que *${inv.recipientRole}* à suivre le chantier :\n👉 *${inv.siteName}*\n\nLien d'accès direct : ${shareUrl}\nCode d'accès sécurisé : *${inv.token}*`
    );
    const phone = inv.recipientPhone?.replace(/[^0-9]/g, '');
    const waUrl = phone ? `https://wa.me/${phone.startsWith('0') ? '213' + phone.slice(1) : phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div
      id="invitations-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Invitations & Accès Chantier
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black border border-emerald-500/30 flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Cloud Synchro
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Partagez l'avancement avec vos clients, architectes ou sous-traitants
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successMessage && (
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-3 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form to create new invitation */}
          <form onSubmit={handleCreateInvitation} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-amber-600" />
              Créer une nouvelle invitation sécurisée
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Chantier concerné</label>
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
                >
                  {db.sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Rôle du destinataire</label>
                <select
                  value={recipientRole}
                  onChange={e => setRecipientRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:border-amber-500 outline-none"
                >
                  <option value="Client / Maître d'Ouvrage">Client / Maître d'Ouvrage</option>
                  <option value="Bureau d'Études / CTC">Bureau d'Études / CTC</option>
                  <option value="Sous-traitant">Sous-traitant</option>
                  <option value="Chef d'Équipe">Chef d'Équipe</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom ou Entreprise *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. Amine Benkaci (Client)"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">N° Téléphone (WhatsApp / SMS)</label>
                <input
                  type="tel"
                  placeholder="Ex: 0550 12 34 56"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Générer le code d'accès & Sauvegarder
            </button>
          </form>

          {/* List of active invitations */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center justify-between">
              <span>Invitations enregistrées ({invitations.length})</span>
              <span className="text-[11px] font-normal text-slate-500">Sauvegardées sur le Cloud</span>
            </h3>

            {invitations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aucune invitation active pour ce chantier. Remplissez le formulaire ci-dessus pour inviter un client ou un partenaire.
              </div>
            ) : (
              <div className="space-y-2.5">
                {invitations.map(inv => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{inv.recipientName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {inv.recipientRole}
                        </span>
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                          {inv.token}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Chantier : <strong>{inv.siteName}</strong></span>
                        {inv.recipientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {inv.recipientPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copier le message d'accès"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(inv)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Envoyer par WhatsApp"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer cette invitation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
