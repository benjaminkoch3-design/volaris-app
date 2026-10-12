// src/components/analytics/WeeklyVolumeChart.tsx

import React from "react";
import { Workout } from "../../types";
import {
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKm,
} from "../../utils/calculations";

interface WeeklyVolumeChartProps {
  workouts: Workout[];
  totalWeeks: number;
  currentWeekNum: number;
  completedWorkouts?: Record<string, boolean>;
  onNavigateToVolumeChart?: () => void;
}

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({
  workouts,
  totalWeeks,
  currentWeekNum,
  completedWorkouts = {},
  onNavigateToVolumeChart,
}) => {
  const safeTotalWeeks = Math.max(totalWeeks || 1, 1);

  // Données hebdomadaires pour chaque semaine du plan
  const weeklyData = Array.from({ length: safeTotalWeeks }, (_, i) => i + 1).map((wNum) => {
    const plannedKm = calculateWeeklyPlannedKm(workouts, wNum);
    const completedKm = calculateWeeklyCompletedKm(workouts, wNum, completedWorkouts);

    return {
      weekNum: wNum,
      plannedKm: Math.round(plannedKm * 10) / 10,
      completedKm: Math.round(completedKm * 10) / 10,
    };
  });

  const currentWeekData = weeklyData.find((w) => w.weekNum === currentWeekNum) || {
    plannedKm: 0,
    completedKm: 0,
  };

  const maxWeeklyKm = Math.max(
    ...weeklyData.map((d) => Math.max(d.plannedKm, d.completedKm)),
    20
  );

  // Dimensions vectorielles SVG identiques à WeeklyLoadChart
  const width = 600;
  const height = 160;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const baselineY = height - paddingBottom;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = baselineY - paddingTop;

  const getX = (index: number) => {
    if (safeTotalWeeks <= 1) return paddingLeft + usableWidth / 2;
    return paddingLeft + (index / (safeTotalWeeks - 1)) * usableWidth;
  };
  const getY = (value: number) => baselineY - (value / maxWeeklyKm) * usableHeight;

  const pointsPlanned = weeklyData.map((d, i) => `${getX(i)},${getY(d.plannedKm)}`).join(" ");
  const pointsCompleted = weeklyData.map((d, i) => `${getX(i)},${getY(d.completedKm)}`).join(" ");
  const areaCompleted = `${getX(0)},${baselineY} ${pointsCompleted} ${getX(safeTotalWeeks - 1)},${baselineY}`;

  const tickStep = safeTotalWeeks > 24 ? 4 : safeTotalWeeks > 14 ? 2 : 1;

  return (
    <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl space-y-3 shadow-xl font-sans w-full flex flex-col justify-between">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <div>
          <span className="text-xs font-black uppercase text-stone-100 tracking-wider block">
            Évolution du Volume (Plan)
          </span>
          <span className="text-[11px] font-bold text-stone-300">
            S{currentWeekNum} :{" "}
            <span className="text-[#4DB380] font-black">{currentWeekData.completedKm} km</span> /{" "}
            {currentWeekData.plannedKm} km prévus
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

      {/* GRAPH SVG */}
      <div className="relative bg-stone-950/80 rounded-2xl p-2 border border-stone-800/80 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="volumeCompletedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DB380" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4DB380" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Axe Y (Valeurs en km) */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyKm)} km
          </text>
          <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyKm / 2)} km
          </text>
          <text x={paddingLeft - 8} y={baselineY + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
            0
          </text>

          {/* Lignes de quadrillage */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#3f3f46" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={width - paddingRight} y2={paddingTop + usableHeight / 2} stroke="#3f3f46" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#52525b" strokeWidth="1.5" />

          {/* Dégradé sous la courbe réalisée */}
          <polygon points={areaCompleted} fill="url(#volumeCompletedGradient)" />

          {/* Courbe prévue (pointillés gris) */}
          <polyline points={pointsPlanned} fill="none" stroke="#737373" strokeWidth="2" strokeDasharray="4,4" />

          {/* Courbe réalisée (vert Volaris #4DB380) */}
          <polyline points={pointsCompleted} fill="none" stroke="#4DB380" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points et repères alignés sous chaque semaine */}
          {weeklyData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.completedKm);
            const isCurrentWeek = d.weekNum === currentWeekNum;
            const showLabel = (d.weekNum - 1) % tickStep === 0 || d.weekNum === safeTotalWeeks;

            return (
              <g key={d.weekNum}>
                <line x1={cx} y1={baselineY} x2={cx} y2={baselineY + 4} stroke="#52525b" strokeWidth="1.5" />

                {showLabel && (
                  <text
                    x={cx}
                    y={baselineY + 18}
                    fill={isCurrentWeek ? "#4DB380" : "#a1a1aa"}
                    fontSize="10"
                    fontWeight={isCurrentWeek ? "900" : "bold"}
                    textAnchor="middle"
                  >
                    S{d.weekNum}
                  </text>
                )}

                <g className="group cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrentWeek ? "5.5" : d.completedKm > 0 ? "4" : "2.5"}
                    style={{
                      fill: isCurrentWeek ? "#4DB380" : "#09090b",
                      stroke: "#4DB380",
                    }}
                    className="stroke-2 transition-all group-hover:r-7"
                  />
                  <title>{`Semaine ${d.weekNum} — Réalisé : ${d.completedKm} km | Prévu : ${d.plannedKm} km`}</title>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* LÉGENDE */}
      <div className="flex justify-between items-center text-[9px] font-semibold text-stone-300 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#4DB380] inline-block"></span> Réalisé
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu
          </span>
        </div>
        <span className="text-stone-400">Progression Plan</span>
      </div>
    </div>
  );
};