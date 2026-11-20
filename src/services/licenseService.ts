import { AppLicense, AccessStatus, UserSubscriptionState } from '../types';

const LICENSE_STORAGE_KEY = 'chantierpro_license_meta';
export const TRIAL_START_KEY = 'chantierpro_trial_start_date';
export const TRIAL_EXPIRED_KEY = 'chantierpro_trial_expired';
export const TRIAL_DURATION_DAYS = 30; // Période d'essai gratuite de 30 jours
const SALT = 'CHANTIERPRO_2026_BTP_SECURE_SALT';

export const SUBSCRIPTION_CONFIG = {
  CURRENCY: 'DA',
  ANNUAL_PRICE: 5500,
  TRIAL_DURATION_DAYS: 30,
  PLAN_NAME: 'Abonnement Annuel ChantierPro BTP',
  PLAN_PRICE_FORMATTED: '5 500 DA / an',
  FEATURES: [
    'Gestion complète des chantiers en illimité',
    'Pointage des ouvriers, heures sup & calcul automatique des paies',
    'Suivi des approvisionnements, stocks & consommations de matériaux',
    'Caisse de chantier & journal des dépenses journalières',
    'Rapports d\'avancement officiels en PDF pour les clients',
    'Scan intelligent par caméra IA (bons de livraison & factures)',
    'Fonctionnement 100% hors-ligne sur le terrain (mode chantier)'
  ]
} as const;

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

export interface LicenseStatusResult {
  license: AppLicense;
  isValid: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  badgeLabel: string;
  badgeColor: string;
  planDisplayName: string;
  trialStartDate?: string;
}

export const LicenseService = {
  /**
   * Récupère ou initialise la date persistante de début de l'essai de 30 jours.
   * Cette date est stockée dès le tout premier lancement dans localStorage et
   * ne peut pas être réinitialisée par un simple rafraîchissement de page.
   */
  getTrialStartDate(): string {
    try {
      const storedDate = localStorage.getItem(TRIAL_START_KEY);
      if (storedDate && !isNaN(new Date(storedDate).getTime())) {
        return storedDate;
      }
      
      // Fallback: vérifier dans les métadonnées existantes
      const storedMeta = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (storedMeta) {
        const parsed = JSON.parse(storedMeta);
        if (parsed?.trialStartDate && !isNaN(new Date(parsed.trialStartDate).getTime())) {
          localStorage.setItem(TRIAL_START_KEY, parsed.trialStartDate);
          return parsed.trialStartDate;
        }
      }
    } catch {}

    // Premier lancement de l'application : initialisation définitive
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(TRIAL_START_KEY, nowIso);
    } catch (e) {
      console.error('Failed to set trial start date in localStorage', e);
    }
    return nowIso;
  },

  getInitialLicense(): AppLicense {
    try {
      const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppLicense;
        // Migration of old licenses if any
        if ((parsed.status as any) === 'pro_annual' || (parsed.status as any) === 'pro_lifetime') {
           parsed.status = 'active';
           parsed.planId = (parsed as any).status === 'pro_annual' ? '1_year' : '3_years';
        }
        return parsed;
      }
    } catch {}

    const trialStart = this.getTrialStartDate();
    const trialStartTime = new Date(trialStart).getTime();
    const expiryTime = trialStartTime + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const isAlreadyExpired = now >= expiryTime || localStorage.getItem(TRIAL_EXPIRED_KEY) === 'true';
    if (isAlreadyExpired) {
      try {
        localStorage.setItem(TRIAL_EXPIRED_KEY, 'true');
      } catch {}
    }

    const trialLicense: AppLicense = {
      status: isAlreadyExpired ? 'expired' : 'trial',
      planName: isAlreadyExpired ? 'Essai Terminé' : 'Essai Découverte Pro (30 jours)',
      trialStartDate: trialStart,
      expiresAt: new Date(expiryTime).toISOString()
    };
    this.saveLicense(trialLicense);
    return trialLicense;
  },

  saveLicense(license: AppLicense): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
      }
    } catch (e) {
      console.error('Failed to save license metadata', e);
    }
  },

  getStatus(currentLicense?: AppLicense): LicenseStatusResult {
    let lic = currentLicense || this.getInitialLicense();
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Vérification d'une licence commerciale payante active
    if (lic.status === 'active' && lic.expiresAt) {
      const expiry = new Date(lic.expiresAt);
      const diffTime = expiry.getTime() - nowMs;
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const isExpired = diffTime <= 0 || daysRemaining <= 0;

      if (isExpired && lic.status !== 'expired') {
        lic = { ...lic, status: 'expired' };
        this.saveLicense(lic);
      }

      return {
        license: lic,
        isValid: !isExpired,
        isTrial: false,
        isExpired,
        daysRemaining,
        badgeLabel: isExpired ? 'Licence Expirée (0j)' : `Pro (${daysRemaining} j)`,
        badgeColor: isExpired
          ? 'bg-rose-600 text-white border-rose-500 font-bold'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        planDisplayName: lic.planName || 'ChantierPro Pro'
      };
    }

    // 2. Gestion stricte de la période d'essai (Trial)
    const trialStart = lic.trialStartDate || this.getTrialStartDate();
    const trialStartTime = new Date(trialStart).getTime();
    const trialExpiryTime = trialStartTime + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    
    // Calcul précis du temps restant
    const diffTime = trialExpiryTime - nowMs;
    const rawDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, rawDays);

    // Blocage strict : dès que diffTime <= 0, ou daysRemaining <= 0, ou flag d'expiration stocké
    const isPermanentExpired = localStorage.getItem(TRIAL_EXPIRED_KEY) === 'true';
    const isExpired = diffTime <= 0 || daysRemaining <= 0 || lic.status === 'expired' || isPermanentExpired;

    if (isExpired) {
      try {
        localStorage.setItem(TRIAL_EXPIRED_KEY, 'true');
      } catch {}

      if (lic.status !== 'expired') {
        lic = {
          ...lic,
          status: 'expired',
          expiresAt: new Date(trialExpiryTime).toISOString()
        };
        this.saveLicense(lic);
      }

      return {
        license: lic,
        isValid: false,
        isTrial: true,
        isExpired: true,
        daysRemaining: 0,
        badgeLabel: "Pointage seul (30j)",
        badgeColor: 'bg-rose-600 text-white border-rose-400 font-black shadow-md',
        planDisplayName: 'Mode Pointage Seul (30 jours expirés)',
        trialStartDate: trialStart
      };
    }

    // Essai en cours et valide (1 à 30 jours restants)
    return {
      license: lic,
      isValid: true,
      isTrial: true,
      isExpired: false,
      daysRemaining,
      badgeLabel: `Essai (${daysRemaining}j)`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
      planDisplayName: `Essai Découverte (30 jours)`,
      trialStartDate: trialStart
    };
  },

  /**
   * Vérifie si l'accès à l'application doit être totalement verrouillé.
   */
  isStrictlyBlocked(currentLicense?: AppLicense): boolean {
    return this.getStatus(currentLicense).isExpired;
  },

  /**
   * Permet de simuler l'expiration immédiate (utile pour les tests et démonstrations).
   */
  simulateExpireTrial(): void {
    try {
      localStorage.setItem(TRIAL_EXPIRED_KEY, 'true');
      const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.status = 'expired';
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Réinitialise la période d'essai pour un nouveau cycle de test de 30 jours.
   */
  resetTrial(): void {
    try {
      localStorage.removeItem(TRIAL_EXPIRED_KEY);
      const now = new Date().toISOString();
      localStorage.setItem(TRIAL_START_KEY, now);
      const trialLicense: AppLicense = {
        status: 'trial',
        planName: 'Essai Découverte Pro (30 jours)',
        trialStartDate: now,
        expiresAt: new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      };
      this.saveLicense(trialLicense);
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Générateur officiel de licence pour l'administrateur / propriétaire (belaidmounir24@gmail.com)
   * Formule Unique :
   * - 1 An (5 500 DA) -> CP1Y-XXXX-XXXX (Valide 365 jours d'accès complet)
   */
  generateKey(
    plan: '1_year' = '1_year',
    clientRef: string = 'BTP'
  ): { key: string; planName: string; price: string; days: number; prefix: string } {
    const prefix = 'CP1Y';
    const planName = 'Abonnement Annuel ChantierPro BTP (1 An)';
    const price = '5 500 DA';
    const days = 365;

    // Generate random 4-character seed from CHARS with client hint if possible
    let seed = '';
    const cleanRef = clientRef.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanRef.length >= 2) {
      // Pick 2 chars from client ref + 2 random chars
      const c1 = CHARS.includes(cleanRef[0]) ? cleanRef[0] : CHARS[Math.floor(Math.random() * CHARS.length)];
      const c2 = CHARS.includes(cleanRef[1]) ? cleanRef[1] : CHARS[Math.floor(Math.random() * CHARS.length)];
      const r1 = CHARS[Math.floor(Math.random() * CHARS.length)];
      const r2 = CHARS[Math.floor(Math.random() * CHARS.length)];
      seed = `${c1}${c2}${r1}${r2}`;
    } else {
      for (let i = 0; i < 4; i++) {
        seed += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    }

    const checksum = computeChecksum(prefix, seed);
    const key = `${prefix}-${seed}-${checksum}`;

    return {
      key,
      planName,
      price,
      days,
      prefix
    };
  },

  verifyAndActivate(
    inputKey: string,
    clientName?: string,
    companyName?: string
  ): { success: boolean; license?: AppLicense; error?: string } {
    const rawClean = inputKey.trim().toUpperCase().replace(/[\s]/g, '');

    // Allow input without hyphens e.g. CP1YA8F29K3L (12 chars)
    let key = rawClean;
    if (/^CP[123]Y[A-Z0-9]{8}$/.test(rawClean)) {
      key = `${rawClean.slice(0, 4)}-${rawClean.slice(4, 8)}-${rawClean.slice(8, 12)}`;
    }

    const parts = key.split('-');

    // ========================================================
    // FORMAT 1: Compact 3-part key (ex: CP1Y-A8F2-9K3L)
    // Generated by "ChantierPro - Générateur de Licences Admin"
    // ========================================================
    if (parts.length === 3 && parts[0].startsWith('CP')) {
      const typeCode = parts[0]; // CP1Y, CP2Y, CP3Y
      const seed = parts[1];
      const checksum = parts[2];

      if (!['CP1Y', 'CP2Y', 'CP3Y'].includes(typeCode)) {
        return {
          success: false,
          error: "Type de formule inconnu. La clé doit commencer par CP1Y, CP2Y ou CP3Y."
        };
      }

      if (seed.length !== 4 || checksum.length !== 4) {
        return {
          success: false,
          error: "Format de clé compacte invalide (format attendu : CP1Y-XXXX-XXXX)."
        };
      }

      // Checksum verification
      const expectedChecksum = computeChecksum(typeCode, seed);
      if (checksum !== expectedChecksum) {
        return {
          success: false,
          error: "Clé de licence invalide ou corrompue. Veuillez vérifier votre saisie."
        };
      }

      const years = 1;
      const planId: '1_year' = '1_year';
      const planName = 'Abonnement Annuel ChantierPro BTP (5 500 DA)';

      const now = new Date();
      const expiresAt = new Date(now.getTime() + years * 365 * 24 * 60 * 60 * 1000);

      const newLicense: AppLicense = {
        status: 'active',
        licenseKey: key,
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        licenseeName: clientName?.trim() || 'Client BTP Pro',
        companyName: companyName?.trim() || 'Entreprise BTP',
        planName,
        planId,
        price: 5500,
        currency: 'DA'
      };

      try {
        localStorage.removeItem(TRIAL_EXPIRED_KEY);
      } catch {}

      this.saveLicense(newLicense);
      return {
        success: true,
        license: newLicense
      };
    }

    // ========================================================
    // FORMAT 2: Extended 5-part key (ex: CP-1YR-XXXX-XXXX-XXXX)
    // ========================================================
    if (parts.length === 5 && parts[0] === 'CP') {
      const typeCode = parts[1]; // 1YR, 2YR, 3YR
      const seed1 = parts[2];
      const seed2 = parts[3];
      const checksum = parts[4];

      if (!['1YR', '2YR', '3YR'].includes(typeCode)) {
        return {
          success: false,
          error: "Type de licence inconnu. La clé doit commencer par CP-1YR."
        };
      }

      const payload = `${seed1}-${seed2}`;
      const expectedChecksum = computeChecksum(typeCode, payload);

      if (checksum !== expectedChecksum) {
        return {
          success: false,
          error: "Clé de licence invalide ou corrompue. Veuillez vérifier votre saisie."
        };
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const newLicense: AppLicense = {
        status: 'active',
        licenseKey: key,
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        licenseeName: clientName?.trim() || 'Client BTP',
        companyName: companyName?.trim() || 'Entreprise BTP',
        planName: 'Abonnement Annuel ChantierPro BTP (5 500 DA)',
        planId: '1_year',
        price: 5500,
        currency: 'DA'
      };

      try {
        localStorage.removeItem(TRIAL_EXPIRED_KEY);
      } catch {}

      this.saveLicense(newLicense);
      return {
        success: true,
        license: newLicense
      };
    }

    return {
      success: false,
      error: "Format de clé invalide. Format attendu : CP1Y-XXXX-XXXX (ex: CP1Y-A8F2-9K3L)."
    };
  },

  /**
   * Logique de vérification d'accès complète :
   * - Vérifie l'abonnement payant (5 500 DA)
   * - Sinon vérifie l'essai gratuit de 30 jours
   * - Bloque si les 30 jours sont écoulés
   */
  checkUserAccess(license?: AppLicense): {
    hasAccess: boolean;
    status: AccessStatus;
    daysRemaining: number;
    message: string;
  } {
    const status = this.getStatus(license);
    if (!status.isTrial && status.isValid) {
      return {
        hasAccess: true,
        status: 'PAID_ACTIVE',
        daysRemaining: status.daysRemaining,
        message: `Abonnement annuel actif (${status.daysRemaining} jours restants).`
      };
    }

    if (!status.isTrial && status.isExpired) {
      return {
        hasAccess: false,
        status: 'PAID_EXPIRED',
        daysRemaining: 0,
        message: 'Votre abonnement annuel de 5 500 DA a expiré. Veuillez le renouveler.'
      };
    }

    if (status.isTrial && !status.isExpired) {
      return {
        hasAccess: true,
        status: 'TRIAL_ACTIVE',
        daysRemaining: status.daysRemaining,
        message: `Période d'essai gratuite en cours (${status.daysRemaining} jours restants sur 30).`
      };
    }

    return {
      hasAccess: false,
      status: 'TRIAL_EXPIRED',
      daysRemaining: 0,
      message: "Votre période d'essai gratuit de 30 jours est expirée. Activez l'abonnement annuel à 5 500 DA pour débloquer l'accès."
    };
  },

  /**
   * Active directement l'abonnement annuel suite au paiement
   */
  activateAnnualSubscription(
    currentLicense: AppLicense | undefined,
    licenseKey: string,
    paymentRef?: string,
    clientName?: string
  ): AppLicense {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const updatedLicense: AppLicense = {
      status: 'active',
      licenseKey,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      licenseeName: clientName || currentLicense?.licenseeName || 'Client BTP Pro',
      companyName: currentLicense?.companyName || 'Entreprise BTP',
      planName: 'Abonnement Annuel ChantierPro BTP (5 500 DA)',
      planId: '1_year',
      price: 5500,
      currency: 'DA',
      paymentReference: paymentRef
    };

    try {
      localStorage.removeItem(TRIAL_EXPIRED_KEY);
    } catch {}

    this.saveLicense(updatedLicense);
    return updatedLicense;
  }
};

