import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Site, Worker, AttendanceRecord, SiteLog, Material, DailyExpense } from '../types';
import { formatCurrency } from '../utils/calculations';

export interface DailyPVReportData {
  site: Site;
  date: string;
  attendance: AttendanceRecord[];
  workers: Worker[];
  log?: SiteLog;
  materials?: Material[];
  expenses?: DailyExpense[];
  currency?: string;
}

export function formatDayDateFr(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates an official Procès-Verbal de Journée (Daily Site Report) in PDF format
 */
export function generateDailyPVPDF(data: DailyPVReportData): jsPDF {
  const {
    site,
    date,
    attendance = [],
    workers = [],
    log,
    materials = [],
    expenses = [],
    currency = 'DZD'
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  const presentCount = attendance.filter(r => r.status === 'P').length;
  const lateCount = attendance.filter(r => r.status === 'R').length;
  const absentCount = attendance.filter(r => r.status === 'A').length;
  const leaveCount = attendance.filter(r => r.status === 'J').length;
  const totalOvertime = attendance.reduce((sum, r) => sum + (Number(r.hSup) || 0), 0);
  const totalAbsenceHours = attendance.reduce((sum, r) => sum + (Number(r.absenceHours) || 0), 0);

  const dayExpenses = expenses.filter(e => e.site === site.id && e.date === date);
  const dayExpensesTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 26, pageWidth, 1.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('PROCÈS-VERBAL DE JOURNÉE & RAPPORT QUOTIDIEN', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Rapport d'activité, effectif et sécurité du chantier`, margin, 18);
  doc.text(`ChantierPro BTP`, pageWidth - margin, 18, { align: 'right' });

  currentY = 34;

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Chantier : ${site.name}`, margin + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Client / Maître d'Ouvrage : ${site.client || 'Non spécifié'}`, margin + 5, currentY + 13);
  doc.text(`Lieu : ${site.address || 'Non spécifié'}`, margin + 5, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`DATE : ${formatDayDateFr(date).toUpperCase()}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Chef de Chantier : ${log?.signedBy || site.supervisor || 'Responsable de site'}`, pageWidth - margin - 5, currentY + 13, { align: 'right' });
  doc.text(`Météo : ${log?.weather || 'Ensoleillé'} (${log?.temp ?? 22}°C) - Arrêt : ${log?.lostHours || 0}h`, pageWidth - margin - 5, currentY + 18, { align: 'right' });

  currentY += 29;

  // KPI Row
  const kpiW = (pageWidth - (margin * 2) - 9) / 4;
  const kpiH = 16;

  // Present
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.text('EFFECTIF PRÉSENT', margin + kpiW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`${presentCount + lateCount} ouvriers`, margin + kpiW / 2, currentY + 12, { align: 'center' });

  // Hours
  const kpi2X = margin + kpiW + 3;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(59, 130, 246);
  doc.roundedRect(kpi2X, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(29, 78, 216);
  doc.text('HEURES SUPP (HS)', kpi2X + kpiW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`+${totalOvertime}h sup`, kpi2X + kpiW / 2, currentY + 12, { align: 'center' });

  // Absences
  const kpi3X = margin + (kpiW + 3) * 2;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(kpi3X, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text('ABSENCES & RETARDS (HA)', kpi3X + kpiW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(totalAbsenceHours > 0 ? `-${totalAbsenceHours}h (${absentCount} abs)` : `${absentCount} abs`, kpi3X + kpiW / 2, currentY + 12, { align: 'center' });

  // Disbursed
  const kpi4X = margin + (kpiW + 3) * 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(kpi4X, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('DÉPENSES DU JOUR', kpi4X + kpiW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(dayExpensesTotal, currency), kpi4X + kpiW / 2, currentY + 12, { align: 'center' });

  currentY += kpiH + 6;

  // Activities & Journal text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TRAVAUX RÉALISÉS & FAITS MARQUANTS DE LA JOURNÉE', margin, currentY);
  currentY += 3;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  const noteText = log?.note?.trim() || 'Travaux exécutés conformément aux prévisions du planning de chantier.';
  const splitNote = doc.splitTextToSize(noteText, pageWidth - (margin * 2) - 8);
  const noteBoxH = Math.max(16, splitNote.length * 4 + 6);

  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), noteBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(splitNote, margin + 4, currentY + 5);

  currentY += noteBoxH + 5;

  // Security & Incidents
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SÉCURITÉ, QUALITÉ & PORT DES EPI', margin, currentY);
  currentY += 3;

  const incidentText = log?.incidents?.trim() || 'R.A.S. Port des EPI obligatoire vérifié à la prise de poste. Aucun accident à signaler.';
  const splitIncident = doc.splitTextToSize(incidentText, pageWidth - (margin * 2) - 8);
  const incidentBoxH = Math.max(12, splitIncident.length * 4 + 6);

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), incidentBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text(splitIncident, margin + 4, currentY + 5);

  currentY += incidentBoxH + 6;

  // Attendance Table
  const activeSiteWorkers = workers.filter(w => w.site === site.id && w.active);
  if (activeSiteWorkers.length > 0 && currentY < pageHeight - 65) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`POINTAGE DES ÉQUIPES (${activeSiteWorkers.length} OUVRIERS)`, margin, currentY);
    currentY += 3;

    const attendRows = activeSiteWorkers.slice(0, 15).map((w, idx) => {
      const rec = attendance.find(r => r.workerId === w.id);
      const status =
        rec?.status === 'P' ? 'Présent' :
        rec?.status === 'R' ? 'Retard' :
        rec?.status === 'J' ? 'Congé/Payé' :
        rec?.status === 'A' ? 'Absent' : 'Non pointé';

      return [
        String(idx + 1),
        w.name,
        w.craft || 'Ouvrier',
        status,
        rec?.hSup ? `+${rec.hSup}h` : '0h',
        rec?.absenceHours ? `-${rec.absenceHours}h` : '0h'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['N°', 'Nom & Prénom', 'Poste / Qualification', 'Statut Pointage', 'Heures Supp.', 'Heures Abs. (HA)']],
      body: attendRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 46, fontStyle: 'bold' },
        2: { cellWidth: 36 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 'auto', halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Signatures
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = margin + 5;
  }

  const sigWidth = (pageWidth - (margin * 2) - 8) / 2;
  const sigH = 22;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, sigWidth, sigH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Le Chef de Chantier', margin + sigWidth / 2, currentY + 5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Visa & Signature', margin + sigWidth / 2, currentY + 18, { align: 'center' });

  const sig2X = margin + sigWidth + 8;
  doc.roundedRect(sig2X, currentY, sigWidth, sigH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Le Maître d\'Ouvrage / Contrôleur', sig2X + sigWidth / 2, currentY + 5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Visa & Accord', sig2X + sigWidth / 2, currentY + 18, { align: 'center' });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ChantierPro — PV Journalier : ${site.name} (${date})`, margin, pageHeight - 4);
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  return doc;
}

export function downloadDailyPVPDF(data: DailyPVReportData, customFilename?: string): string {
  const doc = generateDailyPVPDF(data);
  const cleanSiteName = data.site.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = customFilename || `PV_Journalier_${cleanSiteName}_${data.date}.pdf`;
  doc.save(filename);
  return filename;
}
