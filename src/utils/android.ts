// Android Native Utilities (Haptics, Installation, Wake Lock, Offline Detection)

export const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'success':
        navigator.vibrate([15, 50, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 40, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 50, 50, 50]);
        break;
    }
  } catch {
    // Ignore if vibration not permitted
  }
};

export const isAndroidDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Android Screen Wake Lock API (prevents screen dimming during active inspection / pointage)
let wakeLockSentinel: any = null;

export const requestWakeLock = async (): Promise<boolean> => {
  if ('wakeLock' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

export const releaseWakeLock = async () => {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch {
      // Ignore
    }
  }
};
