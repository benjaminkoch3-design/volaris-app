// src/components/workout/PaceProfileChart.tsx

import React from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

interface PaceProfileChartProps {
  steps?: WorkoutStep[];
  vma?: number | string;
}

export const PaceProfileChart: React.FC<PaceProfileChartProps> = ({ steps, vma }) => {
  const profile = generatePaceProfile(steps, vma);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + (p.durationSec || 0), 0);
  if (totalTimeSec <= 0) return null;

  // Formatage MM:SS
  const formatPace = (sec: number) => {
    const safeSec = Math.max(0, Math.round(sec));
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Bornes d'allure réelles
  const allPaces = profile.map((p) => p.paceSecPerKm);
  const minPaceSec = Math.min(...allPaces);
  const maxPaceSec = Math.max(...allPaces);
  const isSinglePace = minPaceSec === maxPaceSec;

  // Si une seule allure, on encadre à +/- 30s pour un affichage cohérent et centré
  const displayMinPace = isSinglePace ? Math.max(60, minPaceSec - 30) : minPaceSec;
  const displayMaxPace = isSinglePace ? minPaceSec + 30 : maxPaceSec;
  const paceRange = displayMaxPace - displayMinPace;
  const midPace = displayMinPace + paceRange / 2;

  // Couleurs Volaris
  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#CF6361";
      case "corps":
        return "#CF9A61";
      case "recup":
      case "recup_marche":
        return "#CDCF61";
      case "retour_calme":
        return "#3b82f6";
      default:
        return "#10b981";
    }
  };

  // Projection géométrique des barres sur une base vectorielle 1000 x 100
  let currentX = 0;
  const bars = profile.map((point) => {
    const barWidth = ((point.durationSec || 0) / totalTimeSec) * 1000;
    const x = currentX;
    currentX += barWidth;

    // Plus l'allure en secondes/km est faible, plus le coureur va vite -> barre plus haute
    const normalizedHeightPct = isSinglePace
      ? 55
      : 20 + ((displayMaxPace - point.paceSecPerKm) / paceRange) * 70;

    const height = Math.max(10, Math.min(95, normalizedHeightPct));
    const y = 100 - height;

    return {
      ...point,
      x,
      barWidth,
      y,
      height,
    };
  });

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2 font-sans w-full overflow-hidden">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
          Profil d'allure de la séance
        </span>
        <span className="text-[9px] text-stone-500 font-semibold">
          Durée : {Math.round(totalTimeSec / 60)} min
        </span>
      </div>

      <div className="flex gap-2 items-stretch h-28 w-full">
        {/* Axe Y (Allures ordonnées : plus rapide en haut, plus lente en bas) */}
        <div className="flex flex-col justify-between text-[8px] font-extrabold text-stone-500 py-1 text-right w-9 select-none border-r border-stone-800/80 pr-1 shrink-0">
          <span className="text-[#CF9A61]">{formatPace(displayMinPace)}</span>
          <span>{formatPace(midPace)}</span>
          <span className="text-stone-600">{formatPace(displayMaxPace)}</span>
        </div>

        {/* Zone graphique SVG adaptative */}
        <div className="flex-1 min-w-0 bg-stone-900/60 rounded-xl p-2 border border-stone-800/60 flex items-end">
          <svg
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            {bars.map((bar, i) => (
              <g key={i} className="group cursor-pointer">
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={Math.max(bar.barWidth, 1.5)}
                  height={bar.height}
                  fill={getColor(bar.type)}
                  rx="1.5"
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{`${bar.label} — ${bar.paceFormatted} min/km (${Math.round((bar.durationSec || 0) / 60)} min)`}</title>
                </rect>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] inline-block"></span> Échauff.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF9A61] inline-block"></span> Course
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] inline-block"></span> Récup.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block"></span> Calme
          </span>
        </div>
        <span className="text-[8px] text-stone-500 italic">← Durée de séance →</span>
      </div>
    </div>
  );
};