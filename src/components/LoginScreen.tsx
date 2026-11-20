import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../utils/android';
import { safeFetch } from '../utils/network';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await safeFetch<{ success: boolean; error?: string }>(
        '/api/auth/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        },
        2500
      );

      if (response.ok && response.data?.success) {
        triggerHaptic('success');
        onSuccess();
      } else if (response.data?.error) {
        triggerHaptic('error');
        setError(response.data.error);
      } else if (response.isTimeout) {
        triggerHaptic('warning');
        setError('Le serveur met trop de temps à répondre (Timeout). Réessayez ou continuez en mode local.');
      } else {
        triggerHaptic('error');
        setError(response.error || 'Mot de passe incorrect ou serveur inaccessible');
      }
    } catch (err) {
      triggerHaptic('error');
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-900">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center space-y-2">
          <div className="mx-auto w-18 h-18 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400/50 mb-4 bg-slate-950">
            <img src="/pwa-192x192.png" alt="ChantierPro Logo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Accès Protégé</h1>
          <p className="text-slate-400 text-sm">Veuillez entrer le mot de passe pour accéder à ChantierPro.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div className="space-y-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Mot de passe"
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
            />
            {error && <p className="text-red-400 text-xs font-medium pl-1 mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-500 text-slate-900 font-bold rounded-xl shadow-md hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Déverrouiller</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
