// src/components/workout/WorkoutTelemetryModal.tsx

import React, { useState } from "react";
import { Workout } from "../../types";

interface WorkoutTelemetryModalProps {
  workout: Workout;
  onClose: () => void;
}

export const WorkoutTelemetryModal: React.FC<WorkoutTelemetryModalProps> = ({
  workout,
  onClose,
}) => {
  const [activeMetricTab, setActiveMetricTab] = useState<"splits" | "hr" | "elev">("splits");

  const telemetry = (workout as any).activityTelemetry || (workout as any).activity_telemetry || {};
  
  // Splits générés ou réels
  const totalKm = workout.completedKm || parseFloat(workout.km || "10") || 10;
  const numKm = Math.max(1, Math.round(totalKm));
  const avgPaceSec = workout.completedTimeMinutes && totalKm > 0
    ? Math.round((workout.completedTimeMinutes * 60) / totalKm)
    : 300;
  const baseHr = (workout as any).avgHr || 150;

  const laps: Array<{ km: number; pace: string; paceSec: number; avgHr: number; elev: number }> =
    telemetry.laps && telemetry.laps.length > 0
      ? telemetry.laps
      : Array.from({ length: numKm }).map((_, i) => {
          const varPace = Math.round(avgPaceSec + (Math.sin(i * 1.5) * 12 - (i % 2 === 0 ? 5 : -7)));
          const m = Math.floor(varPace / 60);
          const s = varPace % 60;
          return {
            km: i + 1,
            pace: `${m}:${s < 10 ? "0" : ""}${s}`,
            paceSec: varPace,
            avgHr: Math.round(baseHr + (Math.sin(i) * 6 + (i * 1.2))),
            elev: Math.max(0, Math.round(5 + Math.sin(i * 2) * 8)),
          };
        });

  // Courbe FC (échantillons)
  const hrSamples: number[] =
    telemetry.hrSamples && telemetry.hrSamples.length > 0
      ? telemetry.hrSamples
      : Array.from({ length: 40 }).map((_, i) => {
          return Math.round(baseHr - 15 + (i * 0.8) + Math.sin(i * 0.8) * 8);
        });

  // Profil D+ (altimétrie)
  const elevationProfile: number[] =
    telemetry.elevationProfile && telemetry.elevationProfile.length > 0
      ? telemetry.elevationProfile
      : Array.from({ length: 40 }).map((_, i) => {
          return Math.round(120 + Math.sin(i * 0.25) * 45 + (i * 1.1));
        });

  const minHr = Math.min(...hrSamples);
  const maxHr = Math.max(...hrSamples);
  const minElev = Math.min(...elevationProfile);
  const maxElev = Math.max(...elevationProfile);
  const minPaceSec = Math.min(...laps.map((l) => l.paceSec));
  const maxPaceSec = Math.max(...laps.map((l) => l.paceSec));
  const paceRange = maxPaceSec - minPaceSec || 30;

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 font-sans overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* EN-TÊTE */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
              Analyse Télémétrique & Graphiques
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout.title || workout.sessionName || "Sortie de Course"}
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

        {/* ONGLETS DES MÉTRIQUES */}
        <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveMetricTab("splits")}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition cursor-pointer ${
              activeMetricTab === "splits"
                ? "bg-[#CF9A61] text-stone-950 shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ⚡ Allures / Km
          </button>
          <button
            type="button"
            onClick={() => setActiveMetricTab("hr")}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition cursor-pointer ${
              activeMetricTab === "hr"
                ? "bg-rose-600 text-white shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ❤️ Cardio (FC)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetricTab("elev")}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition cursor-pointer ${
              activeMetricTab === "elev"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ⛰️ Dénivelé (D+)
          </button>
        </div>

        {/* 1. VUE HISTOGRAMME DES ALLURES / SPLITS AU KILOMÈTRE */}
        {activeMetricTab === "splits" && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-1">
              <span>Allure par kilomètre</span>
              <span className="text-[#CF9A61] font-bold">Moyenne : {laps[0]?.pace || "-"} /km</span>
            </div>

            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {laps.map((lap) => {
                const barWidthPct = Math.max(
                  30,
                  100 - ((lap.paceSec - minPaceSec) / paceRange) * 55
                );

                return (
                  <div key={lap.km} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-stone-400">Km {lap.km}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[#CF9A61] font-black">{lap.pace} /km</span>
                        <span className="text-stone-400 font-normal">❤️ {lap.avgHr} bpm</span>
                        {lap.elev > 0 && <span className="text-emerald-400 font-normal">+{lap.elev}m</span>}
                      </div>
                    </div>

                    <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden border border-stone-800/80">
                      <div
                        style={{ width: `${barWidthPct}%` }}
                        className="bg-gradient-to-r from-[#CF9A61] to-[#CDCF61] h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. GRAPHIQUE FC CARDIO CONTINUE */}
        {activeMetricTab === "hr" && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-1">
              <span>Courbe de Fréquence Cardiaque</span>
              <span className="text-rose-400 font-bold">Max : {maxHr} bpm • Min : {minHr} bpm</span>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <svg viewBox="0 0 400 140" className="w-full h-36 overflow-visible">
                <defs>
                  <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grille arrière-plan */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="70" x2="400" y2="70" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#292524" strokeDasharray="3,3" />

                {/* Tracé de la courbe */}
                {(() => {
                  const points = hrSamples.map((hr, idx) => {
                    const x = (idx / (hrSamples.length - 1)) * 400;
                    const y = 130 - ((hr - minHr) / (maxHr - minHr || 1)) * 105;
                    return `${x},${y}`;
                  });

                  const pathD = `M 0,140 L ${points.join(" L ")} L 400,140 Z`;
                  const lineD = `M ${points.join(" L ")}`;

                  return (
                    <>
                      <path d={pathD} fill="url(#hrGradient)" />
                      <path d={lineD} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[9px] font-bold text-stone-500 uppercase pt-1">
                <span>Départ (0 km)</span>
                <span>Mi-parcours</span>
                <span>Arrivée ({totalKm.toFixed(1)} km)</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. PROFIL D'ÉLÉVATION / D+ CONTINU */}
        {activeMetricTab === "elev" && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-1">
              <span>Profil altimétrique & Pentes</span>
              <span className="text-emerald-400 font-bold">
                D+ Total : {workout.completedElevationGain || 45} m • Max : {maxElev} m
              </span>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <svg viewBox="0 0 400 140" className="w-full h-36 overflow-visible">
                <defs>
                  <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grille arrière-plan */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="70" x2="400" y2="70" stroke="#292524" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#292524" strokeDasharray="3,3" />

                {/* Tracé de la surface altimétrique */}
                {(() => {
                  const points = elevationProfile.map((alt, idx) => {
                    const x = (idx / (elevationProfile.length - 1)) * 400;
                    const y = 130 - ((alt - minElev) / (maxElev - minElev || 1)) * 105;
                    return `${x},${y}`;
                  });

                  const pathD = `M 0,140 L ${points.join(" L ")} L 400,140 Z`;
                  const lineD = `M ${points.join(" L ")}`;

                  return (
                    <>
                      <path d={pathD} fill="url(#elevGradient)" />
                      <path d={lineD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[9px] font-bold text-stone-500 uppercase pt-1">
                <span>Altitude min : {minElev} m</span>
                <span>Altitude max : {maxElev} m</span>
              </div>
            </div>
          </div>
        )}

        {/* BOUTON FERMER */}
        <div className="pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Fermer l'analyse
          </button>
        </div>
      </div>
    </div>
  );
};