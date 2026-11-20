import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChantierDb, Site, Worker, DailyExpense, Advance, Material } from '../types';

/**
 * Génère et télécharge un fichier CSV compatible Excel (avec BOM UTF-8 pour les accents et caractères arabes/français)
 */
export function exportToExcelCsv(filename: string, headers: string[], rows: (string | number | undefined)[][]): void {
  const csvContent = '\uFEFF' + [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Excel complet de tous les chantiers et clients
 */
export function exportSitesExcel(sites: Site[]): void {
  const headers = ['ID Chantier', 'Nom du Projet', 'Client', 'Adresse / Wilaya', 'Budget (DA)', 'Statut', 'Date Début'];
  const rows = sites.map(s => [
    s.id,
    s.name,
    s.client || 'Non spécifié',
    s.address || 'Algérie',
    s.budget || 0,
    s.status === 'en_cours' ? 'En cours' : s.status === 'termine' ? 'Terminé' : 'En pause',
    s.startDate || ''
  ]);
  exportToExcelCsv(`ChantierPro_Liste_Projets_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

/**
 * Export Excel de la liste des ouvriers
 */
export function exportWorkersExcel(workers: Worker[]): void {
  const headers = ['Nom & Prénom', 'Métier / Spécialité', 'Niveau BTP', 'Tarif Journalier (DA)', 'Téléphone', 'Équipe', 'Statut'];
  const rows = workers.map(w => [
    w.name,
    w.craft,
    w.recruitmentLevel || 'Standard',
    w.rate,
    w.phone || '',
    w.team,
    w.active ? 'Actif' : 'Inactif'
  ]);
  exportToExcelCsv(`ChantierPro_Ouvriers_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

/**
 * Export Excel de la Caisse & Dépenses
 */
export function exportExpensesExcel(expenses: DailyExpense[], siteName: string): void {
  const headers = ['Date', 'Catégorie', 'Montant (DA)', 'Mode Règlement', 'Bénéficiaire / Fournisseur', 'N° Pièce / Facture', 'Note / Détails'];
  const rows = expenses.map(e => [
    e.date,
    e.category,
    e.amount,
    e.paymentMethod,
    e.beneficiary || '',
    e.receiptRef || '',
    e.note || ''
  ]);
  exportToExcelCsv(`ChantierPro_Depenses_${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

/**
 * Export PDF officiel de synthèse du Chantier
 */
export function exportProjectPdf(site: Site, workersCount: number, expensesTotal: number, advancesTotal: number): void {
  const doc = new jsPDF();
  
  // Header ChantierPro
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 0, 210, 24, 'F');
  
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ChantierPro BTP — Fiche Officielle de Projet', 14, 16);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);

  // Site Details Card
  autoTable(doc, {
    startY: 38,
    head: [['Paramètre', 'Valeur']],
    body: [
      ['Nom du Projet', site.name],
      ['Maître d\'Ouvrage (Client)', site.client || 'Non spécifié'],
      ['Localisation', site.address || 'Non spécifié'],
      ['Budget Prévisionnel', `${(site.budget || 0).toLocaleString()} DZD`],
      ['Statut Actuel', site.status.toUpperCase()],
      ['Effectif Ouvriers Déclaré', `${workersCount} ouvriers`],
      ['Total Dépenses Caisse', `${expensesTotal.toLocaleString()} DZD`],
      ['Total Acomptes Versés', `${advancesTotal.toLocaleString()} DZD`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 }
  });

  // Footer note
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Document généré automatiquement par l\'application ChantierPro Algérie.', 14, finalY + 15);
  doc.text('Sauvegarde et certification Cloud Firebase — Données protégées et sécurisées.', 14, finalY + 22);

  doc.save(`ChantierPro_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_Synthese.pdf`);
}
