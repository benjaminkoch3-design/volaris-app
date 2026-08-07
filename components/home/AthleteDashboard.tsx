// src/components/home/AthleteDashboard.tsx

import React, { useState } from "react";
import { Plan, Workout } from "../../types";
import {
  safeFormatDateFr,
  getDaysUntilEvent,
  getCurrentWeekNumber,
  getWorkoutTypeConfig,
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKm,
} from "../../utils/calculations";
import { WeeklyLoadChart } from "../analytics/WeeklyLoadChart";

interface AthleteDashboardProps {
  activePlan: Plan | null;
  completedWorkouts: Record<string, boolean>;
  todayWorkouts: Workout[];
  onSelectWorkoutDetail: (workout: Workout) => void;
  onToggleWorkout: (id: string) => void;
  onCreatePlanRequest: () => void;
  onNavigateToVolumeChart: () => void;
  onOpenDebrief: (workout: Workout) => void;
  isReadOnly?: boolean;
}

const getWorkoutTypeHexColor = (type: string) => {
  switch (type) {
    case "footing":
      return "#4DB380";
    case "vma":
    case "fractionne":
      return "#B34D4D";
    case "seuil":
      return "#CF9A61";
    case "longue":
      return "#4D80B3";
    case "specifique":
      return "#CDCF61";
    default:
      return "#CF9A61";
  }
};

const getRpeGradientColor = (rpeStr?: string) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = parseInt(rpeStr, 10);
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

const getProgressBarColor = (pct: number) => {
  if (pct >= 85) return "bg-[#4DB380]";
  if (pct >= 50) return "bg-[#CDCF61]";
  return "bg-[#CF9A61]";
};

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({
  activePlan,
  completedWorkouts,
  todayWorkouts,
  onSelectWorkoutDetail,
  onCreatePlanRequest,
  onNavigateToVolumeChart,
  onOpenDebrief,
  isReadOnly = false,
}) => {
  const [syncedWorkouts, setSyncedWorkouts] = useState<Record<string, boolean>>({});

  const currentWeekNum = activePlan
    ? getCurrentWeekNumber(
        activePlan.startDate,
        activePlan.durationWeeks || "12"
      )
    : 1;

  const handleSyncToWatch = (workoutId: string) => {
    setSyncedWorkouts((prev) => ({ ...prev, [workoutId]: true }));
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* 1. HERO DÉCOMPTE ÉVÈNEMENT CIBLE */}
      {activePlan && (
        <div className="bg-gradient-to-r from-[#CF6361]/20 via-[#CF6361]/10 to-stone-900 border border-[#CF6361]/30 p-4 rounded-3xl flex items-center justify-between shadow-lg">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#CF6361] block">
              Évènement Cible • {activePlan.targetDistance}
            </span>
            <h3 className="text-sm font-black uppercase text-stone-100">
              {activePlan.name}
            </h3>
            <p className="text-[10px] text-stone-400 font-medium">
              Date : {safeFormatDateFr(activePlan.eventDate)}
            </p>
          </div>

          {(() => {
            const daysLeft = getDaysUntilEvent(activePlan.eventDate);
            return (
              <div className="text-right shrink-0 bg-[#CF6361]/20 px-3 py-2 rounded-2xl border border-[#CF6361]/40">
                <span className="text-lg font-black text-[#CF6361] block leading-none">
                  J-{daysLeft !== null ? daysLeft : "0"}
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#CF6361]/90">
                  Restants
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. CARTE SÉANCE DU JOUR */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div>
            <span className="text-[10px] font-extrabold text-[#CF9A61] uppercase tracking-widest block">
              Dashboard Athlète
            </span>
            <h2 className="text-base font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Séance du Jour
            </h2>
          </div>

          {/* BADGE DE SEMAINE PASSÉ EN BLANC PUR */}
          {activePlan && (
            <span className="text-[9.5px] font-extrabold uppercase px-2.5 py-1 rounded-full border bg-stone-950 border-stone-700 text-stone-100">
              S{currentWeekNum} / {activePlan.durationWeeks || "12"}
            </span>
          )}
        </div>

        {!activePlan ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-2xl">
              📋
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-stone-100">
                Aucun plan d'entraînement actif
              </h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed max-w-xs mx-auto">
                Créez votre plan personnalisé pour afficher vos séances du jour et suivre votre préparation.
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={onCreatePlanRequest}
                className="py-3 px-5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Créer un plan maintenant
              </button>
            )}
          </div>
        ) : todayWorkouts.length === 0 ? (
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-center space-y-2">
            <h4 className="text-xs font-black uppercase text-stone-200">
              Aucune séance programmée pour aujourd'hui
            </h4>
            <p className="text-[11px] text-stone-400 italic">
              Consultez votre plan complet pour les jours à venir ou profitez de ce temps pour récupérer !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayWorkouts.map((todayWorkout) => {
              const typeConfig = getWorkoutTypeConfig(todayWorkout.type);
              const typeHexColor = getWorkoutTypeHexColor(todayWorkout.type);
              const isDone = completedWorkouts[todayWorkout.id];
              const isSynced = syncedWorkouts[todayWorkout.id];
              const rpeColor = getRpeGradientColor(todayWorkout.rpe);

              if (todayWorkout.isRest) {
                return (
                  <div
                    key={todayWorkout.id}
                    className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-stone-400 block">
                        {todayWorkout.dayName} • Récupération
                      </span>
                      <h4 className="text-sm font-black uppercase text-stone-200">
                        Journée de Repos
                      </h4>
                      <p className="text-[11px] text-stone-400 italic">
                        Hydratation, sommeil et étirements doux au programme.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-stone-900 text-stone-400 px-3 py-1 rounded-xl border border-stone-800">
                      Repos
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={todayWorkout.id}
                  className={`p-4 rounded-2xl border border-l-8 ${typeConfig.borderClass} bg-stone-950/90 shadow-xl space-y-3 transition`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-[#CF9A61] block">
                        {todayWorkout.dayName}{" "}
                        {todayWorkout.sessionName ? `• ${todayWorkout.sessionName}` : ""}
                      </span>
                      <h3 className="text-base font-black uppercase tracking-tight text-stone-100 mt-0.5">
                        {todayWorkout.title}
                      </h3>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>
                  </div>

                  {todayWorkout.description && (
                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/60">
                      {todayWorkout.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                    <div className="flex items-center gap-2">
                      {todayWorkout.km && (
                        <span
                          style={{
                            color: typeHexColor,
                            borderColor: `${typeHexColor}40`,
                            backgroundColor: `${typeHexColor}15`,
                          }}
                          className="text-xs font-black px-2.5 py-1 rounded-lg border"
                        >
                          {todayWorkout.km} km
                        </span>
                      )}

                      {todayWorkout.rpe && (
                        <span
                          style={{
                            color: rpeColor,
                            borderColor: `${rpeColor}40`,
                            backgroundColor: `${rpeColor}15`,
                          }}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                        >
                          RPE {todayWorkout.rpe}/10
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectWorkoutDetail(todayWorkout)}
                      className="text-[11px] font-black text-[#CF9A61] hover:underline uppercase flex items-center gap-1 cursor-pointer"
                    >
                      Détails ➔
                    </button>
                  </div>

                  {!isReadOnly && (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSyncToWatch(todayWorkout.id)}
                        disabled={isSynced}
                        className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isSynced ? (
                          <span className="text-emerald-400">✓ Synchronisée sur la montre</span>
                        ) : (
                          <span>Synchroniser la séance sur la montre</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDebrief(todayWorkout)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                          isDone
                            ? "bg-stone-800 text-stone-400 border border-stone-700"
                            : "bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 shadow-md"
                        }`}
                      >
                        <span>
                          {isDone ? "✓ Voir le débriefing" : "Terminer & Débriefing"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. PROGRESSION DE LA SEMAINE */}
      {activePlan && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-stone-100 tracking-wider block">
                Progression de la semaine
              </span>
              <span className="text-[11px] font-bold text-stone-300 block">
                Semaine {currentWeekNum}
              </span>
            </div>

            <button
              type="button"
              onClick={onNavigateToVolumeChart}
              className="text-[10px] font-black text-stone-100 bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl uppercase hover:bg-stone-750 transition cursor-pointer"
            >
              Stats Plan ➔
            </button>
          </div>

          {(() => {
            const plannedKm = calculateWeeklyPlannedKm(activePlan.workouts, currentWeekNum);
            const completedKm = calculateWeeklyCompletedKm(activePlan.workouts, currentWeekNum, completedWorkouts);
            const pct = plannedKm > 0 ? Math.min(100, Math.round((completedKm / plannedKm) * 100)) : 0;
            const barColor = getProgressBarColor(pct);

            return (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-300 font-medium">
                    Volume accompli :{" "}
                    <strong className="text-[#4DB380] font-black">
                      {completedKm.toFixed(1)} km
                    </strong>{" "}
                    / {plannedKm.toFixed(1)} km
                  </span>
                  <span className="font-extrabold text-stone-100">{pct}%</span>
                </div>

                <div className="w-full h-2.5 bg-stone-950 rounded-full overflow-hidden p-0.5 border border-stone-800">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${barColor} rounded-full transition-all`}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. ÉVOLUTION DE LA CHARGE */}
      {activePlan && (
        <WeeklyLoadChart
          workouts={activePlan.workouts}
          currentWeekNum={currentWeekNum}
          completedWorkouts={completedWorkouts}
          onNavigateToVolumeChart={onNavigateToVolumeChart}
        />
      )}
    </div>
  );
};