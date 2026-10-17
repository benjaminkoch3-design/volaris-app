// src/components/stats/AnnualStats.tsx

import React, { useState, useEffect, useRef } from "react";
import { CompletedRun, Plan, Workout } from "../../types";
import { MONTHS_LIST } from "../../constants";
import {
  parseYMD,
  getISOWeekNumberFromParts,
  getCurrentWeekNumber,
  calculateStepMetrics,
} from "../../utils/calculations";
import { exportAthleteStatsToExcel } from "../../utils/excelExport";

interface AnnualStatsProps {
  completedRuns: CompletedRun[];
  activePlan?: Plan | null;
  completedWorkouts?: Record<string, boolean>;
  onAddRun: (run: CompletedRun) => void;
  draftWorkouts?: Workout[];
  newPlanForm?: any;
  draftWeekTypes?: any;
  goal?: string;
  initialSubTab?: "plan" | "annual";
  onBackToDashboard?: () => void;
  isReadOnly?: boolean;
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

// Dégradé Arc-en-ciel pastel pour chaque mois (0 = Janvier, 11 = Décembre)
const RAINBOW_PASTEL_COLORS: Record<number, string> = {
  0: "#C084FC",  // Janvier - Violet clair
  1: "#A78BFA",  // Février - Indigo pastel
  2: "#93C5FD",  // Mars - Bleu céleste
  3: "#A5F3FC",  // Avril - Cyan glacé
  4: "#6EE7B7",  // Mai - Vert menthe clair
  5: "#A3E635",  // Juin - Lime doux
  6: "#FDE047",  // Juillet - Jaune pastel
  7: "#FDBA74",  // Août - Ambre pêche
  8: "#FB923C",  // Septembre - Orange abricot
  9: "#F87171",  // Octobre - Corail doux
  10: "#F472B6", // Novembre - Rose magenta pastel
  11: "#E879F9", // Décembre - Violet lavande
};

const getMonthThemeColor = (monthIndex: number): string => {
  return RAINBOW_PASTEL_COLORS[monthIndex] || "#93C5FD";
};

const getMonthIndexForWeek = (weekNum: number): number => {
  const dayOfYear = (weekNum - 1) * 7 + 3;
  return Math.min(11, Math.max(0, Math.floor(dayOfYear / 30.5)));
};

const getWeekMonthColor = (weekNum: number): string => {
  return RAINBOW_PASTEL_COLORS[getMonthIndexForWeek(weekNum)] || "#6EE7B7";
};

export const AnnualStats: React.FC<AnnualStatsProps> = ({
  completedRuns,
  activePlan,
  completedWorkouts = {},
  onAddRun,
  initialSubTab = "annual",
  isReadOnly = false,
  vma,
}) => {
  const [activeTab, setActiveTab] = useState<"plan" | "annual">(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [selectedStatsYear, setSelectedStatsYear] = useState<number>(2026);
  const [showAddRunForm, setShowAddRunForm] = useState<boolean>(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(
    () => new Date().getMonth()
  );

  const [showVolumeChart, setShowVolumeChart] = useState<boolean>(true);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState<boolean>(true);

  // Gestion du zoom et carrousel mobile pour les 4 histogrammes
  const [zoomedChart, setZoomedChart] = useState<ZoomableChartType | null>(null);
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  const [newRunForm, setNewRunForm] = useState({
    date: new Date().toISOString().split("T")[0],
    km: "",
    durationMin: "",
    elevation: "",
    isRace: false,
    raceNotes: "",
  });

  const handleAddRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const kmNum = parseFloat(newRunForm.km);
    const durMinNum = parseFloat(newRunForm.durationMin);
    const elevNum = parseFloat(newRunForm.elevation) || 0;

    if (
      !newRunForm.date ||
      isNaN(kmNum) ||
      kmNum <= 0 ||
      isNaN(durMinNum) ||
      durMinNum <= 0
    ) {
      return;
    }

    const runToAdd: CompletedRun = {
      id: Date.now().toString(),
      date: newRunForm.date,
      km: kmNum,
      durationHours: durMinNum / 60,
      elevation: elevNum,
      raceNotes:
        newRunForm.isRace && newRunForm.raceNotes
          ? newRunForm.raceNotes
          : undefined,
    };

    onAddRun(runToAdd);
    setNewRunForm({
      date: new Date().toISOString().split("T")[0],
      km: "",
      durationMin: "",
      elevation: "",
      isRace: false,
      raceNotes: "",
    });
    setShowAddRunForm(false);
  };

  const handleExportExcel = () => {
    exportAthleteStatsToExcel(completedRuns, "Athlete", selectedStatsYear);
  };

  const currentMonthColor = getMonthThemeColor(selectedMonthIndex);

  // =========================================================================
  // CALCULS PAR SEMAINE DU PLAN ACTIF
  // =========================================================================
  const durationWeeks = activePlan
    ? typeof activePlan.durationWeeks === "number"
      ? activePlan.durationWeeks
      : parseInt(String(activePlan.durationWeeks), 10) || 12
    : 12;

  const currentWeekNum = activePlan
    ? getCurrentWeekNumber(activePlan.startDate, String(activePlan.durationWeeks || "12"))
    : 1;

  const weeklyMetricsData = Array.from({ length: durationWeeks }, (_, i) => {
    const wNum = i + 1;
    const weekWorkouts = (activePlan?.workouts || []).filter(
      (w) => Number(w.weekNumber) === wNum && !w.isRest
    );

    let plannedKm = 0;
    let completedKm = 0;
    let plannedMinutes = 0;
    let completedMinutes = 0;
    let plannedLoad = 0;
    let completedLoad = 0;
    let completedElevation = 0;

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

        const elev =
          (w as any).completedElevationGain ??
          (w as any).completed_elevation_gain ??
          0;
        completedElevation += Number(elev) || 0;
      }
    });

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
          <linearGradient id={`annualPlanGrad_${colorTheme}_${isExpanded ? "exp" : "std"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.from} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.to} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`annualPlanOverGrad_${colorTheme}_${isExpanded ? "exp" : "std"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.overFrom} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.overTo} stopOpacity="0.95" />
          </linearGradient>
        </defs>

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

        <line x1={paddingLeft} y1={baselineY} x2={svgWidth - paddingRight} y2={baselineY} stroke="#3f3f46" strokeWidth="1.2" />

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
                      ? `url(#annualPlanOverGrad_${colorTheme}_${isExpanded ? "exp" : "std"})`
                      : `url(#annualPlanGrad_${colorTheme}_${isExpanded ? "exp" : "std"})`
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
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* Sélecteur d'onglets principaux (Plan en cours / Bilan annuel) */}
      <div className="flex bg-stone-900 p-1.5 rounded-2xl border border-stone-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer ${
            activeTab === "plan"
              ? "bg-[#CF9A61] text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Plan en cours
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("annual")}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer ${
            activeTab === "annual"
              ? "bg-[#B34D4D] text-stone-100 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Bilan annuel
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. PLAN EN COURS (LES 4 HISTOGRAMMES PAR SEMAINE) */}
      {/* ========================================================================= */}
      {activeTab === "plan" && (
        <div className="space-y-5 animate-fadeIn w-full">
          {!activePlan ? (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-2xl">
                📊
              </div>
              <h3 className="text-sm font-black uppercase text-stone-100">
                Aucun plan d'entraînement actif
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
                Créez un plan personnalisé pour observer vos projections kilométriques et les courbes de charge.
              </p>
            </div>
          ) : (
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
                {/* 1. VOLUME KILOMÉTRIQUE */}
                <div
                  onClick={() => handleOpenZoom("volume")}
                  className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
                >
                  <div className="space-y-3 border-b border-stone-800/80 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                          Macrocycle ({durationWeeks} sem.)
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
                      <span className="text-stone-200 font-bold">Volume réalisé</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                      <span className="text-stone-400 font-medium">Volume prévu</span>
                    </span>
                  </div>
                </div>

                {/* 2. CHARGE D'ENTRAÎNEMENT */}
                <div
                  onClick={() => handleOpenZoom("load")}
                  className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
                >
                  <div className="space-y-3 border-b border-stone-800/80 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                          Macrocycle ({durationWeeks} sem.)
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
                      <span className="text-stone-200 font-bold">Charge réalisée</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                      <span className="text-stone-400 font-medium">Charge prévue</span>
                    </span>
                  </div>
                </div>

                {/* 3. TEMPS PASSÉ À COURIR */}
                <div
                  onClick={() => handleOpenZoom("time")}
                  className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
                >
                  <div className="space-y-3 border-b border-stone-800/80 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                          Macrocycle ({durationWeeks} sem.)
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
                      <span className="text-stone-200 font-bold">Temps réalisé</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                      <span className="text-stone-400 font-medium">Temps prévu</span>
                    </span>
                  </div>
                </div>

                {/* 4. DÉNIVELÉ POSITIF */}
                <div
                  onClick={() => handleOpenZoom("elevation")}
                  className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between transition sm:cursor-pointer group"
                >
                  <div className="space-y-3 border-b border-stone-800/80 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                          Macrocycle ({durationWeeks} sem.)
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BILAN ANNUEL */}
      {/* ========================================================================= */}
      {activeTab === "annual" && (
        <div className="space-y-6 animate-fadeIn w-full">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-black uppercase text-stone-100">
              Statistiques annuelles {selectedStatsYear}
            </h3>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Télécharger le bilan au format Excel conforme"
                >
                  <span>Exporter Excel</span>
                </button>
              )}

              <select
                value={selectedStatsYear}
                onChange={(e) =>
                  setSelectedStatsYear(parseInt(e.target.value, 10))
                }
                className="bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-bold focus:outline-none focus:border-[#B34D4D] cursor-pointer"
              >
                <option value={2026}>Année 2026</option>
                <option value={2025}>Année 2025</option>
              </select>

              {!isReadOnly && (
                <button
                  onClick={() => setShowAddRunForm(!showAddRunForm)}
                  className={`text-[10px] font-black px-3 py-2 rounded-xl uppercase transition cursor-pointer border ${
                    showAddRunForm
                      ? "text-[#CF6361] bg-[#CF6361]/10 border-[#CF6361]/30 hover:bg-[#CF6361]/20"
                      : "text-[#B34D4D] bg-[#B34D4D]/10 border-[#B34D4D]/30 hover:bg-[#B34D4D]/20"
                  }`}
                >
                  {showAddRunForm ? "Fermer" : "Entrer une sortie"}
                </button>
              )}
            </div>
          </div>

          {!isReadOnly && showAddRunForm && (
            <form
              onSubmit={handleAddRunSubmit}
              className="bg-stone-900/90 border border-[#B34D4D]/50 rounded-3xl p-4 space-y-3 shadow-2xl animate-fadeIn"
            >
              <div className="text-xs font-black text-[#B34D4D] uppercase tracking-wider border-b border-stone-800 pb-2">
                Saisir une nouvelle sortie effectuée
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newRunForm.date}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, date: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 12.5"
                    value={newRunForm.km}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, km: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="Ex: 45"
                    value={newRunForm.durationMin}
                    onChange={(e) =>
                      setNewRunForm({
                        ...newRunForm,
                        durationMin: e.target.value,
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Dénivelé (m D+)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Ex: 150"
                    value={newRunForm.elevation}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, elevation: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-[#B34D4D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRunForm.isRace}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, isRace: e.target.checked })
                    }
                    className="accent-[#B34D4D] rounded cursor-pointer"
                  />
                  <span>Il s'agit d'une course officielle</span>
                </label>

                {newRunForm.isRace && (
                  <input
                    type="text"
                    placeholder="Intitulé (ex: Ronde du Salbert: 9,72km)"
                    value={newRunForm.raceNotes}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, raceNotes: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B34D4D] hover:bg-[#993d3d] text-stone-100 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Enregistrer la sortie
              </button>
            </form>
          )}

          {(() => {
            const yearRuns = completedRuns.filter((r) => {
              const { year } = parseYMD(r.date);
              return year === selectedStatsYear;
            });

            const totalKm = yearRuns.reduce((sum, r) => sum + r.km, 0);
            const totalHours = yearRuns.reduce((sum, r) => sum + r.durationHours, 0);
            const totalElev = yearRuns.reduce((sum, r) => sum + (r.elevation || 0), 0);
            const totalRuns = yearRuns.length;

            const moySortieKm = totalRuns > 0 ? totalKm / totalRuns : 0;
            const moySortieHours = totalRuns > 0 ? totalHours / totalRuns : 0;
            const moySortieElev = totalRuns > 0 ? totalElev / totalRuns : 0;

            const moyJourKm = totalKm / 365;
            const moyJourHours = totalHours / 365;
            const moyJourElev = totalElev / 365;

            const moySemaineKm = totalKm / 52;
            const moySemaineHours = totalHours / 52;
            const moySemaineElev = totalElev / 52;
            const moySemaineRuns = totalRuns / 52;

            const moyMoisKm = totalKm / 12;
            const moyMoisHours = totalHours / 12;
            const moyMoisElev = totalElev / 12;
            const moyMoisRuns = totalRuns / 12;

            return (
              <div className="bg-[#B34D4D]/10 border-2 border-[#B34D4D]/50 rounded-3xl p-4 space-y-3 shadow-xl overflow-x-auto custom-scrollbar">
                <div className="text-center pb-1 border-b border-[#B34D4D]/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#B34D4D]">
                    Résumé global année {selectedStatsYear}
                  </span>
                </div>

                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#B34D4D] text-stone-100 font-black text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-2 border border-stone-800">Catégorie</th>
                      <th className="py-2 px-2 border border-stone-800">Distance (km)</th>
                      <th className="py-2 px-2 border border-stone-800">Temps (h)</th>
                      <th className="py-2 px-2 border border-stone-800">Dénivelé (m)</th>
                      <th className="py-2 px-2 border border-stone-800">Sorties (nb)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 bg-stone-950/80 font-bold text-stone-100">
                    <tr className="bg-[#B34D4D]/20 text-[#B34D4D] font-black">
                      <td className="py-2 px-2 border border-stone-800 uppercase bg-[#B34D4D]/30 text-[#B34D4D]">
                        Total
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalKm.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalHours.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {Math.round(totalElev)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalRuns}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / sortie
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800 text-stone-500">-</td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / jour
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800 text-stone-400 text-[10px]">
                        {((totalRuns / 365) * 100).toFixed(1)}%
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / semaine
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineRuns.toFixed(2)}</td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / mois
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisRuns.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* DÉTAIL MENSUEL */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
                Détail mensuel
              </h4>

              <button
                type="button"
                onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 cursor-pointer transition"
              >
                {showMonthlyDetails ? "▲" : "▼"}
              </button>
            </div>

            {showMonthlyDetails && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-2xl border border-stone-800 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonthIndex((prev) => (prev === 0 ? 11 : prev - 1))
                    }
                    style={{ color: currentMonthColor }}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 font-black rounded-xl text-xs transition cursor-pointer"
                    title="Mois précédent"
                  >
                    ◀
                  </button>

                  <div className="flex-1 flex items-center justify-center">
                    <select
                      value={selectedMonthIndex}
                      onChange={(e) =>
                        setSelectedMonthIndex(parseInt(e.target.value, 10))
                      }
                      style={{
                        color: currentMonthColor,
                        borderColor: `${currentMonthColor}60`,
                      }}
                      className="bg-stone-900 border rounded-xl px-4 py-2 text-xs font-black uppercase focus:outline-none cursor-pointer text-center w-full max-w-[200px]"
                    >
                      {MONTHS_LIST.map((mName, idx) => (
                        <option
                          key={mName}
                          value={idx}
                          className="bg-stone-900 font-bold"
                          style={{ color: RAINBOW_PASTEL_COLORS[idx] }}
                        >
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonthIndex((prev) => (prev === 11 ? 0 : prev + 1))
                    }
                    style={{ color: currentMonthColor }}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 font-black rounded-xl text-xs transition cursor-pointer"
                    title="Mois suivant"
                  >
                    ▶
                  </button>
                </div>

                {(() => {
                  const mIdx = selectedMonthIndex;
                  const monthName = MONTHS_LIST[mIdx];
                  const monthRuns = completedRuns.filter((r) => {
                    const { year, month } = parseYMD(r.date);
                    return year === selectedStatsYear && month === mIdx;
                  });

                  const weekMap: Record<
                    number,
                    { km: number; hours: number; elev: number; count: number }
                  > = {};

                  monthRuns.forEach((run) => {
                    const { year, month, day } = parseYMD(run.date);
                    const wNum = getISOWeekNumberFromParts(year, month, day);
                    if (!weekMap[wNum]) {
                      weekMap[wNum] = { km: 0, hours: 0, elev: 0, count: 0 };
                    }
                    weekMap[wNum].km += run.km;
                    weekMap[wNum].hours += run.durationHours;
                    weekMap[wNum].elev += run.elevation || 0;
                    weekMap[wNum].count += 1;
                  });

                  const totalMonthKm = monthRuns.reduce((sum, r) => sum + r.km, 0);
                  const totalMonthHours = monthRuns.reduce(
                    (sum, r) => sum + r.durationHours,
                    0
                  );
                  const totalMonthElev = monthRuns.reduce(
                    (sum, r) => sum + (r.elevation || 0),
                    0
                  );
                  const totalMonthRuns = monthRuns.length;

                  const weekNumbersList = Object.keys(weekMap)
                    .map((w) => parseInt(w, 10))
                    .sort((a, b) => a - b);

                  return (
                    <div className="space-y-3">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-center border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 font-extrabold text-[9.5px] uppercase">
                              <th className="py-2 px-1.5 border border-stone-800/80">Semaine</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Distance (km)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Temps (h)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Dénivelé (m)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Sorties (nb)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/80 bg-stone-950/40 text-stone-200 font-semibold">
                            {weekNumbersList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-4 text-xs text-stone-500 italic">
                                  Aucune sortie enregistrée en {monthName}.
                                </td>
                              </tr>
                            ) : (
                              weekNumbersList.map((wNum) => {
                                const data = weekMap[wNum];
                                return (
                                  <tr key={wNum} className="hover:bg-stone-900/60 transition">
                                    <td
                                      style={{ color: currentMonthColor }}
                                      className="py-2 px-1.5 border border-stone-800/80 font-black text-xs"
                                    >
                                      S{wNum}
                                    </td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.km.toFixed(2)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.hours.toFixed(2)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{Math.round(data.elev)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.count}</td>
                                  </tr>
                                );
                              })
                            )}

                            <tr
                              style={{
                                backgroundColor: `${currentMonthColor}20`,
                                color: currentMonthColor,
                              }}
                              className="font-black"
                            >
                              <td
                                style={{ backgroundColor: `${currentMonthColor}30` }}
                                className="py-2 px-1.5 border border-stone-800 uppercase text-[10px]"
                              >
                                Total
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {totalMonthKm.toFixed(2)}
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {totalMonthHours.toFixed(2)}
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {Math.round(totalMonthElev)}
                              </td>
                              <td className="py-2 px-2 border border-stone-800">
                                {totalMonthRuns}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ÉVOLUTION DU VOLUME ANNUEL */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 md:p-6 shadow-xl space-y-4 w-full">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
                  Évolution du volume
                </h4>
                <span className="text-[10px] font-medium text-stone-400 block -mt-0.5">
                  (km par semaine)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowVolumeChart(!showVolumeChart)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 cursor-pointer transition"
              >
                {showVolumeChart ? "▲" : "▼"}
              </button>
            </div>

            {showVolumeChart && (() => {
              const weekDataMap: Record<number, { km: number; count: number }> = {};
              for (let w = 1; w <= 52; w++) {
                weekDataMap[w] = { km: 0, count: 0 };
              }

              completedRuns.forEach((run) => {
                const { year, month, day } = parseYMD(run.date);
                if (year === selectedStatsYear) {
                  const weekNum = getISOWeekNumberFromParts(year, month, day);
                  if (weekDataMap[weekNum]) {
                    weekDataMap[weekNum].km += run.km;
                    weekDataMap[weekNum].count += 1;
                  }
                }
              });

              const maxWeekKm = Math.max(
                ...Object.values(weekDataMap).map((w) => w.km),
                20
              );

              const width = 1000;
              const height = 240;
              const paddingLeft = 55;
              const paddingRight = 20;
              const paddingTop = 20;
              const paddingBottom = 55;
              const usableWidth = width - paddingLeft - paddingRight;
              const usableHeight = height - paddingTop - paddingBottom;
              const baselineY = height - paddingBottom;

              const pointsArray = Array.from({ length: 52 }, (_, i) => {
                const wNum = i + 1;
                const km = weekDataMap[wNum].km;
                const x = paddingLeft + (i / 51) * usableWidth;
                const y = baselineY - (km / maxWeekKm) * usableHeight;
                const monthColor = getWeekMonthColor(wNum);
                return { x, y, km, wNum, count: weekDataMap[wNum].count, monthColor };
              });

              const pathD = pointsArray.reduce((acc, p, idx) => {
                return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
              }, "");

              const areaD = `${pathD} L ${pointsArray[51].x},${baselineY} L ${pointsArray[0].x},${baselineY} Z`;

              const tickWeeks = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 52];

              return (
                <div className="bg-stone-950 p-3 md:p-4 rounded-2xl border border-stone-800 relative animate-fadeIn w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="annualRainbowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.35" />
                        <stop offset="50%" stopColor="#34D399" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <text x={paddingLeft - 8} y={paddingTop + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      {Math.round(maxWeekKm)} km
                    </text>
                    <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      {Math.round(maxWeekKm / 2)} km
                    </text>
                    <text x={paddingLeft - 8} y={baselineY + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      0 km
                    </text>

                    <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#27272a" strokeDasharray="3,3" />
                    <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={width - paddingRight} y2={paddingTop + usableHeight / 2} stroke="#27272a" strokeDasharray="3,3" />
                    <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#3f3f46" strokeWidth="1.5" />

                    <path d={areaD} fill="url(#annualRainbowGradient)" />
                    <path d={pathD} fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {tickWeeks.map((wNum) => {
                      const point = pointsArray[wNum - 1];
                      return (
                        <g key={`tick-${wNum}`}>
                          <line
                            x1={point.x}
                            y1={baselineY}
                            x2={point.x}
                            y2={baselineY + 5}
                            stroke="#52525b"
                            strokeWidth="1.5"
                          />
                          <text
                            x={point.x}
                            y={baselineY + 16}
                            fill="#a1a1aa"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            S{wNum}
                          </text>
                        </g>
                      );
                    })}

                    {MONTHS_LIST.map((mName, mIdx) => {
                      const mStartWeek = Math.round((mIdx * 52) / 12);
                      const mEndWeek = Math.round(((mIdx + 1) * 52) / 12) - 1;
                      const x1 = pointsArray[Math.min(51, Math.max(0, mStartWeek))].x;
                      const x2 = pointsArray[Math.min(51, Math.max(0, mEndWeek))].x;
                      const centerX = (x1 + x2) / 2;
                      const monthColor = RAINBOW_PASTEL_COLORS[mIdx];

                      return (
                        <text
                          key={mName}
                          x={centerX}
                          y={baselineY + 34}
                          fill={monthColor}
                          fontSize="9"
                          fontWeight="900"
                          textAnchor="middle"
                          className="uppercase tracking-wider"
                        >
                          {mName.slice(0, 3)}
                        </text>
                      );
                    })}

                    {pointsArray.map((p) => (
                      <g key={p.wNum} className="group cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.km > 0 ? "4" : "1.8"}
                          style={{ fill: p.monthColor, stroke: "#09090b" }}
                          className="stroke-1 group-hover:r-6 transition-all"
                        />
                        <title>{`Semaine ${p.wNum} : ${p.km.toFixed(1)} km (${p.count} sortie${p.count > 1 ? "s" : ""})`}</title>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODALE ZOOM PLEIN ÉCRAN */}
      {zoomedChart && (
        <div
          onClick={() => setZoomedChart(null)}
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-md hidden sm:flex items-center justify-center p-4 z-50 animate-fadeIn"
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
  );
};