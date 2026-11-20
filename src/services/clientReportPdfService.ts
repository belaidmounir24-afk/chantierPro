import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Site, Task, SiteLog, Material } from '../types';

export interface ClientProgressReportData {
  site: Site;
  startDate: string;
  endDate: string;
  tasks?: Task[];
  logs?: SiteLog[];
  materials?: Material[];
  recipientName?: string;
  notesForClient?: string;
  currency?: string;
  includeSections?: {
    summary: boolean;
    tasks: boolean;
    logs: boolean;
    materials: boolean;
    signatures: boolean;
  };
}

export function formatDateFr(dateStr: string): string {
  try {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generates a clean, professional PDF progress report for clients / project owners (Maître d'ouvrage).
 * Formatted in standard A4 portrait using jsPDF and jspdf-autotable.
 */
export function generateClientProgressReportPDF(data: ClientProgressReportData): jsPDF {
  const {
    site,
    startDate,
    endDate,
    tasks = [],
    logs = [],
    materials = [],
    recipientName = site.client || 'Maître d\'Ouvrage',
    notesForClient = '',
    includeSections = {
      summary: true,
      tasks: true,
      logs: true,
      materials: false,
      signatures: true
    }
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

  // Filter tasks & logs for this site and period
  const siteTasks = tasks.filter(t => t.siteId === site.id);
  const periodLogs = logs
    .filter(l => l.site === site.id && l.date >= startDate && l.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute Task KPIs
  const totalTasks = siteTasks.length;
  const completedTasks = siteTasks.filter(t => t.status === 'COMPLETEE').length;
  const inProgressTasks = siteTasks.filter(t => t.status === 'EN_COURS').length;
  const plannedTasks = siteTasks.filter(t => t.status === 'PLANIFIEE' || t.status === 'EN_ATTENTE').length;
  const overallProgress = totalTasks > 0
    ? Math.round(siteTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
    : 0;

  const approvedByClientTasks = siteTasks.filter(t => t.clientApproval === 'APPROVED').length;

  // Header Banner - Professional Dark Slate with Amber Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 line
  doc.rect(0, 28, pageWidth, 2, 'F');

  // App & Document Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('RAPPORT D\'AVANCEMENT DE CHANTIER', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Document officiel de suivi des travaux · Destiné au Maître d'Ouvrage / Client`, margin, 19);

  const nowFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(`Édité le : ${nowFormatted}`, pageWidth - margin, 19, { align: 'right' });

  currentY = 36;

  // Metadata Card (Site & Client Details)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

  // Left Column
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Chantier : ${site.name}`, margin + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Destinataire / Client : ${recipientName}`, margin + 5, currentY + 13);
  doc.text(`Localisation : ${site.address || 'Non renseignée'}`, margin + 5, currentY + 19);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`PÉRIODE COUVERTE : DU ${formatDateFr(startDate)} AU ${formatDateFr(endDate)}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Chef de chantier / Superviseur : ${site.supervisor || 'Responsable de site'}`, pageWidth - margin - 5, currentY + 13, { align: 'right' });
  doc.text(`Statut général : ${site.status === 'termine' ? 'Travaux terminés' : site.status === 'en_pause' ? 'En attente / Pause' : 'En cours d\'exécution'}`, pageWidth - margin - 5, currentY + 19, { align: 'right' });

  currentY += 31;

  // Custom Chef de Chantier Note for Client (if provided)
  if (notesForClient && notesForClient.trim().length > 0) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    
    // Calculate text height
    const splitNote = doc.splitTextToSize(`Message du Chef de Chantier au Client :\n"${notesForClient.trim()}"`, pageWidth - (margin * 2) - 10);
    const noteHeight = Math.max(14, splitNote.length * 4.2 + 6);

    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), noteHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15); // amber-900
    doc.text(splitNote, margin + 5, currentY + 5.5);

    currentY += noteHeight + 6;
  }

  // Section: Executive Summary & KPI Cards
  if (includeSections.summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. SYNTHÈSE GLOBALE DE L\'AVANCEMENT DES TRAVAUX', margin, currentY);
    currentY += 4;

    const colWidth = (pageWidth - (margin * 2) - 9) / 4;
    const boxHeight = 22;

    // Card 1: Overall Progress %
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.roundedRect(margin, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text('AVANCEMENT GLOBAL', margin + colWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${overallProgress}%`, margin + colWidth / 2, currentY + 13, { align: 'center' });
    
    // Mini visual progress bar inside Card 1
    const barW = colWidth - 8;
    const barX = margin + 4;
    const barY = currentY + 16;
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(barX, barY, barW, 2.5, 1, 1, 'F');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(barX, barY, (barW * Math.min(overallProgress, 100)) / 100, 2.5, 1, 1, 'F');

    // Card 2: Completed Tasks
    const col2X = margin + colWidth + 3;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(59, 130, 246); // blue-500
    doc.roundedRect(col2X, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(29, 78, 216);
    doc.text('TÂCHES ACHEVÉES', col2X + colWidth / 2, currentY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${completedTasks} / ${totalTasks}`, col2X + colWidth / 2, currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Lots finalisés avec succès', col2X + colWidth / 2, currentY + 18.5, { align: 'center' });

    // Card 3: In Progress Tasks
    const col3X = margin + (colWidth + 3) * 2;
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(col3X, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('LOTS EN COURS', col3X + colWidth / 2, currentY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${inProgressTasks}`, col3X + colWidth / 2, currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${plannedTasks} en préparation/planifiés`, col3X + colWidth / 2, currentY + 18.5, { align: 'center' });

    // Card 4: Client Validations
    const col4X = margin + (colWidth + 3) * 3;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.roundedRect(col4X, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('VALIDATIONS CLIENT', col4X + colWidth / 2, currentY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${approvedByClientTasks} validés`, col4X + colWidth / 2, currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${periodLogs.length} PV de journée sur période`, col4X + colWidth / 2, currentY + 18.5, { align: 'center' });

    currentY += boxHeight + 7;
  }

  // Section: Tasks & Milestones Table
  if (includeSections.tasks && siteTasks.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. DÉTAIL DE L'AVANCEMENT PAR LOT & TÂCHE (${siteTasks.length} TÂCHES RÉPERTORIÉES)`, margin, currentY);
    currentY += 3;

    const taskRows = siteTasks.map((t, idx) => {
      const statusLabel =
        t.status === 'COMPLETEE' ? 'Complétée' :
        t.status === 'EN_COURS' ? 'En cours' :
        t.status === 'EN_ATTENTE' ? 'En attente' : 'Planifiée';

      const approvalLabel =
        t.clientApproval === 'APPROVED' ? 'Validé par client' :
        t.clientApproval === 'REJECTED' ? 'Modification demandée' :
        t.status === 'COMPLETEE' ? 'À valider' : 'En attente';

      const periodDates = t.startDate || t.endDate
        ? `${formatDateFr(t.startDate || '')} -> ${formatDateFr(t.endDate || '')}`
        : 'Non planifié';

      return [
        String(idx + 1),
        t.title,
        `${t.progress || 0}%`,
        statusLabel,
        periodDates,
        approvalLabel,
        t.description ? t.description.slice(0, 90) : 'R.A.S.'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['N°', 'Désignation des Travaux / Lot', 'Avancement', 'Statut', 'Planning / Échéance', 'Visa Client', 'Détails & Spécifications']],
      body: taskRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        valign: 'top',
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 28, fontSize: 6.5 },
        5: { cellWidth: 26, fontSize: 6.5 },
        6: { cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: Site Logs & Progress Events (Activity Diary)
  if (includeSections.logs) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. ACTIVITÉS RÉALISÉES & ÉVÉNEMENTS DU CHANTIER (${periodLogs.length} JOURS CONSIGNÉS)`, margin, currentY);
    currentY += 3;

    if (periodLogs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Aucun journal d\'activité saisi sur cette période.', margin, currentY + 4);
      currentY += 10;
    } else {
      const logsRows = periodLogs.map(log => {
        return [
          formatDateFr(log.date),
          `${log.weather || 'Ensoleillé'}${log.temp ? ` (${log.temp}°C)` : ''}`,
          log.note || 'Travaux exécutés conformément aux règles de l\'art et aux prescriptions du devis.',
          log.incidents || 'R.A.S. - Sécurité et port des EPI conformes. Chantier propre.'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Conditions Météo', 'Travaux Réalisés & Avancement Constaté', 'Sécurité, Qualité & Conformité']],
        body: logsRows,
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
          cellPadding: 2.2,
          valign: 'top'
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 30 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 50 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Section: Major Materials & Deliveries (Optional)
  if (includeSections.materials && materials.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. SUIVI DES APPROVISIONNEMENTS SUR CHANTIER (${materials.length} RÉFÉRENCES)`, margin, currentY);
    currentY += 3;

    const materialRows = materials.map((m, idx) => {
      const currentStock = (m.initStock || 0) + (m.received || 0) - (m.consumed || 0);
      const minAlert = m.minAlert;
      const statusText = minAlert && currentStock <= minAlert ? 'Approvisionnement requis' : 'Stock suffisant';
      return [
        String(idx + 1),
        m.name,
        m.unit || 'U',
        String(currentStock),
        minAlert ? String(minAlert) : '—',
        statusText
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['N°', 'Désignation Matériau / Fourniture', 'Unité', 'Quantité sur Site', 'Seuil Minimum', 'Statut Disponibilité']],
      body: materialRows,
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
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 38, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: Official Signatures & Acceptance Box
  if (includeSections.signatures) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ENGAGEMENTS & VALIDATION DES AVANCEMENTS', margin, currentY);
    currentY += 4;

    const sigBoxWidth = (pageWidth - (margin * 2) - 8) / 2;
    const boxHeight = 28;

    // Box 1: Chef de Chantier
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, sigBoxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Pour l\'Entreprise / Chef de Chantier', margin + sigBoxWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nom : ${site.supervisor || 'Le Conducteur de Travaux'}`, margin + 5, currentY + 11);
    doc.text(`Date : ${nowFormatted}`, margin + 5, currentY + 16);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & Cachet de l\'entreprise', margin + sigBoxWidth / 2, currentY + 24, { align: 'center' });

    // Box 2: Client / Maître d'Ouvrage
    const clientBoxX = margin + sigBoxWidth + 8;
    doc.roundedRect(clientBoxX, currentY, sigBoxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Pour le Client / Maître d\'Ouvrage', clientBoxX + sigBoxWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nom : ${recipientName}`, clientBoxX + 5, currentY + 11);
    doc.text('Mention : "Bon pour accord et constatation d\'avancement"', clientBoxX + 5, currentY + 16);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & Date du Client', clientBoxX + sigBoxWidth / 2, currentY + 24, { align: 'center' });

    currentY += boxHeight + 8;
  }

  // Add Page Numbers & Official Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ChantierPro — Rapport d'Avancement Client : ${site.name} (Période : ${formatDateFr(startDate)} -> ${formatDateFr(endDate)})`,
      margin,
      pageHeight - 4
    );
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  return doc;
}

/**
 * Downloads the client report as a PDF file directly in the browser
 */
export function downloadClientProgressReportPDF(data: ClientProgressReportData, customFilename?: string): string {
  const doc = generateClientProgressReportPDF(data);
  const cleanSiteName = data.site.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = customFilename || `Rapport_Avancement_Client_${cleanSiteName}_${data.startDate}_au_${data.endDate}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Shares the client progress report directly (Web Share API on mobile or WhatsApp/Email fallback)
 */
export async function shareClientProgressReportPDF(
  data: ClientProgressReportData
): Promise<{ success: boolean; method: 'web-share' | 'download' | 'whatsapp'; error?: string }> {
  try {
    const doc = generateClientProgressReportPDF(data);
    const cleanSiteName = data.site.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Rapport_Avancement_Client_${cleanSiteName}_${data.startDate}_au_${data.endDate}.pdf`;

    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    // 1. Try native Web Share API (available on Android, iOS, and modern desktop browsers)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Rapport d'avancement — ${data.site.name}`,
        text: `Bonjour, veuillez trouver ci-joint le rapport officiel d'avancement des travaux pour le chantier "${data.site.name}" (période du ${formatDateFr(data.startDate)} au ${formatDateFr(data.endDate)}).`,
        files: [file]
      });
      return { success: true, method: 'web-share' };
    }

    // 2. Fallback: Download file automatically and provide WhatsApp share message
    doc.save(filename);

    return { success: true, method: 'download' };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, method: 'web-share', error: 'Partage annulé par l\'utilisateur' };
    }
    console.error('Error sharing PDF report:', err);
    // Fallback save
    try {
      downloadClientProgressReportPDF(data);
      return { success: true, method: 'download' };
    } catch (saveErr) {
      return { success: false, method: 'download', error: 'Impossible de générer le fichier PDF.' };
    }
  }
}
