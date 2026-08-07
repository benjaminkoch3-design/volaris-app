// src/components/analytics/TrainingLoadCard.tsx

import React from "react";
import { Workout } from "../../types";
import {
  calculateWeeklyLoad,
  calculateTotalPlanLoad,
  calculateLoadVariationPercentage,
} from "../../utils/trainingLoad";

interface TrainingLoadCardProps {
  workouts: Workout[];
  currentWeekNum: number;
  completedWorkouts?: Record<string, boolean>;
}

export const TrainingLoadCard: React.FC<TrainingLoadCardProps> = ({
  workouts,
  currentWeekNum,
  completedWorkouts,
}) => {
  // Charge semaine en cours
  const currentWeekLoad = calculateWeeklyLoad(workouts, currentWeekNum, completedWorkouts);
  
  // Charge semaine précédente
  const previousWeekLoad = currentWeekNum > 1
    ? calculateWeeklyLoad(workouts, currentWeekNum - 1, completedWorkouts)
    : 0;

  // Variation de la charge (% par rapport à S-1)
  const variationPct = calculateLoadVariationPercentage(currentWeekLoad, previousWeekLoad);

  // Charge totale cumulée du plan
  const totalPlanLoad = calculateTotalPlanLoad(workouts, completedWorkouts);

  return (
    <div className="bg-stone-900 border border-stone-800 p-4 rounded-3xl space-y-3 shadow-xl">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <span className="text-[10px] font-bold uppercase text-[#4D80B3] tracking-wider">
          📊 Charge d'Entraînement (Foster)
        </span>
        <span className="text-[10px] text-stone-500 font-semibold">Semaine {currentWeekNum}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* CHARGE SEMAINE EN BLEU MÉTAL (#4D80B3) */}
        <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800/80">
          <span className="block text-[8px] font-bold text-stone-400 uppercase">
            Charge Semaine {currentWeekNum}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-[#4D80B3]">{currentWeekLoad}</span>
            <span className="text-[9px] text-stone-500 font-bold">pts</span>
          </div>

          {/* INDICATEUR D'ÉVOLUTION EN VERT ÉMERAUDE (#4DB380) OU TERRACOTTA (#B34D4D) */}
          {currentWeekNum > 1 && (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold">
              <span className={variationPct >= 0 ? "text-[#4DB380]" : "text-[#B34D4D]"}>
                {variationPct >= 0 ? `▲ +${variationPct}%` : `▼ ${variationPct}%`}
              </span>
              <span className="text-stone-500">vs S{currentWeekNum - 1}</span>
            </div>
          )}
        </div>

        {/* CHARGE CUMULÉE PLAN */}
        <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800/80">
          <span className="block text-[8px] font-bold text-stone-400 uppercase">
            Charge Totale Plan
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-stone-100">{totalPlanLoad}</span>
            <span className="text-[9px] text-stone-500 font-bold">pts</span>
          </div>
          <span className="text-[8px] text-stone-500 block mt-1">Séances validées</span>
        </div>
      </div>
    </div>
  );
};