import React, { useState } from 'react';
import { Site, Task, UserRole } from '../types';
import { CheckCircle2, AlertCircle, Clock, Search, MessageSquare, ShieldCheck, XCircle, FileText, Download } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface ClientDashboardViewProps {
  site: Site;
  tasks: Task[];
  currency: string;
  onUpdateTaskApproval: (taskId: string, approval: 'APPROVED' | 'REJECTED', comment?: string) => void;
  onOpenClientReport?: () => void;
}

export const ClientDashboardView: React.FC<ClientDashboardViewProps> = ({ site, tasks, currency, onUpdateTaskApproval, onOpenClientReport }) => {
  const siteTasks = tasks.filter(t => t.siteId === site.id);
  const completedTasks = siteTasks.filter(t => t.status === 'COMPLETEE');
  const pendingValidation = completedTasks.filter(t => t.clientApproval === 'PENDING' || !t.clientApproval);
  
  const totalBudget = siteTasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const overallProgress = siteTasks.length > 0 
    ? Math.round(siteTasks.reduce((sum, t) => sum + t.progress, 0) / siteTasks.length) 
    : 0;

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VALIDATION'>('OVERVIEW');
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const handleApprove = (taskId: string) => {
    onUpdateTaskApproval(taskId, 'APPROVED', commentText[taskId]);
    setCommentText(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleReject = (taskId: string) => {
    if (!commentText[taskId]?.trim()) {
      alert("Veuillez ajouter un commentaire pour justifier la demande de modification.");
      return;
    }
    onUpdateTaskApproval(taskId, 'REJECTED', commentText[taskId]);
    setCommentText(prev => ({ ...prev, [taskId]: '' }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Client */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" /> Espace Client Sécurisé
          </div>
          <h1 className="text-3xl font-black mb-2">{site.name}</h1>
          <p className="text-slate-300 flex items-center gap-2">
            Vue d'ensemble et validation des travaux
          </p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 min-w-[200px]">
          <div className="text-slate-300 text-sm font-medium mb-1">Avancement Global</div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black">{overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-900/50 rounded-full h-2">
            <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs and PDF Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('VALIDATION')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'VALIDATION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            À Valider
            {pendingValidation.length > 0 && (
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingValidation.length}</span>
            )}
          </button>
        </div>

        {onOpenClientReport && (
          <button
            id="client-export-pdf-btn"
            type="button"
            onClick={onOpenClientReport}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Télécharger Rapport PDF</span>
          </button>
        )}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-slate-500 font-bold text-sm mb-1">Tâches en cours</h3>
            <p className="text-3xl font-black text-slate-800">{siteTasks.filter(t => t.status === 'EN_COURS').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-slate-500 font-bold text-sm mb-1">Tâches Achevées</h3>
            <p className="text-3xl font-black text-slate-800">{completedTasks.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="font-black text-xl">DZD</span>
            </div>
            <h3 className="text-slate-500 font-bold text-sm mb-1">Budget Estimatif des Tâches</h3>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(totalBudget, currency)}</p>
          </div>
        </div>
      )}

      {activeTab === 'VALIDATION' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {pendingValidation.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Tout est à jour !</h3>
              <p className="text-slate-500">Aucune tâche n'est en attente de votre validation.</p>
            </div>
          ) : (
            pendingValidation.map(task => (
              <div key={task.id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold mb-3">
                      <AlertCircle className="w-3.5 h-3.5" /> En attente d'approbation
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{task.title}</h3>
                    <p className="text-slate-600 mb-4">{task.description}</p>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Commentaires / Demande de modification
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ajoutez une remarque si vous refusez ou validez avec réserve..."
                        value={commentText[task.id] || ''}
                        onChange={(e) => setCommentText({...commentText, [task.id]: e.target.value})}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-3 min-w-[200px] justify-end">
                    <button
                      onClick={() => handleApprove(task.id)}
                      className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReject(task.id)}
                      className="flex-1 py-3 px-4 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Already reviewed tasks */}
          {completedTasks.filter(t => t.clientApproval === 'APPROVED' || t.clientApproval === 'REJECTED').length > 0 && (
             <div className="pt-8">
               <h4 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">Historique des validations</h4>
               <div className="space-y-3">
                 {completedTasks.filter(t => t.clientApproval === 'APPROVED' || t.clientApproval === 'REJECTED').map(task => (
                   <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between opacity-75">
                     <div>
                       <h5 className="font-bold text-slate-800">{task.title}</h5>
                       <p className="text-sm text-slate-500 truncate max-w-md">{task.description}</p>
                     </div>
                     <div>
                       {task.clientApproval === 'APPROVED' ? (
                         <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-lg">
                           <CheckCircle2 className="w-4 h-4" /> Approuvée
                         </span>
                       ) : (
                         <span className="flex items-center gap-1 text-red-600 text-sm font-bold bg-red-50 px-3 py-1 rounded-lg">
                           <XCircle className="w-4 h-4" /> Rejetée
                         </span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
