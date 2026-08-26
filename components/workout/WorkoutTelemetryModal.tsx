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
      : parseFloat(workout.km || "0") || 0;

  const overallAvgPaceSec =
    workout.completedTimeMinutes && totalKm > 0
      ? Math.round((workout.completedTimeMinutes * 60) / totalKm)
      : (workout as any).avgPaceSec || 291;

  const baseHr = (workout as any).avgHr || (workout as any).actualAvgHr || null;
  const totalElev = workout.completedElevationGain ?? 0;

  // Récupération des vrais intervalles
  const intervals: Array<{
    circuit: number;
    intervalNum: string;
    stepType: string;
    durationFormatted: string;
    cumulativeTime: string;
    distanceKm: string;
    pace: string;
    paceSec: number;
    avgHr: number | null;
    maxHr: number | null;
    elevationGain: number;
    cadence: number | null;
  }> = telemetry.intervals || telemetry.laps || [];

  // Échantillons pour les graphiques
  const paceSamples: number[] =
    telemetry.paceSamples && telemetry.paceSamples.length > 0
      ? telemetry.paceSamples
      : intervals.map((i) => i.paceSec).filter((p) => p > 0);

  const hrSamples: number[] =
    telemetry.hrSamples && telemetry.hrSamples.length > 0
      ? telemetry.hrSamples
      : intervals.map((i) => i.avgHr).filter(Boolean) as number[];

  const elevationSamples: number[] = telemetry.elevationProfile || [];

  const minPaceSec = paceSamples.length > 0 ? Math.min(...paceSamples) : overallAvgPaceSec;
  const maxPaceSec = paceSamples.length > 0 ? Math.max(...paceSamples) : overallAvgPaceSec;
  const minHr = hrSamples.length > 0 ? Math.min(...hrSamples) : 130;
  const maxHr = hrSamples.length > 0 ? Math.max(...hrSamples) : 180;
  const minElev = elevationSamples.length > 0 ? Math.min(...elevationSamples) : 0;
  const maxElev = elevationSamples.length > 0 ? Math.max(...elevationSamples) : totalElev;

  const getStepBadgeStyle = (stepType: string) => {
    switch (stepType) {
      case "Échauffement":
        return "text-[#CF6361] bg-[#CF6361]/10 border-[#CF6361]/30";
      case "Course à pied":
        return "text-[#CF9A61] bg-[#CF9A61]/10 border-[#CF9A61]/30 font-black";
      case "Récupération":
        return "text-[#CDCF61] bg-[#CDCF61]/10 border-[#CDCF61]/30";
      case "Retour au calme":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-stone-300 bg-stone-800 border-stone-700";
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-60 font-sans overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-xl w-full space-y-5 shadow-2xl animate-fadeIn my-auto max-h-[94vh] overflow-y-auto custom-scrollbar">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-black text-[#CF9A61] uppercase tracking-widest block">
              Débrief de la séance • Garmin Connect
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
            <span className="text-xs font-black text-rose-400">{baseHr ? `${baseHr} bpm` : "-"}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase text-stone-400 block">D+ Total</span>
            <span className="text-xs font-black text-emerald-400">+{totalElev} m</span>
          </div>
        </div>

        {/* SECTION 1 : TABLEAU DES INTERVALLES & ÉTAPES (STYLE GARMIN CONNECT) */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-stone-300 tracking-wider">
              📊 Intervalles & Étapes de la Séance
            </span>
            <span className="text-[9px] font-bold text-stone-500">
              {intervals.length > 0 ? `${intervals.length} étape(s)` : "Non disponible"}
            </span>
          </div>

          {intervals.length === 0 ? (
            <div className="bg-stone-950 p-6 rounded-2xl border border-stone-800 text-center">
              <p className="text-xs text-stone-400">
                Aucun intervalle retourné par la montre pour cette activité.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-stone-950 shadow-inner">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-stone-900/90 text-stone-400 border-b border-stone-800 uppercase font-extrabold text-[8.5px] tracking-wider">
                    <th className="py-2.5 px-3">Intervalle</th>
                    <th className="py-2.5 px-3">Type d'étape</th>
                    <th className="py-2.5 px-3 text-center">Circuit</th>
                    <th className="py-2.5 px-3">Durée</th>
                    <th className="py-2.5 px-3">Temps cumulé</th>
                    <th className="py-2.5 px-3 text-right">Distance</th>
                    <th className="py-2.5 px-3 text-right">Allure moy.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono">
                  {intervals.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-900/50 transition">
                      <td className="py-2 px-3 font-bold text-[#CF9A61]">
                        {item.intervalNum ? `▶ ${item.intervalNum}` : ""}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] inline-block ${getStepBadgeStyle(item.stepType)}`}>
                          {item.stepType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-stone-400 font-bold">
                        {item.circuit}
                      </td>
                      <td className="py-2 px-3 text-stone-200">
                        {item.durationFormatted}
                      </td>
                      <td className="py-2 px-3 text-stone-400">
                        {item.cumulativeTime}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-stone-100">
                        {item.distanceKm} km
                      </td>
                      <td className="py-2 px-3 text-right font-black text-[#CF9A61]">
                        {item.pace}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 2 : GRAPHIQUES D'ÉVOLUTION CONTINUE */}
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

              {paceSamples.length <= 1 ? (
                <p className="text-center py-6 text-xs text-stone-500">
                  Trace d'allure non disponible.
                </p>
              ) : (
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
              )}

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

              {hrSamples.length <= 1 ? (
                <p className="text-center py-6 text-xs text-stone-500">
                  Cardio continu non disponible.
                </p>
              ) : (
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
              )}

              <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase pt-1">
                <span>Départ</span>
                <span>Moyenne : {baseHr ? `${baseHr} bpm` : "-"}</span>
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

              {elevationSamples.length <= 1 ? (
                <p className="text-center py-6 text-xs text-stone-500">
                  Profil altimétrique non disponible.
                </p>
              ) : (
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
              )}

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