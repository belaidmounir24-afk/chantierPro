// Update Management Service for ChantierPro
// Allows checking, notifying, and applying updates across all shared apps and installed PWAs

import { safeFetch } from '../utils/network';

export interface AppReleaseInfo {
  appName: string;
  version: string;
  versionCode: number;
  buildDate: string;
  buildTimestamp: number;
  channel: string;
  mandatory: boolean;
  releaseNotes: string[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  buildDate: string;
  releaseNotes: string[];
  checkedAt: string;
  isServiceWorkerWaiting: boolean;
  mandatory?: boolean;
}

export const CURRENT_APP_VERSION = '4.3.0';
export const CURRENT_VERSION_CODE = 430;
export const CURRENT_BUILD_DATE = '2026-09-04';

const STORAGE_KEYS = {
  HAS_UPDATE: 'chantierpro_has_update',
  LATEST_VERSION: 'chantierpro_latest_version',
  LAST_CHECK: 'chantierpro_last_update_check',
  RELEASE_NOTES: 'chantierpro_release_notes',
  AUTO_UPDATE_ENABLED: 'chantierpro_auto_update_enabled',
  JUST_UPDATED: 'chantierpro_just_updated',
  DISMISSED_VERSION: 'chantierpro_dismissed_update_version'
};

class UpdateServiceClass {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSWWaiting: boolean = false;
  private checkIntervalId: any = null;

  constructor() {
    this.initServiceWorkerListener();
  }

  // Hook into Service Worker events to detect ready updates
  private initServiceWorkerListener() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return;
      this.swRegistration = registration;

      if (registration.waiting) {
        this.isSWWaiting = true;
        this.setHasUpdate(true, CURRENT_APP_VERSION);
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available once current tabs close or skipWaiting is sent
              this.isSWWaiting = true;
              this.setHasUpdate(true, CURRENT_APP_VERSION);
              this.dispatchStatusChange();
            }
          }
        });
      });
    }).catch(err => {
      console.warn('[UpdateService] SW registration check failed:', err);
    });

    // Listen for controller changes (when new SW activates)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[UpdateService] Service Worker controller changed');
    });
  }

  // Start background auto-check
  public startPeriodicCheck(intervalMinutes: number = 10) {
    if (typeof window === 'undefined') return;
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);

    // Initial check after 3 seconds
    setTimeout(() => {
      if (this.isAutoUpdateEnabled() && navigator.onLine) {
        this.checkForUpdate(false);
      }
    }, 3000);

    // Periodic check
    this.checkIntervalId = setInterval(() => {
      if (this.isAutoUpdateEnabled() && navigator.onLine) {
        this.checkForUpdate(false);
      }
    }, intervalMinutes * 60 * 1000);

    // Also check on window focus
    window.addEventListener('focus', () => {
      const lastCheck = this.getLastCheckTime();
      // If last check was more than 15 mins ago
      if (Date.now() - lastCheck > 15 * 60 * 1000 && navigator.onLine) {
        this.checkForUpdate(false);
      }
    });
  }

  public isAutoUpdateEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_UPDATE_ENABLED);
    return val === null ? true : val === 'true';
  }

  public setAutoUpdateEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.AUTO_UPDATE_ENABLED, String(enabled));
    this.dispatchStatusChange();
  }

  public getLastCheckTime(): number {
    if (typeof window === 'undefined') return 0;
    const val = localStorage.getItem(STORAGE_KEYS.LAST_CHECK);
    return val ? parseInt(val, 10) : 0;
  }

  public getCachedUpdateState(): { hasUpdate: boolean; latestVersion: string; releaseNotes: string[] } {
    if (typeof window === 'undefined') {
      return { hasUpdate: false, latestVersion: CURRENT_APP_VERSION, releaseNotes: [] };
    }
    const hasUpdate = localStorage.getItem(STORAGE_KEYS.HAS_UPDATE) === 'true' || this.isSWWaiting;
    const latestVersion = localStorage.getItem(STORAGE_KEYS.LATEST_VERSION) || CURRENT_APP_VERSION;
    let releaseNotes: string[] = [];
    try {
      const rawNotes = localStorage.getItem(STORAGE_KEYS.RELEASE_NOTES);
      if (rawNotes) releaseNotes = JSON.parse(rawNotes);
    } catch {
      releaseNotes = [];
    }
    return { hasUpdate, latestVersion, releaseNotes };
  }

  private setHasUpdate(hasUpdate: boolean, latestVersion: string, notes: string[] = []) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.HAS_UPDATE, String(hasUpdate));
    localStorage.setItem(STORAGE_KEYS.LATEST_VERSION, latestVersion);
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK, String(Date.now()));
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEYS.RELEASE_NOTES, JSON.stringify(notes));
    }
    this.dispatchStatusChange();
  }

  public dismissUpdateBanner(version: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, version);
    this.dispatchStatusChange();
  }

  public isUpdateDismissed(version: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION) === version;
  }

  // Check server for newer version or SW updates
  public async checkForUpdate(manual: boolean = false): Promise<UpdateCheckResult> {
    const checkedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK, String(Date.now()));

    // 1. If service worker registration is available, trigger an update check with timeout
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const regPromise = navigator.serviceWorker.getRegistration();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const reg = await Promise.race([regPromise, timeoutPromise]);
        if (reg) {
          this.swRegistration = reg;
          // Trigger update without blocking execution
          reg.update().catch(() => {});
          if (reg.waiting) {
            this.isSWWaiting = true;
          }
        }
      } catch (swErr) {
        console.warn('[UpdateService] SW reg.update() failed:', swErr);
      }
    }

    // 2. Fetch server release info with safeFetch (strict 1500ms timeout)
    try {
      const response = await safeFetch<AppReleaseInfo>(
        `/api/version?_t=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        },
        1500
      );

      if (response.ok && response.data) {
        const data: AppReleaseInfo = response.data;
        const serverVersion = data.version || CURRENT_APP_VERSION;
        const notes = data.releaseNotes || [];

        const isNewer = this.compareVersions(serverVersion, CURRENT_APP_VERSION) > 0 || this.isSWWaiting;

        this.setHasUpdate(isNewer, serverVersion, notes);

        return {
          hasUpdate: isNewer,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: serverVersion,
          buildDate: data.buildDate || CURRENT_BUILD_DATE,
          releaseNotes: notes,
          checkedAt,
          isServiceWorkerWaiting: this.isSWWaiting,
          mandatory: data.mandatory || false
        };
      }
    } catch (err) {
      console.warn('[UpdateService] Failed to fetch /api/version:', err);
    }

    // Fallback: compare with SW waiting state
    const isNewer = this.isSWWaiting;
    return {
      hasUpdate: isNewer,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      buildDate: CURRENT_BUILD_DATE,
      releaseNotes: [
        "Mise à jour et synchronisation des fichiers locaux",
        "Purge des caches de navigation pour charger la dernière version"
      ],
      checkedAt,
      isServiceWorkerWaiting: this.isSWWaiting
    };
  }

  // Compare semantic versions (e.g. "4.3.0" vs "4.2.0")
  private compareVersions(v1: string, v2: string): number {
    const clean = (v: string) => v.replace(/^v/i, '').split('-')[0];
    const parts1 = clean(v1).split('.').map(Number);
    const parts2 = clean(v2).split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  // Apply update immediately: purge cache, tell SW to skipWaiting, and reload cleanly
  public async applyUpdate(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. Tell all service workers to skip waiting & clear caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'SKIP_WAITING' });
            reg.active.postMessage({ type: 'CLEAR_CACHE' });
          }
        }
      }

      // 2. Clear window CacheStorage (preserves localStorage databases!)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 3. Mark update completed
      localStorage.removeItem(STORAGE_KEYS.HAS_UPDATE);
      localStorage.setItem(STORAGE_KEYS.JUST_UPDATED, Date.now().toString());

      // 4. Force hard reload with timestamp query param
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
    } catch (err) {
      console.error('[UpdateService] Error applying update:', err);
      // Fallback reload
      window.location.reload();
    }
  }

  // Broadcast update to server (Owner action)
  public async broadcastUpdate(newVersion: string, releaseNotes: string[]): Promise<boolean> {
    try {
      const res = await safeFetch(
        '/api/app/broadcast-update',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newVersion, releaseNotes })
        },
        2500
      );
      if (res.ok) {
        await this.checkForUpdate(true);
        return true;
      }
    } catch (err) {
      console.error('[UpdateService] Broadcast failed:', err);
    }
    return false;
  }

  private dispatchStatusChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chantierpro_update_status_changed'));
    }
  }
}

export const UpdateService = new UpdateServiceClass();
