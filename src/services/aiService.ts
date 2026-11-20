import { Site, Worker, Material, Equipment, DailyExpense, SiteLog } from '../types';

export interface AiAuditResponse {
  success: boolean;
  analysis?: string;
  error?: string;
}

export interface AiDailyReportResponse {
  success: boolean;
  report?: string;
  error?: string;
}

export interface AiChatResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

export interface AiEstimateResponse {
  success: boolean;
  estimation?: string;
  error?: string;
}

export interface AiReceiptScanResponse {
  success: boolean;
  data?: {
    beneficiary?: string;
    category?: string;
    amount?: number;
    date?: string;
    receiptRef?: string;
    paymentMethod?: string;
    items?: Array<{
      name: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      total: number;
    }>;
    summary?: string;
    rawText?: string;
  };
  raw?: string;
  error?: string;
}

async function postAiWithTimeout<T>(endpoint: string, body: any, timeoutMs: number = 20000): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("Mode hors ligne actif. Cette fonctionnalité IA nécessite une connexion internet.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
  }, timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur serveur HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error("Délai de connexion dépassé (Timeout IA). Le serveur met trop de temps à répondre.");
    }
    throw err;
  }
}

export const aiService = {
  // 1. Audit Chantier
  async runAudit(params: {
    site: Site;
    stats: any;
    workers: Worker[];
    materials: Material[];
    equipment: Equipment[];
    expenses?: DailyExpense[];
    logs?: SiteLog[];
    language?: string;
  }): Promise<AiAuditResponse> {
    return postAiWithTimeout<AiAuditResponse>('/api/ai/audit', params, 25000);
  },

  // 2. Rapport Journalier PV
  async generateDailyReport(params: {
    site: Site;
    date: string;
    attendance: any[];
    expenses: DailyExpense[];
    materials: any[];
    log?: SiteLog;
    weather?: string;
    language?: string;
  }): Promise<AiDailyReportResponse> {
    return postAiWithTimeout<AiDailyReportResponse>('/api/ai/daily-report', params, 25000);
  },

  // 3. Chat / Copilot BTP
  async sendMessage(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    siteContext?: string;
    language?: string;
  }): Promise<AiChatResponse> {
    return postAiWithTimeout<AiChatResponse>('/api/ai/chat', params, 20000);
  },

  // 4. Estimation de quantités / Devis travaux
  async estimateQuantities(params: {
    description: string;
    projectType?: string;
    dimensions?: string;
    currency?: string;
    language?: string;
  }): Promise<AiEstimateResponse> {
    return postAiWithTimeout<AiEstimateResponse>('/api/ai/estimate-quantities', params, 25000);
  },

  // 5. Scanner de reçu / facture
  async scanReceipt(params: {
    imageBase64?: string;
    mimeType?: string;
    textHint?: string;
  }): Promise<AiReceiptScanResponse> {
    return postAiWithTimeout<AiReceiptScanResponse>('/api/ai/scan-receipt', params, 30000);
  },

  // 6. Numérisation & Acquisition Universelle IA (Caméra, Photo & Fichier)
  async universalScan(params: {
    imageBase64?: string;
    textContent?: string;
    mimeType?: string;
    userHint?: string;
    targetCategory?: 'auto' | 'expense' | 'attendance' | 'material' | 'equipment' | 'log' | 'worker';
  }): Promise<AiUniversalScanResponse> {
    return postAiWithTimeout<AiUniversalScanResponse>('/api/ai/universal-scan', params, 30000);
  },

  // 7. Évaluation de profil ouvrier & Niveaux de Recrutement IA
  async evaluateWorker(params: {
    inputContent?: string;
    imageBase64?: string;
    mimeType?: string;
    currency?: string;
    existingWorker?: Partial<Worker>;
    language?: string;
  }): Promise<AiWorkerEvaluateResponse> {
    return postAiWithTimeout<AiWorkerEvaluateResponse>('/api/ai/worker-evaluate', params, 25000);
  },

  // 8. Générateur d'équipe & Recrutement massif IA
  async generateTeamWorkers(params: {
    prompt: string;
    siteName?: string;
    count?: number;
    crafts?: string[];
    currency?: string;
    language?: string;
  }): Promise<AiGenerateTeamResponse> {
    return postAiWithTimeout<AiGenerateTeamResponse>('/api/ai/generate-team-workers', params, 30000);
  },

  // 9. Audit Matrice des Compétences & Niveaux de Recrutement
  async auditWorkersMatrix(params: {
    site: Site;
    workers: Worker[];
    attendanceStats?: any;
    language?: string;
  }): Promise<AiWorkersMatrixAuditResponse> {
    return postAiWithTimeout<AiWorkersMatrixAuditResponse>('/api/ai/workers-matrix-audit', params, 25000);
  }
};

export interface AiWorkerEvaluateResponse {
  success: boolean;
  data?: Partial<Worker>;
  raw?: string;
  error?: string;
}

export interface AiGenerateTeamResponse {
  success: boolean;
  data?: {
    workers: Partial<Worker>[];
    teamSummary?: string;
  };
  raw?: string;
  error?: string;
}

export interface AiWorkersMatrixAuditResponse {
  success: boolean;
  audit?: string;
  error?: string;
}

export interface AiUniversalScanResponse {
  success: boolean;
  result?: {
    detectedType: 'expense' | 'attendance' | 'material' | 'equipment' | 'log' | 'worker';
    confidence: number;
    title: string;
    summary: string;
    extractedData: {
      expense?: {
        beneficiary?: string;
        category?: string;
        amount?: number;
        date?: string;
        receiptRef?: string;
        paymentMethod?: string;
        items?: Array<{
          name: string;
          quantity: number;
          unit: string;
          unitPrice: number;
          total: number;
        }>;
      };
      attendance?: {
        date?: string;
        workers?: Array<{
          name: string;
          status: 'P' | 'R' | 'A' | 'J';
          hSup?: number;
          craft?: string;
          notes?: string;
        }>;
      };
      material?: {
        name?: string;
        unit?: string;
        received?: number;
        unitPrice?: number;
        supplier?: string;
        notes?: string;
      };
      equipment?: {
        name?: string;
        brand?: string;
        hours?: number;
        maintenanceType?: string;
        cost?: number;
        description?: string;
        date?: string;
      };
      log?: {
        date?: string;
        weather?: string;
        note?: string;
        incidents?: string;
        lostHours?: number;
      };
      worker?: {
        name?: string;
        craft?: string;
        rate?: number;
        phone?: string;
        cin?: string;
      };
    };
  };
  raw?: string;
  error?: string;
}
