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
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* BANDEAU NAVIGATION MOIS */}
      <div className="bg-stone-900 border border-stone-800 p-4 rounded-3xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] font-black text-[#CDCF61] uppercase tracking-widest block">
            Agenda d'Entraînement
          </span>
          <h2 className="text-base font-black uppercase text-stone-100 mt-0.5">
            {MONTHS_FR[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="text-[10px] font-bold text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 transition cursor-pointer"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 transition cursor-pointer"
          >
            ▶
          </button>
        </div>
      </div>

      {/* GRILLE MENSUELLE */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-3.5 shadow-xl space-y-2">
        <div className="grid grid-cols-7 gap-1 text-center pb-2 border-b border-stone-800/80">
          {DAYS_SHORT_FR.map((d) => (
            <span key={d} className="text-[10px] font-black uppercase text-stone-400">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty_${i}`} className="min-h-[68px] bg-stone-950/20 rounded-2xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const daySessions = sessionsByDate[dateStr] || [];

            const debriefedCount = daySessions.filter(
              (s) => s.workout.completedRpe !== undefined || s.workout.completed || s.workout.completedKm
            ).length;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[70px] p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isToday
                    ? "bg-[#CDCF61]/10 border-[#CDCF61]/60 shadow-md"
                    : daySessions.length > 0
                    ? "bg-stone-950/90 border-stone-800 hover:border-[#CDCF61]/50 hover:bg-stone-950"
                    : "bg-stone-950/40 border-stone-800/50 hover:border-stone-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday ? "bg-[#CDCF61] text-stone-950" : "text-stone-300"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {daySessions.length > 0 && (
                    <span
                      className={`text-[8px] font-black px-1 py-0.2 rounded-md ${
                        debriefedCount > 0
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-[#CDCF61]/20 text-[#CDCF61]"
                      }`}
                    >
                      {debriefedCount > 0 ? `✓ ${debriefedCount}` : daySessions.length}
                    </span>
                  )}
                </div>

                {/* PASTILLES AVEC INDICATEUR DE BILAN DÉBRIEFÉ */}
                <div className="space-y-1 mt-1">
                  {daySessions.slice(0, 2).map((s, idx) => {
                    const isDebriefed =
                      s.workout.completedRpe !== undefined ||
                      Boolean(s.workout.athleteComment) ||
                      Boolean(s.workout.completedKm);

                    const typeConfig = getWorkoutTypeConfig(s.workout.type);
                    const firstName = (s.athlete.name || "Athlète").split(" ")[0];

                    return (
                      <div
                        key={idx}
                        className={`text-[7.5px] font-bold px-1 py-0.5 rounded truncate border flex items-center justify-between ${
                          isDebriefed
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-800"
                            : typeConfig.badgeClass
                        }`}
                        title={`${s.athlete.name} : ${s.workout.title || s.workout.type} ${isDebriefed ? "(Débriefé)" : ""}`}
                      >
                        <span className="truncate">{firstName}</span>
                        {isDebriefed && <span className="text-[7px] text-emerald-400 ml-0.5">✓</span>}
                      </div>
                    );
                  })}

                  {daySessions.length > 2 && (
                    <span className="text-[7.5px] font-black text-stone-500 block text-right">
                      +{daySessions.length - 2}
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