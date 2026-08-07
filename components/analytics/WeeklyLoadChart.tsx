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

// Fonction de calcul de la charge d'une séance (Durée x RPE)
const calculatePlannedWorkoutLoad = (w: Workout): number => {
  if (w.isRest) return 0;
  const distOrTime = parseFloat(w.km || "0");
  // Estimation de la durée en min (si km, approx 5 min/km si non spécifiée)
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

  // Calcul quotidien des charges Prévue (Coach) vs Réalisée (Athlète)
  const dailyLoads = DAYS_LIST.map((dayName, dayIdx) => {
    const dayWorkouts = weekWorkouts.filter((w) => w.dayIndex === dayIdx);
    
    // Charge prévue par le coach
    const totalLoad = dayWorkouts.reduce((sum, w) => sum + calculatePlannedWorkoutLoad(w), 0);
    
    // Charge réalisée par l'athlète avec son RPE ressenti
    const completedLoad = dayWorkouts.reduce((sum, w) => {
      const isDone = completedWorkouts ? completedWorkouts[w.id] : false;
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
  
  // Total hebdo
  const totalWeekLoad = dailyLoads.reduce((acc, d) => acc + d.totalLoad, 0);
  const completedWeekLoad = dailyLoads.reduce((acc, d) => acc + d.completedLoad, 0);

  // SVG dimensions
  const width = 300;
  const height = 90;
  const paddingLeft = 32;
  const paddingRight = 15;
  const paddingY = 15;
  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingY * 2;

  const getX = (index: number) => paddingLeft + (index / (dailyLoads.length - 1)) * usableWidth;
  const getY = (value: number) => height - paddingY - (value / maxDailyLoad) * usableHeight;

  const pointsPlanned = dailyLoads.map((d, i) => `${getX(i)},${getY(d.totalLoad)}`).join(" ");
  const pointsCompleted = dailyLoads.map((d, i) => `${getX(i)},${getY(d.completedLoad)}`).join(" ");

  const areaCompleted = `${getX(0)},${height - paddingY} ${pointsCompleted} ${getX(dailyLoads.length - 1)},${height - paddingY}`;

  return (
    <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl space-y-3 shadow-xl font-sans">
      {/* HEADER : SANS EMOJI DANS LE TITRE */}
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

      {/* GRAPH SVG */}
      <div className="relative bg-stone-950/80 rounded-2xl p-2 border border-stone-800/80">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CF9A61" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#CF9A61" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* AXE DES ORDONNÉES (Y) EN GRIS */}
          <text x={paddingLeft - 4} y={paddingY + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            {Math.round(maxDailyLoad)}
          </text>
          <text x={paddingLeft - 4} y={height / 2 + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            {Math.round(maxDailyLoad / 2)}
          </text>
          <text x={paddingLeft - 4} y={height - paddingY + 3} fill="#737373" fontSize="7" textAnchor="end" fontWeight="bold">
            0
          </text>

          {/* LIGNES DE QUADRILLAGE HORIZONTALES POINTILLÉES EN GRIS */}
          <line x1={paddingLeft} y1={paddingY} x2={width - paddingRight} y2={paddingY} stroke="#525252" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={height / 2} x2={width - paddingRight} y2={height / 2} stroke="#525252" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={height - paddingY} x2={width - paddingRight} y2={height - paddingY} stroke="#737373" />

          {/* DÉGRADÉ SOUS LA COURBE RÉALISÉE */}
          <polygon points={areaCompleted} fill="url(#completedGradient)" />

          {/* COURBE CHARGE PRÉVUE (POINTILLÉS GRIS #737373) */}
          <polyline points={pointsPlanned} fill="none" stroke="#737373" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* COURBE CHARGE RÉALISÉE (TRAIT BRUN #CF9A61) */}
          <polyline points={pointsCompleted} fill="none" stroke="#CF9A61" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* CERCLES SUR LA COURBE RÉALISÉE (CONTOUR CF6361) */}
          {dailyLoads.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.completedLoad);
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={cx} cy={cy} r="4" className="fill-stone-950 stroke-[#CF6361] stroke-[2.5] transition-all group-hover:r-6" />
                {d.hasSession && (
                  <foreignObject x={cx - 50} y={cy - 45} width="100" height="40" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[8px] font-bold p-1 rounded shadow-lg text-center">
                      <div>{d.dayName}</div>
                      <div className="text-[#CF9A61]">{d.completedLoad} pts (Réalisé)</div>
                      <div className="text-stone-400">{d.totalLoad} pts (Prévu)</div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* ÉTIQUETTES DES JOURS */}
        <div className="flex justify-between pl-8 pr-2 pt-1">
          {dailyLoads.map((d, i) => (
            <span key={i} className={`text-[9px] font-bold ${d.hasSession ? "text-stone-100" : "text-stone-500"}`}>
              {d.dayName}
            </span>
          ))}
        </div>
      </div>

      {/* LÉGENDE DE COULEUR DU BAS */}
      <div className="flex justify-between items-center text-[9px] font-semibold text-stone-300 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#CF9A61] inline-block"></span> Réalisé (RPE réel)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu (RPE coach)
          </span>
        </div>
        <span className="text-stone-300">Focus quotidien</span>
      </div>
    </div>
  );
};