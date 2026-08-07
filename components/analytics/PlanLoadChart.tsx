// src/components/analytics/PlanLoadChart.tsx

import React from "react";
import { Workout } from "../../types";

interface PlanLoadChartProps {
  workouts: Workout[];
  totalWeeks: number;
  currentWeekNum: number;
  completedWorkouts?: Record<string, boolean>;
}

// Calcul de la charge prévue (Duration x RPE Target)
const calculatePlannedWorkoutLoad = (w: Workout): number => {
  if (w.isRest) return 0;
  const distOrTime = parseFloat(w.km || "0");
  const durationMin = w.completedTimeMinutes || (distOrTime > 0 ? distOrTime * 5 : 45);
  const targetRpe = w.rpe ? parseFloat(w.rpe) : 5;
  return Math.round(durationMin * targetRpe);
};

// Calcul de la charge réalisée (Duration x RPE Ressenti Athlète)
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
  const weeklyData = Array.from({ length: totalWeeks }, (_, i) => i + 1).map((wNum) => {
    const weekWorkouts = workouts.filter((w) => w.weekNumber === wNum && !w.isRest);
    const plannedLoad = weekWorkouts.reduce((sum, w) => sum + calculatePlannedWorkoutLoad(w), 0);
    const completedLoad = weekWorkouts.reduce((sum, w) => {
      const isDone = completedWorkouts ? completedWorkouts[w.id] : false;
      return sum + calculateCompletedWorkoutLoad(w, isDone);
    }, 0);

    return {
      weekNum: wNum,
      plannedLoad,
      completedLoad,
      hasSession: weekWorkouts.length > 0,
    };
  });

  const maxWeeklyLoad = Math.max(...weeklyData.map((d) => Math.max(d.plannedLoad, d.completedLoad)), 200);
  const totalPlannedLoad = weeklyData.reduce((acc, d) => acc + d.plannedLoad, 0);
  const totalCompletedLoad = weeklyData.reduce((acc, d) => acc + d.completedLoad, 0);

  // Dimensions SVG
  const width = 320;
  const height = 110;
  const paddingLeft = 32;
  const paddingRight = 15;
  const paddingY = 15;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingY * 2;

  const getX = (index: number) => paddingLeft + (index / Math.max(totalWeeks - 1, 1)) * usableWidth;
  const getY = (value: number) => height - paddingY - (value / maxWeeklyLoad) * usableHeight;

  const pointsPlanned = weeklyData.map((d, i) => `${getX(i)},${getY(d.plannedLoad)}`).join(" ");
  const pointsCompleted = weeklyData.map((d, i) => `${getX(i)},${getY(d.completedLoad)}`).join(" ");

  const areaCompleted = `${getX(0)},${height - paddingY} ${pointsCompleted} ${getX(totalWeeks - 1)},${height - paddingY}`;

  return (
    <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl space-y-3 shadow-xl font-sans">
      {/* HEADER DE CHARGE SANS SUPERPOSITION */}
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <div>
          <span className="text-xs font-black uppercase text-stone-100 tracking-wider block">
            Charge Totale du Plan
          </span>
          <span className="text-[11px] font-bold text-stone-300">
            <span className="text-[#CF9A61] font-black">{totalCompletedLoad}</span> / {totalPlannedLoad} pts réalisés
          </span>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-1 rounded-xl bg-stone-800 text-stone-300 border border-stone-700">
          Macrocycle
        </span>
      </div>

      {/* GRAPH SVG */}
      <div className="relative bg-stone-950/80 rounded-2xl p-2 border border-stone-800/80">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id="planCompletedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CF9A61" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#CF9A61" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* AXE Y DES ORDONNÉES EN GRIS */}
          <text x={paddingLeft - 4} y={paddingY + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyLoad)}
          </text>
          <text x={paddingLeft - 4} y={height / 2 + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            {Math.round(maxWeeklyLoad / 2)}
          </text>
          <text x={paddingLeft - 4} y={height - paddingY + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            0
          </text>

          {/* QUADRILLAGE HORIZONTAL POINTILLÉ EN GRIS */}
          <line x1={paddingLeft} y1={paddingY} x2={width - paddingRight} y2={paddingY} stroke="#525252" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={height / 2} x2={width - paddingRight} y2={height / 2} stroke="#525252" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={height - paddingY} x2={width - paddingRight} y2={height - paddingY} stroke="#737373" />

          {/* DÉGRADÉ SOUS LA COURBE RÉALISÉE */}
          <polygon points={areaCompleted} fill="url(#planCompletedGradient)" />

          {/* COURBE PREVUE (POINTILLÉS GRIS) */}
          <polyline points={pointsPlanned} fill="none" stroke="#737373" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* COURBE REALISEE (TRAIT BRUN OCRE #CF9A61) */}
          <polyline points={pointsCompleted} fill="none" stroke="#CF9A61" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* CERCLES SUR LA COURBE (CONTOUR TERRACOTTA #CF6361) */}
          {weeklyData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.completedLoad);
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={cx} cy={cy} r="4" className="fill-stone-950 stroke-[#CF6361] stroke-[2.5] transition-all group-hover:r-6" />
                <foreignObject x={cx - 50} y={cy - 42} width="100" height="40" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[8px] font-bold p-1 rounded shadow-lg text-center">
                    <div>Semaine {d.weekNum}</div>
                    <div className="text-[#CF9A61]">{d.completedLoad} pts (Réalisé)</div>
                    <div className="text-stone-400">{d.plannedLoad} pts (Prévu)</div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* ABSCISSE : SEMAINES */}
        <div className="flex justify-between pl-8 pr-2 pt-1">
          {weeklyData.map((d, i) => (
            <span key={i} className="text-[8px] font-bold text-stone-300">
              S{d.weekNum}
            </span>
          ))}
        </div>
      </div>

      {/* LÉGENDE DE BAS DE CARTE */}
      <div className="flex justify-between items-center text-[9px] font-semibold text-stone-300 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#CF9A61] inline-block"></span> Réalisé (Athlète)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu (Coach)
          </span>
        </div>
        <span className="text-stone-300 font-bold">Progression Plan</span>
      </div>
    </div>
  );
};