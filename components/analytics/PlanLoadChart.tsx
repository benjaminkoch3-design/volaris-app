// src/components/analytics/PlanLoadChart.tsx

import React from "react";
import { Workout } from "../../types";

interface PlanLoadChartProps {
  workouts: Workout[];
  totalWeeks: number;
  currentWeekNum: number;
  completedWorkouts?: Record<string, boolean>;
}

const calculatePlannedWorkoutLoad = (w: Workout): number => {
  if (w.isRest) return 0;
  const distOrTime = parseFloat(w.km || "0");
  const durationMin = w.completedTimeMinutes || (distOrTime > 0 ? distOrTime * 5 : 45);
  const targetRpe = w.rpe ? parseFloat(w.rpe) : 5;
  return Math.round(durationMin * targetRpe);
};

const calculateCompletedWorkoutLoad = (w: Workout, isCompleted: boolean): number => {
  if (w.isRest || !isCompleted) return 0;
  const completedKm = w.completedKm ? w.completedKm : parseFloat(w.km || "0");
  const durationMin = w.completedTimeMinutes || (completedKm > 0 ? completedKm * 5 : 45);
  const actualRpe = w.completedRpe !== undefined ? w.completedRpe : (w.rpe ? parseFloat(w.rpe) : 5);
  return Math.round(durationMin * actualRpe);
};

export const PlanLoadChart: React.FC<PlanLoadChartProps> = ({
  workouts,
  totalWeeks,
  completedWorkouts,
}) => {
  const safeTotalWeeks = Math.max(totalWeeks || 1, 1);

  const weeklyData = Array.from({ length: safeTotalWeeks }, (_, i) => i + 1).map((wNum) => {
    const weekWorkouts = workouts.filter((w) => w.weekNumber === wNum && !w.isRest);
    const plannedLoad = weekWorkouts.reduce((sum, w) => sum + calculatePlannedWorkoutLoad(w), 0);
    const completedLoad = weekWorkouts.reduce((sum, w) => {
      const isDone = completedWorkouts ? Boolean(completedWorkouts[w.id]) : false;
      return sum + calculateCompletedWorkoutLoad(w, isDone);
    }, 0);

    return {
      weekNum: wNum,
      plannedLoad,
      completedLoad,
      hasSession: weekWorkouts.length > 0,
    };
  });

  const maxWeeklyLoad = Math.max(
    ...weeklyData.map((d) => Math.max(d.plannedLoad, d.completedLoad)),
    200
  );
  const totalPlannedLoad = weeklyData.reduce((acc, d) => acc + d.plannedLoad, 0);
  const totalCompletedLoad = weeklyData.reduce((acc, d) => acc + d.completedLoad, 0);

  const width = 1000;
  const height = 220;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const baselineY = height - paddingBottom;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = baselineY - paddingTop;

  const getX = (index: number) => {
    if (safeTotalWeeks <= 1) return paddingLeft + usableWidth / 2;
    return paddingLeft + (index / (safeTotalWeeks - 1)) * usableWidth;
  };
  const getY = (value: number) => baselineY - (value / maxWeeklyLoad) * usableHeight;

  const pointsPlanned = weeklyData.map((d, i) => `${getX(i)},${getY(d.plannedLoad)}`).join(" ");
  const pointsCompleted = weeklyData.map((d, i) => `${getX(i)},${getY(d.completedLoad)}`).join(" ");
  const areaCompleted = `${getX(0)},${baselineY} ${pointsCompleted} ${getX(safeTotalWeeks - 1)},${baselineY}`;

  const tickStep = safeTotalWeeks > 24 ? 4 : safeTotalWeeks > 14 ? 2 : 1;

  return (
    <div className="bg-stone-900 border border-stone-800 p-5 md:p-6 rounded-3xl space-y-4 shadow-xl font-sans w-full">
      <div className="flex justify-between items-center border-b border-stone-800 pb-3">
        <div>
          <span className="text-xs md:text-sm font-black uppercase text-stone-100 tracking-wider block">
            Charge Totale du Plan
          </span>
          <span className="text-[11px] md:text-xs font-bold text-stone-300">
            <span className="text-[#CF9A61] font-black">{totalCompletedLoad}</span> / {totalPlannedLoad} pts réalisés
          </span>
        </div>
        <span className="text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-xl bg-stone-800 text-stone-300 border border-stone-700">
          Macrocycle ({safeTotalWeeks} sem.)
        </span>
      </div>

      <div className="relative bg-stone-950/80 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="planCompletedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CF9A61" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#CF9A61" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Axe Y (Valeurs) */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyLoad)}
          </text>
          <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyLoad / 2)}
          </text>
          <text x={paddingLeft - 8} y={baselineY + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            0
          </text>

          {/* Lignes horizontales de quadrillage */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#27272a" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={width - paddingRight} y2={paddingTop + usableHeight / 2} stroke="#27272a" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#3f3f46" strokeWidth="1.5" />

          {/* Zone sous la courbe réalisée */}
          <polygon points={areaCompleted} fill="url(#planCompletedGradient)" />

          {/* Courbe prévue & courbe réalisée */}
          <polyline points={pointsPlanned} fill="none" stroke="#737373" strokeWidth="2" strokeDasharray="4,4" />
          <polyline points={pointsCompleted} fill="none" stroke="#CF9A61" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Repères et abscisses alignés */}
          {weeklyData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.completedLoad);
            const showLabel = (d.weekNum - 1) % tickStep === 0 || d.weekNum === safeTotalWeeks;

            return (
              <g key={d.weekNum}>
                <line x1={cx} y1={baselineY} x2={cx} y2={baselineY + 5} stroke="#52525b" strokeWidth="1.5" />

                {showLabel && (
                  <text
                    x={cx}
                    y={baselineY + 18}
                    fill="#a1a1aa"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    S{d.weekNum}
                  </text>
                )}

                <g className="group cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={d.completedLoad > 0 ? "4.5" : "3"}
                    className="fill-stone-950 stroke-[#CF6361] stroke-[2] transition-all group-hover:r-6"
                  />
                  <title>{`Semaine ${d.weekNum} — Réalisé : ${d.completedLoad} pts | Prévu : ${d.plannedLoad} pts`}</title>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[9px] md:text-xs font-semibold text-stone-300 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#CF9A61] inline-block"></span> Réalisé (Athlète)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu (Coach)
          </span>
        </div>
        <span className="text-stone-400 font-bold">Progression Plan</span>
      </div>
    </div>
  );
};