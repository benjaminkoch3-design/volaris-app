// src/components/workout/WorkoutDetail.tsx

import React from "react";
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

// ----------------------------------------------------------------------
// 1. COMPOSANT INTERNE : PROFIL D'ALLURE (ALLURE EN ORDONNÉE Y)
// ----------------------------------------------------------------------
const PaceProfileChart: React.FC<{ steps?: WorkoutStep[] }> = ({ steps }) => {
  const profile = generatePaceProfile(steps);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalTimeSec === 0) return null;

  const minPaceSec = Math.min(...profile.map((p) => p.paceSecPerKm));
  const maxPaceSec = Math.max(...profile.map((p) => p.paceSecPerKm));
  const paceRange = maxPaceSec - minPaceSec || 60;

  const formatPace = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#CF6361"; // Terracotta
      case "corps":
        return "#CF9A61"; // Ocre Doré
      case "recup":
        return "#CDCF61"; // Jaune Olive
      case "retour_calme":
        return "#3b82f6"; // Blue
      default:
        return "#10b981"; // Emerald
    }
  };

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
          📈 Profil d'allure de la séance
        </span>
        <span className="text-[9px] text-stone-500 font-semibold">
          Durée Totale : {Math.round(totalTimeSec / 60)} min
        </span>
      </div>

      <div className="flex gap-2 items-stretch h-24">
        {/* AXE DES ORDONNÉES (Y) : ALLURES EN JAUNE OLIVE (#CDCF61) */}
        <div className="flex flex-col justify-between text-[8px] font-bold text-stone-500 py-1 text-right w-8 select-none">
          <span className="text-[#CDCF61]">{formatPace(minPaceSec)}</span>
          <span>{formatPace(minPaceSec + paceRange / 2)}</span>
          <span className="text-stone-600">{formatPace(maxPaceSec)}</span>
        </div>

        {/* ZONE DU GRAPHIQUE */}
        <div className="flex-1 bg-stone-900/60 rounded-xl p-2 flex items-end gap-1 relative overflow-hidden border border-stone-800/60">
          {profile.map((point, i) => {
            const widthPct = (point.durationSec / totalTimeSec) * 100;
            const normalizedHeight =
              paceRange === 0
                ? 60
                : 20 + ((maxPaceSec - point.paceSecPerKm) / paceRange) * 75;

            return (
              <div
                key={i}
                style={{
                  width: `${Math.max(widthPct, 2)}%`,
                  height: `${normalizedHeight}%`,
                  backgroundColor: getColor(point.type),
                }}
                className="rounded-t-sm transition-all relative group cursor-pointer hover:brightness-125"
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    <div>{point.label}</div>
                    <div className="text-[#CF9A61]">{point.paceFormatted} min/km</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] inline-block"></span> Échauffement
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF9A61] inline-block"></span> Course / Corps
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] inline-block"></span> Récupération
          </span>
        </div>
        <span className="text-[8px] text-stone-500 italic">← Déroulement séance →</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. COMPOSANT PRINCIPAL : WORKOUT DETAIL
// ----------------------------------------------------------------------
export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workout,
  onClose,
}) => {
  const typeConfig = WORKOUT_TYPES_CONFIG[workout.type] || WORKOUT_TYPES_CONFIG.footing;
  const metrics = calculateStepMetrics(workout.steps);

  // Calcul de la charge cible estimée : Durée (min) × RPE prévisionnel
  const targetRpe = workout.rpe ? parseInt(workout.rpe, 10) : 5;
  const estimatedLoad = Math.round((metrics.totalMinutes || 0) * targetRpe);

  // Rendu arborescent récursif des blocs pour la consultation
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
                  <span className="text-[9px] text-stone-500 uppercase block font-bold">
                    Cible
                  </span>
                  <span className="font-black text-[#CF9A61]">
                    {step.goalValue}
                  </span>
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
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}
              >
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

        {/* MÉTRIQUES CIBLES & CHARGE D'ENTRAÎNEMENT PRÉVUE */}
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
            <span className="text-sm font-black text-[#CDCF61]">
              {workout.rpe ? `${workout.rpe}/10` : "-"}
            </span>
          </div>
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-xl py-0.5">
            <span className="block text-[8px] font-bold text-[#CDCF61] uppercase">Charge Cible</span>
            <span className="text-sm font-black text-[#CDCF61]">{estimatedLoad}</span>
          </div>
        </div>

        {/* GRAPHIQUE DU PROFIL D'ALLURE */}
        <PaceProfileChart steps={workout.steps} />

        {/* DESCRIPTION DE LA SÉANCE */}
        {workout.description && (
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800 space-y-1">
            <span className="text-[9px] font-bold uppercase text-stone-400 block">
              Description de la séance
            </span>
            <p className="text-xs text-stone-300 leading-relaxed">
              {workout.description}
            </p>
          </div>
        )}

        {/* CONSIGNES / REMARQUE DU COACH EN JAUNE OLIVE (#CDCF61) */}
        {workout.remark && (
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 p-3 rounded-2xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase text-[#CDCF61] block">
              💡 Conseil du Coach
            </span>
            <p className="text-xs text-[#CDCF61]/90">{workout.remark}</p>
          </div>
        )}

        {/* STRUCTURE DÉTAILLÉE DES BLOCS */}
        <div className="space-y-2 border-t border-stone-800 pt-3">
          <span className="text-[10px] font-black uppercase text-stone-200 tracking-wider block">
            Structure de la séance ({workout.steps?.length || 0} bloc
            {workout.steps && workout.steps.length > 1 ? "s" : ""})
          </span>

          {!workout.steps || workout.steps.length === 0 ? (
            <p className="text-xs text-stone-500 italic text-center py-2">
              Aucun bloc structuré renseigné.
            </p>
          ) : (
            <div className="max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
              {renderStepTree(workout.steps)}
            </div>
          )}
        </div>

        {/* PIED DE PAGE & BOUTON FERMER */}
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
    </div>
  );
};