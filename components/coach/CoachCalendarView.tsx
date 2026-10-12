// src/components/coach/CoachCalendarView.tsx

import React, { useState } from "react";
import { AthleteProfile, Plan, Workout } from "../../types";
import { getWorkoutTypeConfig } from "../../utils/calculations";

interface CoachCalendarViewProps {
  managedAthletes: AthleteProfile[];
  allPlans: Plan[];
  allWorkouts: Workout[];
  onSelectDate: (dateStr: string) => void;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_SHORT_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const CoachCalendarView: React.FC<CoachCalendarViewProps> = ({
  managedAthletes,
  allPlans,
  allWorkouts,
  onSelectDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleCurrentMonth = () => setCurrentDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Vérification stricte du débriefing réel de l'athlète
  const isWorkoutDebriefed = (w: any): boolean => {
    const hasExplicitFlag = w.completed === true || w.isCompleted === true;
    const hasRealRpe =
      w.completedRpe !== undefined &&
      w.completedRpe !== null &&
      Number(w.completedRpe) > 0;
    const hasRealComment =
      typeof w.athleteComment === "string" && w.athleteComment.trim().length > 0;
    const hasRealCompletedKm =
      w.completedKm !== undefined &&
      w.completedKm !== null &&
      Number(w.completedKm) > 0 &&
      w.isKmValidated === true;

    return hasExplicitFlag || hasRealRpe || hasRealComment || hasRealCompletedKm;
  };

  // Regroupement des séances par date
  const sessionsByDate: Record<string, { athlete: AthleteProfile; workout: Workout }[]> = {};

  allPlans.forEach((item) => {
    const plan = item as any;
    const isPlanActive = plan.isActive !== undefined ? plan.isActive : plan.is_active !== false;
    const isPlanArchived = plan.isArchived !== undefined ? plan.isArchived : plan.is_archived === true;

    if (!isPlanActive || isPlanArchived) return;

    const planUserId = plan.userId || plan.user_id;
    const athlete = managedAthletes.find((a) => a.id === planUserId);
    if (!athlete || (!plan.startDate && !plan.start_date)) return;

    const planStartDateStr: string = plan.startDate || plan.start_date;
    const planId = plan.id;

    const planWorkouts = allWorkouts.filter((wItem) => {
      const w = wItem as any;
      return w.planId === planId || w.plan_id === planId;
    });

    planWorkouts.forEach((wItem) => {
      const w = wItem as any;
      if (w.isRest || w.is_rest) return;

      const [sY, sM, sD] = planStartDateStr.split("-").map(Number);
      const workoutDateObj = new Date(sY, sM - 1, sD);
      const weekNum = w.weekNumber !== undefined ? w.weekNumber : (w.week_number || 1);
      const dayIdx = w.dayIndex !== undefined ? w.dayIndex : (w.day_index || 0);

      workoutDateObj.setDate(workoutDateObj.getDate() + ((weekNum - 1) * 7 + dayIdx));

      const y = workoutDateObj.getFullYear();
      const m = String(workoutDateObj.getMonth() + 1).padStart(2, "0");
      const d = String(workoutDateObj.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      if (!sessionsByDate[key]) sessionsByDate[key] = [];
      sessionsByDate[key].push({ athlete, workout: wItem });
    });
  });

  return (
    <div className="space-y-5 animate-fadeIn font-sans w-full">
      {/* BANDEAU NAVIGATION MOIS */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-3xl flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
        <div>
          <span className="text-[10px] font-black text-[#CDCF61] uppercase tracking-widest block">
            Agenda d'Entraînement
          </span>
          <h2 className="text-base font-black uppercase text-stone-900 dark:text-stone-100 mt-0.5">
            {MONTHS_FR[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="text-[10px] font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200 dark:border-stone-800 transition cursor-pointer"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200 dark:border-stone-800 transition cursor-pointer"
          >
            ▶
          </button>
        </div>
      </div>

      {/* GRILLE MENSUELLE */}
      <div className="bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-3xl p-3.5 shadow-sm dark:shadow-xl space-y-2 transition-colors">
        <div className="grid grid-cols-7 gap-1 text-center pb-2 border-b border-stone-200 dark:border-stone-800/80">
          {DAYS_SHORT_FR.map((d) => (
            <span key={d} className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-500">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty_${i}`} className="min-h-[85px] bg-stone-50/50 dark:bg-stone-950/20 rounded-2xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const daySessions = sessionsByDate[dateStr] || [];

            const debriefedCount = daySessions.filter((s) => isWorkoutDebriefed(s.workout)).length;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isToday
                    ? "bg-[#CDCF61]/15 border-[#CDCF61]/70 shadow-md"
                    : daySessions.length > 0
                    ? "bg-stone-50/80 dark:bg-stone-950/90 border-stone-200 dark:border-stone-800 hover:border-[#CDCF61]/60 hover:bg-stone-100 dark:hover:bg-stone-950"
                    : "bg-stone-50/40 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/50 hover:border-stone-300 dark:hover:border-stone-700"
                }`}
              >
                {/* EN-TÊTE DU JOUR */}
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? "bg-[#CDCF61] text-stone-950 font-extrabold"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {daySessions.length > 0 && (
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${
                        debriefedCount === daySessions.length
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : debriefedCount > 0
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-stone-200 dark:bg-[#CDCF61]/20 text-stone-700 dark:text-[#CDCF61] border-stone-300 dark:border-[#CDCF61]/30"
                      }`}
                    >
                      {debriefedCount > 0 ? `✓ ${debriefedCount}/${daySessions.length}` : daySessions.length}
                    </span>
                  )}
                </div>

                {/* LISTE DES PASTILLES SÉANCES DU JOUR */}
                <div className="space-y-1 mt-1.5">
                  {daySessions.slice(0, 3).map((s, idx) => {
                    const w = s.workout as any;
                    const isDone = isWorkoutDebriefed(w);

                    // Couleur exacte issue du plan ou repli sécurisé
                    const fallbackConfig = getWorkoutTypeConfig(w.type);
                    const workoutColor: string =
                      w.color ||
                      w.tagColor ||
                      (fallbackConfig as any)?.color ||
                      "#CF9A61";

                    // Titre réel de la séance
                    const workoutTitle = w.title || (fallbackConfig as any)?.label || "Séance";
                    const firstName = (s.athlete.name || "Athlète").split(" ")[0];

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: `${workoutColor}28`,
                          borderColor: `${workoutColor}60`,
                        }}
                        className="text-[8px] font-bold px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 transition-all shadow-xs"
                        title={`${s.athlete.name} • ${workoutTitle} ${
                          isDone
                            ? "(Réalisée ✓)"
                            : isPast
                            ? "(Non réalisée ✕)"
                            : "(À venir)"
                        }`}
                      >
                        {/* Athlète + Titre de la séance */}
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          <span className="font-black text-stone-950 dark:text-stone-100 truncate">
                            {firstName}
                          </span>
                          <span className="text-[7.5px] font-medium text-stone-700 dark:text-stone-300 truncate">
                            • {workoutTitle}
                          </span>
                        </div>

                        {/* Statut d'exécution conditionnel */}
                        {isDone ? (
                          <span
                            className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 shrink-0"
                            title="Séance validée"
                          >
                            ✓
                          </span>
                        ) : isPast ? (
                          <span
                            className="text-[9px] font-black text-rose-600 dark:text-rose-400 shrink-0"
                            title="Séance non réalisée"
                          >
                            ✕
                          </span>
                        ) : null}
                      </div>
                    );
                  })}

                  {daySessions.length > 3 && (
                    <span className="text-[7.5px] font-black text-stone-500 block text-right">
                      +{daySessions.length - 3} autre(s)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};