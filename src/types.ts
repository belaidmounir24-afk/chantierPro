export type RateType = 'jour' | 'heure';
export type AttendanceStatus = 'P' | 'R' | 'A' | 'J'; // P=Présent, R=Retard, A=Absent, J=Congé/Payé

export type RecruitmentLevel =
  | 'Niveau 1 — Manœuvre / Débutant'
  | 'Niveau 2 — Ouvrier Professionnel (OP1)'
  | 'Niveau 3 — Compagnon Professionnel (OP2)'
  | 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe';

export interface Site {
  id: string;
  name: string;
  client: string;
  address: string;
  radius: number; // in meters for GPS check-in
  supervisor?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  status: 'en_cours' | 'termine' | 'en_pause';
}

export interface Worker {
  id: string;
  site: string;
  name: string;
  craft: string;
  rate: number;
  rateType: RateType;
  team: string;
  phone?: string;
  cin?: string; // Carte d'identité / matricule
  active: boolean;
  notes?: string;
  recruitmentLevel?: RecruitmentLevel;
  experienceYears?: number;
  skills?: string[];
  certifications?: string[];
  hireDate?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  evaluationScore?: number; // 1 to 5
  aiEvaluationSummary?: string;
  aiSalaryRecommendation?: {
    minRate: number;
    maxRate: number;
    marketAverage: number;
    justification: string;
  };
}

export interface Team {
  id: string;
  siteId: string;
  name: string;
  leader?: string;
}

export interface AttendanceRecord {
  workerId: string;
  status: AttendanceStatus;
  hSup: number; // Heures supplémentaires
  absenceHours?: number; // Heures d'absence ou retard (défaut: 0)
  bonus?: number;
  note?: string;
  checkInTime?: string;
}

export interface Advance {
  id: string;
  site: string;
  workerId: string;
  date: string;
  amount: number;
  method: 'Espèces' | 'Virement' | 'Chèque' | 'Autre';
  note?: string;
  signature?: string; // Base64 signature image
  approvedBy?: string; // Validateur / Chef de chantier
  receiptRef?: string; // N° de reçu standardisé
}

export interface Material {
  id: string;
  site: string;
  name: string;
  unit: string;
  initStock: number;
  received: number;
  consumed: number;
  minAlert?: number;
  unitPrice?: number;
  category?: string;
}

export interface MaterialMovement {
  id: string;
  site: string;
  materialId: string;
  type: 'reception' | 'consommation';
  quantity: number;
  date: string;
  bonRef?: string;
  note?: string;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  site: string;
  date: string;
  hoursAtMaintenance: number;
  type: 'vidange' | 'revision_generale' | 'reparation' | 'filtres' | 'graissage' | 'controle_technique' | 'autre';
  cost?: number;
  technician?: string;
  receiptRef?: string;
  notes?: string;
  nextScheduledHours?: number;
  nextScheduledDate?: string;
}

export interface MaintenanceAlert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand?: string;
  siteId: string;
  siteName: string;
  severity: 'urgent' | 'warning' | 'info';
  type: 'hours_overdue' | 'hours_threshold' | 'deadline_overdue' | 'deadline_near' | 'status_issue';
  title: string;
  message: string;
  hoursRemaining: number;
  currentHours: number;
  maintDue: number;
  nextMaintenanceDate?: string;
  daysUntilDeadline?: number;
  timestamp: string;
}

export interface Equipment {
  id: string;
  site: string;
  name: string;
  hours: number;
  fuel: number;
  maintDue: number; // Frequency in hours (e.g. 250h)
  lastMaintHours?: number;
  brand?: string;
  status?: 'ok' | 'a_reviser' | 'en_panne';
  nextMaintenanceDate?: string; // Scheduled deadline date (YYYY-MM-DD)
  maintThresholdHours?: number; // Pre-alert threshold in hours (default 25h)
  maintenanceHistory?: MaintenanceRecord[];
  notes?: string;
}

export interface SiteLog {
  id: string;
  site: string;
  date: string;
  temp: number | string;
  weather: 'Dégagé' | 'Ensoleillé' | 'Nuageux' | 'Pluie' | 'Vent fort' | 'Canicule' | 'Orage' | 'Neige';
  lostHours: number;
  note: string;
  incidents: string;
  photos?: { id: string; url: string; caption?: string }[];
  signedBy?: string;
}

export type ExpenseCategory =
  | 'Carburant & Énergie'
  | 'Petit Outillage & Quincaillerie'
  | 'Transport & Déchargement'
  | 'Restauration & Eau'
  | 'Location Matériel'
  | 'Entretien & Réparations'
  | 'Frais Administratifs'
  | 'Divers & Urgences';

export interface DailyExpense {
  id: string;
  site: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'Espèces (Caisse)' | 'Virement' | 'Chèque' | 'Carte';
  beneficiary?: string; // Fournisseur / Prestataire / Quincaillerie
  receiptRef?: string; // N° ticket / Facture / Bon
  paidBy?: string; // e.g. Chef de chantier, Conducteur de travaux
  note?: string;
  status?: 'valide' | 'en_attente' | 'rapproche';
  attachmentUrl?: string;
}

export interface CashInflow {
  id: string;
  site: string;
  date: string;
  amount: number;
  source: string; // e.g. Direction générale, Trésorerie centrale, Virement banque, Dotation chef de chantier
  paymentMethod: 'Espèces' | 'Virement' | 'Chèque';
  reference?: string; // N° Virement, N° Bordereau, N° Chèque
  receivedBy?: string; // Chef de chantier, Caissier
  note?: string;
}

export interface CashAudit {
  id: string;
  site: string;
  date: string;
  theoreticalBalance: number;
  countedPhysicalCash: number;
  difference: number;
  breakdown?: Record<string, number>; // Billetage e.g. "2000": 5, "1000": 10
  auditedBy: string;
  notes?: string;
  status: 'conforme' | 'ecart';
}

export interface ActivationDevice {
  deviceId: string;
  deviceName: string;
  activationDate: string;
}

export interface ActivationKeyData {
  id: string; // The original key (in a real backend this would just be the ID, and hash stored)
  key: string; 
  clientName: string;
  clientEmail: string;
  licenseType: 'MONTHLY' | 'YEARLY' | 'UNLIMITED';
  maxDevices: number;
  activatedDevices: ActivationDevice[];
  status: 'ACTIVE' | 'REVOKED';
  licenseEndDate: string;
  createdAt: string;
  createdBy: string;
}

export interface AppLicense {
  status: 'trial' | 'active' | 'expired';
  licenseKey?: string;
  activatedAt?: string;
  expiresAt?: string | null;
  licenseeName?: string;
  companyName?: string;
  planName?: string;
  planId?: '1_year' | '2_years' | '3_years';
  price?: number;
  currency?: string;
  daysRemaining?: number;
  trialStartDate?: string;
  paymentReference?: string;
}

export type AccessStatus = 
  | 'TRIAL_ACTIVE'   // Essai gratuit en cours (<= 30 jours)
  | 'TRIAL_EXPIRED'  // Essai gratuit terminé (> 30 jours, non payé)
  | 'PAID_ACTIVE'    // Abonnement 5 500 DA/an validé et actif
  | 'PAID_EXPIRED';  // Abonnement annuel expiré (après 365 jours)

export interface UserSubscriptionState {
  userId?: string;
  firstLaunchDate: string;
  isTrialUsed: boolean;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  activatedLicenseKey?: string;
  paymentReference?: string;
}

export interface ActivationState {
  isActivated: boolean;
  activationKey?: string;
  expiryDate?: string;
  deviceId?: string;
}

export type TaskStatus = 'PLANIFIEE' | 'EN_COURS' | 'EN_ATTENTE' | 'COMPLETEE';
export type Priority = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';

export type UserRole = 'CHEF_CHANTIER' | 'CLIENT' | 'ADMIN';

export interface TaskComment {
  id: string;
  author: string;
  role?: UserRole;
  date: string;
  text: string;
}

export interface TaskRequirement {
  materialId: string;
  quantity: number;
}

export interface Task {
  id: string;
  siteId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignees: string[]; // Worker IDs
  startDate?: string;
  endDate?: string;
  priority: Priority;
  budget?: number;
  progress: number; // 0 to 100
  materialsRequired?: TaskRequirement[];
  photos?: string[];
  comments?: TaskComment[];
  dependencies?: string[]; // IDs of tasks that must be completed first
  subtasks?: { id: string; title: string; completed: boolean }[];
  clientApproval?: 'PENDING' | 'APPROVED' | 'REJECTED'; // Client validation
}

export interface ProjectInvitation {
  id: string;
  siteId: string;
  siteName: string;
  recipientName: string;
  recipientPhone?: string;
  recipientRole: 'Client / Maître d\'Ouvrage' | 'Bureau d\'Études / CTC' | 'Sous-traitant' | 'Chef d\'Équipe';
  token: string;
  status: 'active' | 'en_attente' | 'revoquee';
  createdAt: string;
  expiresAt?: string;
  notes?: string;
}

export interface ChantierDb {
  sites: Site[];
  activeSite: string | null;
  workers: Worker[];
  teams: Team[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>; // siteId -> date (YYYY-MM-DD) -> AttendanceRecord[]
  advances: Advance[];
  expenses?: DailyExpense[];
  cashInflows?: CashInflow[];
  cashAudits?: CashAudit[];
  materials: Material[];
  materialMovements?: MaterialMovement[];
  equipment: Equipment[];
  maintenanceRecords?: MaintenanceRecord[];
  logs: SiteLog[];
  tasks?: Task[];
  invitations?: ProjectInvitation[];
  seq: Record<string, number>;
  currency: string;
  license?: AppLicense;
}

export type TabType = 'dash' | 'tasks' | 'team' | 'caisse' | 'mat' | 'log' | 'rep' | 'ai';

