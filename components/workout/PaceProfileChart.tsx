// src/components/workout/PaceProfileChart.tsx

import React, { useState } from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

interface PaceProfileChartProps {
  steps?: WorkoutStep[];
  vma?: number | string;
}

export const PaceProfileChart: React.FC<PaceProfileChartProps> = ({ steps, vma }) => {
  const profile = generatePaceProfile(steps, vma);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  const formatDuration = (sec: number) => {
    const s = Math.round(sec);
    const m = Math.floor(s / 60);
    const remainingS = s % 60;
    if (m === 0) return `${remainingS}s`;
    if (remainingS === 0) return `${m}'`;
    return `${m}'${remainingS < 10 ? "0" : ""}${remainingS}`;
  };

  // Bornes d'allure réelles
  const allPaces = profile.map((p) => p.paceSecPerKm);
  const minPaceSec = Math.min(...allPaces);
  const maxPaceSec = Math.max(...allPaces);
  const isSinglePace = minPaceSec === maxPaceSec;

  const displayMinPace = isSinglePace ? Math.max(60, minPaceSec - 30) : minPaceSec;
  const displayMaxPace = isSinglePace ? minPaceSec + 30 : maxPaceSec;
  const paceRange = Math.max(1, displayMaxPace - displayMinPace);
  const midPace = displayMinPace + paceRange / 2;

  // Thème de couleurs Volaris par type de bloc
  const getTypeColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return {
          stroke: "#CF6361",
          fill: "url(#gradEchauff)",
          dot: "#CF6361",
          label: "Échauffement",
        };
      case "corps":
        return {
          stroke: "#B34D4D",
          fill: "url(#gradCorps)",
          dot: "#B34D4D",
          label: "Allure active",
        };
      case "recup":
      case "recup_marche":
        return {
          stroke: "#CDCF61",
          fill: "url(#gradRecup)",
          dot: "#CDCF61",
          label: "Récupération",
        };
      case "retour_calme":
        return {
          stroke: "#4D80B3",
          fill: "url(#gradCalme)",
          dot: "#4D80B3",
          label: "Retour au calme",
        };
      default:
        return {
          stroke: "#4DB380",
          fill: "url(#gradDefault)",
          dot: "#4DB380",
          label: "Course",
        };
    }
  };

  // Projection géométrique des barres sur base 1000 x 100
  let currentX = 0;
  const bars = profile.map((point, index) => {
    const rawWidth = ((point.durationSec || 0) / totalTimeSec) * 1000;
    const barWidth = Math.max(2, rawWidth);
    const x = currentX;
    currentX += rawWidth;

    const normalizedHeightPct = isSinglePace
      ? 55
      : 22 + ((displayMaxPace - point.paceSecPerKm) / paceRange) * 68;

    const height = Math.max(12, Math.min(94, normalizedHeightPct));
    const y = 100 - height;

    const speedKmh = point.paceSecPerKm > 0 ? (3600 / point.paceSecPerKm).toFixed(1) : "0";

    return {
      ...point,
      index,
      x,
      barWidth,
      y,
      height,
      speedKmh,
      color: getTypeColor(point.type),
    };
  });

  // Construction de la ligne de crête continue (step-path)
  let ribbonPath = "";
  bars.forEach((b, i) => {
    if (i === 0) {
      ribbonPath += `M ${b.x.toFixed(1)} ${b.y.toFixed(1)} L ${(b.x + b.barWidth).toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      const prevB = bars[i - 1];
      if (prevB.y !== b.y) {
        ribbonPath += ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      ribbonPath += ` L ${(b.x + b.barWidth).toFixed(1)} ${b.y.toFixed(1)}`;
    }
  });

  const activeBar = hoveredIdx !== null ? bars[hoveredIdx] : null;

  return (
    <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800/90 space-y-2.5 font-sans w-full overflow-hidden shadow-inner">
      {/* En-tête : titre & durée / infobulle active au survol */}
      <div className="flex justify-between items-center min-h-[22px]">
        {activeBar ? (
          <div className="flex items-center gap-2 flex-wrap text-[10px] animate-fadeIn">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: activeBar.color.dot }}
            />
            <span className="font-black uppercase text-stone-200">
              {activeBar.label || activeBar.color.label}
            </span>
            <span className="text-stone-500">•</span>
            <span className="font-mono font-black text-[#CF9A61]">
              {activeBar.paceFormatted || formatPace(activeBar.paceSecPerKm)} min/km
            </span>
            <span className="text-stone-400 font-mono text-[9px]">
              ({activeBar.speedKmh} km/h)
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-300 font-bold">
              {formatDuration(activeBar.durationSec || 0)}
            </span>
          </div>
        ) : (
          <>
            <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider">
              Profil d'allure de la séance
            </span>
            <span className="text-[9.5px] text-stone-400 font-mono font-bold bg-stone-900/80 px-2 py-0.5 rounded-md border border-stone-800">
              {formatMinutesToHours(Math.round(totalTimeSec / 60))}
            </span>
          </>
        )}
      </div>

      <div className="flex gap-2 items-stretch h-28 w-full">
        {/* Axe Y : allures de référence (plus rapide en haut) */}
        <div className="flex flex-col justify-between text-[8.5px] font-mono font-bold text-stone-500 py-1 text-right w-10 select-none border-r border-stone-800/80 pr-1.5 shrink-0">
          <span className="text-[#CF9A61] font-black">{formatPace(displayMinPace)}</span>
          <span className="text-stone-600">{formatPace(midPace)}</span>
          <span className="text-stone-500">{formatPace(displayMaxPace)}</span>
        </div>

        {/* Zone graphique SVG */}
        <div className="flex-1 min-w-0 bg-stone-900/40 rounded-xl p-2 border border-stone-800/60 relative flex items-end overflow-hidden">
          <svg
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              {/* Dégradés verticaux semi-transparents */}
              <linearGradient id="gradEchauff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CF6361" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#CF6361" stopOpacity="0.08" />
              </linearGradient>

              <linearGradient id="gradCorps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B34D4D" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#B34D4D" stopOpacity="0.12" />
              </linearGradient>

              <linearGradient id="gradRecup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CDCF61" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#CDCF61" stopOpacity="0.08" />
              </linearGradient>

              <linearGradient id="gradCalme" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4D80B3" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#4D80B3" stopOpacity="0.08" />
              </linearGradient>

              <linearGradient id="gradDefault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4DB380" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#4DB380" stopOpacity="0.08" />
              </linearGradient>

              {/* Lueur subtile pour la crête */}
              <filter id="paceGlow" x="-10%" y="-30%" width="120%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Lignes de niveau discrètes */}
            <line x1="0" y1="20" x2="1000" y2="20" stroke="#27272a" strokeWidth="0.8" strokeDasharray="2,4" />
            <line x1="0" y1="56" x2="1000" y2="56" stroke="#27272a" strokeWidth="0.8" strokeDasharray="2,4" />
            <line x1="0" y1="98" x2="1000" y2="98" stroke="#3f3f46" strokeWidth="1" />

            {/* Blocs d'allure */}
            {bars.map((bar) => {
              const isHovered = hoveredIdx === bar.index;
              return (
                <g
                  key={bar.index}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIdx(bar.index)}
                  onTouchStart={() => setHoveredIdx(bar.index)}
                >
                  {/* Corps du bloc */}
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width={bar.barWidth}
                    height={bar.height}
                    fill={bar.color.fill}
                    stroke={bar.color.stroke}
                    strokeWidth={isHovered ? "1.8" : "1"}
                    strokeOpacity={isHovered ? 1 : 0.75}
                    rx="3"
                    className="transition-all duration-150"
                  />

                  {/* Ligne d'accent lumineuse au sommet du bloc */}
                  <line
                    x1={bar.x}
                    y1={bar.y}
                    x2={bar.x + bar.barWidth}
                    y2={bar.y}
                    stroke={bar.color.stroke}
                    strokeWidth={isHovered ? "2.6" : "1.8"}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Ligne de crête continue (step-ribbon) */}
            <path
              d={ribbonPath}
              fill="none"
              stroke="#CF9A61"
              strokeWidth="1.2"
              strokeOpacity="0.85"
              filter="url(#paceGlow)"
              pointerEvents="none"
            />

            {/* Repère vertical sur le bloc survolé */}
            {activeBar && (
              <line
                x1={activeBar.x + activeBar.barWidth / 2}
                y1="0"
                x2={activeBar.x + activeBar.barWidth / 2}
                y2="100"
                stroke="#CF9A61"
                strokeWidth="1"
                strokeDasharray="2,2"
                strokeOpacity="0.9"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Légende épurée */}
      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/70">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] shadow-sm inline-block" /> Échauff.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B34D4D] shadow-sm inline-block" /> Allure cible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] shadow-sm inline-block" /> Récup.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4D80B3] shadow-sm inline-block" /> Calme
          </span>
        </div>
        <span className="text-[8.5px] font-mono text-stone-500 uppercase tracking-wider">
          min/km
        </span>
      </div>
    </div>
  );
};