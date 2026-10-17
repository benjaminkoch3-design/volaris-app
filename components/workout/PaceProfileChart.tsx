// src/components/workout/PaceProfileChart.tsx

import React, { useState } from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

interface PaceProfileChartProps {
  steps?: WorkoutStep[];
  vma?: number | string;
}

const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return "0'";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m < 10 ? "0" : ""}${m}`;
};

const formatPace = (sec: number) => {
  const safeSec = Math.max(0, Math.round(sec));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const formatDetailedDuration = (sec: number) => {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const remainingS = s % 60;
  if (m === 0) return `${remainingS}s`;
  if (remainingS === 0) return `${m} min`;
  return `${m} min ${remainingS}s`;
};

// Couleurs unies (sans dégradé) définies pour les modes Sombre et Clair
const COLORS: Record<string, { dark: string; light: string }> = {
  echauffement: { dark: "#38BDF8", light: "#0284C7" },
  corps: { dark: "#FB923C", light: "#EA580C" },
  recup: { dark: "#A3E635", light: "#65A30D" },
  retour_calme: { dark: "#2DD4BF", light: "#0D9488" },
  default: { dark: "#A8A29E", light: "#78716C" },
};

const getColors = (type: string) => {
  switch (type) {
    case "echauffement":
      return COLORS.echauffement;
    case "corps":
      return COLORS.corps;
    case "recup":
    case "recup_marche":
      return COLORS.recup;
    case "retour_calme":
      return COLORS.retour_calme;
    default:
      return COLORS.default;
  }
};

const H_MIN = 20;
const H_MAX = 90;

const LEGEND = [
  { label: "Échauff.", ...COLORS.echauffement },
  { label: "Course", ...COLORS.corps },
  { label: "Récup.", ...COLORS.recup },
  { label: "Calme", ...COLORS.retour_calme },
];

export const PaceProfileChart: React.FC<PaceProfileChartProps> = ({ steps, vma }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const profile = generatePaceProfile(steps, vma);
  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + (p.durationSec || 0), 0);
  if (totalTimeSec <= 0) return null;

  const allPaces = profile.map((p) => p.paceSecPerKm);
  const minPaceSec = Math.min(...allPaces);
  const maxPaceSec = Math.max(...allPaces);
  const isSinglePace = minPaceSec === maxPaceSec;

  const displayMinPace = isSinglePace ? Math.max(60, minPaceSec - 30) : minPaceSec;
  const displayMaxPace = isSinglePace ? minPaceSec + 30 : maxPaceSec;
  const paceRange = Math.max(1, displayMaxPace - displayMinPace);
  const midPace = displayMinPace + paceRange / 2;

  const toHeight = (pace: number) =>
    isSinglePace
      ? 55
      : H_MIN + ((displayMaxPace - pace) / paceRange) * (H_MAX - H_MIN);

  const yTicks = [displayMinPace, midPace, displayMaxPace].map((pace) => ({
    pace,
    h: toHeight(pace),
  }));

  const totalMin = totalTimeSec / 60;
  const stepMin = [5, 10, 15, 20, 30, 60].find((s) => totalMin / s <= 6) ?? 60;
  const xTicks: number[] = [];
  for (let t = 0; t <= totalMin; t += stepMin) xTicks.push(t);

  let currentPct = 0;
  const bars = profile.map((point, index) => {
    const widthPct = ((point.durationSec || 0) / totalTimeSec) * 100;
    const leftPct = currentPct;
    currentPct += widthPct;
    const height = Math.max(8, Math.min(95, toHeight(point.paceSecPerKm)));
    const speedKmh = point.paceSecPerKm > 0 ? (3600 / point.paceSecPerKm).toFixed(1) : "0";

    return {
      ...point,
      index,
      leftPct,
      widthPct,
      height,
      speedKmh,
      colors: getColors(point.type),
    };
  });

  const active = hovered !== null ? bars[hovered] : null;

  return (
    <div className="w-full space-y-3 rounded-2xl border border-stone-200 bg-white p-4 font-sans shadow-sm dark:border-stone-800 dark:bg-stone-950 dark:shadow-none">
      {/* En-tête : Titre & Durée globale ou informations du bloc survolé */}
      <div className="flex items-center justify-between min-h-[22px]">
        {active ? (
          <div className="flex items-center gap-2 flex-wrap text-[10px] animate-fadeIn">
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{
                backgroundColor: "var(--active-color, #FB923C)",
                ["--active-color" as any]: active.colors.dark,
              }}
            />
            <span className="font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              {active.label}
            </span>
            <span className="text-stone-400 dark:text-stone-600">•</span>
            <span className="font-mono font-bold text-[#FB923C] dark:text-[#FB923C]">
              {active.paceFormatted || formatPace(active.paceSecPerKm)} min/km
            </span>
            <span className="font-mono text-stone-500 dark:text-stone-400 text-[9.5px]">
              ({active.speedKmh} km/h)
            </span>
            <span className="text-stone-400 dark:text-stone-600">•</span>
            <span className="font-semibold text-stone-600 dark:text-stone-300">
              {formatDetailedDuration(active.durationSec || 0)}
            </span>
          </div>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
              Profil d'allure de la séance
            </span>
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
              {formatMinutesToHours(Math.round(totalTimeSec / 60))}
            </span>
          </>
        )}
      </div>

      {/* Graphique */}
      <div className="flex gap-2">
        {/* Axe Y : valeurs conservées à gauche sans ligne pointillée */}
        <div className="relative h-32 w-10 shrink-0">
          {yTicks.map((t, i) => (
            <span
              key={i}
              className="absolute right-0 translate-y-1/2 font-mono text-[9px] font-semibold tabular-nums text-stone-500 dark:text-stone-500"
              style={{ bottom: `${t.h}%` }}
            >
              {formatPace(t.pace)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Zone de tracé sans pointillés */}
          <div
            className="relative h-32 select-none"
            onMouseLeave={() => setHovered(null)}
          >
            {/* Barres d'allure unies (sans dégradé) */}
            {bars.map((bar, i) => {
              const isHovered = hovered === i;
              const isDimmed = hovered !== null && !isHovered;

              return (
                <div
                  key={i}
                  className="absolute bottom-0 top-0 cursor-pointer"
                  style={{
                    left: `${bar.leftPct}%`,
                    width: `${bar.widthPct}%`,
                    minWidth: 3,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onTouchStart={() => setHovered(i)}
                >
                  <div
                    className="absolute bottom-0 inset-x-[0.5px] rounded-t-[3px] transition-all duration-150 pace-bar-solid"
                    style={
                      {
                        height: `${bar.height}%`,
                        backgroundColor: "var(--bar-bg)",
                        opacity: isDimmed ? 0.35 : 1,
                        filter: isHovered ? "brightness(1.15)" : "none",
                        ["--bar-bg-light" as any]: bar.colors.light,
                        ["--bar-bg-dark" as any]: bar.colors.dark,
                        ["--bar-bg" as any]: bar.colors.dark,
                      } as React.CSSProperties
                    }
                  />
                </div>
              );
            })}

            {/* Infobulle flottante */}
            {active && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-xl border border-stone-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur transition-transform dark:border-stone-700 dark:bg-stone-900/95"
                style={{
                  left: `${Math.min(84, Math.max(16, active.leftPct + active.widthPct / 2))}%`,
                  bottom: `calc(${active.height}% + 10px)`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full inline-block"
                    style={{ backgroundColor: active.colors.dark }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    {active.label}
                  </span>
                </div>
                <div className="font-mono text-[10px] tabular-nums text-stone-600 dark:text-stone-300">
                  <span className="text-[#FB923C] font-bold">
                    {active.paceFormatted || formatPace(active.paceSecPerKm)} min/km
                  </span>
                  <span className="text-stone-400 dark:text-stone-500">
                    {" "}
                    ({active.speedKmh} km/h)
                  </span>
                </div>
                <div className="text-[9px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Durée : {formatDetailedDuration(active.durationSec || 0)}
                </div>
              </div>
            )}
          </div>

          {/* Axe X (Graduation temporelle en bas) */}
          <div className="relative mt-1.5 h-3 border-t border-stone-200 dark:border-stone-800">
            {xTicks.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 font-mono text-[9px] tabular-nums text-stone-500 first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(t / totalMin) * 100}%` }}
              >
                {t === 0 ? "0" : formatMinutesToHours(t)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Légende avec les couleurs unies */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 border-t border-stone-100 dark:border-stone-900">
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className="flex items-center gap-1.5 text-[10px] font-medium text-stone-600 dark:text-stone-400"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: l.dark }}
            />
            {l.label}
          </span>
        ))}
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-stone-400 dark:text-stone-600">
          min/km
        </span>
      </div>
    </div>
  );
};