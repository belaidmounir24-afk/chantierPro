import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, Worker } from '../types';
import { X, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { getTodayDateString } from '../services/storage';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>, editId?: string) => void;
  editingTask: Task | null;
  siteId: string;
  workers: Worker[];
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, editingTask, siteId, workers }) => {
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    siteId: siteId,
    title: '',
    description: '',
    status: 'PLANIFIEE',
    assignees: [],
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    priority: 'MOYENNE',
    budget: 0,
    progress: 0,
    subtasks: []
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setFormData({ ...editingTask });
      } else {
        setFormData({
          siteId: siteId,
          title: '',
          description: '',
          status: 'PLANIFIEE',
          assignees: [],
          startDate: getTodayDateString(),
          endDate: getTodayDateString(),
          priority: 'MOYENNE',
          budget: 0,
          progress: 0,
          subtasks: []
        });
      }
      setNewSubtaskTitle('');
    }
  }, [isOpen, editingTask, siteId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData, editingTask?.id);
    onClose();
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setFormData(prev => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), { id: `sub_${Date.now()}`, title: newSubtaskTitle.trim(), completed: false }]
      }));
      setNewSubtaskTitle('');
    }
  };

  const toggleSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  const deleteSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter(s => s.id !== id)
    }));
  };

  const toggleAssignee = (workerId: string) => {
    setFormData(prev => {
      const current = prev.assignees || [];
      if (current.includes(workerId)) {
        return { ...prev, assignees: current.filter(id => id !== workerId) };
      } else {
        return { ...prev, assignees: [...current, workerId] };
      }
    });
  };

  const siteWorkers = workers.filter(w => w.site === siteId && w.active);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full sm:w-full max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">
            {editingTask ? 'Modifier la Tâche' : 'Nouvelle Tâche'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Titre de la tâche *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ex: Ferraillage semelles..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                placeholder="Détails de la tâche..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="PLANIFIEE">Planifiée</option>
                  <option value="EN_COURS">En Cours</option>
                  <option value="EN_ATTENTE">En Attente</option>
                  <option value="COMPLETEE">Complétée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Priorité</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="BASSE">Basse</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Date fin prévue</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Progression (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={e => setFormData({ ...formData, progress: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Budget alloué</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget || ''}
                  onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ouvriers assignés</label>
              <div className="flex flex-wrap gap-2">
                {siteWorkers.map(w => {
                  const isAssigned = (formData.assignees || []).includes(w.id);
                  return (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => toggleAssignee(w.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        isAssigned 
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2">Sous-tâches (Checklist)</label>
              <div className="space-y-2 mb-3">
                {(formData.subtasks || []).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        checked={sub.completed}
                        onChange={() => toggleSubtask(sub.id)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className={`text-sm ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {sub.title}
                      </span>
                    </label>
                    <button type="button" onClick={() => deleteSubtask(sub.id)} className="text-slate-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                  placeholder="Ajouter une étape..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
