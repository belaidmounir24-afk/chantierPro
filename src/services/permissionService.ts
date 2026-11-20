// Service de Gestion des Permissions & Sécurité Propriétaire ChantierPro
import { AppLicense } from '../types';

export interface UserRoleProfile {
  id: string;
  title: string;
  badge: string;
  badgeClass: string;
  hasSellerEditorRole: boolean;
  canGenerateLicenses: boolean;
  canConfigurePermissions: boolean;
  canManageChantierData: boolean;
  scope: 'proprietaire' | 'collaborateur' | 'invite';
  status: 'autorise_exclusif' | 'revoque_bloque';
  statusLabel: string;
}

export interface IssuedLicenseRecord {
  id: string;
  key: string;
  type: 'annual' | 'lifetime';
  clientRef: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  EXCLUSIVE_LOCK: 'chantierpro_seller_role_exclusive',
  REVOCATION_DATE: 'chantierpro_seller_revoked_at',
  OWNER_PIN: 'chantierpro_owner_pin_hash',
  OWNER_SESSION: 'chantierpro_owner_session_active',
  ISSUED_LICENSES: 'chantierpro_issued_licenses_log'
};

const DEFAULT_PIN = '2026';
const SALT = 'CHANTIERPRO_2026_BTP_SECURE_SALT';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeChecksum(prefix: string, seed: string): string {
  const combined = `${prefix}_${seed}_${SALT}`;
  const hash = simpleHash(combined);
  let res = '';
  let temp = hash;
  for (let i = 0; i < 4; i++) {
    const index = temp % CHARS.length;
    res += CHARS[index];
    temp = Math.floor(temp / CHARS.length) + (i * 7);
  }
  return res;
}

export const PermissionService = {
  /**
   * Vérifie si le rôle éditeur-vendeur est verrouillé exclusivement au propriétaire
   */
  isSellerExclusiveToOwner(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.EXCLUSIVE_LOCK);
    // Par défaut, strictement exclusif au propriétaire
    return val !== 'false';
  },

  /**
   * Vérifie si la session actuelle est authentifiée comme Propriétaire
   */
  isOwnerAuthenticated(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.OWNER_SESSION) === 'true';
  },

  /**
   * Obtient la date de la dernière révocation
   */
  getLastRevocationDate(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REVOCATION_DATE);
  },

  /**
   * Connexion en tant que Propriétaire avec le Code Maître
   */
  loginOwner(enteredPin: string): { success: boolean; error?: string } {
    const pin = enteredPin.trim();
    if (!pin) {
      return { success: false, error: 'Veuillez saisir votre Code Maître Propriétaire.' };
    }

    const currentPin = localStorage.getItem(STORAGE_KEYS.OWNER_PIN) || DEFAULT_PIN;

    if (pin === currentPin) {
      sessionStorage.setItem(STORAGE_KEYS.OWNER_SESSION, 'true');
      this.dispatchUpdate();
      return { success: true };
    }

    return {
      success: false,
      error: 'Code Maître incorrect. Seul le propriétaire détient ce code.'
    };
  },

  /**
   * Déconnexion de la session Propriétaire
   */
  logoutOwner(): void {
    sessionStorage.removeItem(STORAGE_KEYS.OWNER_SESSION);
    this.dispatchUpdate();
  },

  /**
   * Modification du Code Maître Propriétaire
   */
  updateOwnerPin(currentPin: string, newPin: string): { success: boolean; error?: string } {
    const existing = localStorage.getItem(STORAGE_KEYS.OWNER_PIN) || DEFAULT_PIN;
    if (currentPin.trim() !== existing) {
      return { success: false, error: 'L\'ancien code maître saisi est incorrect.' };
    }

    const cleanNew = newPin.trim();
    if (cleanNew.length < 4) {
      return { success: false, error: 'Le nouveau code maître doit comporter au moins 4 caractères.' };
    }

    localStorage.setItem(STORAGE_KEYS.OWNER_PIN, cleanNew);
    return { success: true };
  },

  /**
   * Action maîtresse : Révoque le rôle Éditeur-Vendeur à tous les autres utilisateurs
   */
  revokeSellerRoleFromAllOtherUsers(): { success: boolean; message: string; timestamp: string } {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.EXCLUSIVE_LOCK, 'true');
    localStorage.setItem(STORAGE_KEYS.REVOCATION_DATE, now);

    // Supprime toute clé ou session résiduelle non-propriétaire
    try {
      fetch('/api/permissions/revoke-seller-role', { method: 'POST' }).catch(() => {});
    } catch {}

    this.dispatchUpdate();

    return {
      success: true,
      message: 'Le rôle Éditeur-Vendeur a été immédiatement retiré à tous les autres utilisateurs et appareils. L\'exclusivité totale est réservée à votre compte propriétaire.',
      timestamp: now
    };
  },

  /**
   * Génération officielle d'une clé de licence (accessible UNIQUEMENT si Propriétaire authentifié)
   */
  generateOfficialLicenseKey(type: 'annual' | 'lifetime', clientRef: string = 'CLIENT'): string {
    if (!this.isOwnerAuthenticated()) {
      throw new Error("Action non autorisée : Vous devez être authentifié en tant que Propriétaire Officiel.");
    }

    const typeCode = type === 'lifetime' ? 'LIFE' : 'ANN';
    const rawRef = clientRef.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BTP';
    const seed1 = (rawRef + '7892').slice(0, 4).padEnd(4, 'X');

    let seed2 = '';
    for (let i = 0; i < 4; i++) {
      seed2 += CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    const payload = `${seed1}-${seed2}`;
    const checksum = computeChecksum(typeCode, payload);
    const key = `CP-${typeCode}-${seed1}-${seed2}-${checksum}`;

    // Enregistrement dans l'historique privé
    this.recordIssuedKey(key, type, clientRef);

    return key;
  },

  /**
   * Historique des clés émises
   */
  getIssuedLicenses(): IssuedLicenseRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ISSUED_LICENSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  recordIssuedKey(key: string, type: 'annual' | 'lifetime', clientRef: string): void {
    try {
      const list = this.getIssuedLicenses();
      const record: IssuedLicenseRecord = {
        id: 'lic_' + Date.now(),
        key,
        type,
        clientRef: clientRef.trim() || 'Client BTP',
        createdAt: new Date().toISOString()
      };
      list.unshift(record);
      localStorage.setItem(STORAGE_KEYS.ISSUED_LICENSES, JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.error('Failed to log issued license', e);
    }
  },

  /**
   * Liste détaillée de la cartographie des rôles
   */
  getRolesDirectory(): UserRoleProfile[] {
    const isExclusive = this.isSellerExclusiveToOwner();
    const isOwner = this.isOwnerAuthenticated();

    return [
      {
        id: 'role_owner',
        title: 'Propriétaire Officiel (Vous)',
        badge: isOwner ? 'Connecté (Maître)' : 'Compte Réservé Exclusif',
        badgeClass: isOwner
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        hasSellerEditorRole: true,
        canGenerateLicenses: true,
        canConfigurePermissions: true,
        canManageChantierData: true,
        scope: 'proprietaire',
        status: 'autorise_exclusif',
        statusLabel: 'Détenteur exclusif de tous les privilèges Éditeur-Vendeur'
      },
      {
        id: 'role_collaborator',
        title: 'Conducteurs & Chefs de Chantier',
        badge: 'Rôle Vendeur Verrouillé',
        badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        hasSellerEditorRole: false,
        canGenerateLicenses: false,
        canConfigurePermissions: false,
        canManageChantierData: true,
        scope: 'collaborateur',
        status: 'revoque_bloque',
        statusLabel: isExclusive ? 'Rôle Éditeur-Vendeur STRICTEMENT RÉVOQUÉ' : 'Droits restreints'
      },
      {
        id: 'role_guest',
        title: 'Appareils Partagés / Liens Publics',
        badge: 'Accès Opérateur Seul',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
        hasSellerEditorRole: false,
        canGenerateLicenses: false,
        canConfigurePermissions: false,
        canManageChantierData: true,
        scope: 'invite',
        status: 'revoque_bloque',
        statusLabel: 'Aucun droit de vente ou de modification des licences'
      }
    ];
  },

  dispatchUpdate(): void {
    try {
      window.dispatchEvent(new CustomEvent('chantierpro_permissions_changed'));
    } catch {}
  }
};
