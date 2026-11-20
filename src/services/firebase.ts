import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChantierDb } from '../types';
import { StorageService, sanitizeDb } from './storage';

// Initialize Firebase App
export const firebaseApp = initializeApp(firebaseConfig);

// CRITICAL: MUST pass firestoreDatabaseId as required by Firebase blueprint
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Operation Types as required by the Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type CloudSyncStatus = 
  | 'ONLINE_SYNCED'       // Données à jour et sécurisées en ligne (vert)
  | 'SYNCING'             // Synchronisation en cours... (bleu/jaune)
  | 'OFFLINE_SAVED'       // Hors ligne (sauvegardé sur le téléphone)
  | 'NOT_CONNECTED'       // Non connecté (données locales uniquement)
  | 'ERROR';              // Erreur de synchronisation

export interface CloudUserAccount {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSyncedAt?: string;
}

// ----------------------------------------------------
// AUTHENTICATION METHODS
// ----------------------------------------------------

/**
 * 1-Click Google Login (idéal pour Android / Google Play Store sans mot de passe à taper)
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erreur connexion Google:', error);
    throw error;
  }
}

/**
 * Connexion par Identifiant (Email ou Numéro Algérien simplifié e.g. 0697296059)
 */
export async function loginWithCredentials(identifier: string, pass: string): Promise<User> {
  // If user entered just a phone number, map it to a valid email format
  const cleanId = identifier.trim().toLowerCase();
  const formattedEmail = cleanId.includes('@') 
    ? cleanId 
    : `${cleanId.replace(/[^0-9]/g, '')}@chantierpro.dz`;

  try {
    const cred = await signInWithEmailAndPassword(auth, formattedEmail, pass);
    return cred.user;
  } catch (error) {
    console.error('Erreur login credentials:', error);
    throw error;
  }
}

/**
 * Inscription simplifiée pour chef de chantier
 */
export async function registerWithCredentials(identifier: string, pass: string, fullName?: string, companyName?: string): Promise<User> {
  const cleanId = identifier.trim().toLowerCase();
  const formattedEmail = cleanId.includes('@') 
    ? cleanId 
    : `${cleanId.replace(/[^0-9]/g, '')}@chantierpro.dz`;

  try {
    const cred = await createUserWithEmailAndPassword(auth, formattedEmail, pass);
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName });
    }
    // Create initial user document
    const userRef = doc(db, 'users', cred.user.uid);
    await setDoc(userRef, {
      id: cred.user.uid,
      email: cred.user.email || formattedEmail,
      name: fullName || 'Chef de Chantier',
      companyName: companyName || 'Entreprise BTP',
      role: 'CHEF_CHANTIER',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      deviceInfo: navigator.userAgent.slice(0, 120)
    }, { merge: true });

    return cred.user;
  } catch (error) {
    console.error('Erreur inscription credentials:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ----------------------------------------------------
// CLOUD BACKUP & RESTORATION (PROTECTION CONTRE LA CASSE)
// ----------------------------------------------------

/**
 * Sauvegarde automatique ou manuelle complète de l'application sur le Cloud
 */
export async function syncLocalDbToCloud(localDb: ChantierDb): Promise<{ success: boolean; timestamp: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Veuillez vous connecter pour synchroniser vos données dans le Cloud.");
  }

  const path = `users/${user.uid}/cloud_backup/main`;
  try {
    const sanitized = sanitizeDb(localDb);
    const nowIso = new Date().toISOString();

    // Prepare serializable snapshot
    const dataJson = JSON.stringify(sanitized);

    // 1. Save Full Cloud Backup Document
    await setDoc(doc(db, 'users', user.uid, 'cloud_backup', 'main'), {
      userId: user.uid,
      timestamp: nowIso,
      appVersion: '2.5.0',
      dataJson: dataJson,
      sitesCount: sanitized.sites.length,
      workersCount: sanitized.workers.length,
      expensesCount: (sanitized.expenses || []).length,
      advancesCount: sanitized.advances.length,
      materialsCount: sanitized.materials.length,
      invitationsCount: (sanitized.invitations || []).length
    });

    // 2. Update User Profile metadata
    const userPath = `users/${user.uid}`;
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || 'Chef de Chantier',
      lastSyncedAt: nowIso,
      deviceInfo: navigator.userAgent.slice(0, 120)
    }, { merge: true });

    // 3. Granularly sync individual sites
    for (const site of sanitized.sites.slice(0, 50)) {
      const sitePath = `users/${user.uid}/sites/${site.id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'sites', site.id), {
          id: site.id,
          name: site.name,
          client: site.client || '',
          address: site.address || '',
          radius: Number(site.radius) || 200,
          budget: Number(site.budget) || 0,
          status: site.status || 'en_cours',
          updatedAt: nowIso,
          isDeleted: false
        }, { merge: true });
      } catch (siteErr) {
        console.warn('Sync site error:', sitePath, siteErr);
      }
    }

    // 4. Granularly sync invitations
    for (const inv of (sanitized.invitations || []).slice(0, 50)) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'invitations', inv.id), {
          id: inv.id,
          siteId: inv.siteId,
          siteName: inv.siteName,
          recipientName: inv.recipientName,
          recipientRole: inv.recipientRole,
          recipientPhone: inv.recipientPhone || '',
          token: inv.token,
          status: inv.status || 'active',
          createdAt: inv.createdAt,
          notes: inv.notes || ''
        }, { merge: true });
      } catch (invErr) {
        console.warn('Sync inv error:', inv.id, invErr);
      }
    }

    // Save timestamp locally
    localStorage.setItem('chantierpro_last_cloud_sync', nowIso);

    return { success: true, timestamp: nowIso };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Restaure intégralement les données depuis le Cloud (e.g. après achat d'un nouveau téléphone)
 */
export async function restoreDbFromCloud(): Promise<{ restored: boolean; db: ChantierDb; timestamp?: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Veuillez vous connecter pour récupérer votre sauvegarde Cloud.");
  }

  const path = `users/${user.uid}/cloud_backup/main`;
  try {
    const backupSnap = await getDoc(doc(db, 'users', user.uid, 'cloud_backup', 'main'));
    if (!backupSnap.exists()) {
      return { restored: false, db: StorageService.load() };
    }

    const backupData = backupSnap.data();
    if (!backupData?.dataJson) {
      return { restored: false, db: StorageService.load() };
    }

    const parsed = JSON.parse(backupData.dataJson);
    const sanitized = sanitizeDb(parsed);

    // Save to local storage
    StorageService.save(sanitized);
    localStorage.setItem('chantierpro_last_cloud_sync', backupData.timestamp || new Date().toISOString());

    return {
      restored: true,
      db: sanitized,
      timestamp: backupData.timestamp
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Écoute en direct les changements du cloud pour détecter les mises à jour distantes
 */
export function listenToCloudSync(userId: string, onRemoteUpdate: (lastSyncedAt: string) => void) {
  const path = `users/${userId}`;
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data?.lastSyncedAt) {
        onRemoteUpdate(data.lastSyncedAt);
      }
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}
