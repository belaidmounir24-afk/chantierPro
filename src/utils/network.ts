/**
 * ChantierPro Network Resilience Utility
 * 
 * Assure une exécution prioritaire en mode local / hors-ligne :
 * - Toutes les requêtes réseau sont encadrées par un timeout court (1500ms - 2500ms).
 * - Aucune exception ou rejet de promesse n'est propagé vers l'interface.
 * - En cas de timeout, d'erreur 5xx ou de lenteur réseau, l'application bascule
 *   immédiatement et silencieusement sur les données locales (localStorage/cache).
 */

export interface SafeFetchResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  isTimeout?: boolean;
}

/**
 * Effectue un appel fetch avec timeout strict et gestion d'erreurs sécurisée
 */
export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 2000
): Promise<SafeFetchResponse<T>> {
  // Si le navigateur est explicitement hors-ligne, échouer immédiatement sans attendre
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Navigateur hors-ligne'
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // Ignorer
    }
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);

    let parsedData: T | null = null;
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        parsedData = (await res.json()) as T;
      } catch {
        parsedData = null;
      }
    } else {
      try {
        const text = await res.text();
        parsedData = text as unknown as T;
      } catch {
        parsedData = null;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsedData,
      error: res.ok ? undefined : `Erreur HTTP ${res.status}`
    };
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
    return {
      ok: false,
      status: 0,
      data: null,
      error: isTimeout ? `Timeout réseau (${timeoutMs}ms)` : (err?.message || 'Erreur réseau'),
      isTimeout
    };
  }
}

/**
 * Exécute une promesse ou tâche asynchrone avec un timeout maximum et sans jamais lever d'exception
 */
export async function runWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  return new Promise<T>((resolve) => {
    let completed = false;

    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        resolve(fallbackValue);
      }
    }, timeoutMs);

    promise
      .then((val) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(fallbackValue);
        }
      });
  });
}
