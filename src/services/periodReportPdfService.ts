import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Site, Worker, AttendanceRecord, DailyExpense, Advance, SiteLog } from '../types';
import { calculateWorkerPeriodNet, formatCurrency } from '../utils/calculations';

export interface PeriodReportData {
  site: Site;
  startDate: string;
  endDate: string;
  workers: Worker[];
  attendance: Record<string, Record<string, AttendanceRecord[]>>;
  expenses: DailyExpense[];
  advances: Advance[];
  logs: SiteLog[];
  currency: string;
  includeSections?: {
    summary: boolean;
    logs: boolean;
    expenses: boolean;
    attendance: boolean;
  };
}

export function generatePeriodReportPDF(data: PeriodReportData): jsPDF {
  const {
    site,
    startDate,
    endDate,
    workers,
    attendance,
    expenses,
    advances,
    logs,
    currency,
    includeSections = { summary: true, logs: true, expenses: true, attendance: true }
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

  // Filter items in range
  const siteWorkers = workers.filter(w => w.site === site.id && w.active);
  const siteAttendance = attendance[site.id] || {};
  const periodExpenses = expenses.filter(e => e.site === site.id && e.date >= startDate && e.date <= endDate);
  const periodAdvances = advances.filter(a => a.site === site.id && a.date >= startDate && a.date <= endDate);
  const periodLogs = logs
    .filter(l => l.site === site.id && l.date >= startDate && l.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  let totalGross = 0;
  let totalAdvancesAmount = 0;
  let totalNet = 0;
  let totalOvertimeHours = 0;
  let totalNormalHours = 0;
  let totalWorkerDays = 0;

  const workerSummaries = siteWorkers.map(w => {
    const calc = calculateWorkerPeriodNet(w, siteAttendance, periodAdvances, startDate, endDate);
    totalGross += calc.gross;
    totalAdvancesAmount += calc.advancesTotal;
    totalNet += calc.net;
    totalOvertimeHours += calc.stats.hoursOvertime;
    totalNormalHours += calc.stats.hoursRegular;
    totalWorkerDays += calc.stats.regularDays;
    return { worker: w, calc };
  });

  const totalExpensesAmount = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalDisbursed = totalExpensesAmount + totalAdvancesAmount;
  const grandTotalCost = totalGross + totalExpensesAmount;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 line
  doc.rect(0, 28, pageWidth, 1.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('CHANTIERPRO — RAPPORT PÉRIODIQUE COMPLET', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Journal de chantier · Dépenses & Caisse · Pointage & Masse salariale`, margin, 19);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 19, { align: 'right' });

  currentY = 36;

  // Site & Period Meta Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Chantier : ${site.name}`, margin + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Client / M.O : ${site.client || 'Non spécifié'}`, margin + 4, currentY + 13);
  doc.text(`Lieu : ${site.address || 'Non spécifié'}`, margin + 4, currentY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  const formatDateFr = (d: string) => {
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch {
      return d;
    }
  };
  doc.text(`PÉRIODE DU : ${formatDateFr(startDate)} AU ${formatDateFr(endDate)}`, pageWidth - margin - 4, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Responsable : ${site.supervisor || 'Chef de chantier'}`, pageWidth - margin - 4, currentY + 13, { align: 'right' });
  doc.text(`Statut : ${site.status === 'en_cours' ? 'En cours' : site.status === 'termine' ? 'Terminé' : 'En pause'}`, pageWidth - margin - 4, currentY + 19, { align: 'right' });

  currentY += 28;

  // Key Metrics / Executive Summary
  if (includeSections.summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('SYNTHÈSE GLOBALE DE LA PÉRIODE', margin, currentY);
    currentY += 4;

    const colWidth = (pageWidth - (margin * 2) - 12) / 4;
    const cards = [
      {
        title: 'EFFECTIF & POINTAGE',
        val1: `${siteWorkers.length} ouvriers`,
        val2: `${totalWorkerDays} j. / ${totalNormalHours + totalOvertimeHours}h`,
        bg: [238, 242, 255], // indigo-50
        border: [199, 210, 254],
        text: [49, 46, 129]
      },
      {
        title: 'HEURES SUPPLÉM.',
        val1: `+${totalOvertimeHours} heures`,
        val2: `Majoration normale`,
        bg: [239, 246, 255], // blue-50
        border: [191, 219, 254],
        text: [30, 58, 138]
      },
      {
        title: 'DÉPENSES CAISSE',
        val1: formatCurrency(totalExpensesAmount, currency),
        val2: `${periodExpenses.length} transactions`,
        bg: [255, 241, 242], // rose-50
        border: [254, 205, 211],
        text: [159, 18, 57]
      },
      {
        title: 'MASSE SALARIALE NETTE',
        val1: formatCurrency(totalNet, currency),
        val2: `Acomptes: ${formatCurrency(totalAdvancesAmount, currency)}`,
        bg: [236, 253, 245], // emerald-50
        border: [167, 243, 208],
        text: [6, 78, 59]
      }
    ];

    cards.forEach((c, idx) => {
      const cardX = margin + idx * (colWidth + 4);
      doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
      doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
      doc.roundedRect(cardX, currentY, colWidth, 20, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(c.text[0], c.text[1], c.text[2]);
      doc.text(c.title, cardX + 3, currentY + 5);

      doc.setFontSize(9);
      doc.text(c.val1, cardX + 3, currentY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.val2, cardX + 3, currentY + 16);
    });

    currentY += 25;
  }

  // Section 1: Journal de Chantier
  if (includeSections.logs) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. JOURNAL DE CHANTIER — RAPPORTS JOURNALIERS (${periodLogs.length} JOURS RENSEIGNÉS)`, margin, currentY);
    currentY += 3;

    if (periodLogs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Aucun rapport journalier consigné pour cette période spécifique.', margin, currentY + 5);
      currentY += 12;
    } else {
      const logsTableData = periodLogs.map(log => {
        // Count attendance for this date
        const dayRows = siteAttendance[log.date] || [];
        const presentCount = dayRows.filter(r => r.status === 'P' || r.status === 'R').length;
        const hsCount = dayRows.reduce((sum, r) => sum + (Number(r.hSup) || 0), 0);

        return [
          formatDateFr(log.date),
          `${log.weather || '—'}\n(${log.temp ? `${log.temp}°C` : 'N/A'})\nArrêt: ${log.lostHours || 0}h`,
          `${presentCount} ouvriers\n+${hsCount}h sup`,
          log.note || 'R.A.S. — Travaux conformes au planning.',
          log.incidents || 'R.A.S. Sécurité & EPI conformes.'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Météo / Arrêts', 'Effectif', 'Tâches Exécutées & Avancement', 'Sécurité & Incidents']],
        body: logsTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 7.2,
          textColor: [30, 41, 59],
          valign: 'top',
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 26 },
          2: { cellWidth: 22 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 42 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      // Update currentY from autoTable
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Section 2: Dépenses & Finances
  if (includeSections.expenses) {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. SUIVI FINANCIER & DÉPENSES DE CAISSE (TOTAL : ${formatCurrency(totalExpensesAmount, currency)})`, margin, currentY);
    currentY += 3;

    if (periodExpenses.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Aucune dépense enregistrée sur cette période.', margin, currentY + 5);
      currentY += 12;
    } else {
      const expenseRows = periodExpenses.map(e => [
        formatDateFr(e.date),
        e.category,
        e.beneficiary || '—',
        e.note || e.receiptRef || '—',
        e.paymentMethod,
        formatCurrency(e.amount, currency)
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Catégorie', 'Bénéficiaire / Fournisseur', 'Motif / Réf', 'Règlement', 'Montant']],
        body: expenseRows,
        foot: [['', 'TOTAL DÉPENSES', '', '', `${periodExpenses.length} op.`, formatCurrency(totalExpensesAmount, currency)]],
        theme: 'grid',
        headStyles: {
          fillColor: [190, 18, 60], // rose-700
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        footStyles: {
          fillColor: [255, 228, 230], // rose-100
          textColor: [159, 18, 57],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59],
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 36 },
          2: { cellWidth: 38 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 26 },
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [255, 241, 242]
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Acomptes versés
    if (periodAdvances.length > 0) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`Acomptes versés aux ouvriers sur la période (${periodAdvances.length} acomptes — Total : ${formatCurrency(totalAdvancesAmount, currency)})`, margin, currentY);
      currentY += 2;

      const advanceRows = periodAdvances.map(a => {
        const w = siteWorkers.find(worker => worker.id === a.workerId);
        return [
          formatDateFr(a.date),
          w ? `${w.name} (${w.craft})` : a.workerId,
          a.note || a.receiptRef || 'Acompte',
          a.method,
          a.approvedBy || 'Chef de chantier',
          formatCurrency(a.amount, currency)
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Ouvrier Bénéficiaire', 'Motif / Reçu', 'Mode', 'Validé par', 'Montant']],
        body: advanceRows,
        theme: 'grid',
        headStyles: {
          fillColor: [180, 83, 9], // amber-700
          textColor: [255, 255, 255],
          fontSize: 7.2,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 6.8,
          textColor: [30, 41, 59],
          cellPadding: 1.8
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 44, fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 22 },
          4: { cellWidth: 28 },
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Section 3: Pointage & Masse Salariale
  if (includeSections.attendance) {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. POINTAGE DU PERSONNEL & BORDEREAU DES SALAIRES`, margin, currentY);
    currentY += 3;

    const attendanceTableRows = workerSummaries.map(({ worker, calc }, idx) => [
      String(idx + 1),
      worker.name,
      worker.craft,
      worker.team || '—',
      `${calc.stats.regularDays}j`,
      `${calc.stats.lateDays}j`,
      `${calc.stats.absenceDays}j`,
      `${calc.stats.paidLeaveDays}j`,
      `+${calc.stats.hoursOvertime}h`,
      `${calc.stats.totalHours}h`,
      `${formatCurrency(worker.rate, currency)}/${worker.rateType === 'heure' ? 'h' : 'j'}`,
      formatCurrency(calc.gross, currency),
      formatCurrency(calc.advancesTotal, currency),
      formatCurrency(calc.net, currency)
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [[
        'N°', 'Nom & Prénom', 'Métier', 'Équipe', 'P', 'R', 'A', 'C', 'HS', 'Tot.H', 'Taux', 'Brut', 'Acomptes', 'Net'
      ]],
      body: attendanceTableRows,
      foot: [[
        '', 'TOTAUX GÉNÉRAUX', '', '', `${totalWorkerDays}j`, '', '', '', `+${totalOvertimeHours}h`, `${totalNormalHours + totalOvertimeHours}h`, '',
        formatCurrency(totalGross, currency),
        formatCurrency(totalAdvancesAmount, currency),
        formatCurrency(totalNet, currency)
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105], // emerald-600
        textColor: [255, 255, 255],
        fontSize: 6.8,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [209, 250, 229], // emerald-100
        textColor: [6, 95, 70],
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [30, 41, 59],
        cellPadding: 1.8
      },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 30, fontStyle: 'bold' },
        2: { cellWidth: 20 },
        3: { cellWidth: 16 },
        4: { cellWidth: 8, halign: 'center' },
        5: { cellWidth: 7, halign: 'center' },
        6: { cellWidth: 7, halign: 'center' },
        7: { cellWidth: 7, halign: 'center' },
        8: { cellWidth: 9, halign: 'center' },
        9: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        10: { cellWidth: 18, halign: 'right' },
        11: { cellWidth: 16, halign: 'right' },
        12: { cellWidth: 16, halign: 'right', textColor: [180, 83, 9] },
        13: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244]
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Official Signatures Block
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = margin + 4;
  }

  const sigBoxWidth = (pageWidth - (margin * 2) - 8) / 3;
  const sigTitles = [
    'Le Chef de Chantier',
    'Le Conducteur de Travaux',
    'Maître d\'Ouvrage / Contrôle'
  ];

  sigTitles.forEach((t, i) => {
    const boxX = margin + i * (sigBoxWidth + 4);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, currentY, sigBoxWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(t, boxX + sigBoxWidth / 2, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & Date / Cachet', boxX + sigBoxWidth / 2, currentY + 18, { align: 'center' });
  });

  // Add Page Numbers & Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ChantierPro — Rapport Périodique : ${site.name} (du ${formatDateFr(startDate)} au ${formatDateFr(endDate)})`, margin, pageHeight - 4);
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  return doc;
}

export function downloadPeriodReportPDF(data: PeriodReportData, customFilename?: string): void {
  const doc = generatePeriodReportPDF(data);
  const cleanSiteName = data.site.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = customFilename || `Rapport_Complet_${cleanSiteName}_${data.startDate}_au_${data.endDate}.pdf`;
  doc.save(filename);
}
