// src/components/coach/CoachDailyWorkoutsView.tsx

import React from "react";
import { AthleteProfile, Workout, Plan } from "../../types";
import { getWorkoutTypeConfig, safeFormatDateFr } from "../../utils/calculations";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";

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

  const getRpeColor = (rpeVal?: number | string) => {
    if (!rpeVal) return "#CDCF61";
    const rpe = typeof rpeVal === "number" ? rpeVal : parseInt(rpeVal, 10);
    if (rpe <= 3) return "#10b981";
    if (rpe <= 5) return "#f59e0b";
    if (rpe <= 7) return "#f97316";
    return "#ef4444";
  };

  const renderBrandLogo = (nameStr: string) => {
    const lower = (nameStr || "").toLowerCase();
    if (lower.includes("strava")) return <StravaLogo className="w-3.5 h-3.5" />;
    if (lower.includes("coros")) return <CorosLogo className="w-3.5 h-3.5" />;
    return <GarminLogo className="w-3.5 h-3.5" />;
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

      {/* LISTE DES SÉANCES DU JOUR */}
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
        <div className="space-y-4">
          {dailySessions.map(({ athlete, plan, workout }) => {
            const hasDebrief =
              workout.completedRpe !== undefined &&
              workout.completedRpe !== null ||
              Boolean(workout.athleteComment) ||
              Boolean(workout.completedKm);

            const isDone = completedWorkouts[workout.id] || workout.completed || hasDebrief;
            const typeConfig = getWorkoutTypeConfig(workout.type);
            const rpeColor = getRpeColor(workout.completedRpe ?? workout.rpe);

            // Calcul allure réelle si km et temps présents
            let actualPaceStr = "";
            if (workout.completedKm && workout.completedTimeMinutes) {
              const totalSec = workout.completedTimeMinutes * 60;
              const secPerKm = Math.round(totalSec / workout.completedKm);
              const m = Math.floor(secPerKm / 60);
              const s = secPerKm % 60;
              actualPaceStr = `${m}:${s < 10 ? "0" : ""}${s} /km`;
            }

            return (
              <div
                key={`${athlete.id}_${workout.id}`}
                onClick={() => onSelectWorkoutDetail(workout, plan)}
                className={`bg-stone-900/95 border p-4 rounded-3xl space-y-3.5 shadow-xl transition-all cursor-pointer group border-l-4 ${
                  hasDebrief
                    ? "border-emerald-700/60 hover:border-emerald-500"
                    : "border-stone-800 hover:border-[#CDCF61]/50"
                } ${typeConfig.borderClass}`}
              >
                {/* ATHLÈTE ET STATUT DE DÉBRIEFING */}
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
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                      hasDebrief
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-700/70"
                        : isDone
                        ? "bg-stone-900 text-stone-300 border-stone-700"
                        : "bg-stone-950 text-stone-500 border-stone-800"
                    }`}
                  >
                    {hasDebrief ? "✓ Débriefé" : isDone ? "✓ Réalisé" : "À Faire"}
                  </span>
                </div>

                {/* SÉANCE PRÉVUE */}
                <div className="space-y-1.5">
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

                    <div className="flex items-center gap-1.5 text-[9.5px]">
                      {workout.km && (
                        <span className="font-bold bg-stone-950 text-stone-300 px-2 py-0.5 rounded-md border border-stone-800">
                          Prévu : {workout.km} km
                        </span>
                      )}
                    </div>
                  </div>

                  {workout.description && (
                    <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">
                      {workout.description}
                    </p>
                  )}
                </div>

                {/* ENCART SPÉCIAL DU BILAN DÉBRIEFING ATHLÈTE */}
                {hasDebrief && (
                  <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2.5 mt-2">
                    <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <span>📊 Bilan de l'athlète</span>
                      </span>

                      {workout.importedActivityName && (
                        <span className="text-[8.5px] font-bold text-stone-400 flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-800">
                          {renderBrandLogo(workout.importedActivityName)}
                          <span className="truncate max-w-[130px]">{workout.importedActivityName}</span>
                        </span>
                      )}
                    </div>

                    {/* MÉTRIQUES RÉELLES */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800/80">
                        <span className="block text-[8px] font-bold uppercase text-stone-400">Réel</span>
                        <span className="font-black text-[#CF9A61]">
                          {workout.completedKm !== undefined ? `${workout.completedKm} km` : "-"}
                        </span>
                      </div>

                      <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800/80">
                        <span className="block text-[8px] font-bold uppercase text-stone-400">Temps & Allure</span>
                        <span className="font-black text-stone-200">
                          {workout.completedTimeMinutes ? `${workout.completedTimeMinutes} min` : "-"}
                        </span>
                        {actualPaceStr && (
                          <span className="block text-[7.5px] text-stone-400 font-mono">{actualPaceStr}</span>
                        )}
                      </div>

                      <div
                        style={{
                          backgroundColor: `${rpeColor}15`,
                          borderColor: `${rpeColor}40`,
                          color: rpeColor,
                        }}
                        className="p-2 rounded-xl border flex flex-col justify-center"
                      >
                        <span className="block text-[8px] font-bold uppercase opacity-90">RPE Ressenti</span>
                        <span className="font-black text-xs">
                          {workout.completedRpe !== undefined ? `${workout.completedRpe}/10` : "-"}
                        </span>
                      </div>
                    </div>

                    {/* COMMENTAIRE & SENSATIONS DE L'ATHLÈTE */}
                    {workout.athleteComment && (
                      <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800/90 text-xs">
                        <span className="text-[8.5px] font-bold text-stone-400 uppercase block mb-0.5">
                          💬 Sensations :
                        </span>
                        <p className="text-stone-300 italic text-[11px] leading-relaxed">
                          « {workout.athleteComment} »
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};