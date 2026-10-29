// src/components/workout/PaceProfileChart.tsx

import React, { useState } from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

interface PaceProfileChartProps {
  steps?: WorkoutStep[];
  vma?: number | string;
  athleteVmaTemplates?: any[];
  coachVmaTemplates?: any[];
  userRole?: string;
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

// Fonction utilitaire pour extraire min/max d'une zone VMA
const getZoneMinMax = (zone: any) => {
  if (!zone) return { min: 0, max: 0 };
  const rawMin = zone.minVmaPercent ?? zone.percentageMin ?? zone.minPercent ?? zone.min ?? zone.percentage_min ?? zone.min_percent ?? 0;
  const rawMax = zone.maxVmaPercent ?? zone.percentageMax ?? zone.maxPercent ?? zone.max ?? zone.percentage_max ?? zone.max_percent ?? 0;
  let min = parseFloat(String(rawMin).replace(",", ".")) || 0;
  let max = parseFloat(String(rawMax).replace(",", ".")) || 0;
  return { min, max };
};

// Couleurs avec dégradés verticaux préservant les teintes Volaris
const COLORS: Record<
  string,
  { light: string; dark: string; border: string; gradient: string }
> = {
  echauffement: {
    light: "#C24E4C",
    dark: "#CF6361",
    border: "#CF6361",
    gradient: "linear-gradient(180deg, rgba(207, 99, 97, 0.95) 0%, rgba(207, 99, 97, 0.25) 100%)",
  },
  corps: {
    light: "#C07F36",
    dark: "#CF9A61",
    border: "#CF9A61",
    gradient: "linear-gradient(180deg, rgba(207, 154, 97, 0.95) 0%, rgba(207, 154, 97, 0.25) 100%)",
  },
  recup: {
    light: "#A3A62A",
    dark: "#CDCF61",
    border: "#CDCF61",
    gradient: "linear-gradient(180deg, rgba(205, 207, 97, 0.95) 0%, rgba(205, 207, 97, 0.25) 100%)",
  },
  retour_calme: {
    light: "#2563eb",
    dark: "#3b82f6",
    border: "#3b82f6",
    gradient: "linear-gradient(180deg, rgba(59, 130, 246, 0.95) 0%, rgba(59, 130, 246, 0.25) 100%)",
  },
  default: {
    light: "#059669",
    dark: "#10b981",
    border: "#10b981",
    gradient: "linear-gradient(180deg, rgba(16, 185, 129, 0.95) 0%, rgba(16, 185, 129, 0.25) 100%)",
  },
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

export const PaceProfileChart: React.FC<PaceProfileChartProps> = ({
  steps,
  vma,
  athleteVmaTemplates = [],
  coachVmaTemplates = [],
  userRole = "athlete",
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const numericVma = typeof vma === "string" ? parseFloat(vma.replace(",", ".")) : Number(vma || 0);

  const isCoach = userRole === "coach";
  const availableVmaTemplates = isCoach
    ? (coachVmaTemplates.length > 0 ? coachVmaTemplates : athleteVmaTemplates)
    : athleteVmaTemplates;
  const defaultVmaTemplate = availableVmaTemplates.find((t: any) => t.isDefault || t.is_default) || availableVmaTemplates[0];

  // Traduction des blocs "vma_zone" en allures (secondes/km) pour le graphique
  const processedSteps = steps?.map((step) => {
    if (step.goalType === "vma_zone" && step.targetZoneId && defaultVmaTemplate?.zones) {
      const selectedVmaZone = defaultVmaTemplate.zones.find(
        (z: any, zIdx: number) => 
          String(z.id) === String(step.targetZoneId) || 
          String(z.name) === String(step.targetZoneId) ||
          String(zIdx) === String(step.targetZoneId)
      );
      if (selectedVmaZone && numericVma > 0) {
        const { min, max } = getZoneMinMax(selectedVmaZone);
        if (min > 0 && max > 0) {
          const avgPercent = (min + max) / 2;
          const speedKmH = (numericVma * avgPercent) / 100;
          if (speedKmH > 0) {
            const paceSec = 3600 / speedKmH;
            return {
              ...step,
              paceSecPerKm: paceSec,
            };
          }
        }
      }
    }
    return step;
  });

  const profile = generatePaceProfile(processedSteps, vma);
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
              style={{ backgroundColor: active.colors.dark }}
            />
            <span className="font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              {active.label}
            </span>
            <span className="text-stone-400 dark:text-stone-600">•</span>
            <span className="font-mono font-bold text-[#CF9A61]">
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
          <div
            className="relative h-32 select-none"
            onMouseLeave={() => setHovered(null)}
          >
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
                    className="absolute bottom-0 inset-x-[0.5px] rounded-t-[3px] border border-b-0 transition-all duration-150"
                    style={{
                      height: `${bar.height}%`,
                      backgroundImage: bar.colors.gradient,
                      borderColor: bar.colors.border,
                      opacity: isDimmed ? 0.35 : 1,
                      filter: isHovered ? "brightness(1.2)" : "none",
                    }}
                  />
                </div>
              );
            })}

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
                  <span className="text-[#CF9A61] font-bold">
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