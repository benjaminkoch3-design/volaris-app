// src/components/analytics/WeeklyLoadChart.tsx

import React from "react";
import { Workout } from "../../types";
import { DAYS_LIST } from "../../constants";

interface WeeklyLoadChartProps {
  workouts: Workout[];
  currentWeekNum: number;
  completedWorkouts?: Record<string, boolean>;
  onNavigateToVolumeChart?: () => void;
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

export const WeeklyLoadChart: React.FC<WeeklyLoadChartProps> = ({
  workouts,
  currentWeekNum,
  completedWorkouts,
  onNavigateToVolumeChart,
}) => {
  const weekWorkouts = workouts.filter((w) => w.weekNumber === currentWeekNum && !w.isRest);

  const dailyLoads = DAYS_LIST.map((dayName, dayIdx) => {
    const dayWorkouts = weekWorkouts.filter((w) => w.dayIndex === dayIdx);

    const totalLoad = dayWorkouts.reduce((sum, w) => sum + calculatePlannedWorkoutLoad(w), 0);
    const completedLoad = dayWorkouts.reduce((sum, w) => {
      const isDone = completedWorkouts ? Boolean(completedWorkouts[w.id]) : false;
      return sum + calculateCompletedWorkoutLoad(w, isDone);
    }, 0);

    return {
      dayName: dayName.substring(0, 3),
      totalLoad,
      completedLoad,
      hasSession: dayWorkouts.length > 0,
    };
  });

  const maxDailyLoad = Math.max(...dailyLoads.map((d) => Math.max(d.totalLoad, d.completedLoad)), 100);

  const totalWeekLoad = dailyLoads.reduce((acc, d) => acc + d.totalLoad, 0);
  const completedWeekLoad = dailyLoads.reduce((acc, d) => acc + d.completedLoad, 0);

  const width = 600;
  const height = 160;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const baselineY = height - paddingBottom;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = baselineY - paddingTop;

  const getX = (index: number) => paddingLeft + (index / (dailyLoads.length - 1)) * usableWidth;
  const getY = (value: number) => baselineY - (value / maxDailyLoad) * usableHeight;

  const pointsPlanned = dailyLoads.map((d, i) => `${getX(i)},${getY(d.totalLoad)}`).join(" ");
  const pointsCompleted = dailyLoads.map((d, i) => `${getX(i)},${getY(d.completedLoad)}`).join(" ");
  const areaCompleted = `${getX(0)},${baselineY} ${pointsCompleted} ${getX(dailyLoads.length - 1)},${baselineY}`;

  return (
    <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl space-y-3 shadow-xl font-sans w-full">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <div>
          <span className="text-xs font-black uppercase text-stone-100 tracking-wider block">
            Évolution de la charge
          </span>
          <span className="text-[11px] font-bold text-stone-300">
            <span className="text-[#CF9A61] font-black">{completedWeekLoad}</span> / {totalWeekLoad} pts réalisés
          </span>
        </div>

        {onNavigateToVolumeChart && (
          <button
            type="button"
            onClick={onNavigateToVolumeChart}
            className="text-[10px] font-black text-stone-100 bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl uppercase hover:bg-stone-750 transition cursor-pointer"
          >
            Stats Plan ➔
          </button>
        )}
      </div>

      <div className="relative bg-stone-950/80 rounded-2xl p-2 border border-stone-800/80 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CF9A61" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#CF9A61" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Axe Y (Valeurs) */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxDailyLoad)}
          </text>
          <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxDailyLoad / 2)}
          </text>
          <text x={paddingLeft - 8} y={baselineY + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            0
          </text>

          {/* Lignes de quadrillage */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#3f3f46" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={width - paddingRight} y2={paddingTop + usableHeight / 2} stroke="#3f3f46" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#52525b" strokeWidth="1.5" />

          {/* Dégradé et courbes */}
          <polygon points={areaCompleted} fill="url(#completedGradient)" />
          <polyline points={pointsPlanned} fill="none" stroke="#737373" strokeWidth="2" strokeDasharray="4,4" />
          <polyline points={pointsCompleted} fill="none" stroke="#CF9A61" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points et axe X alignés */}
          {dailyLoads.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.completedLoad);

            return (
              <g key={i}>
                <line x1={cx} y1={baselineY} x2={cx} y2={baselineY + 4} stroke="#52525b" strokeWidth="1.5" />
                <text
                  x={cx}
                  y={baselineY + 18}
                  fill={d.hasSession ? "#f4f4f5" : "#71717a"}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {d.dayName}
                </text>

                <g className="group cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5"
                    className="fill-stone-950 stroke-[#CF6361] stroke-[2.5] transition-all group-hover:r-7"
                  />
                  {d.hasSession && (
                    <title>{`${d.dayName} — Réalisé : ${d.completedLoad} pts | Prévu : ${d.totalLoad} pts`}</title>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[9px] font-semibold text-stone-300 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#CF9A61] inline-block"></span> Réalisé (RPE réel)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu (RPE coach)
          </span>
        </div>
        <span className="text-stone-400">Focus quotidien</span>
      </div>
    </div>
  );
};