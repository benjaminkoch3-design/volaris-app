// src/components/coach/CoachCalendarView.tsx

import React, { useState } from "react";
import { AthleteProfile, Plan, Workout, WorkoutType } from "../../types";

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

// 🎨 Palette calquée exclusivement sur les clés de WORKOUT_TYPES_CONFIG (constants/index.ts)
const WORKOUT_COLORS: Record<
  Exclude<WorkoutType, "repos">,
  { bg: string; text: "dark" | "light" }
> = {
  recup: { bg: "#38bdf8", text: "dark" },         // sky-400
  footing: { bg: "#34d399", text: "dark" },       // emerald-400
  footing_actif: { bg: "#059669", text: "light" },// emerald-600/700
  cotes: { bg: "#92400e", text: "light" },        // amber-800
  vma: { bg: "#ef4444", text: "light" },          // red-500
  seuil: { bg: "#f97316", text: "light" },        // orange-500
  specifique: { bg: "#a855f7", text: "light" },   // purple-500
  sortie_longue: { bg: "#f472b6", text: "dark" }, // pink-400/500
  activation: { bg: "#1d4ed8", text: "light" },   // blue-700
  course: { bg: "#f59e0b", text: "dark" },        // amber-400/500
};

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

  // Détection stricte d'un débriefing effectué par l'athlète
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
      if (w.isRest || w.is_rest || w.type === "repos") return;

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
            <div key={`empty_${i}`} className="min-h-[90px] bg-stone-50/50 dark:bg-stone-950/20 rounded-2xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const daySessions = sessionsByDate[dateStr] || [];

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[95px] p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-start group ${
                  isToday
                    ? "bg-[#CDCF61]/15 border-[#CDCF61]/70 shadow-md"
                    : daySessions.length > 0
                    ? "bg-stone-50/80 dark:bg-stone-950/90 border-stone-200 dark:border-stone-800 hover:border-[#CDCF61]/60 hover:bg-stone-100 dark:hover:bg-stone-950"
                    : "bg-stone-50/40 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/50 hover:border-stone-300 dark:hover:border-stone-700"
                }`}
              >
                {/* NUMÉRO DU JOUR */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center ${
                      isToday
                        ? "bg-[#CDCF61] text-stone-950 font-extrabold"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* LISTE DES SÉANCES DU JOUR */}
                <div className="space-y-1 w-full overflow-y-auto max-h-[110px] pr-0.5 custom-scrollbar">
                  {daySessions.map((s, idx) => {
                    const w = s.workout as any;
                    const isDone = isWorkoutDebriefed(w);

                    // Couleur calquée sur les clés exactes de WORKOUT_TYPES_CONFIG
                    const typeKey = (w.type || "footing") as Exclude<WorkoutType, "repos">;
                    const colorScheme =
                      WORKOUT_COLORS[typeKey] ||
                      (w.color ? { bg: w.color, text: "light" } : { bg: "#34d399", text: "dark" });

                    const isDarkText = colorScheme.text === "dark";
                    const workoutTitle = w.title || w.type || "Séance";
                    const initialLetter = (s.athlete.name || "A").trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: colorScheme.bg,
                          borderColor: `${colorScheme.bg}ee`,
                        }}
                        className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md border flex items-center justify-between gap-1 transition-all shadow-xs w-full ${
                          isDarkText ? "text-stone-950" : "text-white"
                        }`}
                        title={`${s.athlete.name} • ${workoutTitle} ${
                          isDone
                            ? "(Validée ✓)"
                            : isPast
                            ? "(Non débriefée ✕)"
                            : "(Prévue)"
                        }`}
                      >
                        {/* Initiale de l'athlète + Titre exact */}
                        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black shrink-0 ${
                              isDarkText ? "bg-stone-950/20 text-stone-950" : "bg-black/25 text-white"
                            }`}
                          >
                            {initialLetter}
                          </span>
                          <span className="truncate tracking-tight font-extrabold">
                            {workoutTitle}
                          </span>
                        </div>

                        {/* Statut d'exécution */}
                        {isDone ? (
                          <span
                            className="text-[8.5px] font-black text-emerald-950 bg-white/95 px-1 rounded shrink-0 leading-none py-0.5 shadow-xs"
                            title="Validée"
                          >
                            ✓
                          </span>
                        ) : isPast ? (
                          <span
                            className={`text-[8px] font-black px-1 rounded shrink-0 leading-none py-0.5 ${
                              isDarkText ? "text-white bg-rose-700" : "text-white bg-black/40"
                            }`}
                            title="Non débriefée"
                          >
                            ✕
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};