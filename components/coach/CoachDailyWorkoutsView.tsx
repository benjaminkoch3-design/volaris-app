// src/components/coach/CoachDailyWorkoutsView.tsx

import React from "react";
import { AthleteProfile, Workout, Plan } from "../../types";
import { getWorkoutTypeConfig, safeFormatDateFr } from "../../utils/calculations";

export interface AthleteDailySession {
  athlete: AthleteProfile;
  plan: Plan | null;
  workout: Workout;
}

interface CoachDailyWorkoutsViewProps {
  selectedDateStr: string; // Format "YYYY-MM-DD"
  dailySessions: AthleteDailySession[];
  completedWorkouts: Record<string, boolean>;
  onSelectWorkoutDetail: (workout: Workout, plan: Plan | null) => void;
  onBackToCalendar?: () => void;
}

export const CoachDailyWorkoutsView: React.FC<CoachDailyWorkoutsViewProps> = ({
  selectedDateStr,
  dailySessions,
  completedWorkouts,
  onSelectWorkoutDetail,
  onBackToCalendar,
}) => {
  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];
  const formattedDate = safeFormatDateFr(selectedDateStr);

  const getRpeColor = (rpeStr?: string) => {
    if (!rpeStr) return "#CDCF61";
    const rpe = parseInt(rpeStr, 10);
    if (rpe <= 3) return "#10b981";
    if (rpe <= 5) return "#f59e0b";
    if (rpe <= 7) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* EN-TÊTE DE LA JOURNÉE */}
      <div className="flex justify-between items-center bg-stone-900 border border-stone-800 p-4 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[#CDCF61] uppercase tracking-widest block">
              {isToday ? "Séances d'Aujourd'hui" : "Séances du Jour"}
            </span>
            {isToday && (
              <span className="text-[9px] font-black uppercase bg-[#CDCF61] text-stone-950 px-2 py-0.5 rounded-full">
                En direct
              </span>
            )}
          </div>
          <h2 className="text-base font-black uppercase text-stone-100 mt-0.5">
            {formattedDate}
          </h2>
        </div>

        {onBackToCalendar && (
          <button
            type="button"
            onClick={onBackToCalendar}
            className="text-[10px] font-black uppercase text-stone-300 hover:text-white bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 transition cursor-pointer"
          >
            📅 Voir l'Agenda
          </button>
        )}
      </div>

      {/* LISTE DES SÉANCES DU JOUR DES ATHLÈTES */}
      {dailySessions.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center mx-auto text-xl text-[#CDCF61]">
            🏃‍♂️
          </div>
          <p className="text-xs text-stone-400 font-bold">
            Aucune séance programmée pour cette journée.
          </p>
          <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
            Vos athlètes sont soit en repos, soit n'ont pas encore de plan actif sur cette date.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {dailySessions.map(({ athlete, plan, workout }) => {
            const isDone = completedWorkouts[workout.id] || workout.completed;
            const typeConfig = getWorkoutTypeConfig(workout.type);
            const rpeColor = getRpeColor(workout.rpe);

            return (
              <div
                key={`${athlete.id}_${workout.id}`}
                onClick={() => onSelectWorkoutDetail(workout, plan)}
                className={`bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/50 p-4 rounded-3xl space-y-3 shadow-xl transition-all cursor-pointer group border-l-4 ${typeConfig.borderClass}`}
              >
                {/* ATHLÈTE ET STATUT */}
                <div className="flex justify-between items-center border-b border-stone-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-xs text-[#CDCF61]">
                      {athlete.name ? athlete.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-stone-100 group-hover:text-[#CDCF61] transition">
                        {athlete.name}
                      </h4>
                      <span className="text-[9.5px] text-stone-500 font-mono">
                        VMA : {athlete.vma || "N/A"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border transition ${
                      isDone
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800"
                        : "bg-stone-950 text-stone-400 border-stone-800"
                    }`}
                  >
                    {isDone ? "✓ Réalisée" : "À Faire"}
                  </span>
                </div>

                {/* DÉTAIL SÉANCE (STYLE DASHBOARD) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-black ${typeConfig.badgeClass}`}
                      >
                        {typeConfig.label}
                      </span>
                      <h3 className="text-xs font-black uppercase text-stone-100">
                        {workout.isRest ? "Repos" : workout.title || workout.sessionName || "Séance"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {workout.km && (
                        <span className="text-[9.5px] font-black bg-stone-950 text-stone-100 px-2 py-0.5 rounded-md border border-stone-800">
                          {workout.completedKm !== undefined
                            ? `${workout.completedKm} km (réel)`
                            : `${workout.km} km`}
                        </span>
                      )}

                      {workout.rpe && (
                        <span
                          style={{
                            color: rpeColor,
                            borderColor: `${rpeColor}40`,
                            backgroundColor: `${rpeColor}15`,
                          }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-md border"
                        >
                          RPE {workout.completedRpe ?? workout.rpe}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {workout.description && (
                    <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">
                      {workout.description}
                    </p>
                  )}

                  {workout.steps && workout.steps.length > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[#CDCF61] pt-1.5 border-t border-stone-800/60">
                      <span>{workout.steps.length} bloc(s) de fractionné</span>
                      <span className="underline font-bold">Consulter la séance ➔</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};