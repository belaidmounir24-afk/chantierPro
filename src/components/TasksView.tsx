import React, { useState } from 'react';
import { Site, Task, TaskStatus, Worker } from '../types';
import { Plus, Search, Calendar, CheckSquare, Edit, Clock, AlertTriangle, Users, Target, ShieldCheck, Download } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface TasksViewProps {
  site: Site;
  tasks?: Task[];
  workers: Worker[];
  onOpenTaskModal: (task?: Task) => void;
  onOpenClientReport?: () => void;
  currency: string;
}

export const TasksView: React.FC<TasksViewProps> = ({ site, tasks = [], workers, onOpenTaskModal, onOpenClientReport, currency }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');

  const siteTasks = tasks.filter(t => t.siteId === site.id);

  const filteredTasks = siteTasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             t.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch(status) {
      case 'PLANIFIEE': return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-300">Planifiée</span>;
      case 'EN_COURS': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-300">En Cours</span>;
      case 'EN_ATTENTE': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">En Attente</span>;
      case 'COMPLETEE': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-300">Complétée</span>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'URGENTE': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'HAUTE': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'MOYENNE': return <Target className="w-4 h-4 text-blue-500" />;
      default: return <CheckSquare className="w-4 h-4 text-slate-400" />;
    }
  };

  // Stats
  const completedCount = siteTasks.filter(t => t.status === 'COMPLETEE').length;
  const inProgressCount = siteTasks.filter(t => t.status === 'EN_COURS').length;
  const totalBudget = siteTasks.reduce((sum, t) => sum + (t.budget || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="text-emerald-500" />
            Gestion des Tâches
          </h2>
          <p className="text-slate-500 text-sm">Planification et suivi de l'avancement</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {onOpenClientReport && (
            <button
              id="export-client-tasks-report-btn"
              type="button"
              onClick={onOpenClientReport}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              title="Exporter le rapport d'avancement des tâches et du chantier pour le client (PDF)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Rapport Client (PDF)</span>
            </button>
          )}
          <button
            onClick={() => onOpenTaskModal()}
            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Tâche
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Tâches</span>
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-800">{siteTasks.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">En Cours</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-700">{inProgressCount}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Complétées</span>
            <CheckSquare className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{completedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Budget Tâches</span>
            <span className="text-slate-400 text-xs font-bold">{currency}</span>
          </div>
          <span className="text-lg font-black text-slate-800 truncate" title={formatCurrency(totalBudget, currency)}>{formatCurrency(totalBudget, currency)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all"
            />
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            {(['ALL', 'PLANIFIEE', 'EN_COURS', 'COMPLETEE'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === status 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'ALL' ? 'Toutes' : status === 'PLANIFIEE' ? 'Planifiées' : status === 'EN_COURS' ? 'En Cours' : 'Complétées'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 grid gap-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckSquare className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Aucune tâche trouvée</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(task.priority)}
                    <h3 className="font-bold text-slate-800 text-lg">{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2">{task.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                    {task.startDate && task.endDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {task.startDate.slice(5)} au {task.endDate.slice(5)}
                      </div>
                    )}
                    {task.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {task.assignees.length} assigné(s)
                      </div>
                    )}
                    {task.clientApproval === 'APPROVED' && (
                      <div className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckSquare className="w-3 h-3" /> Client: OK
                      </div>
                    )}
                    {task.clientApproval === 'REJECTED' && (
                      <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Rejeté (Modifs)
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center sm:items-end justify-between sm:flex-col gap-3 min-w-[120px]">
                  <div className="flex flex-col items-end w-full">
                    <div className="flex justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-600">Progression</span>
                      <span className="text-xs font-bold text-emerald-600">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onOpenTaskModal(task)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Modifier la tâche"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
