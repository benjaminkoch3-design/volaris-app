// src/components/workout/WorkoutTelemetryModal.tsx

import React, { useState } from "react";
import { Workout } from "../../types";

interface WorkoutTelemetryModalProps {
  workout: Workout;
  onClose: () => void;
}

const formatPaceFromSeconds = (sec: number): string => {
  if (!sec || sec <= 0 || !isFinite(sec)) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export const WorkoutTelemetryModal: React.FC<WorkoutTelemetryModalProps> = ({
  workout,
  onClose,
}) => {
  const [activeGraphTab, setActiveGraphTab] = useState<"pace" | "hr" | "elev">("pace");

  const telemetry =
    (workout as any).activityTelemetry ||
    (workout as any).activity_telemetry ||
    {};

  const totalKm =
    workout.completedKm !== undefined
      ? workout.completedKm
      : parseFloat(workout.km || "0") || 10;

  const numLaps = Math.max(1, Math.round(totalKm));

  const overallAvgPaceSec =
    workout.completedTimeMinutes && totalKm > 0
      ? Math.round((workout.completedTimeMinutes * 60) / totalKm)
      : (workout as any).avgPaceSec || 291;

  const baseHr = (workout as any).avgHr || (workout as any).actualAvgHr || 139;
  const maxHrVal = (workout as any).maxHr || (workout as any).actualMaxHr || (baseHr + 10);
  const totalElev = workout.completedElevationGain ?? 49;
  const cadenceVal = (workout as any).avgCadence || 170;

  // Récupération des tours
  const rawLaps = telemetry.laps || [];
  const laps: Array<{
    km: number;
    pace: string;
    paceSec: number;
    avgHr: number | null;
    maxHr: number | null;
    elevationGain: number;
    cadence: number | null;
  }> =
    rawLaps.length > 0
      ? rawLaps
      : Array.from({ length: numLaps }).map((_, i) => ({
          km: i + 1,
          pace: formatPaceFromSeconds(overallAvgPaceSec),
          paceSec: overallAvgPaceSec,
          avgHr: baseHr,
          maxHr: maxHrVal,
          elevationGain: Math.round(totalElev / numLaps),
          cadence: cadenceVal,
        }));

  // Échantillons pour les graphiques
  const paceSamples: number[] =
    telemetry.paceSamples && telemetry.paceSamples.length > 0
      ? telemetry.paceSamples
      : laps.map((l) => l.paceSec);

  const hrSamples: number[] =
    telemetry.hrSamples && telemetry.hrSamples.length > 0
      ? telemetry.hrSamples
      : laps.map((l) => l.avgHr || baseHr);

  const elevationSamples: number[] =
    telemetry.elevationProfile && telemetry.elevationProfile.length > 0
      ? telemetry.elevationProfile
      : [0, totalElev];

  const minPaceSec = Math.min(...paceSamples);
  const maxPaceSec = Math.max(...paceSamples);
  const minHr = Math.min(...hrSamples);
  const maxHr = Math.max(...hrSamples);
  const minElev = Math.min(...elevationSamples);
  const maxElev = Math.max(...elevationSamples);

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-60 font-sans overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-5 shadow-2xl animate-fadeIn my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-black text-[#CF9A61] uppercase tracking-widest block">
              Débrief de la séance
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout.title || workout.sessionName || "Détail de la Sortie"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* MÉTRIQUES RÉELLES */}
        <div className="grid grid-cols-4 gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
          <div>
            <span className="text-[8px] font-bold uppercase text-stone-400 block">Distance</span>
            <span className="text-xs font-black text-[#CF9A61]">{totalKm.toFixed(2)} km</span>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase text-stone-400 block">Allure Moy.</span>
            <span className="text-xs font-black text-stone-100">{formatPaceFromSeconds(overallAvgPaceSec)} /km</span>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase text-stone-400 block">FC Moyenne</span>
            <span className="text-xs font-black text-rose-400">{baseHr} bpm</span>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase text-stone-400 block">D+ Total</span>
            <span className="text-xs font-black text-emerald-400">+{totalElev} m</span>
          </div>
        </div>

        {/* SECTION 1 : TABLEAU KILOMÈTRE PAR KILOMÈTRE */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-stone-300 tracking-wider">
              ⏱️ Découpage Kilométrique (Bips Montre)
            </span>
            <span className="text-[9px] font-bold text-stone-500">
              {laps.length} tour(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-stone-950">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-stone-900/80 text-stone-400 border-b border-stone-800 uppercase font-bold text-[8.5px] tracking-wider">
                  <th className="py-2 px-3">Km</th>
                  <th className="py-2 px-3">Allure</th>
                  <th className="py-2 px-3">FC Moy / Max</th>
                  <th className="py-2 px-3">D+</th>
                  <th className="py-2 px-3 text-right">Cadence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {laps.map((lap) => (
                  <tr key={lap.km} className="hover:bg-stone-900/40 transition">
                    <td className="py-2 px-3 font-black text-stone-300">
                      Km {lap.km}
                    </td>
                    <td className="py-2 px-3 font-black text-[#CF9A61]">
                      {lap.pace}
                    </td>
                    <td className="py-2 px-3 text-rose-300">
                      {lap.avgHr ? `${lap.avgHr}` : "-"}
                      {lap.maxHr ? <span className="text-stone-500 text-[8px]"> / {lap.maxHr}</span> : ""}
                    </td>
                    <td className="py-2 px-3 text-emerald-400">
                      +{lap.elevationGain}m
                    </td>
                    <td className="py-2 px-3 text-right text-stone-400">
                      {lap.cadence ? `${lap.cadence} spm` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2 : GRAPHIQUES D'ÉVOLUTION */}
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-stone-300 tracking-wider">
              📈 Graphiques d'évolution
            </span>
          </div>

          <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveGraphTab("pace")}
              className={`flex-1 py-1.5 text-[9.5px] font-black uppercase rounded-xl transition cursor-pointer ${
                activeGraphTab === "pace"
                  ? "bg-[#CF9A61] text-stone-950 shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              ⚡ Allure
            </button>
            <button
              type="button"
              onClick={() => setActiveGraphTab("hr")}
              className={`flex-1 py-1.5 text-[9.5px] font-black uppercase rounded-xl transition cursor-pointer ${
                activeGraphTab === "hr"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              ❤️ Cardio
            </button>
            <button
              type="button"
              onClick={() => setActiveGraphTab("elev")}
              className={`flex-1 py-1.5 text-[9.5px] font-black uppercase rounded-xl transition cursor-pointer ${
                activeGraphTab === "elev"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              ⛰️ Dénivelé
            </button>
          </div>

          {/* 1. COURBE D'ALLURE */}
          {activeGraphTab === "pace" && (
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold px-1">
                <span>Allure</span>
                <span className="text-[#CF9A61]">
                  Max : {formatPaceFromSeconds(minPaceSec)} • Min : {formatPaceFromSeconds(maxPaceSec)}
                </span>
              </div>

              <svg viewBox="0 0 400 130" className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="paceGradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CF9A61" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#CF9A61" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="20" x2="400" y2="20" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="65" x2="400" y2="65" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="#292524" strokeDasharray="3,3" />

                {(() => {
                  const range = maxPaceSec - minPaceSec || 20;
                  const points = paceSamples.map((p, idx) => {
                    const x = (idx / Math.max(1, paceSamples.length - 1)) * 400;
                    const y = 20 + ((p - minPaceSec) / range) * 90;
                    return `${x},${y}`;
                  });

                  return (
                    <>
                      <path d={`M 0,130 L ${points.join(" L ")} L 400,130 Z`} fill="url(#paceGradReal)" />
                      <path
                        d={`M ${points.join(" L ")}`}
                        fill="none"
                        stroke="#CF9A61"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase pt-1">
                <span>0 km</span>
                <span>Moyenne : {formatPaceFromSeconds(overallAvgPaceSec)} /km</span>
                <span>{totalKm.toFixed(1)} km</span>
              </div>
            </div>
          )}

          {/* 2. COURBE CARDIO */}
          {activeGraphTab === "hr" && (
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold px-1">
                <span>Fréquence Cardiaque (bpm)</span>
                <span className="text-rose-400">Max : {maxHr} bpm • Min : {minHr} bpm</span>
              </div>

              <svg viewBox="0 0 400 130" className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="hrGradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="20" x2="400" y2="20" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="65" x2="400" y2="65" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="#292524" strokeDasharray="3,3" />

                {(() => {
                  const range = maxHr - minHr || 20;
                  const points = hrSamples.map((hr, idx) => {
                    const x = (idx / Math.max(1, hrSamples.length - 1)) * 400;
                    const y = 110 - ((hr - minHr) / range) * 90;
                    return `${x},${y}`;
                  });

                  return (
                    <>
                      <path d={`M 0,130 L ${points.join(" L ")} L 400,130 Z`} fill="url(#hrGradReal)" />
                      <path
                        d={`M ${points.join(" L ")}`}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase pt-1">
                <span>Départ</span>
                <span>Moyenne : {baseHr} bpm</span>
                <span>Arrivée</span>
              </div>
            </div>
          )}

          {/* 3. PROFIL DÉNIVELÉ */}
          {activeGraphTab === "elev" && (
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold px-1">
                <span>Altitude & Dénivelé (m)</span>
                <span className="text-emerald-400">D+ Total : +{totalElev} m</span>
              </div>

              <svg viewBox="0 0 400 130" className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="elevGradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="20" x2="400" y2="20" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="65" x2="400" y2="65" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="#292524" strokeDasharray="3,3" />

                {(() => {
                  const range = maxElev - minElev || 20;
                  const points = elevationSamples.map((alt, idx) => {
                    const x = (idx / Math.max(1, elevationSamples.length - 1)) * 400;
                    const y = 110 - ((alt - minElev) / range) * 90;
                    return `${x},${y}`;
                  });

                  return (
                    <>
                      <path d={`M 0,130 L ${points.join(" L ")} L 400,130 Z`} fill="url(#elevGradReal)" />
                      <path
                        d={`M ${points.join(" L ")}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase pt-1">
                <span>Alt. Min : {minElev}m</span>
                <span>Alt. Max : {maxElev}m</span>
              </div>
            </div>
          )}
        </div>

        {/* FERMER */}
        <div className="pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};