// src/components/chat/ConnectCoachView.tsx

'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ConnectCoachViewProps {
  onCoachConnected: (coachId: string, coachName: string) => void;
}

export function ConnectCoachView({ onCoachConnected }: ConnectCoachViewProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc('link_athlete_to_coach', {
        code_input: code.trim(),
      });

      if (error) throw error;

      if (data && data.success) {
        onCoachConnected(data.coach_id, data.coach_name);
      } else {
        setErrorMsg(data?.message || 'Code introuvable. Vérifiez le code fourni par votre coach.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fadeIn">
      <div className="w-16 h-16 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-3xl">
        💬
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-black uppercase tracking-wider text-stone-100">
          Connectez votre Coach
        </h3>
        <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
          Pour échanger avec votre entraîneur et recevoir vos conseils personnalisés, renseignez son Code Coach unique.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xs mx-auto">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: COACH-8921"
            className="w-full bg-stone-950 border border-stone-800 focus:border-[#CF9A61] rounded-2xl px-4 py-3 text-center text-sm font-mono tracking-widest text-stone-100 uppercase focus:outline-none transition"
          />
        </div>

        {errorMsg && (
          <p className="text-[11px] font-bold text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-2.5">
            ⚠️ {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full py-3.5 bg-[#CF9A61] hover:bg-[#b88652] disabled:opacity-50 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
        >
          {loading ? 'Vérification...' : 'Valider le code'}
        </button>
      </form>
    </div>
  );
}