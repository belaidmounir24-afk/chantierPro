import React, { useState, useEffect, useMemo } from 'react';
import {
  ChantierDb,
  Site,
  Worker,
  Advance,
  DailyExpense,
  CashInflow,
  CashAudit,
  Material,
  Equipment,
  SiteLog,
  AttendanceRecord,
  TabType,
  MaintenanceRecord,
  MaintenanceAlert,
  Task
} from './types';
import { StorageService, getTodayDateString } from './services/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AttendanceView } from './components/AttendanceView';
import { WorkersView } from './components/WorkersView';
import { ExpensesView } from './components/ExpensesView';
import { MaterialsView } from './components/MaterialsView';
import { DailyLogView } from './components/DailyLogView';
import { ReportsView } from './components/ReportsView';
import { TasksView } from './components/TasksView';
import { TaskModal } from './components/TaskModal';
import { SiteModal } from './components/SiteModal';
import { WorkerModal } from './components/WorkerModal';
import { AdvanceModal } from './components/AdvanceModal';
import { ExpenseModal } from './components/ExpenseModal';
import { AdvanceReceiptModal } from './components/AdvanceReceiptModal';
import { ExpenseReceiptModal } from './components/ExpenseReceiptModal';
import { CashInflowModal } from './components/CashInflowModal';
import { CashAuditModal } from './components/CashAuditModal';
import { MaterialModal, StockMovementModal } from './components/MaterialModal';
import { EquipmentModal } from './components/EquipmentModal';
import { MaintenanceLogModal } from './components/MaintenanceLogModal';
import { MaintenanceNotificationCenter } from './components/MaintenanceNotificationCenter';
import { MaintenanceToast } from './components/MaintenanceToast';
import { BackupModal } from './components/BackupModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { InvitationsModal } from './components/InvitationsModal';
import { auth, syncLocalDbToCloud, CloudSyncStatus } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { PrintDailyPV } from './components/PrintDailyPV';
import { PeriodReportModal } from './components/PeriodReportModal';
import { ClientReportExportModal } from './components/ClientReportExportModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TrialExpiredLockScreen } from './components/TrialExpiredLockScreen';
import { PrivacyModal } from './components/PrivacyModal';
import { AdminLicenseModal } from './components/AdminLicenseModal';
import { UpdateModal } from './components/UpdateModal';
import { UpdateBanner } from './components/UpdateBanner';
import { LicenseService } from './services/licenseService';
import { UpdateService } from './services/updateService';
import { GlobalSearch } from './components/GlobalSearch';
import { AiPerformanceHub } from './components/AiPerformanceHub';
import { AiSmartCaptureModal } from './components/AiSmartCaptureModal';
import { LoginScreen } from './components/LoginScreen';
import { ClientDashboardView } from './components/ClientDashboardView';
import { triggerHaptic } from './utils/android';
import { safeFetch } from './utils/network';
import { getEquipmentMaintenanceAlerts, playMaintenanceChime } from './utils/maintenanceNotifications';
import { useLanguage } from './i18n/LanguageContext';
import { AppLicense, UserRole } from './types';
import { Plus, Smartphone, ClipboardCheck, Boxes, UserPlus, BookOpen, X, HandCoins, Receipt, Bell, Wrench, Camera, Loader2, RefreshCw, Mail, Lock } from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const [db, setDb] = useState<ChantierDb>(() => StorageService.load());
  const [currentTab, setCurrentTab] = useState<TabType>('dash');

  // Auth & Roles State (Initialisation locale instantanée pour priorité hors-ligne)
  const [userRole, setUserRole] = useState<UserRole>('CHEF_CHANTIER');
  const [authConfigLoading, setAuthConfigLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('chantier_auth') === 'true') return true;
      // Par défaut, si aucune protection n'est mémorisée localement, accès immédiat sans attendre de serveur
      return localStorage.getItem('chantier_password_protected') !== 'true';
    }
    return true;
  });
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chantier_password_protected') === 'true';
    }
    return false;
  });

  // Android & Network State
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);

  // Modals state
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [selectedWorkerForAdvance, setSelectedWorkerForAdvance] = useState<Worker | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [expenseDefaultDate, setExpenseDefaultDate] = useState<string | undefined>(undefined);

  const [inflowModalOpen, setInflowModalOpen] = useState(false);
  const [editingInflow, setEditingInflow] = useState<CashInflow | null>(null);

  const [auditModalOpen, setAuditModalOpen] = useState(false);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptAdvance, setReceiptAdvance] = useState<Advance | null>(null);
  const [receiptWorker, setReceiptWorker] = useState<Worker | null>(null);

  const [expenseReceiptModalOpen, setExpenseReceiptModalOpen] = useState(false);
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<DailyExpense | null>(null);

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedMaterialForMovement, setSelectedMaterialForMovement] = useState<Material | null>(null);
  const [movementType, setMovementType] = useState<'reception' | 'consommation'>('reception');

  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Maintenance notifications & recording state
  const [maintenanceCenterOpen, setMaintenanceCenterOpen] = useState(false);
  const [maintenanceLogModalOpen, setMaintenanceLogModalOpen] = useState(false);
  const [selectedEquipmentForMaintenance, setSelectedEquipmentForMaintenance] = useState<Equipment | null>(null);
  const [activeToastAlert, setActiveToastAlert] = useState<MaintenanceAlert | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [cloudSyncModalOpen, setCloudSyncModalOpen] = useState(false);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('NOT_CONNECTED');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chantierpro_last_cloud_sync');
    }
    return null;
  });
  const [aiCaptureModalOpen, setAiCaptureModalOpen] = useState(false);
  const [printPVDate, setPrintPVDate] = useState<string | null>(null);
  const [periodReportModalOpen, setPeriodReportModalOpen] = useState(false);
  const [periodReportDates, setPeriodReportDates] = useState<{ start?: string; end?: string }>({});
  const [clientReportModalOpen, setClientReportModalOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [adminLicenseModalOpen, setAdminLicenseModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Initialize auto-update checks on mount
  useEffect(() => {
    UpdateService.startPeriodicCheck(10);
  }, []);

  // Automatic activation via URL query parameter (e.g., from WhatsApp or Email link: ?key=CP1Y-...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key') || params.get('activateKey') || params.get('license');
      if (urlKey) {
        const res = LicenseService.verifyAndActivate(urlKey);
        if (res.success && res.license) {
          handleUpdateLicense(res.license);
          triggerHaptic('success');
          // Clean URL parameter without page reload
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        } else if (res.error) {
          console.warn('URL License key invalid:', res.error);
        }
      }
    } catch (e) {
      console.error('Failed to parse URL activation key', e);
    }
  }, []);

  const handleUpdateLicense = (newLicense: AppLicense) => {
    LicenseService.saveLicense(newLicense);
    const updated: ChantierDb = {
      ...db,
      license: newLicense
    };
    updateDb(updated);
  };

  const isExpired = LicenseService.getStatus(db?.license).isExpired;

  const interceptIfExpired = () => {
    if (isExpired) {
      setSubscriptionModalOpen(true);
      return true;
    }
    return false;
  };

  const handleOpenPeriodReport = (start?: string, end?: string) => {
    if (interceptIfExpired()) return;
    setPeriodReportDates({ start, end });
    setPeriodReportModalOpen(true);
  };

  // Check Auth Config de façon asynchrone non-bloquante avec timeout strict
  useEffect(() => {
    let isMounted = true;
    const checkAuthConfig = async () => {
      try {
        const res = await safeFetch<{ isPasswordProtected: boolean }>('/api/auth/config', { method: 'GET' }, 1500);
        if (!isMounted) return;
        if (res.ok && res.data) {
          const isProtected = Boolean(res.data.isPasswordProtected);
          setIsPasswordProtected(isProtected);
          localStorage.setItem('chantier_password_protected', String(isProtected));
          if (!isProtected || sessionStorage.getItem('chantier_auth') === 'true') {
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        // En cas d'erreur ou timeout réseau, l'application continue en mode local
        console.warn('Mode local/hors-ligne conservé pour auth:', err);
      } finally {
        if (isMounted) {
          setAuthConfigLoading(false);
        }
      }
    };

    checkAuthConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global search shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Android PWA beforeinstallprompt & connectivity listeners
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (auth.currentUser) {
        setCloudSyncStatus('SYNCING');
        syncLocalDbToCloud(db).then((res) => {
          if (res.success) {
            setCloudSyncStatus('ONLINE_SYNCED');
            setLastSyncTime(res.timestamp);
          }
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setCloudSyncStatus('OFFLINE_SAVED');
      triggerHaptic('warning');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  // Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setFirebaseUser(usr);
      if (usr) {
        setCloudSyncStatus(isOnline ? 'ONLINE_SYNCED' : 'OFFLINE_SAVED');
      } else {
        setCloudSyncStatus('NOT_CONNECTED');
      }
    });
    return () => unsub();
  }, [isOnline]);

  // Debounced auto-sync to Cloud whenever db changes and user is signed in
  useEffect(() => {
    if (!firebaseUser || !isOnline) return;

    const timer = setTimeout(async () => {
      try {
        setCloudSyncStatus('SYNCING');
        const res = await syncLocalDbToCloud(db);
        if (res.success) {
          setCloudSyncStatus('ONLINE_SYNCED');
          setLastSyncTime(res.timestamp);
        }
      } catch (err) {
        console.warn('Auto cloud sync background notice:', err);
        setCloudSyncStatus('OFFLINE_SAVED');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [db, firebaseUser, isOnline]);

  const handleTriggerCloudSync = async () => {
    setCloudSyncStatus('SYNCING');
    try {
      const res = await syncLocalDbToCloud(db);
      if (res.success) {
        setCloudSyncStatus('ONLINE_SYNCED');
        setLastSyncTime(res.timestamp);
      }
    } catch (err) {
      console.error('Manual cloud sync failed', err);
      setCloudSyncStatus('ERROR');
      throw err;
    }
  };

  // Sync to localStorage
  const updateDb = (newDb: ChantierDb) => {
    setDb(newDb);
    StorageService.save(newDb);
  };

  // Ensure active site
  const activeSite = db.sites.find(s => s.id === db.activeSite) || db.sites[0];

  const handleSelectSite = (siteId: string) => {
    const updated = { ...db, activeSite: siteId };
    updateDb(updated);
  };

  // Site handlers
  const handleOpenSiteModal = (site?: Site) => {
    if (!site && interceptIfExpired()) return; // Only intercept on create, allow edit/view
    setEditingSite(site || null);
    setSiteModalOpen(true);
  };

  const handleSaveSite = (siteData: Omit<Site, 'id'>, editId?: string) => {
    if (editId) {
      const updatedSites = db.sites.map(s => (s.id === editId ? { ...siteData, id: editId } : s));
      updateDb({ ...db, sites: updatedSites });
    } else {
      const nextSeq = (db.seq?.site || 0) + 1;
      const newId = `site_${nextSeq}`;
      const newSite: Site = { ...siteData, id: newId };
      updateDb({
        ...db,
        sites: [...db.sites, newSite],
        activeSite: newId,
        seq: { ...db.seq, site: nextSeq }
      });
    }
  };

  // Task handlers
  const handleOpenTaskModal = (task?: Task) => {
    if (!task && interceptIfExpired()) return;
    setEditingTask(task || null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>, editId?: string) => {
    if (editId) {
      const updatedTasks = (db.tasks || []).map(t => (t.id === editId ? { ...taskData, id: editId } : t));
      updateDb({ ...db, tasks: updatedTasks });
    } else {
      const nextSeq = (db.seq?.task || 0) + 1;
      const newTask: Task = { ...taskData, id: `task_${nextSeq}` };
      updateDb({
        ...db,
        tasks: [...(db.tasks || []), newTask],
        seq: { ...db.seq, task: nextSeq }
      });
    }
  };

  const handleUpdateTaskApproval = (taskId: string, approval: 'APPROVED' | 'REJECTED', comment?: string) => {
    const updatedTasks = (db.tasks || []).map(t => {
      if (t.id === taskId) {
        // Optionnel : on pourrait aussi ajouter un commentaire lié à la tâche ici
        return { ...t, clientApproval: approval };
      }
      return t;
    });
    updateDb({ ...db, tasks: updatedTasks });
  };

  // Worker handlers
  const handleOpenWorkerModal = (worker?: Worker) => {
    if (!worker && interceptIfExpired()) return;
    setEditingWorker(worker || null);
    setWorkerModalOpen(true);
  };

  const handleSaveWorker = (workerData: Omit<Worker, 'id'>, editId?: string) => {
    if (editId) {
      const updatedWorkers = db.workers.map(w => (w.id === editId ? { ...workerData, id: editId } : w));
      updateDb({ ...db, workers: updatedWorkers });
    } else {
      const nextSeq = (db.seq?.w || 0) + 1;
      const newId = `w_${nextSeq}`;
      const newWorker: Worker = { ...workerData, id: newId };
      updateDb({
        ...db,
        workers: [...db.workers, newWorker],
        seq: { ...db.seq, w: nextSeq }
      });
    }
  };

  const handleBatchAddWorkers = (newWorkersData: Omit<Worker, 'id'>[]) => {
    if (interceptIfExpired()) return;
    let currentSeq = db.seq?.w || 0;
    const addedWorkers: Worker[] = newWorkersData.map(wData => {
      currentSeq++;
      return {
        ...wData,
        id: `w_${currentSeq}`
      };
    });
    updateDb({
      ...db,
      workers: [...db.workers, ...addedWorkers],
      seq: { ...db.seq, w: currentSeq }
    });
  };

  // Advance handlers
  const handleOpenAdvanceModal = (worker: Worker) => {
    if (interceptIfExpired()) return;
    setSelectedWorkerForAdvance(worker);
    setAdvanceModalOpen(true);
  };

  const handleAddAdvance = (advanceData: Omit<Advance, 'id'>) => {
    const nextSeq = (db.seq?.a || 0) + 1;
    const newAdvance: Advance = { ...advanceData, id: `adv_${nextSeq}` };
    updateDb({
      ...db,
      advances: [...db.advances, newAdvance],
      seq: { ...db.seq, a: nextSeq }
    });
  };

  const handleDeleteAdvance = (advanceId: string) => {
    updateDb({
      ...db,
      advances: db.advances.filter(a => a.id !== advanceId)
    });
  };

  const handlePrintAdvanceReceipt = (advance: Advance, worker: Worker) => {
    setReceiptAdvance(advance);
    setReceiptWorker(worker);
    setReceiptModalOpen(true);
  };

  // Expense handlers
  const handleOpenExpenseModal = (expense?: DailyExpense, defaultDate?: string) => {
    if (!expense && interceptIfExpired()) return;
    setEditingExpense(expense || null);
    setExpenseDefaultDate(defaultDate);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = (expenseData: Omit<DailyExpense, 'id'>, editId?: string) => {
    if (editId) {
      const updatedExpenses = (db.expenses || []).map(e => (e.id === editId ? { ...expenseData, id: editId } : e));
      updateDb({ ...db, expenses: updatedExpenses });
    } else {
      const nextSeq = (db.seq?.exp || 0) + 1;
      const newId = `exp_${nextSeq}`;
      const newExpense: DailyExpense = { ...expenseData, id: newId };
      updateDb({
        ...db,
        expenses: [...(db.expenses || []), newExpense],
        seq: { ...db.seq, exp: nextSeq }
      });
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateDb({
      ...db,
      expenses: (db.expenses || []).filter(e => e.id !== expenseId)
    });
  };

  // Cash Inflow handlers
  const handleOpenInflowModal = (inflow?: CashInflow) => {
    if (!inflow && interceptIfExpired()) return;
    setEditingInflow(inflow || null);
    setInflowModalOpen(true);
  };

  const handleSaveInflow = (inflowData: CashInflow) => {
    const existing = (db.cashInflows || []).some(i => i.id === inflowData.id);
    if (existing) {
      const updated = (db.cashInflows || []).map(i => (i.id === inflowData.id ? inflowData : i));
      updateDb({ ...db, cashInflows: updated });
    } else {
      updateDb({
        ...db,
        cashInflows: [...(db.cashInflows || []), inflowData]
      });
    }
  };

  const handleDeleteInflow = (inflowId: string) => {
    updateDb({
      ...db,
      cashInflows: (db.cashInflows || []).filter(i => i.id !== inflowId)
    });
  };

  // Cash Audit handlers
  const handleOpenAuditModal = () => {
    if (interceptIfExpired()) return;
    setAuditModalOpen(true);
  };

  const handleSaveAudit = (auditData: CashAudit) => {
    updateDb({
      ...db,
      cashAudits: [auditData, ...(db.cashAudits || [])]
    });
  };

  // Advance signature update
  const handleUpdateAdvanceSignature = (advanceId: string, signature: string) => {
    const updatedAdvances = db.advances.map(a => (a.id === advanceId ? { ...a, signature } : a));
    updateDb({ ...db, advances: updatedAdvances });
    if (receiptAdvance && receiptAdvance.id === advanceId) {
      setReceiptAdvance({ ...receiptAdvance, signature });
    }
  };

  const handleOpenExpenseReceiptModal = (expense: DailyExpense) => {
    setSelectedExpenseForReceipt(expense);
    setExpenseReceiptModalOpen(true);
  };

  // Material handlers
  const handleOpenMaterialModal = (material?: Material) => {
    if (!material && interceptIfExpired()) return;
    setEditingMaterial(material || null);
    setMaterialModalOpen(true);
  };

  const handleSaveMaterial = (materialData: Omit<Material, 'id'>, editId?: string) => {
    if (editId) {
      const updated = db.materials.map(m => (m.id === editId ? { ...materialData, id: editId } : m));
      updateDb({ ...db, materials: updated });
    } else {
      const nextSeq = (db.seq?.m || 0) + 1;
      const newMaterial: Material = { ...materialData, id: `mat_${nextSeq}` };
      updateDb({
        ...db,
        materials: [...db.materials, newMaterial],
        seq: { ...db.seq, m: nextSeq }
      });
    }
  };

  const handleOpenMovementModal = (material: Material, type: 'reception' | 'consommation') => {
    if (interceptIfExpired()) return;
    setSelectedMaterialForMovement(material);
    setMovementType(type);
    setMovementModalOpen(true);
  };

  const handleConfirmStockMovement = (materialId: string, quantity: number, note?: string) => {
    const updatedMaterials = db.materials.map(m => {
      if (m.id === materialId) {
        if (movementType === 'reception') {
          return { ...m, received: m.received + quantity };
        } else {
          return { ...m, consumed: m.consumed + quantity };
        }
      }
      return m;
    });

    const nextSeq = (db.seq?.mov || 0) + 1;
    const newMovement = {
      id: `mov_${nextSeq}`,
      site: activeSite.id,
      materialId,
      type: movementType,
      quantity,
      date: getTodayDateString(),
      note
    };

    updateDb({
      ...db,
      materials: updatedMaterials,
      materialMovements: [...(db.materialMovements || []), newMovement],
      seq: { ...db.seq, mov: nextSeq }
    });
  };

  const handleDeleteStockMovement = (movementId: string) => {
    const movToDelete = (db.materialMovements || []).find(m => m.id === movementId);
    if (!movToDelete) return;

    const updatedMaterials = db.materials.map(m => {
      if (m.id === movToDelete.materialId) {
        if (movToDelete.type === 'reception') {
          return { ...m, received: Math.max(0, m.received - movToDelete.quantity) };
        } else {
          return { ...m, consumed: Math.max(0, m.consumed - movToDelete.quantity) };
        }
      }
      return m;
    });

    const updatedMovements = (db.materialMovements || []).filter(m => m.id !== movementId);

    updateDb({
      ...db,
      materials: updatedMaterials,
      materialMovements: updatedMovements
    });
  };

  // Equipment handlers
  const handleOpenEquipmentModal = (eq?: Equipment) => {
    if (!eq && interceptIfExpired()) return;
    setEditingEquipment(eq || null);
    setEquipmentModalOpen(true);
  };

  const handleSaveEquipment = (eqData: Omit<Equipment, 'id'>, editId?: string) => {
    if (editId) {
      const updated = db.equipment.map(e => (e.id === editId ? { ...eqData, id: editId } : e));
      updateDb({ ...db, equipment: updated });
    } else {
      const nextSeq = (db.seq?.e || 0) + 1;
      const newEq: Equipment = { ...eqData, id: `eq_${nextSeq}` };
      updateDb({
        ...db,
        equipment: [...db.equipment, newEq],
        seq: { ...db.seq, e: nextSeq }
      });
    }
  };

  const handleUpdateEquipmentHours = (equipmentId: string, hours: number) => {
    const updated = db.equipment.map(e => (e.id === equipmentId ? { ...e, hours } : e));
    updateDb({ ...db, equipment: updated });
  };

  const handleUpdateEquipmentFuel = (equipmentId: string, fuel: number) => {
    const updated = db.equipment.map(e => (e.id === equipmentId ? { ...e, fuel } : e));
    updateDb({ ...db, equipment: updated });
  };

  // Maintenance Alerts & Calculations
  const maintenanceAlerts = useMemo(() => {
    const all = getEquipmentMaintenanceAlerts(db.equipment, db.sites);
    return all.filter(a => !dismissedAlertIds.includes(a.id));
  }, [db.equipment, db.sites, dismissedAlertIds]);

  const activeSiteAlerts = useMemo(() => {
    if (!activeSite) return [];
    return maintenanceAlerts.filter(a => a.siteId === activeSite.id);
  }, [maintenanceAlerts, activeSite]);

  // Trigger audio notification chime & toast banner when maintenance alert is active
  useEffect(() => {
    if (maintenanceAlerts.length > 0) {
      const urgent = maintenanceAlerts.find(a => a.severity === 'urgent');
      const alertToShow = urgent || maintenanceAlerts[0];
      if (alertToShow) {
        setActiveToastAlert(alertToShow);
        playMaintenanceChime(alertToShow.severity === 'urgent' ? 'urgent' : 'warning');
      }
    }
  }, [maintenanceAlerts.length]);

  const handleOpenMaintenanceModal = (eq: Equipment) => {
    if (interceptIfExpired()) return;
    setSelectedEquipmentForMaintenance(eq);
    setMaintenanceLogModalOpen(true);
  };

  const handleSaveMaintenance = (
    record: MaintenanceRecord,
    updatedEquipment: Equipment,
    createExpense?: Omit<DailyExpense, 'id'>
  ) => {
    const updatedEquipmentList = db.equipment.map(e =>
      e.id === updatedEquipment.id ? updatedEquipment : e
    );

    let updatedExpenses = db.expenses || [];
    let updatedSeq = { ...db.seq };

    if (createExpense) {
      const nextExpSeq = (db.seq?.exp || 0) + 1;
      const newExpense: DailyExpense = {
        ...createExpense,
        id: `exp_${nextExpSeq}`
      };
      updatedExpenses = [newExpense, ...updatedExpenses];
      updatedSeq.exp = nextExpSeq;
    }

    const nextMaintSeq = (db.seq?.maint || 0) + 1;
    const maintenanceRecords = [
      record,
      ...(db.maintenanceRecords || [])
    ];
    updatedSeq.maint = nextMaintSeq;

    updateDb({
      ...db,
      equipment: updatedEquipmentList,
      maintenanceRecords,
      expenses: updatedExpenses,
      seq: updatedSeq
    });

    // Remove any dismissed state for this machine
    setDismissedAlertIds(prev => prev.filter(id => !id.startsWith(`alert_${updatedEquipment.id}`)));
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => [...prev, alertId]);
  };

  const handleNavigateToEquipment = (equipmentId: string) => {
    const eq = db.equipment.find(e => e.id === equipmentId);
    if (eq && eq.site !== activeSite.id) {
      handleSelectSite(eq.site);
    }
    setCurrentTab('mat');
  };

  // Attendance handlers
  const handleUpdateAttendance = (date: string, records: AttendanceRecord[]) => {
    const siteAtt = { ...(db.attendance[activeSite.id] || {}) };
    siteAtt[date] = records;
    updateDb({
      ...db,
      attendance: {
        ...db.attendance,
        [activeSite.id]: siteAtt
      }
    });
  };

  // Log handlers
  const handleSaveLog = (newLog: SiteLog) => {
    if (interceptIfExpired()) return;
    const filtered = db.logs.filter(l => !(l.site === newLog.site && l.date === newLog.date));
    updateDb({
      ...db,
      logs: [...filtered, newLog]
    });
  };

  // Calculate badge counts
  const lowStockCount = db.materials
    .filter(m => m.site === activeSite?.id)
    .filter(m => (m.minAlert ? m.received - m.consumed <= m.minAlert : m.received - m.consumed <= 0)).length;

  const dueMaintenanceCount = activeSiteAlerts.length;

  if (isPasswordProtected && !isAuthenticated) {
    return <LoginScreen onSuccess={() => {
      sessionStorage.setItem('chantier_auth', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  if (!activeSite) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-6">
          <h1 className="text-xl font-bold mb-2">Chargement de ChantierPro...</h1>
          <button
            onClick={() => updateDb(StorageService.reset())}
            className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-xl"
          >
            Réinitialiser les données
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-900 transition-colors duration-200">
      {/* Update notification banner for all shared applications */}
      <UpdateBanner onOpenUpdateModal={() => setUpdateModalOpen(true)} />

      {/* Header */}
      <Header
        userRole={userRole}
        onChangeRole={setUserRole}
        sites={db.sites}
        activeSiteId={activeSite.id}
        onSelectSite={handleSelectSite}
        onOpenSiteModal={handleOpenSiteModal}
        onOpenBackupModal={() => setBackupModalOpen(true)}
        onOpenCloudModal={() => setCloudSyncModalOpen(true)}
        onOpenInvitationsModal={() => setInvitationsModalOpen(true)}
        onOpenAndroidModal={() => setAndroidModalOpen(true)}
        onOpenLicenseModal={() => setSubscriptionModalOpen(true)}
        onOpenUpdateModal={() => setUpdateModalOpen(true)}
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
        onOpenNotifications={() => setMaintenanceCenterOpen(true)}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        onOpenAiSmartCapture={() => setAiCaptureModalOpen(true)}
        license={db.license}
        alertsCount={maintenanceAlerts.length}
        hasUrgentAlerts={maintenanceAlerts.some(a => a.severity === 'urgent')}
        isOnline={isOnline}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncTime={lastSyncTime}
        firebaseUser={firebaseUser}
      />

      {isExpired && (
        <div 
          className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md z-30 relative animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-200" />
            <span>
              <strong>Mode restreint (30 jours écoulés) :</strong> L'application est désactivée, <strong>seul le module Pointage journalier reste actif</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSubscriptionModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-amber-100 font-bold text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Activer la licence complète (5 500 DA)
          </button>
        </div>
      )}

      {/* Navigation - Visible même après expiration pour permettre l'accès au Pointage */}
      {userRole !== 'CLIENT' && (
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenSearch={() => {
            if (isExpired) {
              setSubscriptionModalOpen(true);
            } else {
              setGlobalSearchOpen(true);
            }
          }}
          badgeCounts={{
            lowStock: lowStockCount,
            dueMaintenance: dueMaintenanceCount
          }}
          isExpired={isExpired}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 mb-20 md:mb-6">
        {userRole === 'CLIENT' ? (
          <ClientDashboardView
            site={activeSite}
            tasks={db.tasks || []}
            currency={db.currency || 'DZD'}
            onUpdateTaskApproval={handleUpdateTaskApproval}
            onOpenClientReport={() => setClientReportModalOpen(true)}
          />
        ) : isExpired && currentTab !== 'dash' ? (
          <TrialExpiredLockScreen
            license={db.license}
            onUpdateLicense={handleUpdateLicense}
            onOpenSubscriptionModal={() => setSubscriptionModalOpen(true)}
            onOpenBackupModal={() => setBackupModalOpen(true)}
            onGoToAttendance={() => setCurrentTab('dash')}
            lockedTabName={
              currentTab === 'tasks' ? 'Tâches' :
              currentTab === 'team' ? 'Personnel & Paie' :
              currentTab === 'caisse' ? 'Caisse & Dépenses' :
              currentTab === 'mat' ? 'Matériaux & Engins' :
              currentTab === 'log' ? 'Journal de Bord' :
              currentTab === 'rep' ? 'Rapports & PV' :
              currentTab === 'ai' ? 'IA & Performance' : 'Ce module'
            }
          />
        ) : (
          <>
            {currentTab === 'dash' && (
          <AttendanceView
            site={activeSite}
            workers={db.workers}
            teams={db.teams}
            attendance={db.attendance}
            advances={db.advances}
            expenses={db.expenses || []}
            onUpdateAttendance={handleUpdateAttendance}
            onOpenWorkerModal={handleOpenWorkerModal}
            onOpenAdvanceModal={handleOpenAdvanceModal}
            onOpenAiSmartCapture={() => {
              if (interceptIfExpired()) return;
              setAiCaptureModalOpen(true);
            }}
            onSelectTab={setCurrentTab}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            site={activeSite}
            tasks={db.tasks || []}
            workers={db.workers}
            onOpenTaskModal={handleOpenTaskModal}
            onOpenClientReport={() => setClientReportModalOpen(true)}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'team' && (
          <WorkersView
            site={activeSite}
            workers={db.workers}
            teams={db.teams}
            advances={db.advances}
            attendance={db.attendance}
            onOpenWorkerModal={handleOpenWorkerModal}
            onOpenAdvanceModal={handleOpenAdvanceModal}
            onBatchAddWorkers={handleBatchAddWorkers}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'caisse' && (
          <ExpensesView
            site={activeSite}
            workers={db.workers}
            expenses={db.expenses || []}
            advances={db.advances || []}
            cashInflows={db.cashInflows || []}
            cashAudits={db.cashAudits || []}
            attendance={db.attendance}
            onOpenExpenseModal={handleOpenExpenseModal}
            onDeleteExpense={handleDeleteExpense}
            onOpenAdvanceModal={handleOpenAdvanceModal}
            onDeleteAdvance={handleDeleteAdvance}
            onOpenInflowModal={handleOpenInflowModal}
            onDeleteInflow={handleDeleteInflow}
            onOpenAuditModal={handleOpenAuditModal}
            onOpenReceiptModal={(worker, advance) => handlePrintAdvanceReceipt(advance, worker)}
            onOpenExpenseReceiptModal={handleOpenExpenseReceiptModal}
            onPrintAdvanceReceipt={handlePrintAdvanceReceipt}
            onOpenAiScanner={() => setCurrentTab('ai')}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'mat' && (
          <MaterialsView
            site={activeSite}
            materials={db.materials}
            equipment={db.equipment}
            materialMovements={db.materialMovements || []}
            onOpenMaterialModal={handleOpenMaterialModal}
            onOpenMovementModal={handleOpenMovementModal}
            onOpenEquipmentModal={handleOpenEquipmentModal}
            onOpenMaintenanceModal={handleOpenMaintenanceModal}
            onUpdateEquipmentHours={handleUpdateEquipmentHours}
            onUpdateEquipmentFuel={handleUpdateEquipmentFuel}
            onDeleteMovement={handleDeleteStockMovement}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'log' && (
          <DailyLogView
            site={activeSite}
            logs={db.logs}
            workers={db.workers}
            attendance={db.attendance}
            expenses={db.expenses || []}
            onSaveLog={handleSaveLog}
            onOpenPV={date => setPrintPVDate(date)}
            onOpenPeriodReport={() => handleOpenPeriodReport()}
            onOpenClientReport={() => setClientReportModalOpen(true)}
            onOpenExpenseModal={handleOpenExpenseModal}
            onDeleteExpense={handleDeleteExpense}
            currency={db.currency || 'DZD'}
            isExpired={LicenseService.getStatus(db?.license).isExpired}
          />
        )}

        {currentTab === 'rep' && (
          <ReportsView
            site={activeSite}
            workers={db.workers}
            teams={db.teams}
            attendance={db.attendance}
            advances={db.advances}
            expenses={db.expenses || []}
            logs={db.logs}
            tasks={db.tasks || []}
            materials={db.materials || []}
            onOpenPV={date => setPrintPVDate(date)}
            onOpenPeriodReport={handleOpenPeriodReport}
            onOpenClientReport={() => setClientReportModalOpen(true)}
            onUpdateAttendance={handleUpdateAttendance}
            currency={db.currency || 'DZD'}
          />
        )}

        {currentTab === 'ai' && (
          <AiPerformanceHub
            db={db}
            activeSite={activeSite}
            onUpdateDb={setDb}
            onSelectTab={setCurrentTab}
            currency={db.currency || 'DZD'}
          />
        )}
          </>
        )}
      </main>

      {/* Android Mobile Floating Action Button (FAB) - Masqué si expiré */}
      {!isExpired && (
        <div className="md:hidden fixed bottom-18 right-4 z-40">
          {mobileFabOpen && (
            <div className="mb-3 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-5 duration-200">
              {/* Quick AI Scan trigger on mobile */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  if(interceptIfExpired()) return; setAiCaptureModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-xl border border-amber-300 ring-2 ring-amber-400/40"
              >
                <span>Scan IA (Caméra / Photos)</span>
                <Camera className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  setCurrentTab('dash');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-amber-400 font-bold text-xs shadow-xl border border-amber-500/40"
              >
                <span>{t('attendance.title', 'Pointage du jour')}</span>
                <ClipboardCheck className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  handleOpenExpenseModal();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-amber-400 font-bold text-xs shadow-xl border border-amber-500/40"
              >
                <span>{t('expenses.addExpense', 'Dépense de Caisse')}</span>
                <Receipt className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  const firstWorker = db.workers.find(w => w.site === activeSite.id && w.active);
                  if (firstWorker) {
                    handleOpenAdvanceModal(firstWorker);
                  } else {
                    handleOpenWorkerModal();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-amber-300 font-bold text-xs shadow-xl border border-amber-500/40"
              >
                <span>{t('attendance.advance', 'Acompte')}</span>
                <HandCoins className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  handleOpenWorkerModal();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-emerald-400 font-bold text-xs shadow-xl border border-emerald-500/40"
              >
                <span>{t('workers.addWorker', '+ Ouvrier')}</span>
                <UserPlus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  handleOpenMaterialModal();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-blue-400 font-bold text-xs shadow-xl border border-blue-500/40"
              >
                <span>{t('materials.addMaterial', '+ Matériau')}</span>
                <Boxes className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  setAndroidModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xl border border-emerald-400/40"
              >
                <span>{t('app.androidInstall', 'App Android')}</span>
                <Smartphone className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setMobileFabOpen(false);
                  setUpdateModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 text-amber-400 font-bold text-xs shadow-xl border border-amber-500/40"
              >
                <span>Mise à jour</span>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            id="btn-mobile-fab"
            onClick={() => {
              triggerHaptic('medium');
              setMobileFabOpen(!mobileFabOpen);
            }}
            className={`h-13 w-13 rounded-full flex items-center justify-center font-black text-white shadow-2xl transition-all transform active:scale-95 cursor-pointer ${
              mobileFabOpen
                ? 'bg-slate-800 rotate-45 border-2 border-slate-700'
                : 'bg-amber-500 text-slate-950 shadow-amber-500/40 hover:bg-amber-400'
            }`}
            title="Actions rapides Android"
          >
            {mobileFabOpen ? <X className="h-6 w-6 text-slate-200" /> : <Plus className="h-7 w-7 text-slate-950" />}
          </button>
        </div>
      )}

      {/* Modals */}
      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onOpenAndroidModal={() => setAndroidModalOpen(true)}
      />

      <AndroidInstallModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => {
          setDeferredPrompt(null);
        }}
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onOpenLicense={() => setSubscriptionModalOpen(true)}
        onOpenUpdateModal={() => {
          setAndroidModalOpen(false);
          setUpdateModalOpen(true);
        }}
      />

      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        license={db.license}
        onUpdateLicense={handleUpdateLicense}
        onOpenPrivacy={() => {
          setSubscriptionModalOpen(false);
          setPrivacyModalOpen(true);
        }}
        onOpenAdminLicenseModal={() => {
          setSubscriptionModalOpen(false);
          setAdminLicenseModalOpen(true);
        }}
      />

      <AdminLicenseModal
        isOpen={adminLicenseModalOpen}
        onClose={() => setAdminLicenseModalOpen(false)}
      />

      <PrivacyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />
      <SiteModal
        isOpen={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        onSave={handleSaveSite}
        editingSite={editingSite}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        editingTask={editingTask}
        siteId={activeSite.id}
        workers={db.workers}
      />

      <WorkerModal
        isOpen={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        onSave={handleSaveWorker}
        editingWorker={editingWorker}
        siteId={activeSite.id}
        teams={db.teams}
        currency={db.currency || 'DZD'}
      />

      <AdvanceModal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        worker={selectedWorkerForAdvance}
        advances={db.advances}
        onAddAdvance={handleAddAdvance}
        onDeleteAdvance={handleDeleteAdvance}
        siteAttendance={db.attendance[activeSite.id]}
        monthPrefix={getTodayDateString().slice(0, 7)}
        currency={db.currency || 'DZD'}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSaveExpense={handleSaveExpense}
        expense={editingExpense}
        site={activeSite}
        defaultDate={expenseDefaultDate}
        currency={db.currency || 'DZD'}
      />

      <CashInflowModal
        isOpen={inflowModalOpen}
        onClose={() => {
          setInflowModalOpen(false);
          setEditingInflow(null);
        }}
        onSave={handleSaveInflow}
        site={activeSite}
        inflow={editingInflow}
        currency={db.currency || 'DZD'}
      />

      <CashAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        onSave={handleSaveAudit}
        site={activeSite}
        theoreticalBalance={
          (db.cashInflows || []).filter(i => i.site === activeSite.id).reduce((sum, i) => sum + (Number(i.amount) || 0), 0) -
          ((db.expenses || []).filter(e => e.site === activeSite.id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
           (db.advances || []).filter(a => a.site === activeSite.id).reduce((sum, a) => sum + (Number(a.amount) || 0), 0))
        }
        currency={db.currency || 'DZD'}
      />

      <AdvanceReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setReceiptAdvance(null);
          setReceiptWorker(null);
        }}
        advance={receiptAdvance}
        worker={receiptWorker}
        site={activeSite}
        currency={db.currency || 'DZD'}
        onUpdateAdvanceSignature={handleUpdateAdvanceSignature}
      />

      <ExpenseReceiptModal
        isOpen={expenseReceiptModalOpen}
        onClose={() => {
          setExpenseReceiptModalOpen(false);
          setSelectedExpenseForReceipt(null);
        }}
        expense={selectedExpenseForReceipt}
        site={activeSite}
        currency={db.currency || 'DZD'}
      />

      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        onSave={handleSaveMaterial}
        editingMaterial={editingMaterial}
        siteId={activeSite.id}
        currency={db.currency || 'DZD'}
      />

      <StockMovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        material={selectedMaterialForMovement}
        type={movementType}
        onConfirm={handleConfirmStockMovement}
      />

      <EquipmentModal
        isOpen={equipmentModalOpen}
        onClose={() => setEquipmentModalOpen(false)}
        onSave={handleSaveEquipment}
        editingEquipment={editingEquipment}
        siteId={activeSite.id}
      />

      <MaintenanceLogModal
        isOpen={maintenanceLogModalOpen}
        onClose={() => {
          setMaintenanceLogModalOpen(false);
          setSelectedEquipmentForMaintenance(null);
        }}
        onSaveMaintenance={handleSaveMaintenance}
        equipment={selectedEquipmentForMaintenance}
        site={activeSite}
        currency={db.currency || 'DZD'}
      />

      <MaintenanceNotificationCenter
        isOpen={maintenanceCenterOpen}
        onClose={() => setMaintenanceCenterOpen(false)}
        alerts={maintenanceAlerts}
        onOpenMaintenanceModal={handleOpenMaintenanceModal}
        onNavigateToEquipment={handleNavigateToEquipment}
        onQuickHoursPrompt={handleOpenEquipmentModal}
        equipmentList={db.equipment}
        sites={db.sites}
        onDismissAlert={handleDismissAlert}
      />

      <MaintenanceToast
        alert={activeToastAlert}
        onClose={() => setActiveToastAlert(null)}
        onOpenMaintenance={equipmentId => {
          const eq = db.equipment.find(e => e.id === equipmentId);
          if (eq) handleOpenMaintenanceModal(eq);
        }}
        onViewEquipment={handleNavigateToEquipment}
      />

      <BackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        db={db}
        onUpdateDb={updateDb}
        onOpenCloudModal={() => setCloudSyncModalOpen(true)}
      />

      <CloudSyncModal
        isOpen={cloudSyncModalOpen}
        onClose={() => setCloudSyncModalOpen(false)}
        db={db}
        onUpdateDb={updateDb}
        syncStatus={cloudSyncStatus}
        lastSyncTime={lastSyncTime}
        isOnline={isOnline}
        onTriggerSync={handleTriggerCloudSync}
        activeSite={activeSite}
      />

      <InvitationsModal
        isOpen={invitationsModalOpen}
        onClose={() => setInvitationsModalOpen(false)}
        db={db}
        onUpdateDb={updateDb}
        activeSite={activeSite}
      />

      <AiSmartCaptureModal
        isOpen={aiCaptureModalOpen}
        onClose={() => setAiCaptureModalOpen(false)}
        db={db}
        activeSite={activeSite}
        onUpdateDb={updateDb}
        currency={db.currency || 'DZD'}
        onSelectTab={setCurrentTab}
      />

      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        db={db}
        activeSiteId={activeSite.id}
        onSelectSite={handleSelectSite}
        onSelectTab={setCurrentTab}
        onOpenWorkerModal={handleOpenWorkerModal}
        onOpenAdvanceModal={handleOpenAdvanceModal}
        onOpenMaterialModal={handleOpenMaterialModal}
        onOpenMovementModal={handleOpenMovementModal}
        onOpenEquipmentModal={handleOpenEquipmentModal}
        onOpenMaintenanceModal={handleOpenMaintenanceModal}
        onOpenExpenseModal={handleOpenExpenseModal}
        currency={db.currency || 'DZD'}
      />

      {printPVDate && (
        <PrintDailyPV
          site={activeSite}
          date={printPVDate}
          attendance={db.attendance[activeSite.id]?.[printPVDate] || []}
          workers={db.workers}
          log={db.logs.find(l => l.site === activeSite.id && l.date === printPVDate)}
          materials={db.materials.filter(m => m.site === activeSite.id)}
          expenses={db.expenses || []}
          advances={db.advances || []}
          currency={db.currency || 'DZD'}
          onClose={() => setPrintPVDate(null)}
        />
      )}

      {periodReportModalOpen && (
        <PeriodReportModal
          isOpen={periodReportModalOpen}
          onClose={() => setPeriodReportModalOpen(false)}
          site={activeSite}
          workers={db.workers}
          attendance={db.attendance}
          expenses={db.expenses || []}
          advances={db.advances || []}
          logs={db.logs || []}
          currency={db.currency || 'DZD'}
          initialStartDate={periodReportDates.start}
          initialEndDate={periodReportDates.end}
        />
      )}

      {clientReportModalOpen && (
        <ClientReportExportModal
          isOpen={clientReportModalOpen}
          onClose={() => setClientReportModalOpen(false)}
          site={activeSite}
          tasks={db.tasks || []}
          logs={db.logs || []}
          materials={db.materials || []}
          currency={db.currency || 'DZD'}
        />
      )}

      {/* Desktop Footer with Privacy Policy and License */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xs py-3.5 px-4 text-center text-xs text-slate-500 dark:text-slate-400 hidden md:block transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">
            © 2026 ChantierPro — Solution Professionnelle BTP & Pointage Chantier
          </span>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setPrivacyModalOpen(true)}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium cursor-pointer"
            >
              Politique de Confidentialité
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSubscriptionModalOpen(true)}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium cursor-pointer"
            >
              Licence Commerciale & Tarifs
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setAndroidModalOpen(true)}
              className="hover:text-amber-600 transition-colors font-medium cursor-pointer flex items-center gap-1 text-slate-700"
            >
              <Smartphone className="h-3.5 w-3.5 text-amber-500" />
              <span>Partager & Lanceur Android</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setAdminLicenseModalOpen(true)}
              className="hover:text-amber-600 text-slate-500 transition-colors font-medium cursor-pointer flex items-center gap-1"
              title="Générateur de clés officiel réservé à Mounir Belaid"
            >
              <Lock className="h-3 w-3 text-amber-500" />
              <span>Générateur Licences</span>
            </button>
            <span>•</span>
            <a
              id="footer-contact-owner"
              href="mailto:belaidmounir24@gmail.com?subject=Contact%20depuis%20l'application&body=Bonjour,%20je%20souhaite%20vous%20contacter%20concernant%20l'application."
              className="hover:text-amber-600 transition-colors font-medium cursor-pointer flex items-center gap-1"
            >
              <Mail className="h-3 w-3 text-amber-500" />
              <span>Contacter le propriétaire</span>
            </a>
            <span>•</span>
            <button
              type="button"
              onClick={() => setUpdateModalOpen(true)}
              className="hover:text-amber-600 text-amber-600 transition-colors font-bold cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Mise à jour</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
