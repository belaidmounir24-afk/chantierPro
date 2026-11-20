import React, { useState } from 'react';
import { Site, Worker, AttendanceRecord, SiteLog, Material, DailyExpense, Advance } from '../types';
import { formatCurrency } from '../utils/calculations';
import { downloadDailyPVPDF } from '../services/dailyReportPdfService';
import { triggerHaptic } from '../utils/android';
import { Printer, X, Building2, HardHat, Calendar, CloudSun, ShieldCheck, CheckCircle2, Receipt, HandCoins, Download, Loader2 } from 'lucide-react';

interface PrintDailyPVProps {
  site: Site;
  date: string;
  attendance: AttendanceRecord[];
  workers: Worker[];
  log?: SiteLog;
  materials?: Material[];
  expenses?: DailyExpense[];
  advances?: Advance[];
  currency?: string;
  onClose: () => void;
}

export const PrintDailyPV: React.FC<PrintDailyPVProps> = ({
  site,
  date,
  attendance,
  workers,
  log,
  materials,
  expenses = [],
  advances = [],
  currency = 'DZD',
  onClose
}) => {
  const activeWorkers = workers.filter(w => w.site === site.id && w.active);
  const presentCount = attendance.filter(r => r.status === 'P').length;
  const lateCount = attendance.filter(r => r.status === 'R').length;
  const absentCount = attendance.filter(r => r.status === 'A').length;
  const leaveCount = attendance.filter(r => r.status === 'J').length;
  const totalOvertime = attendance.reduce((sum, r) => sum + (Number(r.hSup) || 0), 0);
  const totalAbsenceHours = attendance.reduce((sum, r) => sum + (Number(r.absenceHours) || 0), 0);
  const totalHours = Math.max(0, (presentCount + lateCount) * 8 + totalOvertime - totalAbsenceHours);

  // Day's expenses & advances
  const dayExpenses = expenses.filter(e => e.site === site.id && e.date === date);
  const dayAdvances = advances.filter(a => a.site === site.id && a.date === date);
  const dayExpensesTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const dayAdvancesTotal = dayAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const dayTotalDisbursed = dayExpensesTotal + dayAdvancesTotal;

  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setPdfDownloading(true);
      triggerHaptic('medium');
      downloadDailyPVPDF({
        site,
        date,
        attendance,
        workers,
        log,
        materials,
        expenses,
        currency
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du fichier PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 p-4 md:p-8 flex justify-center items-start print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 md:p-10 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:p-0">
        {/* Print controls (hidden in print) */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 print:hidden flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              Aperçu officiel BTP
            </span>
            <span className="text-xs text-slate-500">
              Format standard PV de Journée A4
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct PDF Download */}
            <button
              id="download-direct-pv-pdf-btn"
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfDownloading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black shadow-md transition-all active:scale-95 cursor-pointer ${
                pdfSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {pdfDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Création PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>PDF Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-slate-950" />
                  <span>Télécharger PDF (Direct)</span>
                </>
              )}
            </button>

            <button
              id="print-pv-trigger-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-bold shadow-md transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              Imprimer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PV Content */}
        <div className="text-slate-900 space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏗️</span>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                    Procès-Verbal de Journée & Rapport de Chantier
                  </h1>
                </div>
                <p className="text-sm font-bold text-amber-600 mt-1">
                  Chantier : {site.name}
                </p>
              </div>
              <div className="text-left md:text-right text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><span className="text-slate-500 font-medium">Date :</span> <strong className="text-sm">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
                <div><span className="text-slate-500 font-medium">Maître d'ouvrage :</span> <strong>{site?.client || 'N/A'}</strong></div>
                <div><span className="text-slate-500 font-medium">Lieu :</span> <strong>{site?.address || 'N/A'}</strong></div>
                <div><span className="text-slate-500 font-medium">Responsable de site :</span> <strong>{site?.supervisor || 'Chef de chantier'}</strong></div>
              </div>
            </div>
          </div>

          {/* Météo & Conditions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">Météo du jour</span>
              <strong className="text-sm font-bold flex items-center gap-1.5 text-slate-900">
                <CloudSun className="h-4 w-4 text-amber-500" />
                {log?.weather || 'Dégagé / Favorable'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">Température</span>
              <strong className="text-sm font-bold text-slate-900">
                {log?.temp ? `${log.temp} °C` : 'Non renseignée'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">Intempéries / Heures perdues</span>
              <strong className={`text-sm font-bold ${log?.lostHours ? 'text-rose-600' : 'text-slate-900'}`}>
                {log?.lostHours ? `${log.lostHours} heures` : '0h (Aucun arrêt)'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">Volume d'heures travaillées</span>
              <strong className="text-sm font-bold text-blue-700">
                {totalHours} heures
              </strong>
            </div>
          </div>

          {/* Synthèse Présence & Effectifs */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
              <span>1. Effectif & Pointage du Personnel</span>
              <span className="text-slate-500 font-normal">
                Total inscrits : {activeWorkers.length} | Présents : {presentCount + lateCount}
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <span className="text-[11px] text-emerald-800 font-bold block">Présents (P)</span>
                <span className="text-base font-extrabold text-emerald-700">{presentCount}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <span className="text-[11px] text-amber-800 font-bold block">Retards (R)</span>
                <span className="text-base font-extrabold text-amber-700">{lateCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                <span className="text-[11px] text-rose-800 font-bold block">Absents (A)</span>
                <span className="text-base font-extrabold text-rose-700">{absentCount}</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <span className="text-[11px] text-blue-800 font-bold block">Heures Supp. (HS)</span>
                <span className="text-base font-extrabold text-blue-700">+{totalOvertime}h</span>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-orange-800 font-bold block">Heures Abs. (HA)</span>
                <span className="text-base font-extrabold text-orange-700">
                  {totalAbsenceHours > 0 ? `-${totalAbsenceHours}h` : '0h'}
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">N°</th>
                  <th className="p-2 border-r border-slate-300">Nom & Prénom</th>
                  <th className="p-2 border-r border-slate-300">Corps d'état</th>
                  <th className="p-2 border-r border-slate-300">Équipe</th>
                  <th className="p-2 border-r border-slate-300 text-center">Statut</th>
                  <th className="p-2 border-r border-slate-300 text-center">H. Supp</th>
                  <th className="p-2 border-r border-slate-300 text-center">H. Abs.</th>
                  <th className="p-2">Observations</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkers.map((w, idx) => {
                  const record = attendance.find(r => r.workerId === w.id);
                  const st = record?.status || 'A';
                  const stLabels: Record<string, { label: string; bg: string }> = {
                    P: { label: 'PRÉSENT', bg: 'text-emerald-700 font-bold' },
                    R: { label: 'RETARD', bg: 'text-amber-700 font-bold' },
                    A: { label: 'ABSENT', bg: 'text-rose-700 font-bold' },
                    J: { label: 'CONGÉ / PAYÉ', bg: 'text-purple-700 font-bold' }
                  };
                  const currentSt = stLabels[st] || stLabels.A;

                  return (
                    <tr key={w.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-slate-400">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{w.name}</td>
                      <td className="p-2 border-r border-slate-200">{w.craft}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{w.team}</td>
                      <td className={`p-2 border-r border-slate-200 text-center ${currentSt.bg}`}>
                        {currentSt.label}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">
                        {record?.hSup ? `+${record.hSup}h` : '—'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-600">
                        {record?.absenceHours ? `-${record.absenceHours}h` : '—'}
                      </td>
                      <td className="p-2 text-slate-500">
                        {record?.note || (st === 'A' ? 'Non pointé' : '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Avancement des travaux */}
          <div className="rounded-xl border border-slate-300 p-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Tâches exécutées & Avancement du jour
            </h2>
            <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed min-h-12">
              {log?.note || 'Travaux de coffrage, ferraillage et maçonnerie conformes au planning prévisionnel.'}
            </div>
          </div>

          {/* Sécurité & Incidents */}
          <div className="rounded-xl border border-slate-300 p-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              3. Sécurité, Hygiène & Incidents
            </h2>
            <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {log?.incidents || 'R.A.S. Aucun incident ou accident de travail à signaler. Port des Équipements de Protection Individuelle (casques, chaussures, gilets) respecté.'}
            </div>
          </div>

          {/* Dépenses & Acomptes du jour */}
          {(dayExpenses.length > 0 || dayAdvances.length > 0) && (
            <div className="rounded-xl border border-slate-300 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  4. Dépenses de Caisse & Acomptes Versés ce Jour
                </h2>
                <span className="text-xs font-black text-slate-900 font-mono">
                  Total décaissements : {formatCurrency(dayTotalDisbursed, currency)}
                </span>
              </div>

              {dayExpenses.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Dépenses de chantier ({dayExpenses.length}) :
                  </span>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="p-1.5 border-r border-slate-200">Catégorie</th>
                        <th className="p-1.5 border-r border-slate-200">Bénéficiaire / Motif</th>
                        <th className="p-1.5 border-r border-slate-200">Mode</th>
                        <th className="p-1.5 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayExpenses.map(e => (
                        <tr key={e.id} className="border-t border-slate-200">
                          <td className="p-1.5 border-r border-slate-200 font-semibold">{e.category}</td>
                          <td className="p-1.5 border-r border-slate-200">
                            {e.beneficiary || 'Dépense'} {e.note && `· ${e.note}`}
                          </td>
                          <td className="p-1.5 border-r border-slate-200">{e.paymentMethod}</td>
                          <td className="p-1.5 text-right font-black font-mono">
                            {formatCurrency(e.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dayAdvances.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Acomptes versés aux ouvriers ({dayAdvances.length}) :
                  </span>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="p-1.5 border-r border-slate-200">Ouvrier</th>
                        <th className="p-1.5 border-r border-slate-200">Motif</th>
                        <th className="p-1.5 border-r border-slate-200">Mode</th>
                        <th className="p-1.5 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayAdvances.map(a => {
                        const w = activeWorkers.find(w => w.id === a.workerId);
                        return (
                          <tr key={a.id} className="border-t border-slate-200">
                            <td className="p-1.5 border-r border-slate-200 font-semibold">
                              {w?.name || a.workerId} ({w?.craft || ''})
                            </td>
                            <td className="p-1.5 border-r border-slate-200">{a.note || 'Acompte'}</td>
                            <td className="p-1.5 border-r border-slate-200">{a.method}</td>
                            <td className="p-1.5 text-right font-black font-mono text-amber-700">
                              {formatCurrency(a.amount, currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 border-t border-slate-300">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Le Chef de Chantier
                </span>
                <span className="text-[11px] text-slate-400 italic">Signature & Date</span>
              </div>
              <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Le Conducteur de Travaux
                </span>
                <span className="text-[11px] text-slate-400 italic">Signature & Cachet</span>
              </div>
              <div className="border border-slate-300 rounded-xl p-4 min-h-28 flex flex-col justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Bureau de Contrôle / Maître d'œuvre
                </span>
                <span className="text-[11px] text-slate-400 italic">Visa & Observations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
