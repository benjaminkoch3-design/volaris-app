// app/components/plan/ActivePlanView.tsx

import React, { useState, useEffect } from "react";
import { Plan, Workout, WeekType } from "../../types";
import { WEEK_TYPES_CONFIG } from "../../constants";
import { supabase } from "../../lib/supabaseClient";
import {
  getCurrentWeekNumber,
  getWeekTypeLabel,
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKmDeduplicated,
  getWeekDateRange,
  getExactDayDate,
  getWorkoutTypeConfig,
} from "../../utils/calculations";

// Ordre strict du calendrier européen : Lundi = 0 -> Dimanche = 6
const DAYS_ORDER_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

interface ActivePlanViewProps {
  activePlan: Plan;
  completedWorkouts: Record<string, boolean>;
  openWeeks: Record<number, boolean>;
  toggleWeekAccordion: (wNum: number) => void;
  onEditActivePlan: () => void;
  onChangePlanRequest?: () => void;
  onSelectWorkoutDetail: (workout: Workout) => void;
  onToggleWorkout: (id: string) => void;
  onNavigateToVolumeChart?: () => void;
  onMoveWorkoutToDay?: (workoutId: string, targetWeekNumber: number, targetDayIndex: number) => void;
  isReadOnly?: boolean;
}

const getRpeGradientColor = (rpeStr?: string) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = parseInt(rpeStr, 10);
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

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
  onChangePlanRequest,
  onSelectWorkoutDetail,
  onToggleWorkout,
  onNavigateToVolumeChart,
  onMoveWorkoutToDay,
  isReadOnly = false,
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

  const [draggedWorkoutId, setDraggedWorkoutId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // État local pour stocker les notes du coach destinées à l'athlète : Record<dateStr, noteText>
  const [coachDayNotes, setCoachDayNotes] = useState<Record<string, string>>({});

  // Récupération des notes publiques du coach depuis Supabase
  useEffect(() => {
    const fetchPublicCoachNotes = async () => {
      const athleteId = activePlan.userId || (activePlan as any).user_id;
      if (!athleteId) return;

      const { data, error } = await supabase
        .from("coach_day_notes")
        .select("date, note_text")
        .eq("athlete_id", athleteId)
        .eq("visible_to_athlete", true);

      if (!error && data) {
        const notesMap: Record<string, string> = {};
        data.forEach((row: any) => {
          if (row.note_text && row.note_text.trim() !== "") {
            notesMap[row.date] = row.note_text;
          }
        });
        setCoachDayNotes(notesMap);
      }
    };

    fetchPublicCoachNotes();
  }, [activePlan]);

  const handleDragStart = (e: React.DragEvent, workoutId: string) => {
    e.dataTransfer.setData("text/plain", workoutId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedWorkoutId(workoutId);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetKey: string) => {
    if (dragOverTarget === targetKey) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetWeekNum: number,
    targetDayIndex: number
  ) => {
    e.preventDefault();
    setDragOverTarget(null);
    const wId = e.dataTransfer.getData("text/plain") || draggedWorkoutId;
    setDraggedWorkoutId(null);

    if (wId && onMoveWorkoutToDay) {
      onMoveWorkoutToDay(wId, targetWeekNum, targetDayIndex);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* BANNIÈRE HEADER */}
      <div className="bg-gradient-to-br from-[#CF9A61] to-[#b88652] rounded-3xl p-6 text-stone-950 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span className="bg-stone-950/20 text-stone-950 font-bold text-[10px] uppercase px-3 py-1 rounded-full tracking-wider inline-block mb-1.5">
              Plan Actif
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-0.5">
              {activePlan.name}
            </h3>
            <p className="text-xs font-semibold text-stone-950/80">
              {durationWeeksStr} semaines de préparation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activePlan.targetDistance && (
              <div className="bg-stone-950/20 border border-stone-950/20 px-3 py-1.5 rounded-2xl text-center min-w-[90px]">
                <span className="text-[9px] font-bold uppercase text-stone-950/70 block">
                  Distance
                </span>
                <span className="text-sm font-black text-stone-950 font-mono">
                  {activePlan.targetDistance}
                </span>
              </div>
            )}

            {activePlan.targetTime && (
              <div className="bg-stone-950/20 border border-stone-950/20 px-3 py-1.5 rounded-2xl text-center min-w-[90px]">
                <span className="text-[9px] font-bold uppercase text-stone-950/70 block">
                  Chrono visé
                </span>
                <span className="text-sm font-black text-stone-950 font-mono">
                  {activePlan.targetTime}
                </span>
              </div>
            )}

            {activePlan.elevationGain && (
              <div className="bg-stone-950/20 border border-stone-950/20 px-3 py-1.5 rounded-2xl text-center min-w-[80px]">
                <span className="text-[9px] font-bold uppercase text-stone-950/70 block">
                  Dénivelé
                </span>
                <span className="text-sm font-black text-stone-950 font-mono">
                  +{activePlan.elevationGain} m
                </span>
              </div>
            )}
          </div>
        </div>

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

          <div className="flex items-center gap-2">
            {onNavigateToVolumeChart && (
              <button
                type="button"
                onClick={onNavigateToVolumeChart}
                className="text-[10px] font-black text-stone-950 bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
              >
                Stats Plan ➔
              </button>
            )}

            <button
              type="button"
              onClick={onEditActivePlan}
              className="text-[10px] font-black text-stone-950 bg-white/30 hover:bg-white/40 border border-white/40 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
            >
              Modifier
            </button>
          </div>
        </div>
      </div>

      {/* SEMAINES */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
              Semaines du programme ({durationWeeksStr})
            </h4>
            <span className="text-[10px] text-stone-500 font-medium hidden sm:inline">
              • Glissez-déposez une séance d'un jour à l'autre
            </span>
          </div>

          {onChangePlanRequest && (
            <button
              type="button"
              onClick={onChangePlanRequest}
              className="text-[10px] font-bold uppercase text-stone-400 hover:text-stone-200 transition cursor-pointer"
            >
              Changer de plan
            </button>
          )}
        </div>

        <div className="space-y-4">
          {Array.from({ length: totalWeeksNum }, (_, i) => i + 1).map((wNum) => {
            const weekTypeVal = activePlan.weekTypes?.[wNum];
            const wLabel = getWeekTypeLabel(weekTypeVal);
            const badgeClass = getWeekTypeBadgeClass(weekTypeVal);
            const isCurrentWeek = wNum === currentWeekNum;
            const isOpen = openWeeks[wNum] ?? isCurrentWeek;

            const rawWeekWorkouts = activePlan.workouts.filter(
              (w) => w.weekNumber === wNum
            );
            const nonRestCount = rawWeekWorkouts.filter((w) => !w.isRest).length;

            const weeklyPlannedKm = calculateWeeklyPlannedKm(
              activePlan.workouts,
              wNum
            );

            const weeklyCompletedKm = calculateWeeklyCompletedKmDeduplicated(
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
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-stone-850/40 transition"
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
                  <div className="p-4 pt-0 border-t border-stone-800/60">
                    {/* LES 7 JOURS DE LA SEMAINE DU LUNDI (0) AU DIMANCHE (6) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                      {DAYS_ORDER_FR.map((dayLabel, dIdx) => {
                        const targetKey = `w${wNum}_d${dIdx}`;
                        const isDragOverThisDay = dragOverTarget === targetKey;

                        const exactDate = getExactDayDate(
                          activePlan.startDate,
                          wNum,
                          dIdx
                        );

                        // Calcul du format ISO AAAA-MM-JJ pour matcher la clé Supabase
                        const isoDateStr = (() => {
                          if (!exactDate) return "";
                          const parts = exactDate.split("/");
                          if (parts.length === 3) {
                            const [day, month, year] = parts;
                            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                          }
                          return exactDate;
                        })();

                        const coachNoteForDay = coachDayNotes[isoDateStr];

                        const dayWorkouts = rawWeekWorkouts.filter(
                          (w) => w.dayIndex === dIdx
                        );

                        const hasActiveWorkouts = dayWorkouts.some((w) => !w.isRest);

                        return (
                          <div
                            key={dIdx}
                            onDragOver={(e) => handleDragOver(e, targetKey)}
                            onDragLeave={(e) => handleDragLeave(e, targetKey)}
                            onDrop={(e) => handleDrop(e, wNum, dIdx)}
                            className={`rounded-2xl border transition-all p-3 flex flex-col justify-between space-y-2.5 ${
                              isDragOverThisDay
                                ? "border-[#CF9A61] bg-[#CF9A61]/10 ring-2 ring-[#CF9A61]/40"
                                : "border-stone-800/90 bg-stone-950/50"
                            }`}
                          >
                            <div className="flex justify-between items-center pb-1.5 border-b border-stone-800/60">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-stone-200 uppercase tracking-wide">
                                  {dayLabel}
                                </span>
                                <span className="text-[10px] font-bold text-stone-500">
                                  {exactDate}
                                </span>
                              </div>
                              <span className="text-[9px] font-semibold text-stone-500 uppercase">
                                {hasActiveWorkouts
                                  ? `${dayWorkouts.filter((w) => !w.isRest).length} séance(s)`
                                  : "Repos"}
                              </span>
                            </div>

                            {/* 📋 AFFICHAGE DE LA NOTE DU COACH POUR L'ATHLÈTE */}
                            {coachNoteForDay && (
                              <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-xl p-2.5 flex items-start gap-2 shadow-xs">
                                <span className="text-xs">📋</span>
                                <div>
                                  <span className="text-[9.5px] font-black uppercase text-[#CDCF61] block tracking-wider">
                                    Consigne du Coach :
                                  </span>
                                  <p className="text-[11px] font-medium text-stone-200 mt-0.5 whitespace-pre-line leading-snug">
                                    {coachNoteForDay}
                                  </p>
                                </div>
                              </div>
                            )}

                            {!hasActiveWorkouts ? (
                              <div className="py-4 text-center text-xs text-stone-600 italic select-none">
                                Repos
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {dayWorkouts
                                  .filter((w) => !w.isRest)
                                  .map((w) => {
                                    const isDone =
                                      completedWorkouts[w.id] || w.completed;
                                    const typeConfig = getWorkoutTypeConfig(w.type);
                                    const rpeColor = getRpeGradientColor(w.rpe);
                                    const isBeingDragged = draggedWorkoutId === w.id;

                                    return (
                                      <div
                                        key={w.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, w.id)}
                                        onClick={() => onSelectWorkoutDetail(w)}
                                        className={`p-3.5 rounded-xl border border-l-4 transition flex flex-col justify-between space-y-2.5 cursor-grab active:cursor-grabbing ${typeConfig.borderClass} ${
                                          isBeingDragged
                                            ? "opacity-30 border-dashed"
                                            : isDone
                                            ? "bg-stone-950/40 border-stone-800 text-stone-500"
                                            : "bg-stone-900 border-stone-800 hover:border-[#CF9A61]/60 text-stone-100 shadow-md"
                                        }`}
                                      >
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center gap-2">
                                            <span
                                              className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-extrabold ${typeConfig.badgeClass}`}
                                            >
                                              {typeConfig.label}
                                            </span>

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              {w.km && (
                                                <span className="text-[9px] font-extrabold bg-stone-950 text-stone-100 px-2 py-0.5 rounded-md border border-stone-800 font-mono">
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
                                                  RPE {w.completedRpe ?? w.rpe}/10
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onToggleWorkout(w.id);
                                                }}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                                                  isDone
                                                    ? "bg-[#4DB380]/20 border-[#4DB380]/40 text-[#4DB380]"
                                                    : "border-stone-700 text-stone-400 hover:border-[#CF9A61]"
                                                }`}
                                                title="Cocher / Décocher la séance"
                                              >
                                                {isDone ? "✓" : ""}
                                              </div>
                                              <h5
                                                className={`text-xs font-bold truncate ${
                                                  isDone
                                                    ? "line-through text-stone-500"
                                                    : "text-stone-100"
                                                }`}
                                              >
                                                {w.title || "Séance"}
                                              </h5>
                                            </div>
                                            <span className="text-xs text-[#CF9A61] font-bold ml-1">
                                              ➔
                                            </span>
                                          </div>

                                          {w.description && (
                                            <p
                                              className={`text-[11px] leading-relaxed line-clamp-2 ${
                                                isDone ? "text-stone-500" : "text-stone-300"
                                              }`}
                                            >
                                              {w.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
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