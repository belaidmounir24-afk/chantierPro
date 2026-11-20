import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Site, Worker, AttendanceRecord, AttendanceStatus } from '../types';
import { formatCurrency, calculateDailyWorkerPay, HEURES_PAR_JOUR } from '../utils/calculations';

export type WeekFormat = 'mon-sun' | 'sat-fri' | 'sat-thu' | 'mon-sat';

export interface DayInfo {
  date: string; // YYYY-MM-DD
  dayNameShort: string; // Lun, Mar...
  dayNameFull: string; // Lundi, Mardi...
  dayNumber: string; // 05
  monthShort: string; // oct.
  displayLabel: string; // Lun 05/10
}

export interface WeeklyWorkerDayRecord {
  date: string;
  record?: AttendanceRecord;
  status: AttendanceStatus | '—';
  hours: number;
  hSup: number;
  absenceHours: number;
  cost: number;
}

export interface WeeklyWorkerRow {
  worker: Worker;
  daysData: WeeklyWorkerDayRecord[];
  totalHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalAbsenceHours: number;
  totalDaysPresent: number;
  weeklyGross: number;
  hourlyRate: number;
}

export interface WeeklyPlanningData {
  site: Site;
  weekStartDate: string;
  weekEndDate: string;
  weekNumber?: number;
  weekFormat: WeekFormat;
  days: DayInfo[];
  rows: WeeklyWorkerRow[];
  currency: string;
  filterTeam?: string;
  filterCraft?: string;
}

const FRENCH_DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FRENCH_DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FRENCH_MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

/**
 * Calculates the list of DayInfo for a given base date and week format
 */
export function getWeekDates(baseDateStr: string, format: WeekFormat = 'mon-sun'): DayInfo[] {
  let baseDate = new Date();
  try {
    const parts = baseDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  } catch {
    baseDate = new Date();
  }

  const dayOfWeek = baseDate.getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
  const startDay = new Date(baseDate);

  let numDays = 7;
  if (format === 'mon-sun') {
    const diffToMon = (dayOfWeek + 6) % 7;
    startDay.setDate(baseDate.getDate() - diffToMon);
    numDays = 7;
  } else if (format === 'sat-fri') {
    const diffToSat = (dayOfWeek + 1) % 7;
    startDay.setDate(baseDate.getDate() - diffToSat);
    numDays = 7;
  } else if (format === 'sat-thu') {
    const diffToSat = (dayOfWeek + 1) % 7;
    startDay.setDate(baseDate.getDate() - diffToSat);
    numDays = 6;
  } else if (format === 'mon-sat') {
    const diffToMon = (dayOfWeek + 6) % 7;
    startDay.setDate(baseDate.getDate() - diffToMon);
    numDays = 6;
  }

  const days: DayInfo[] = [];
  for (let i = 0; i < numDays; i++) {
    const current = new Date(startDay);
    current.setDate(startDay.getDate() + i);

    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const dow = current.getDay();
    const shortName = FRENCH_DAYS_SHORT[dow];
    const fullName = FRENCH_DAYS_FULL[dow];
    const monthShort = FRENCH_MONTHS_SHORT[current.getMonth()];

    days.push({
      date: dateStr,
      dayNameShort: shortName,
      dayNameFull: fullName,
      dayNumber: d,
      monthShort,
      displayLabel: `${shortName} ${d}/${m}`
    });
  }

  return days;
}

/**
 * Builds the data structure for weekly planning from raw app data
 */
export function buildWeeklyPlanningData(
  site: Site,
  workers: Worker[],
  attendance: Record<string, Record<string, AttendanceRecord[]>>,
  baseDate: string,
  weekFormat: WeekFormat = 'mon-sun',
  currency: string = 'DZD',
  filterTeam?: string,
  filterCraft?: string
): WeeklyPlanningData {
  const days = getWeekDates(baseDate, weekFormat);
  const weekStartDate = days[0]?.date || baseDate;
  const weekEndDate = days[days.length - 1]?.date || baseDate;

  // Filter site workers
  let siteWorkers = workers.filter(w => w.site === site.id && w.active);
  if (filterTeam && filterTeam !== 'all') {
    siteWorkers = siteWorkers.filter(w => w.team === filterTeam);
  }
  if (filterCraft && filterCraft !== 'all') {
    siteWorkers = siteWorkers.filter(w => w.craft === filterCraft);
  }

  const siteAttendance = attendance[site.id] || {};

  const rows: WeeklyWorkerRow[] = siteWorkers.map(worker => {
    const tarifJournalier = Number(worker.rate) || 0;
    const hourlyRate = worker.rateType === 'heure' ? tarifJournalier : tarifJournalier / HEURES_PAR_JOUR;

    let totalHours = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalAbsenceHours = 0;
    let totalDaysPresent = 0;
    let weeklyGross = 0;

    const daysData: WeeklyWorkerDayRecord[] = days.map(day => {
      const recordsForDay = siteAttendance[day.date] || [];
      const record = recordsForDay.find(r => r.workerId === worker.id);

      if (!record) {
        return {
          date: day.date,
          status: '—',
          hours: 0,
          hSup: 0,
          absenceHours: 0,
          cost: 0
        };
      }

      const payCalc = calculateDailyWorkerPay(worker, record);
      totalHours += payCalc.effectiveHours;
      totalRegularHours += payCalc.regularHours;
      totalOvertimeHours += payCalc.hSup;
      totalAbsenceHours += payCalc.absenceHours;
      weeklyGross += payCalc.gross;

      if (record.status === 'P' || record.status === 'R' || record.status === 'J') {
        totalDaysPresent += 1;
      }

      return {
        date: day.date,
        record,
        status: record.status,
        hours: payCalc.effectiveHours,
        hSup: payCalc.hSup,
        absenceHours: payCalc.absenceHours,
        cost: payCalc.gross
      };
    });

    return {
      worker,
      daysData,
      totalHours,
      totalRegularHours,
      totalOvertimeHours,
      totalAbsenceHours,
      totalDaysPresent,
      weeklyGross,
      hourlyRate
    };
  });

  return {
    site,
    weekStartDate,
    weekEndDate,
    weekFormat,
    days,
    rows,
    currency,
    filterTeam,
    filterCraft
  };
}

/**
 * Generates an official Weekly Workers Schedule & Attendance PDF in A4 Landscape format
 */
export function generateWeeklyPlanningPDF(data: WeeklyPlanningData): jsPDF {
  const {
    site,
    weekStartDate,
    weekEndDate,
    days,
    rows,
    currency,
    filterTeam,
    filterCraft
  } = data;

  // A4 Landscape: 297mm width, 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const margin = 12;
  let currentY = margin;

  // Aggregate weekly metrics
  const totalWorkers = rows.length;
  const totalWeeklyHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const totalWeeklyOvertime = rows.reduce((s, r) => s + r.totalOvertimeHours, 0);
  const totalWeeklyGross = rows.reduce((s, r) => s + r.weeklyGross, 0);

  const formatDateFr = (d: string) => {
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch {
      return d;
    }
  };

  // 1. TOP HEADER BANNER (Slate-900 with Amber accent line)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 23, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 accent stripe
  doc.rect(0, 23, pageWidth, 1.8, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('CHANTIERPRO — PLANNING HEBDOMADAIRE & POINTAGE DU PERSONNEL', margin, 11);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Feuille de présence hebdomadaire, heures réelles et coûts salariaux au prorata (base 8h/j)', margin, 18);

  // Top right badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('DOCUMENT OFFICIEL BTP', pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const nowStr = `${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Édité le : ${nowStr}`, pageWidth - margin, 18, { align: 'right' });

  currentY = 29;

  // 2. METADATA & FILTER CARD (Rounded box)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 19, 2, 2, 'FD');

  // Left col: Site & Client
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Chantier : ${site.name}`, margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Client / M.O. : ${site.client || 'Non spécifié'}   |   Lieu : ${site.address || 'Non spécifié'}`, margin + 4, currentY + 11);
  doc.text(`Responsable : ${site.supervisor || 'Chef de chantier'}   |   Filtres : ${filterTeam ? `Équipe: ${filterTeam}` : 'Toutes équipes'} ${filterCraft ? `· Métier: ${filterCraft}` : ''}`, margin + 4, currentY + 16);

  // Right col: Week range
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`SEMAINE DU ${formatDateFr(weekStartDate)} AU ${formatDateFr(weekEndDate)}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Statut chantier : ${site.status === 'en_cours' ? 'En cours d\'exécution' : site.status === 'termine' ? 'Terminé' : 'En pause'}`, pageWidth - margin - 4, currentY + 12, { align: 'right' });
  doc.text(`Règle : Prorata réel (Tarif Journalier ÷ 8h × Heures réelles)`, pageWidth - margin - 4, currentY + 16.5, { align: 'right' });

  currentY += 23;

  // 3. EXECUTIVE KPI METRICS (4 Mini Cards)
  const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
  const cards = [
    {
      title: 'EFFECTIF PLANIFIÉ',
      val1: `${totalWorkers} ouvriers`,
      val2: `${site.supervisor || 'Personnel actif'}`,
      bg: [238, 242, 255], // indigo-50
      border: [199, 210, 254],
      text: [49, 46, 129]
    },
    {
      title: 'HEURES TOTALES',
      val1: `${totalWeeklyHours} heures`,
      val2: `Moyenne : ${totalWorkers > 0 ? Math.round(totalWeeklyHours / totalWorkers) : 0}h / ouvrier`,
      bg: [239, 246, 255], // blue-50
      border: [191, 219, 254],
      text: [30, 58, 138]
    },
    {
      title: 'HEURES SUPPLÉMENTAIRES',
      val1: `+${totalWeeklyOvertime} heures HS`,
      val2: totalWeeklyOvertime > 0 ? 'Surcroît d\'activité' : 'Aucune heure sup',
      bg: [254, 243, 199], // amber-100
      border: [251, 191, 36],
      text: [120, 53, 15]
    },
    {
      title: 'ESTIMATION SALAIRES HEBDO',
      val1: formatCurrency(totalWeeklyGross, currency),
      val2: 'Prorata strict des heures',
      bg: [236, 253, 245], // emerald-50
      border: [167, 243, 208],
      text: [6, 78, 59]
    }
  ];

  cards.forEach((c, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
    doc.roundedRect(cardX, currentY, cardWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(c.text[0], c.text[1], c.text[2]);
    doc.text(c.title, cardX + 3, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val1, cardX + 3, currentY + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(c.val2, cardX + 3, currentY + 12);
  });

  currentY += 17.5;

  // 4. MAIN AUTOTABLE: WEEKLY PLANNING MATRIX
  // Prepare Table Columns & Data
  const headDays = days.map(d => `${d.dayNameShort.toUpperCase()}\n${d.dayNumber}/${d.date.slice(5, 7)}`);

  const head = [[
    'N°',
    'Ouvrier',
    'Métier',
    'Équipe',
    `Taux (${currency})`,
    ...headDays,
    'H. Tot.',
    'HS',
    `Brut (${currency})`
  ]];

  // Daily totals collectors for footer
  const dailyPresents = days.map(d => {
    return rows.filter(r => {
      const dayData = r.daysData.find(dd => dd.date === d.date);
      return dayData && (dayData.status === 'P' || dayData.status === 'R' || dayData.status === 'J');
    }).length;
  });

  const dailyHours = days.map(d => {
    return rows.reduce((s, r) => {
      const dayData = r.daysData.find(dd => dd.date === d.date);
      return s + (dayData ? dayData.hours : 0);
    }, 0);
  });

  const body = rows.map((r, idx) => {
    const daysCells = r.daysData.map(dd => {
      if (dd.status === '—') return '—';
      if (dd.status === 'P') {
        if (dd.hSup > 0) return `P (${dd.hours}h)\n+${dd.hSup}HS`;
        if (dd.absenceHours > 0) return `P (${dd.hours}h)\n-${dd.absenceHours}h`;
        return `P (8h)`;
      }
      if (dd.status === 'R') {
        return `R (${dd.hours}h)\n-${dd.absenceHours}h`;
      }
      if (dd.status === 'J') {
        return `C (8h)`;
      }
      if (dd.status === 'A') {
        if (dd.hours > 0) return `A (${dd.hours}h)`;
        return `ABS`;
      }
      return dd.status;
    });

    const rateStr = `${r.worker.rate}/${r.worker.rateType === 'heure' ? 'h' : 'j'}`;

    return [
      String(idx + 1),
      `${r.worker.name}\n${r.worker.phone || ''}`,
      r.worker.craft,
      r.worker.team || '—',
      rateStr,
      ...daysCells,
      `${r.totalHours}h`,
      r.totalOvertimeHours > 0 ? `+${r.totalOvertimeHours}h` : '0h',
      formatCurrency(r.weeklyGross, currency)
    ];
  });

  const foot = [[
    '',
    'TOTAUX EFFECTIFS / HEURES',
    `${rows.length} ouvriers`,
    '',
    '',
    ...days.map((_, i) => `${dailyPresents[i]} P\n${dailyHours[i]}h`),
    `${totalWeeklyHours}h`,
    `+${totalWeeklyOvertime}h`,
    formatCurrency(totalWeeklyGross, currency)
  ]];

  // Column width calculations for landscape
  const dayColWidth = days.length === 6 ? 19 : 16.5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head,
    body,
    foot,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      cellPadding: 1.5,
      lineColor: [226, 232, 240]
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32, fontStyle: 'bold', halign: 'left' },
      2: { cellWidth: 22, halign: 'left' },
      3: { cellWidth: 20, halign: 'left' },
      4: { cellWidth: 15, halign: 'center' },
      // Dynamic day columns
      5: { cellWidth: dayColWidth, halign: 'center' },
      6: { cellWidth: dayColWidth, halign: 'center' },
      7: { cellWidth: dayColWidth, halign: 'center' },
      8: { cellWidth: dayColWidth, halign: 'center' },
      9: { cellWidth: dayColWidth, halign: 'center' },
      10: { cellWidth: dayColWidth, halign: 'center' },
      ...(days.length === 7 ? { 11: { cellWidth: dayColWidth, halign: 'center' } } : {}),
      [days.length + 5]: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      [days.length + 6]: { cellWidth: 12, halign: 'center', textColor: [37, 99, 235], fontStyle: 'bold' },
      [days.length + 7]: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    didDrawCell: (hookData) => {
      // Custom coloring for status cells
      if (hookData.section === 'body' && hookData.column.index >= 5 && hookData.column.index < 5 + days.length) {
        const text = String(hookData.cell.raw || '');
        if (text.startsWith('P')) {
          doc.setFillColor(236, 253, 245); // emerald-50
          doc.setTextColor(4, 120, 87); // emerald-700
        } else if (text.startsWith('R')) {
          doc.setFillColor(254, 243, 199); // amber-100
          doc.setTextColor(180, 83, 9); // amber-700
        } else if (text.startsWith('C')) {
          doc.setFillColor(243, 232, 255); // purple-100
          doc.setTextColor(109, 40, 217); // purple-700
        } else if (text.startsWith('ABS') || text.startsWith('A')) {
          doc.setFillColor(255, 241, 242); // rose-50
          doc.setTextColor(190, 18, 60); // rose-700
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 5. SIGNATURE & VALIDATION BLOCK
  // Ensure signature box fits on page, else add page
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = margin + 5;
  }

  const sigWidth = (pageWidth - (margin * 2) - 12) / 3;
  const sigHeight = 22;

  const signatures = [
    { title: 'Le Chef d\'Équipe / Pointeur', subtitle: 'Visa des pointages & heures réelles' },
    { title: 'Le Conducteur de Travaux', subtitle: 'Vérification & conformité planning' },
    { title: 'Le Maître d\'Ouvrage / Contrôle', subtitle: 'Visa & approbation hebdomadaire' }
  ];

  signatures.forEach((sig, i) => {
    const sigX = margin + i * (sigWidth + 6);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sigX, currentY, sigWidth, sigHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sig.title, sigX + sigWidth / 2, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(sig.subtitle, sigX + sigWidth / 2, currentY + 9, { align: 'center' });

    // Dotted line for signature
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(sigX + 8, currentY + 17, sigX + sigWidth - 8, currentY + 17);
    doc.setLineDashPattern([], 0);
  });

  // 6. PAGE FOOTERS
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 7, pageWidth - margin, pageHeight - 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ChantierPro — Planning Hebdomadaire : ${site.name} (Semaine du ${formatDateFr(weekStartDate)} au ${formatDateFr(weekEndDate)})`, margin, pageHeight - 3.5);
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 3.5, { align: 'right' });
  }

  return doc;
}

/**
 * Direct file download trigger for Weekly Planning PDF
 */
export function downloadWeeklyPlanningPDF(data: WeeklyPlanningData, customFilename?: string): string {
  const doc = generateWeeklyPlanningPDF(data);
  const cleanSiteName = data.site.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = customFilename || `Planning_Hebdo_${cleanSiteName}_${data.weekStartDate}_${data.weekEndDate}.pdf`;
  doc.save(filename);
  return filename;
}
