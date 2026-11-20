import { Equipment, Site, MaintenanceAlert } from '../types';
import { triggerHaptic } from './android';

/**
 * Calculates detailed maintenance status for a given piece of equipment.
 */
export interface EquipmentMaintenanceStatus {
  equipment: Equipment;
  hoursSinceLastMaint: number;
  hoursRemaining: number;
  thresholdHours: number;
  percentOfCycle: number;
  isOverdueHours: boolean;
  isThresholdReached: boolean;
  daysUntilDeadline?: number;
  isDeadlineOverdue: boolean;
  isDeadlineNear: boolean;
  hasCriticalStatus: boolean;
  severity: 'urgent' | 'warning' | 'info' | 'ok';
  primaryReason?: string;
}

export function calculateMaintenanceStatus(
  equipment: Equipment,
  currentDateStr?: string
): EquipmentMaintenanceStatus {
  const today = currentDateStr ? new Date(currentDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const lastMaint = equipment.lastMaintHours || 0;
  const hoursSinceLastMaint = Math.max(0, equipment.hours - lastMaint);
  const maintFrequency = equipment.maintDue || 250;
  const hoursRemaining = maintFrequency - hoursSinceLastMaint;
  const thresholdHours = equipment.maintThresholdHours ?? 25;
  const percentOfCycle = maintFrequency > 0
    ? Math.min(100, Math.max(0, Math.round((hoursSinceLastMaint / maintFrequency) * 100)))
    : 0;

  const isOverdueHours = hoursRemaining <= 0;
  const isThresholdReached = hoursRemaining > 0 && hoursRemaining <= thresholdHours;

  let daysUntilDeadline: number | undefined;
  let isDeadlineOverdue = false;
  let isDeadlineNear = false;

  if (equipment.nextMaintenanceDate) {
    const deadline = new Date(equipment.nextMaintenanceDate);
    deadline.setHours(0, 0, 0, 0);
    const diffMs = deadline.getTime() - today.getTime();
    daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline < 0) {
      isDeadlineOverdue = true;
    } else if (daysUntilDeadline <= 7) {
      isDeadlineNear = true;
    }
  }

  const hasCriticalStatus = equipment.status === 'en_panne' || equipment.status === 'a_reviser';

  let severity: 'urgent' | 'warning' | 'info' | 'ok' = 'ok';
  let primaryReason: string | undefined;

  if (equipment.status === 'en_panne') {
    severity = 'urgent';
    primaryReason = 'status_en_panne';
  } else if (isOverdueHours) {
    severity = 'urgent';
    primaryReason = 'hours_overdue';
  } else if (isDeadlineOverdue) {
    severity = 'urgent';
    primaryReason = 'deadline_overdue';
  } else if (equipment.status === 'a_reviser') {
    severity = 'warning';
    primaryReason = 'status_a_reviser';
  } else if (isThresholdReached) {
    severity = 'warning';
    primaryReason = 'hours_threshold';
  } else if (isDeadlineNear) {
    severity = 'warning';
    primaryReason = 'deadline_near';
  }

  return {
    equipment,
    hoursSinceLastMaint,
    hoursRemaining,
    thresholdHours,
    percentOfCycle,
    isOverdueHours,
    isThresholdReached,
    daysUntilDeadline,
    isDeadlineOverdue,
    isDeadlineNear,
    hasCriticalStatus,
    severity,
    primaryReason
  };
}

/**
 * Builds list of active maintenance alerts from equipment
 */
export function getEquipmentMaintenanceAlerts(
  equipmentList: Equipment[],
  sites: Site[],
  currentDateStr?: string
): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];

  for (const eq of equipmentList) {
    const status = calculateMaintenanceStatus(eq, currentDateStr);
    if (status.severity === 'ok') continue;

    const site = sites.find(s => s.id === eq.site);
    const siteName = site ? site.name : 'Chantier';

    let type: MaintenanceAlert['type'] = 'hours_threshold';
    let title = '';
    let message = '';

    if (eq.status === 'en_panne') {
      type = 'status_issue';
      title = `Panne signalée : ${eq.name}`;
      message = `L'engin est marqué hors service / en panne. Intervention mécanique requise.`;
    } else if (status.isOverdueHours) {
      type = 'hours_overdue';
      const overdueBy = Math.abs(status.hoursRemaining);
      title = `Vidange / Révision dépassée : ${eq.name}`;
      message = `Compteur à ${eq.hours}h (dépassé de ${overdueBy}h par rapport au cycle de ${eq.maintDue}h).`;
    } else if (status.isDeadlineOverdue) {
      type = 'deadline_overdue';
      const overdueDays = Math.abs(status.daysUntilDeadline || 0);
      title = `Date limite d'entretien dépassée : ${eq.name}`;
      message = `L'échéance du ${eq.nextMaintenanceDate} est dépassée depuis ${overdueDays} jour(s).`;
    } else if (status.isThresholdReached) {
      type = 'hours_threshold';
      title = `Seuil d'entretien atteint : ${eq.name}`;
      message = `Compteur à ${eq.hours}h. Il reste seulement ${status.hoursRemaining}h avant la prochaine révision (${eq.maintDue}h).`;
    } else if (status.isDeadlineNear) {
      type = 'deadline_near';
      const days = status.daysUntilDeadline || 0;
      title = `Échéance d'entretien imminente : ${eq.name}`;
      message = `Date programmée le ${eq.nextMaintenanceDate} (dans ${days === 0 ? "aujourd'hui" : days + ' jour(s)'}).`;
    } else if (eq.status === 'a_reviser') {
      type = 'status_issue';
      title = `Révision requise : ${eq.name}`;
      message = `L'engin a été marqué 'À réviser' par le chef de chantier.`;
    }

    alerts.push({
      id: `alert_${eq.id}_${status.primaryReason || 'maint'}`,
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentBrand: eq.brand,
      siteId: eq.site,
      siteName,
      severity: status.severity,
      type,
      title,
      message,
      hoursRemaining: status.hoursRemaining,
      currentHours: eq.hours,
      maintDue: eq.maintDue,
      nextMaintenanceDate: eq.nextMaintenanceDate,
      daysUntilDeadline: status.daysUntilDeadline,
      timestamp: new Date().toISOString()
    });
  }

  // Sort: urgent first, then warning
  return alerts.sort((a, b) => {
    if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
    if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
    return a.hoursRemaining - b.hoursRemaining;
  });
}

/**
 * Clean Web Audio API chime for maintenance alerts
 */
export function playMaintenanceChime(type: 'warning' | 'urgent' = 'warning') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (type === 'urgent') {
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      osc.frequency.setValueAtTime(440, now + 0.3); // A4
      osc.frequency.setValueAtTime(880, now + 0.45); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    triggerHaptic(type === 'urgent' ? 'error' : 'warning');
  } catch {
    // Graceful fallback if AudioContext blocked by browser policy
  }
}
