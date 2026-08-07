// src/components/plan/VolumeChart.tsx

import React, { useState } from "react";
import { Plan, Workout } from "../../types";
import {
  calculateWeeks,
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKm,
  getWeekTypeLabel,
  getWeekDateRange,
} from "../../utils/calculations";

interface VolumeChartProps {
  activePlan: Plan | null;
  draftWorkouts: Workout[];
  newPlanForm: {
    startDate: string;
    eventDate: string;
  };
  draftWeekTypes: Record<number, any>;
  completedWorkouts: Record<string, boolean>;
  onBack: () => void;
  goal: string;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({
  activePlan,
  draftWorkouts,
  newPlanForm,
  draftWeekTypes,
  completedWorkouts,
  onBack,
  goal,
}) => {
  // Menu déroulant pour afficher/masquer le détail des semaines
  const [showWeeklyDetails, setShowWeeklyDetails] = useState<boolean>(false);

  const workoutsSource = activePlan ? activePlan.workouts : draftWorkouts;
  const totalWeeksNum = activePlan
    ? Number(activePlan.durationWeeks) || 4
    : calculateWeeks(newPlanForm.startDate, newPlanForm.eventDate);

  const startDateSource = activePlan ? activePlan.startDate : newPlanForm.startDate;

  const weekData = Array.from({ length: totalWeeksNum }, (_, i) => {
    const wNum = i + 1;
    const plannedKm = calculateWeeklyPlannedKm(workoutsSource, wNum);
    const completedKm = calculateWeeklyCompletedKm(workoutsSource, wNum, completedWorkouts);
    const weekTypeObj = activePlan?.weekTypes?.[wNum] || draftWeekTypes[wNum];
    const weekLabel = getWeekTypeLabel(weekTypeObj);

    return {
      wNum,
      plannedKm,
      completedKm,
      weekLabel,
      dateRange: getWeekDateRange(startDateSource, wNum),
    };
  });

  const maxPlannedKm = Math.max(...weekData.map((d) => Math.max(d.plannedKm, d.completedKm, 1)));
  const grandTotalPlanned = weekData.reduce((acc, d) => acc + d.plannedKm, 0);
  const grandTotalCompleted = weekData.reduce((acc, d) => acc + d.completedKm, 0);

  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-5 font-sans">
      {/* HEADER DE RETOUR PROPRE SANS STICKY NI ABSOLUTE (ÉVITE LA SUPERPOSITION) */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="text-stone-300 hover:text-stone-100 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          ← Tableau de bord
        </button>
        <span className="text-[10px] font-bold bg-[#CF9A61]/20 text-[#CF9A61] px-2.5 py-1 rounded-full border border-[#CF9A61]/30">
          {activePlan?.targetDistance || goal}
        </span>
      </div>

      {/* TITRE ET INFORMATIONS */}
      <div>
        <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
          Suivi du volume kilométrique
        </span>
        <h2 className="text-lg font-black uppercase text-stone-100 mt-0.5">
          📊 Évolution & Projections
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Visualisez la montée en charge, les semaines de récupération et votre progression réelle.
        </p>
      </div>

      {/* TUILES RESUMÉ CUMULÉ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-0.5">
          <span className="text-[9px] font-bold uppercase text-[#CF9A61]/90 block">
            Total Prévu
          </span>
          <span className="text-xl font-black text-[#CF9A61]">
            {grandTotalPlanned.toFixed(1)} <span className="text-xs font-bold text-stone-400">km</span>
          </span>
        </div>

        <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-0.5">
          <span className="text-[9px] font-bold uppercase text-emerald-400/90 block">
            Total Réalisé
          </span>
          <span className="text-xl font-black text-emerald-400">
            {grandTotalCompleted.toFixed(1)} <span className="text-xs font-bold text-stone-400">km</span>
          </span>
        </div>
      </div>

      {/* LÉGENDE */}
      <div className="flex items-center justify-between bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-[10px] text-stone-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#CF9A61]/50 inline-block border border-[#CF9A61]" />
          Projection Prévue (km)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          Réalisé Effectif (km)
        </span>
      </div>

      {/* GRAPHIQUE EN BARRES (HISTOGRAMME) */}
      <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-4 pt-6">
        <div className="flex items-end justify-between gap-1.5 h-48 pt-2 pb-1 border-b border-stone-800 px-1">
          {weekData.map((d) => {
            const plannedHeightPct = Math.max(10, Math.round((d.plannedKm / maxPlannedKm) * 100));
            const completedHeightPct = Math.max(0, Math.round((d.completedKm / maxPlannedKm) * 100));

            return (
              <div key={d.wNum} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[9px] font-bold text-[#CF9A61] text-center">
                  {d.plannedKm > 0 ? `${Math.round(d.plannedKm)}` : 0}
                </div>

                <div className="w-full max-w-[28px] bg-stone-900 rounded-t-lg relative flex items-end justify-center overflow-hidden h-full border border-stone-800">
                  <div
                    style={{ height: `${plannedHeightPct}%` }}
                    className="w-full bg-gradient-to-t from-[#CF9A61]/30 to-[#CF9A61]/50 border-t border-[#CF9A61]/80 transition-all rounded-t-md"
                  />
                  {d.completedKm > 0 && (
                    <div
                      style={{ height: `${completedHeightPct}%` }}
                      className="w-full absolute bottom-0 bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all rounded-t-md"
                    />
                  )}
                </div>

                <span className="text-[9px] font-black uppercase text-stone-400 mt-1">
                  S{d.wNum}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-stone-400 text-center italic">
          Les barres ombragées dorées indiquent le volume prévu. La jauge verte indique la part accomplie.
        </div>
      </div>

      {/* DÉTAIL LISTE SEMAINE PAR SEMAINE (MENU DÉROULANT / ACCORDÉON) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#CF9A61]">
            📋 Détail Semaine par Semaine
          </h3>

          <button
            type="button"
            onClick={() => setShowWeeklyDetails(!showWeeklyDetails)}
            className="text-[10px] font-black text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 border border-[#CF9A61]/30 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
          >
            <span>
              {showWeeklyDetails
                ? "Masquer le détail"
                : "👁️ Voir le détail des semaines"}
            </span>
            <span>{showWeeklyDetails ? "▲" : "▼"}</span>
          </button>
        </div>

        {showWeeklyDetails && (
          <div className="space-y-2 animate-fadeIn pt-1">
            {weekData.map((d) => {
              const pct = d.plannedKm > 0 ? Math.min(100, Math.round((d.completedKm / d.plannedKm) * 100)) : 0;

              return (
                <div
                  key={d.wNum}
                  className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-stone-100 uppercase">
                        Semaine {d.wNum}
                      </span>
                      <span className="text-[9px] font-bold text-[#CF9A61] bg-[#CF9A61]/10 border border-[#CF9A61]/30 px-2 py-0.5 rounded">
                        {d.weekLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400">
                      {d.dateRange}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-0.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[#CF9A61] font-bold">
                        Prévu : <strong>{d.plannedKm.toFixed(1)} km</strong>
                      </span>
                      <span className="text-emerald-400 font-bold">
                        Fait : <strong>{d.completedKm.toFixed(1)} km</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-stone-300">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};