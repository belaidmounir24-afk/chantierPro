/**
 * Dynamic App URL Resolution
 * Resolves the public, valid URL for sharing, QR code generation, and mobile navigation.
 */

// Fallback public shared URL if completely offline or without window
export const DEFAULT_PUBLIC_APP_URL = 'https://ais-pre-dbcps7jg62xvkzijie3e5u-385428295075.europe-west2.run.app';

/**
 * Returns the dynamic, public URL of the application.
 * Converts private AI Studio dev URLs ('ais-dev-...') to the public shared URL ('ais-pre-...'),
 * preventing 404 errors on external devices and shared links.
 */
export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_PUBLIC_APP_URL;
  }

  try {
    // 1. Check user-defined custom override if configured
    const customUrl = localStorage.getItem('chantierpro_custom_app_url');
    if (customUrl && customUrl.trim().startsWith('http')) {
      return customUrl.trim().replace(/\/+$/, '');
    }

    // 2. If running inside window, inspect origin
    let origin = window.location.origin;

    // Fix 404 error: 'ais-dev-' is a restricted private dev sandbox that returns 404 to all external devices.
    // The public, shared counterpart is 'ais-pre-'.
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }

    // If local dev environment (localhost / 127.0.0.1 / 0.0.0.0), return the public live URL
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
      return DEFAULT_PUBLIC_APP_URL;
    }

    // Remove any trailing slashes or path query params
    const pathname = window.location.pathname;
    if (pathname && pathname !== '/' && !pathname.endsWith('.html')) {
      return `${origin}${pathname}`.replace(/\/+$/, '');
    }

    return origin;
  } catch (e) {
    console.warn('[getPublicAppUrl] Error detecting origin:', e);
    return DEFAULT_PUBLIC_APP_URL;
  }
}
