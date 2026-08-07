// src/components/plan/ActivePlanView.tsx

import React from "react";
import { Plan, Workout, WeekType } from "../../types";
import { WEEK_TYPES_CONFIG } from "../../constants";
import {
  getCurrentWeekNumber,
  getWeekTypeLabel,
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKm,
  getWeekDateRange,
  getExactDayDate,
  getWorkoutTypeConfig,
} from "../../utils/calculations";

interface ActivePlanViewProps {
  activePlan: Plan;
  completedWorkouts: Record<string, boolean>;
  openWeeks: Record<number, boolean>;
  toggleWeekAccordion: (wNum: number) => void;
  onEditActivePlan: () => void;
  onChangePlanRequest?: () => void;
  onSelectWorkoutDetail: (workout: Workout) => void;
  onToggleWorkout: (id: string) => void;
  onNavigateToVolumeChart: () => void;
}

const getRpeGradientColor = (rpeStr?: string) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = parseInt(rpeStr, 10);
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

// Utilitaire pour récupérer la classe CSS du badge de phase de semaine
const getWeekTypeBadgeClass = (weekTypeObj?: { type: WeekType; customLabel?: string }) => {
  if (!weekTypeObj) return "bg-stone-800 text-stone-300 border-stone-700";
  const config = WEEK_TYPES_CONFIG[weekTypeObj.type];
  return config ? config.badgeClass : "bg-stone-800 text-stone-300 border-stone-700";
};

export const ActivePlanView: React.FC<ActivePlanViewProps> = ({
  activePlan,
  completedWorkouts,
  openWeeks,
  toggleWeekAccordion,
  onEditActivePlan,
  onSelectWorkoutDetail,
  onToggleWorkout,
}) => {
  const durationWeeksStr = String(activePlan.durationWeeks || "4");
  const totalWeeksNum =
    typeof activePlan.durationWeeks === "number"
      ? activePlan.durationWeeks
      : parseInt(String(activePlan.durationWeeks), 10) || 4;

  const currentWeekNum = getCurrentWeekNumber(
    activePlan.startDate,
    durationWeeksStr
  );

  return (
    <div className="space-y-6 font-sans">
      {/* BANNIÈRE DE HEADER DU PLAN ACTIF */}
      <div className="bg-gradient-to-br from-[#CF9A61] to-[#b88652] rounded-3xl p-6 text-stone-950 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        {/* TITRE ET NOMBRE DE SEMAINES */}
        <div>
          <span className="bg-stone-950/20 text-stone-950 font-bold text-[10px] uppercase px-3 py-1 rounded-full tracking-wider inline-block mb-1.5">
            Plan Actif • {activePlan.targetDistance}
          </span>
          <h3 className="text-xl font-black uppercase tracking-tight mb-0.5">
            {activePlan.name}
          </h3>
          <p className="text-xs font-semibold text-stone-950/80">
            {durationWeeksStr} semaines de préparation
          </p>
        </div>

        {/* PHASE D'ENTRAÎNEMENT & BOUTON MODIFIER */}
        <div className="flex justify-between items-center pt-2 border-t border-stone-950/10 flex-wrap gap-2">
          {(() => {
            const curWeekType = activePlan.weekTypes?.[currentWeekNum];
            const badgeClass = getWeekTypeBadgeClass(curWeekType);
            return curWeekType ? (
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-sm ${badgeClass}`}>
                Phase en cours : {getWeekTypeLabel(curWeekType)}
              </span>
            ) : (
              <div />
            );
          })()}

          <button
            type="button"
            onClick={onEditActivePlan}
            className="text-[10px] font-black text-stone-950 bg-white/30 hover:bg-white/40 border border-white/40 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* EN-TÊTE DES SEMAINES */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
            Semaines du programme ({durationWeeksStr})
          </h4>
        </div>

        {/* ACCORDÉONS SEMAINE PAR SEMAINE */}
        <div className="space-y-3">
          {Array.from({ length: totalWeeksNum }, (_, i) => i + 1).map((wNum) => {
            const weekTypeVal = activePlan.weekTypes?.[wNum];
            const wLabel = getWeekTypeLabel(weekTypeVal);
            const badgeClass = getWeekTypeBadgeClass(weekTypeVal);
            const isCurrentWeek = wNum === currentWeekNum;

            const isOpen = openWeeks[wNum] ?? isCurrentWeek;

            const weekWorkouts = activePlan.workouts.filter(
              (w) => w.weekNumber === wNum
            );
            const nonRestCount = weekWorkouts.filter((w) => !w.isRest).length;

            const weeklyPlannedKm = calculateWeeklyPlannedKm(
              activePlan.workouts,
              wNum
            );
            const weeklyCompletedKm = calculateWeeklyCompletedKm(
              activePlan.workouts,
              wNum,
              completedWorkouts
            );

            return (
              <div
                key={wNum}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isCurrentWeek
                    ? "border-[#CF9A61]/80 bg-stone-900/90 shadow-xl"
                    : "border-stone-800/80 bg-stone-900/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleWeekAccordion(wNum)}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-stone-800/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black uppercase text-stone-100">
                        Semaine {wNum}
                      </span>

                      {isCurrentWeek && (
                        <span className="text-[9px] font-black uppercase bg-[#CF9A61] text-stone-950 px-2 py-0.5 rounded-full">
                          En cours
                        </span>
                      )}

                      {weekTypeVal && (
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${badgeClass}`}>
                          {wLabel}
                        </span>
                      )}

                      <span className="text-[9px] font-black bg-stone-950 text-stone-100 px-2 py-0.5 rounded-md border border-stone-800">
                        {weeklyPlannedKm.toFixed(1)} km prévus
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-stone-400 flex items-center gap-2">
                      <span>
                        {getWeekDateRange(activePlan.startDate, wNum)} •{" "}
                        {nonRestCount} séance(s)
                      </span>
                      {weeklyCompletedKm > 0 && (
                        <span className="text-[#4DB380] font-extrabold">
                          (✓ {weeklyCompletedKm.toFixed(1)} km)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-xs font-bold bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-0 space-y-3 border-t border-stone-800/60">
                    <div className="space-y-2.5 pt-3">
                      {weekWorkouts.map((w) => {
                        const isDone = completedWorkouts[w.id];
                        const exactDate = getExactDayDate(
                          activePlan.startDate,
                          w.weekNumber,
                          w.dayIndex
                        );
                        const typeConfig = getWorkoutTypeConfig(w.type);
                        const rpeColor = getRpeGradientColor(w.rpe);

                        if (w.isRest) {
                          return (
                            <div
                              key={w.id}
                              className="p-3 rounded-2xl border border-stone-800/60 bg-stone-950/30 text-stone-500 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold uppercase text-stone-100">
                                  {w.dayName}
                                </span>
                                <span className="text-[10px] text-stone-500">
                                  {exactDate}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-stone-500 uppercase">
                                Repos
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={w.id}
                            onClick={() => onSelectWorkoutDetail(w)}
                            className={`p-3.5 rounded-2xl border border-l-4 transition space-y-2 cursor-pointer ${typeConfig.borderClass} ${
                              isDone
                                ? "bg-stone-950/40 border-stone-800 text-stone-500"
                                : "bg-stone-950/90 border-stone-800 text-stone-100 hover:border-[#CF9A61]/60 shadow-md"
                            }`}
                          >
                            <div className="flex justify-between items-center pb-1.5 border-b border-stone-800/60">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-stone-100 uppercase tracking-wide">
                                  {w.dayName}
                                </span>
                                <span className="text-[10px] font-bold text-stone-400">
                                  {exactDate}
                                </span>
                              </div>
                              {w.type !== "repos" && (
                                <span
                                  className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-extrabold ${typeConfig.badgeClass}`}
                                >
                                  {typeConfig.label}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex items-center gap-2.5 flex-1">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleWorkout(w.id);
                                  }}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs font-bold transition flex-shrink-0 ${
                                    isDone
                                      ? "bg-[#4DB380]/20 border-[#4DB380]/40 text-[#4DB380]"
                                      : "border-stone-700 text-stone-400 hover:border-[#CF9A61]"
                                  }`}
                                  title="Cocher / Décocher la séance"
                                >
                                  {isDone ? "✓" : ""}
                                </div>
                                <h5
                                  className={`text-xs font-bold ${
                                    isDone
                                      ? "line-through text-stone-500"
                                      : "text-stone-100"
                                  }`}
                                >
                                  {w.title}
                                </h5>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {w.km && (
                                  <span className="text-[9px] font-extrabold bg-stone-900 text-stone-100 px-2 py-0.5 rounded-md border border-stone-800">
                                    {w.km} km
                                  </span>
                                )}

                                {w.rpe && (
                                  <span
                                    style={{
                                      color: rpeColor,
                                      borderColor: `${rpeColor}40`,
                                      backgroundColor: `${rpeColor}15`,
                                    }}
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-md border"
                                  >
                                    RPE {w.rpe}/10
                                  </span>
                                )}
                                <span className="text-xs text-[#CF9A61] font-bold ml-1">
                                  ➔
                                </span>
                              </div>
                            </div>

                            <p
                              className={`text-[11px] leading-relaxed line-clamp-2 ${
                                isDone ? "text-stone-500" : "text-stone-300"
                              }`}
                            >
                              {w.description}
                            </p>

                            {w.steps && w.steps.length > 0 && (
                              <div className="flex items-center justify-between text-[10px] font-semibold text-[#CF9A61]/90 pt-1 border-t border-stone-800/80">
                                <span>{w.steps.length} bloc(s)</span>
                                <span className="font-bold underline">
                                  Voir la séance ➔
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};