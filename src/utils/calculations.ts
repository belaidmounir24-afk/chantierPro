import { Worker, Site, AttendanceRecord, Advance, Material, SiteLog } from '../types';

export function formatCurrency(amount: number, currency: string = 'DZD'): string {
  const formatted = new Intl.NumberFormat('fr-DZ', {
    maximumFractionDigits: 0
  }).format(Math.round(amount || 0));
  return `${formatted} ${currency}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num || 0);
}

// ✅ CORRECTION (Calcul au prorata des heures basées sur une journée de 8h)
export const HEURES_PAR_JOUR = 8;

export function getMonthWorkedStats(
  siteAttendance: Record<string, AttendanceRecord[]> | undefined,
  workerId: string,
  monthPrefix: string
): {
  regularDays: number;
  hoursRegular: number;
  hoursOvertime: number;
  hoursAbsence: number;
  effectiveHours: number;
  totalHours: number;
  paidLeaveDays: number;
  absenceDays: number;
  lateDays: number;
  effectiveDays: number;
} {
  let regularDays = 0;
  let paidLeaveDays = 0;
  let lateDays = 0;
  let absenceDays = 0;
  let hoursOvertime = 0;
  let hoursAbsence = 0;
  let hoursRegular = 0;

  if (!siteAttendance) {
    return {
      regularDays: 0,
      hoursRegular: 0,
      hoursOvertime: 0,
      hoursAbsence: 0,
      effectiveHours: 0,
      totalHours: 0,
      paidLeaveDays: 0,
      absenceDays: 0,
      lateDays: 0,
      effectiveDays: 0
    };
  }

  Object.entries(siteAttendance).forEach(([date, rows]) => {
    if (date.startsWith(monthPrefix)) {
      const record = rows.find(r => r.workerId === workerId);
      if (record) {
        const hSup = Number(record.hSup) || 0;
        const absence = Number(record.absenceHours) || 0;

        if (record.status === 'P') {
          regularDays += 1;
          hoursOvertime += hSup;
          hoursAbsence += absence;
          const normalWorked = Math.max(0, HEURES_PAR_JOUR - absence);
          hoursRegular += normalWorked;
        } else if (record.status === 'R') {
          lateDays += 1;
          regularDays += 1; // Présent avec retard
          const effectiveAbsence = absence > 0 ? absence : 1;
          hoursAbsence += effectiveAbsence;
          hoursOvertime += hSup;
          const normalWorked = Math.max(0, HEURES_PAR_JOUR - effectiveAbsence);
          hoursRegular += normalWorked;
        } else if (record.status === 'J') {
          paidLeaveDays += 1;
          regularDays += 1;
          hoursRegular += HEURES_PAR_JOUR;
          hoursOvertime += hSup;
        } else if (record.status === 'A') {
          if (absence > 0 && absence < HEURES_PAR_JOUR) {
            // Absence partielle (demi-journée ou quelques heures travaillées)
            const normalWorked = Math.max(0, HEURES_PAR_JOUR - absence);
            hoursRegular += normalWorked;
            hoursAbsence += absence;
            hoursOvertime += hSup;
            regularDays += Math.round((normalWorked / HEURES_PAR_JOUR) * 10) / 10;
          } else {
            absenceDays += 1;
            hoursAbsence += absence > 0 ? absence : HEURES_PAR_JOUR;
            hoursOvertime += hSup;
          }
        }
      }
    }
  });

  // Total des heures réelles travaillées (heures normales effectives + heures supplémentaires)
  const effectiveHours = Math.max(0, hoursRegular + hoursOvertime);
  const totalHours = effectiveHours;
  const effectiveDays = Math.round((effectiveHours / HEURES_PAR_JOUR) * 10) / 10;

  return {
    regularDays,
    lateDays,
    paidLeaveDays,
    absenceDays,
    hoursRegular,
    hoursOvertime,
    hoursAbsence,
    effectiveHours,
    totalHours,
    effectiveDays
  };
}

export function getAdvancesTotal(advances: Advance[], siteId: string, workerId: string, monthPrefix?: string): number {
  return advances
    .filter(a => a.site === siteId && a.workerId === workerId && (!monthPrefix || a.date.startsWith(monthPrefix)))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
}

export function getPeriodWorkedStats(
  siteAttendance: Record<string, AttendanceRecord[]> | undefined,
  workerId: string,
  startDate: string,
  endDate: string
): {
  regularDays: number;
  hoursRegular: number;
  hoursOvertime: number;
  hoursAbsence: number;
  effectiveHours: number;
  totalHours: number;
  paidLeaveDays: number;
  absenceDays: number;
  lateDays: number;
  effectiveDays: number;
} {
  let regularDays = 0;
  let paidLeaveDays = 0;
  let lateDays = 0;
  let absenceDays = 0;
  let hoursOvertime = 0;
  let hoursAbsence = 0;
  let hoursRegular = 0;

  if (!siteAttendance) {
    return {
      regularDays: 0,
      hoursRegular: 0,
      hoursOvertime: 0,
      hoursAbsence: 0,
      effectiveHours: 0,
      totalHours: 0,
      paidLeaveDays: 0,
      absenceDays: 0,
      lateDays: 0,
      effectiveDays: 0
    };
  }

  Object.entries(siteAttendance).forEach(([date, rows]) => {
    if (date >= startDate && date <= endDate) {
      const record = rows.find(r => r.workerId === workerId);
      if (record) {
        const hSup = Number(record.hSup) || 0;
        const absence = Number(record.absenceHours) || 0;

        if (record.status === 'P') {
          regularDays += 1;
          hoursOvertime += hSup;
          hoursAbsence += absence;
          const normalWorked = Math.max(0, HEURES_PAR_JOUR - absence);
          hoursRegular += normalWorked;
        } else if (record.status === 'R') {
          lateDays += 1;
          regularDays += 1;
          const effectiveAbsence = absence > 0 ? absence : 1;
          hoursAbsence += effectiveAbsence;
          hoursOvertime += hSup;
          const normalWorked = Math.max(0, HEURES_PAR_JOUR - effectiveAbsence);
          hoursRegular += normalWorked;
        } else if (record.status === 'J') {
          paidLeaveDays += 1;
          regularDays += 1;
          hoursRegular += HEURES_PAR_JOUR;
          hoursOvertime += hSup;
        } else if (record.status === 'A') {
          if (absence > 0 && absence < HEURES_PAR_JOUR) {
            const normalWorked = Math.max(0, HEURES_PAR_JOUR - absence);
            hoursRegular += normalWorked;
            hoursAbsence += absence;
            hoursOvertime += hSup;
            regularDays += Math.round((normalWorked / HEURES_PAR_JOUR) * 10) / 10;
          } else {
            absenceDays += 1;
            hoursAbsence += absence > 0 ? absence : HEURES_PAR_JOUR;
            hoursOvertime += hSup;
          }
        }
      }
    }
  });

  const effectiveHours = Math.max(0, hoursRegular + hoursOvertime);
  const totalHours = effectiveHours;
  const effectiveDays = Math.round((effectiveHours / HEURES_PAR_JOUR) * 10) / 10;

  return {
    regularDays,
    lateDays,
    paidLeaveDays,
    absenceDays,
    hoursRegular,
    hoursOvertime,
    hoursAbsence,
    effectiveHours,
    totalHours,
    effectiveDays
  };
}

export function calculateWorkerPeriodNet(
  worker: Worker,
  siteAttendance: Record<string, AttendanceRecord[]> | undefined,
  advances: Advance[],
  startDate: string,
  endDate: string
) {
  const stats = getPeriodWorkedStats(siteAttendance, worker.id, startDate, endDate);
  
  // ✅ CORRECTION (Calcul au prorata des heures basées sur une journée de 8h)
  const tarifJournalier = Number(worker.rate) || 0;
  const tarifHoraire = worker.rateType === 'heure' ? tarifJournalier : tarifJournalier / HEURES_PAR_JOUR;
  const totalHeures = stats.effectiveHours;
  const montantTotal = Math.max(0, Math.round(totalHeures * tarifHoraire));
  const absenceDeduction = Math.round(stats.hoursAbsence * tarifHoraire);

  const advancesTotal = advances
    .filter(a => a.site === worker.site && a.workerId === worker.id && a.date >= startDate && a.date <= endDate)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const net = montantTotal - advancesTotal;
  const advPercentage = montantTotal > 0 ? (advancesTotal / montantTotal) * 100 : 0;

  return {
    stats,
    gross: montantTotal,
    absenceDeduction,
    advancesTotal,
    net,
    advPercentage,
    hourlyRate: tarifHoraire,
    totalHeures
  };
}

export function calculateWorkerNet(
  worker: Worker,
  siteAttendance: Record<string, AttendanceRecord[]> | undefined,
  advances: Advance[],
  monthPrefix: string
) {
  const stats = getMonthWorkedStats(siteAttendance, worker.id, monthPrefix);
  
  // ✅ CORRECTION (Calcul au prorata des heures basées sur une journée de 8h)
  const tarifJournalier = Number(worker.rate) || 0;
  const tarifHoraire = worker.rateType === 'heure' ? tarifJournalier : tarifJournalier / HEURES_PAR_JOUR;
  const totalHeures = stats.effectiveHours;
  const montantTotal = Math.max(0, Math.round(totalHeures * tarifHoraire));
  const absenceDeduction = Math.round(stats.hoursAbsence * tarifHoraire);

  const advancesTotal = getAdvancesTotal(advances, worker.site, worker.id, monthPrefix);
  const net = montantTotal - advancesTotal;
  const advPercentage = montantTotal > 0 ? (advancesTotal / montantTotal) * 100 : 0;

  return {
    stats,
    gross: montantTotal,
    absenceDeduction,
    advancesTotal,
    net,
    advPercentage,
    hourlyRate: tarifHoraire,
    totalHeures
  };
}

export function calculateDailyWorkerPay(worker: Worker, record?: AttendanceRecord): {
  status: string;
  regularHours: number;
  hSup: number;
  absenceHours: number;
  effectiveHours: number;
  hourlyRate: number;
  gross: number;
  absenceDeduction: number;
  totalHeures: number;
} {
  const status = record?.status || 'A';
  const hSup = Number(record?.hSup) || 0;
  const absenceHours = Number(record?.absenceHours) || 0;

  // ✅ CORRECTION (Calcul au prorata des heures basées sur une journée de 8h)
  const tarifJournalier = Number(worker.rate) || 0;
  const tarifHoraire = worker.rateType === 'heure' ? tarifJournalier : tarifJournalier / HEURES_PAR_JOUR;

  if (status === 'A') {
    if (absenceHours > 0 && absenceHours < HEURES_PAR_JOUR) {
      const normalHours = Math.max(0, HEURES_PAR_JOUR - absenceHours);
      const totalHeures = normalHours + hSup;
      const montantTotal = Math.round(totalHeures * tarifHoraire);
      const absenceDeduction = Math.round(absenceHours * tarifHoraire);
      return {
        status,
        regularHours: normalHours,
        hSup,
        absenceHours,
        effectiveHours: totalHeures,
        totalHeures,
        hourlyRate: tarifHoraire,
        gross: montantTotal,
        absenceDeduction
      };
    }
    const totalHeures = hSup;
    const montantTotal = Math.round(totalHeures * tarifHoraire);
    const absenceDeduction = Math.round(HEURES_PAR_JOUR * tarifHoraire);
    return {
      status,
      regularHours: 0,
      hSup,
      absenceHours: absenceHours > 0 ? absenceHours : HEURES_PAR_JOUR,
      effectiveHours: totalHeures,
      totalHeures,
      hourlyRate: tarifHoraire,
      gross: montantTotal,
      absenceDeduction
    };
  }

  if (status === 'J') {
    const totalHeures = HEURES_PAR_JOUR + hSup;
    const montantTotal = Math.round(totalHeures * tarifHoraire);
    return {
      status,
      regularHours: HEURES_PAR_JOUR,
      hSup,
      absenceHours: 0,
      effectiveHours: totalHeures,
      totalHeures,
      hourlyRate: tarifHoraire,
      gross: montantTotal,
      absenceDeduction: 0
    };
  }

  // Statut P (Présent) ou R (Retard)
  // Prorata réel des heures travaillées sur la base de 8h
  const effectiveAbsence = status === 'R' && absenceHours === 0 ? 1 : absenceHours;
  const normalHours = Math.max(0, HEURES_PAR_JOUR - effectiveAbsence);
  const totalHeures = normalHours + hSup;
  const montantTotal = Math.round(totalHeures * tarifHoraire);
  const absenceDeduction = Math.round(effectiveAbsence * tarifHoraire);

  return {
    status,
    regularHours: normalHours,
    hSup,
    absenceHours: effectiveAbsence,
    effectiveHours: totalHeures,
    totalHeures,
    hourlyRate: tarifHoraire,
    gross: montantTotal,
    absenceDeduction
  };
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPayrollCSV(
  site: Site,
  workers: Worker[],
  siteAttendance: Record<string, AttendanceRecord[]> | undefined,
  advances: Advance[],
  monthPrefix: string
) {
  let csv = `BORDEREAU DE PAIE CHANTIER - ${site.name}\n`;
  csv += `Période: ${monthPrefix};Client: ${site.client};Devise: ${site.currency || 'DZD'}\n\n`;
  csv += `ID Ouvrier;Nom & Prénom;Corps d'état;Équipe;Téléphone;Taux (${site.currency || 'DZD'});Jours Présent;Heures Normales;Heures Supp;Heures Abs./Retard;Heures Effectives;Déduction Absence;Salaire Brut;Total Acomptes;Net à Payer\n`;

  let totalGross = 0;
  let totalAdvances = 0;
  let totalNet = 0;
  let totalOvertime = 0;
  let totalAbsenceHours = 0;

  workers.forEach(w => {
    const calc = calculateWorkerNet(w, siteAttendance, advances, monthPrefix);
    totalGross += calc.gross;
    totalAdvances += calc.advancesTotal;
    totalNet += calc.net;
    totalOvertime += calc.stats.hoursOvertime;
    totalAbsenceHours += calc.stats.hoursAbsence;

    csv += `"${w.id}";"${w.name}";"${w.craft}";"${w.team}";"${w.phone || ''}";"${w.rate}";"${calc.stats.regularDays}";"${calc.stats.hoursRegular}";"${calc.stats.hoursOvertime}";"${calc.stats.hoursAbsence}";"${calc.stats.effectiveHours}";"${calc.absenceDeduction}";"${calc.gross}";"${calc.advancesTotal}";"${calc.net}"\n`;
  });

  csv += `\n;;;;TOTAL GÉNÉRAL;;;;;"${totalOvertime}h";"${totalAbsenceHours}h";;"${totalGross}";"${totalAdvances}";"${totalNet}"\n`;

  downloadFile(`ChantierPro_Paie_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthPrefix}.csv`, csv, 'text/csv');
}

export function exportMaterialsCSV(site: Site, materials: Material[]) {
  let csv = `ÉTAT DES STOCKS MATÉRIAUX - ${site.name}\n`;
  csv += `Date d'extraction: ${new Date().toLocaleDateString('fr-FR')};Devise: ${site.currency || 'DZD'}\n\n`;
  csv += `Matériau;Catégorie;Unité;Stock Initial;Total Réceptionné;Total Consommé;Stock Actuel Restant;Alerte Min;Statut Stock\n`;

  materials.forEach(m => {
    const remaining = m.received - m.consumed;
    const isLow = m.minAlert ? remaining <= m.minAlert : remaining <= 0;
    csv += `"${m.name}";"${m.category || 'Général'}";"${m.unit}";"${m.initStock}";"${m.received}";"${m.consumed}";"${remaining}";"${m.minAlert || '-'}";"${isLow ? 'ALERTE STOCK BAS' : 'NORMAL'}"\n`;
  });

  downloadFile(`ChantierPro_Stocks_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
}
