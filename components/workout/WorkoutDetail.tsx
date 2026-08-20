// src/components/workout/WorkoutDetail.tsx

import React, { useState } from "react";
import { Workout, Plan, WorkoutStep } from "../../types";
import { WORKOUT_TYPES_CONFIG } from "../../constants";
import {
  calculateStepMetrics,
  getStepTypeLabel,
  generatePaceProfile,
} from "../../utils/calculations";

interface WorkoutDetailProps {
  workout: Workout;
  plan: Plan;
  completedWorkouts: Record<string, boolean>;
  onClose: () => void;
  onToggleWorkout: (id: string) => void;
}

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workout,
  onClose,
}) => {
  const typeConfig = WORKOUT_TYPES_CONFIG[workout.type] || WORKOUT_TYPES_CONFIG.footing;
  const metrics = calculateStepMetrics(workout.steps);
  const targetRpe = workout.rpe ? parseInt(workout.rpe, 10) : 5;
  const estimatedLoad = Math.round((metrics.totalMinutes || 0) * targetRpe);

  // État pour la synchronisation Garmin
  const [showGarminModal, setShowGarminModal] = useState(false);
  const [garminEmail, setGarminEmail] = useState(() => localStorage.getItem("volaris_garmin_email") || "");
  const [garminPassword, setGarminPassword] = useState(() => localStorage.getItem("volaris_garmin_pwd") || "");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleGarminSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSyncStatus(null);

    try {
      localStorage.setItem("volaris_garmin_email", garminEmail);
      localStorage.setItem("volaris_garmin_pwd", garminPassword);

      const res = await fetch("/api/sync-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: garminEmail,
          password: garminPassword,
          workout,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de synchronisation");
      }

      setSyncStatus("✅ Séance envoyée sur Garmin Connect !");
      setTimeout(() => {
        setShowGarminModal(false);
        setSyncStatus(null);
      }, 2000);
    } catch (err: any) {
      setSyncStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepTree = (steps: WorkoutStep[], parentIndex = "") => {
    return (
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const stepNum = parentIndex ? `${parentIndex}.${idx + 1}` : `${idx + 1}`;

          if (step.type === "repeat") {
            return (
              <div
                key={step.id || idx}
                className="bg-stone-900/80 border border-[#CF9A61]/30 rounded-2xl p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider">
                    🔁 Boucle Répétition • {step.reps || 1}x
                  </span>
                  <span className="text-[9px] text-stone-500 font-mono">
                    Bloc #{stepNum}
                  </span>
                </div>

                {step.nestedSteps && step.nestedSteps.length > 0 && (
                  <div className="pl-3 border-l-2 border-[#CF9A61]/40 space-y-2 pt-1">
                    {renderStepTree(step.nestedSteps, stepNum)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={step.id || idx}
              className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                  {getStepTypeLabel(step.type)}
                </span>
                <span className="font-semibold text-stone-200">
                  {step.durationOrDist || "-"}
                </span>
              </div>

              {step.goalValue && (
                <div className="text-right">
                  <span className="text-[9px] text-stone-500 uppercase block font-bold">Cible</span>
                  <span className="font-black text-[#CF9A61]">{step.goalValue}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                Semaine {workout.weekNumber} • {workout.dayName}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}>
                {typeConfig.label}
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-stone-100">
              {workout.title || "Séance d'entraînement"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* MÉTRIQUES CIBLES */}
        <div className="grid grid-cols-4 gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">Distance</span>
            <span className="text-sm font-black text-[#CF9A61]">{workout.km || metrics.totalKm} km</span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">Durée</span>
            <span className="text-sm font-black text-[#CF9A61]">{metrics.totalMinutes} min</span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">RPE Cible</span>
            <span className="text-sm font-black text-[#CDCF61]">{workout.rpe ? `${workout.rpe}/10` : "-"}</span>
          </div>
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-xl py-0.5">
            <span className="block text-[8px] font-bold text-[#CDCF61] uppercase">Charge Cible</span>
            <span className="text-sm font-black text-[#CDCF61]">{estimatedLoad}</span>
          </div>
        </div>

        {/* BOUTON D'ENVOI DIRECT VERS GARMIN */}
        <button
          type="button"
          onClick={() => setShowGarminModal(true)}
          className="w-full py-3 bg-[#CF9A61] hover:bg-[#b8854f] text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
        >
          <span>⌚ Synchroniser avec Garmin Connect</span>
        </button>

        {/* DESCRIPTION */}
        {workout.description && (
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800 space-y-1">
            <span className="text-[9px] font-bold uppercase text-stone-400 block">Description de la séance</span>
            <p className="text-xs text-stone-300 leading-relaxed">{workout.description}</p>
          </div>
        )}

        {/* REMARQUE COACH */}
        {workout.remark && (
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 p-3 rounded-2xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase text-[#CDCF61] block">💡 Conseil du Coach</span>
            <p className="text-xs text-[#CDCF61]/90">{workout.remark}</p>
          </div>
        )}

        {/* STRUCTURE DES BLOCS */}
        <div className="space-y-2 border-t border-stone-800 pt-3">
          <span className="text-[10px] font-black uppercase text-stone-200 tracking-wider block">
            Structure de la séance ({workout.steps?.length || 0} bloc{workout.steps && workout.steps.length > 1 ? "s" : ""})
          </span>

          {!workout.steps || workout.steps.length === 0 ? (
            <p className="text-xs text-stone-500 italic text-center py-2">Aucun bloc structuré renseigné.</p>
          ) : (
            <div className="max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
              {renderStepTree(workout.steps)}
            </div>
          )}
        </div>

        {/* BOUTON FERMER */}
        <div className="pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* MODAL DE CONNEXION ET ENVOI GARMIN */}
      {showGarminModal && (
        <div className="fixed inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-60">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h4 className="text-sm font-black uppercase text-stone-100">Connexion Garmin Connect</h4>
              <button
                type="button"
                onClick={() => setShowGarminModal(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Renseigne tes identifiants Garmin. La séance sera directement créée dans ton catalogue d'entraînements et envoyée en Bluetooth sur ta montre.
            </p>

            <form onSubmit={handleGarminSync} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Email Garmin</label>
                <input
                  type="email"
                  required
                  value={garminEmail}
                  onChange={(e) => setGarminEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#CF9A61]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Mot de passe Garmin</label>
                <input
                  type="password"
                  required
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#CF9A61]"
                />
              </div>

              {syncStatus && (
                <div className="text-[11px] font-semibold text-center py-1">
                  {syncStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#CF9A61] hover:bg-[#b8854f] disabled:opacity-50 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                {loading ? "Synchronisation en cours..." : "Envoyer sur ma montre"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};