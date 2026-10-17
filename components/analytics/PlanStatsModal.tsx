// src/components/analytics/PlanStatsModal.tsx

import React, { useState, useRef } from "react";
import { Plan } from "../../types";
import {
  getCurrentWeekNumber,
  calculateStepMetrics,
} from "../../utils/calculations";

interface PlanStatsModalProps {
  activePlan: Plan;
  completedWorkouts: Record<string, boolean>;
  onClose: () => void;
  vma?: number | string;
}

type ZoomableChartType = "volume" | "load" | "time" | "elevation";

const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return "0'";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m < 10 ? "0" : ""}${m}`;
};

export const PlanStatsModal: React.FC<PlanStatsModalProps> = ({
  activePlan,
  completedWorkouts,
  onClose,
  vma,
}) => {
  const [zoomedChart, setZoomedChart] = useState<ZoomableChartType | null>(null);
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  const durationWeeks =
    typeof activePlan.durationWeeks === "number"
      ? activePlan.durationWeeks
      : parseInt(String(activePlan.durationWeeks), 10) || 12;

  const currentWeekNum = getCurrentWeekNumber(
    activePlan.startDate,
    String(activePlan.durationWeeks || "12")
  );

  // Agrégation semaine par semaine (S1 -> Sn)
  const weeklyMetricsData = Array.from({ length: durationWeeks }, (_, i) => {
    const wNum = i + 1;
    const weekWorkouts = (activePlan.workouts || []).filter(
      (w) => Number(w.weekNumber) === wNum && !w.isRest
    );

    let plannedKm = 0;
    let completedKm = 0;
    let plannedMinutes = 0;
    let completedMinutes = 0;
    let plannedLoad = 0;
    let completedLoad = 0;
    let completedElevation = 0;

    let weekCompletedRpes: number[] = [];
    let weekPlannedRpes: number[] = [];

    weekWorkouts.forEach((w) => {
      const stepM =
        w.steps && w.steps.length > 0
          ? calculateStepMetrics(w.steps, vma)
          : { totalKm: 0, totalMinutes: 0 };

      // Distance
      if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
        plannedKm += parseFloat(String(w.km).replace(",", ".")) || 0;
      } else {
        plannedKm += stepM.totalKm || 0;
      }

      // Durée
      const pMin = stepM.totalMinutes || 0;
      plannedMinutes += pMin;

      // Charge
      const pRpe = w.rpe ? parseInt(String(w.rpe), 10) || 5 : 5;
      plannedLoad += pMin * pRpe;
      weekPlannedRpes.push(pRpe);

      const isDone = completedWorkouts[w.id] || w.completed;
      if (isDone) {
        if (
          w.completedKm !== undefined &&
          w.completedKm !== null &&
          String(w.completedKm).trim() !== ""
        ) {
          completedKm += parseFloat(String(w.completedKm).replace(",", ".")) || 0;
        } else if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
          completedKm += parseFloat(String(w.km).replace(",", ".")) || 0;
        } else {
          completedKm += stepM.totalKm || 0;
        }

        const cMin =
          w.completedTimeMinutes !== undefined && w.completedTimeMinutes !== null
            ? Number(w.completedTimeMinutes)
            : pMin;
        completedMinutes += cMin;

        const cRpe =
          w.completedRpe !== undefined && w.completedRpe !== null
            ? Number(w.completedRpe)
            : pRpe;
        completedLoad += cMin * cRpe;
        weekCompletedRpes.push(cRpe);

        const elev =
          (w as any).completedElevationGain ??
          (w as any).completed_elevation_gain ??
          0;
        completedElevation += Number(elev) || 0;
      }
    });

    const avgCompletedRpe =
      weekCompletedRpes.length > 0
        ? Math.round((weekCompletedRpes.reduce((a, b) => a + b, 0) / weekCompletedRpes.length) * 10) / 10
        : null;

    return {
      weekNum: wNum,
      weekLabel: `S${wNum}`,
      isCurrent: wNum === currentWeekNum,
      plannedKm: Math.round(plannedKm * 10) / 10,
      completedKm: Math.round(completedKm * 10) / 10,
      plannedMinutes: Math.round(plannedMinutes),
      completedMinutes: Math.round(completedMinutes),
      plannedLoad: Math.round(plannedLoad),
      completedLoad: Math.round(completedLoad),
      completedElevation: Math.round(completedElevation),
      avgCompletedRpe,
    };
  });

  // Totaux globaux
  const totalVolumePlanned =
    Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.plannedKm, 0) * 10) / 10;
  const totalVolumeCompleted =
    Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.completedKm, 0) * 10) / 10;
  const totalVolumePct =
    totalVolumePlanned > 0
      ? Math.min(100, Math.round((totalVolumeCompleted / totalVolumePlanned) * 100))
      : totalVolumeCompleted > 0 ? 100 : 0;

  const totalLoadPlanned = Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.plannedLoad, 0));
  const totalLoadCompleted = Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.completedLoad, 0));
  const totalLoadPct =
    totalLoadPlanned > 0
      ? Math.min(100, Math.round((totalLoadCompleted / totalLoadPlanned) * 100))
      : totalLoadCompleted > 0 ? 100 : 0;

  const totalTimePlanned = Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.plannedMinutes, 0));
  const totalTimeCompleted = Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.completedMinutes, 0));
  const totalTimePct =
    totalTimePlanned > 0
      ? Math.min(100, Math.round((totalTimeCompleted / totalTimePlanned) * 100))
      : totalTimeCompleted > 0 ? 100 : 0;

  const totalElevation = Math.round(weeklyMetricsData.reduce((acc, w) => acc + w.completedElevation, 0));
  const maxWeeklyElevation = Math.max(...weeklyMetricsData.map((w) => w.completedElevation), 0);
  const avgWeeklyElevation = Math.round(totalElevation / durationWeeks);

  // Max pour l'échelle SVG
  const maxVol = Math.max(...weeklyMetricsData.map((w) => Math.max(w.plannedKm, w.completedKm)), 20);
  const maxLoad = Math.max(...weeklyMetricsData.map((w) => Math.max(w.plannedLoad, w.completedLoad)), 400);
  const maxTime = Math.max(...weeklyMetricsData.map((w) => Math.max(w.plannedMinutes, w.completedMinutes)), 120);
  const maxElev = Math.max(...weeklyMetricsData.map((w) => w.completedElevation), 250);

  const handleCarouselScroll = () => {
    if (carouselScrollRef.current) {
      const { scrollLeft, offsetWidth } = carouselScrollRef.current;
      if (offsetWidth > 0) {
        const nextIdx = Math.round(scrollLeft / offsetWidth);
        setActiveMobileSlide(Math.max(0, Math.min(3, nextIdx)));
      }
    }
  };

  const scrollToSlide = (idx: number) => {
    if (carouselScrollRef.current) {
      const width = carouselScrollRef.current.offsetWidth;
      carouselScrollRef.current.scrollTo({
        left: idx * width,
        behavior: "smooth",
      });
      setActiveMobileSlide(idx);
    }
  };

  const handleOpenZoom = (chartType: ZoomableChartType) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      setZoomedChart(chartType);
    }
  };

  const renderWeeklyBarChart = (
    data: {
      plannedVal: number;
      completedVal: number;
      labelValue: string;
      tooltipText: string;
    }[],
    maxVal: number,
    colorTheme: "burgundy" | "gold" | "blue" | "green",
    isExpanded = false
  ) => {
    const svgWidth = isExpanded ? Math.max(750, durationWeeks * 56) : Math.max(540, durationWeeks * 44);
    const svgHeight = isExpanded ? 240 : 165;
    const paddingLeft = 38;
    const paddingRight = 15;
    const paddingTop = 26;
    const paddingBottom = 30;
    const usableHeight = svgHeight - paddingTop - paddingBottom;
    const baselineY = svgHeight - paddingBottom;
    const usableWidth = svgWidth - paddingLeft - paddingRight;
    const colWidth = usableWidth / durationWeeks;
    const barWidth = Math.min(isExpanded ? 26 : 18, Math.max(10, colWidth * 0.55));

    const gradients = {
      burgundy: { from: "#B34D4D", to: "#7f2b2b", overFrom: "#CF6361", overTo: "#B34D4D" },
      gold: { from: "#CF9A61", to: "#9c6b35", overFrom: "#eab308", overTo: "#CF9A61" },
      blue: { from: "#4D80B3", to: "#2d547d", overFrom: "#38bdf8", overTo: "#4D80B3" },
      green: { from: "#4DB380", to: "#2e7d55", overFrom: "#CDCF61", overTo: "#4DB380" },
    }[colorTheme];

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id={`planGrad_${colorTheme}_${isExpanded ? "exp" : "std"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.from} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.to} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`planOverGrad_${colorTheme}_${isExpanded ? "exp" : "std"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.overFrom} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.overTo} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Axe Y sans pointillés */}
        <line x1={paddingLeft} y1={paddingTop - 6} x2={paddingLeft} y2={baselineY} stroke="#3f3f46" strokeWidth="1.2" />

        {[0, 0.5, 1].map((pct, idx) => {
          const y = paddingTop + usableHeight * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <g key={idx}>
              <line x1={paddingLeft - 3} y1={y} x2={paddingLeft} y2={y} stroke="#52525b" strokeWidth="1.2" />
              <text
                x={paddingLeft - 6}
                y={y + 3.5}
                fill="#71717a"
                fontSize={isExpanded ? "11" : "9"}
                fontWeight="700"
                textAnchor="end"
                className="font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Ligne de base X */}
        <line x1={paddingLeft} y1={baselineY} x2={svgWidth - paddingRight} y2={baselineY} stroke="#3f3f46" strokeWidth="1.2" />

        {/* Colonnes par semaine */}
        {data.map((item, i) => {
          const w = weeklyMetricsData[i];
          const colCenterX = paddingLeft + i * colWidth + colWidth / 2;
          const barX = colCenterX - barWidth / 2;

          const baseTarget = Math.max(item.plannedVal, item.completedVal);
          const containerH = baseTarget > 0 ? (baseTarget / maxVal) * usableHeight : 0;
          const containerY = baselineY - containerH;

          const fillH = item.completedVal > 0 ? (item.completedVal / maxVal) * usableHeight : 0;
          const fillY = baselineY - fillH;

          const isOver = item.plannedVal > 0 && item.completedVal > item.plannedVal;
          const topElementY = Math.min(
            containerH > 0 ? containerY : baselineY,
            fillH > 0 ? fillY : baselineY
          );

          return (
            <g key={i} className="group cursor-pointer">
              {w.isCurrent && (
                <rect
                  x={colCenterX - colWidth / 2 + 1}
                  y={paddingTop - 12}
                  width={colWidth - 2}
                  height={usableHeight + 18}
                  fill={gradients.from}
                  fillOpacity="0.08"
                  rx="6"
                />
              )}

              {containerH > 0 && (
                <rect
                  x={barX}
                  y={containerY}
                  width={barWidth}
                  height={Math.max(4, containerH)}
                  fill="#1c1917"
                  stroke="#292524"
                  strokeWidth="1"
                  rx="3"
                  className="transition-colors group-hover:stroke-stone-600"
                />
              )}

              {fillH > 0 && (
                <rect
                  x={barX}
                  y={fillY}
                  width={barWidth}
                  height={Math.max(4, fillH)}
                  fill={
                    isOver
                      ? `url(#planOverGrad_${colorTheme}_${isExpanded ? "exp" : "std"})`
                      : `url(#planGrad_${colorTheme}_${isExpanded ? "exp" : "std"})`
                  }
                  rx="3"
                  className="transition-all duration-200 group-hover:brightness-110"
                />
              )}

              {item.completedVal > 0 && (
                <text
                  x={colCenterX}
                  y={topElementY - 4}
                  fill={w.isCurrent ? gradients.from : "#d4d4d8"}
                  fontSize={isExpanded ? "10" : "8.5"}
                  fontWeight="900"
                  textAnchor="middle"
                  className="font-mono tracking-tight"
                >
                  {item.labelValue}
                </text>
              )}

              <text
                x={colCenterX}
                y={baselineY + 16}
                fill={w.isCurrent ? gradients.from : "#a1a1aa"}
                fontSize={isExpanded ? "10" : "8.5"}
                fontWeight={w.isCurrent ? "900" : "700"}
                textAnchor="middle"
                className="tracking-tight"
              >
                {w.weekLabel}
              </text>

              {w.isCurrent && (
                <circle cx={colCenterX} cy={baselineY + 22} r="1.5" fill={gradients.from} />
              )}

              <title>{item.tooltipText}</title>
            </g>
          );
        })}
      </svg>
    );
  };

  const volumeItems = weeklyMetricsData.map((w) => ({
    plannedVal: w.plannedKm,
    completedVal: w.completedKm,
    labelValue: `${w.completedKm}`,
    tooltipText: `Semaine ${w.weekNum} : ${w.completedKm} km / ${w.plannedKm} km prévus`,
  }));

  const loadItems = weeklyMetricsData.map((w) => ({
    plannedVal: w.plannedLoad,
    completedVal: w.completedLoad,
    labelValue: `${w.completedLoad}`,
    tooltipText: `Semaine ${w.weekNum} : ${w.completedLoad} / ${w.plannedLoad} charge prévue`,
  }));

  const timeItems = weeklyMetricsData.map((w) => ({
    plannedVal: w.plannedMinutes,
    completedVal: w.completedMinutes,
    labelValue: formatMinutesToHours(w.completedMinutes),
    tooltipText: `Semaine ${w.weekNum} : ${formatMinutesToHours(w.completedMinutes)} / ${formatMinutesToHours(w.plannedMinutes)} prévus`,
  }));

  const elevationItems = weeklyMetricsData.map((w) => ({
    plannedVal: 0,
    completedVal: w.completedElevation,
    labelValue: `${w.completedElevation}m`,
    tooltipText: `Semaine ${w.weekNum} : ${w.completedElevation} m D+ réalisés`,
  }));

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 md:p-6 max-w-5xl w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* En-tête */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
              Statistiques du Plan • {activePlan.name}
            </span>
            <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Progression par Semaine ({durationWeeks} sem.)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center justify-center cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* 4 Graphiques */}
        <div className="space-y-3 w-full">
          <div className="sm:hidden flex items-center justify-between px-1 text-[10px] font-bold text-stone-400">
            <span className="flex items-center gap-1 text-[#CF9A61]">
              <span>👉</span> Glissez pour faire défiler les graphiques
            </span>
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeMobileSlide === idx ? "bg-[#CF9A61] w-4" : "bg-stone-800"
                  }`}
                  aria-label={`Graphique ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div
            ref={carouselScrollRef}
            onScroll={handleCarouselScroll}
            className="w-full flex overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible"
          >
            {/* 1. VOLUME */}
            <div
              onClick={() => handleOpenZoom("volume")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Macrocycle
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#CF6361] transition">
                      Volume kilométrique
                    </h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#CF6361] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                    <span>⛶</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total réalisé</span>
                    <div className="text-xs font-black text-[#B34D4D] mt-0.5">
                      {totalVolumeCompleted} <span className="text-stone-500 font-normal text-[10px]">km</span>
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total prévu</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {totalVolumePlanned} <span className="text-stone-500 font-normal text-[10px]">km</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {totalVolumePct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderWeeklyBarChart(volumeItems, maxVol, "burgundy", false)}
              </div>

              <div className="flex items-center gap-4 text-[9.5px] font-semibold text-stone-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B34D4D] inline-block shadow-sm"></span>
                  <span className="text-stone-200 font-bold">Réalisé</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                  <span className="text-stone-400 font-medium">Prévu</span>
                </span>
              </div>
            </div>

            {/* 2. CHARGE */}
            <div
              onClick={() => handleOpenZoom("load")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Macrocycle
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#CF9A61] transition">
                      Charge d'entraînement
                    </h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#CF9A61] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                    <span>⛶</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total réalisé</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {totalLoadCompleted}
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total prévu</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {totalLoadPlanned}
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {totalLoadPct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderWeeklyBarChart(loadItems, maxLoad, "gold", false)}
              </div>

              <div className="flex items-center gap-4 text-[9.5px] font-semibold text-stone-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CF9A61] inline-block shadow-sm"></span>
                  <span className="text-stone-200 font-bold">Réalisé</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                  <span className="text-stone-400 font-medium">Prévu</span>
                </span>
              </div>
            </div>

            {/* 3. TEMPS */}
            <div
              onClick={() => handleOpenZoom("time")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Macrocycle
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#4D80B3] transition">
                      Temps passé à courir
                    </h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#4D80B3] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                    <span>⛶</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total réalisé</span>
                    <div className="text-xs font-black text-[#4D80B3] mt-0.5">
                      {formatMinutesToHours(totalTimeCompleted)}
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total prévu</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {formatMinutesToHours(totalTimePlanned)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {totalTimePct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderWeeklyBarChart(timeItems, maxTime, "blue", false)}
              </div>

              <div className="flex items-center gap-4 text-[9.5px] font-semibold text-stone-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4D80B3] inline-block shadow-sm"></span>
                  <span className="text-stone-200 font-bold">Réalisé</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                  <span className="text-stone-400 font-medium">Prévu</span>
                </span>
              </div>
            </div>

            {/* 4. DÉNIVELÉ */}
            <div
              onClick={() => handleOpenZoom("elevation")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Macrocycle
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#4DB380] transition">
                      Dénivelé positif
                    </h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#4DB380] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                    <span>⛶</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total réalisé</span>
                    <div className="text-xs font-black text-[#4DB380] mt-0.5">
                      {totalElevation} <span className="text-stone-500 text-[10px] font-normal">m D+</span>
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Max Semaine</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {maxWeeklyElevation} <span className="text-stone-500 text-[10px] font-normal">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Moyenne / Sem.</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {avgWeeklyElevation} <span className="text-stone-500 text-[10px] font-normal">m</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderWeeklyBarChart(elevationItems, maxElev, "green", false)}
              </div>

              <div className="flex items-center gap-4 text-[9.5px] font-semibold text-stone-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4DB380] inline-block shadow-sm"></span>
                  <span className="text-stone-200 font-bold">Dénivelé réalisé (m D+)</span>
                </span>
                <span className="text-[8.5px] uppercase font-bold text-stone-500">
                  Non prescrit dans le plan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODALE ZOOM PLEIN ÉCRAN */}
        {zoomedChart && (
          <div
            onClick={() => setZoomedChart(null)}
            className="fixed inset-0 bg-stone-950/95 backdrop-blur-md hidden sm:flex items-center justify-center p-4 z-60 animate-fadeIn"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                <h3 className="text-base font-black uppercase text-stone-100">
                  {zoomedChart === "volume" && "Volume kilométrique • Évolution par Semaine"}
                  {zoomedChart === "load" && "Charge d'entraînement • Évolution par Semaine"}
                  {zoomedChart === "time" && "Temps passé à courir • Évolution par Semaine"}
                  {zoomedChart === "elevation" && "Dénivelé positif • Évolution par Semaine"}
                </h3>
                <button
                  type="button"
                  onClick={() => setZoomedChart(null)}
                  className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center justify-center cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                {zoomedChart === "volume" && renderWeeklyBarChart(volumeItems, maxVol, "burgundy", true)}
                {zoomedChart === "load" && renderWeeklyBarChart(loadItems, maxLoad, "gold", true)}
                {zoomedChart === "time" && renderWeeklyBarChart(timeItems, maxTime, "blue", true)}
                {zoomedChart === "elevation" && renderWeeklyBarChart(elevationItems, maxElev, "green", true)}
              </div>

              <button
                type="button"
                onClick={() => setZoomedChart(null)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};