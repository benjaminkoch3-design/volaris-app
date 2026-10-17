// src/components/home/AthleteDashboard.tsx

import React, { useState, useEffect, useRef } from "react";
import { Plan, Workout } from "../../types";
import {
  safeFormatDateFr,
  getDaysUntilEvent,
  getCurrentWeekNumber,
  getWorkoutTypeConfig,
  calculateStepMetrics,
} from "../../utils/calculations";

interface AthleteDashboardProps {
  activePlan: Plan | null;
  completedWorkouts: Record<string, boolean>;
  todayWorkouts: Workout[];
  onSelectWorkoutDetail: (workout: Workout) => void;
  onToggleWorkout: (id: string) => void;
  onCreatePlanRequest: () => void;
  onNavigateToVolumeChart: () => void;
  onOpenDebrief: (workout: Workout) => void;
  isReadOnly?: boolean;
}

const getWorkoutTypeHexColor = (type: string) => {
  switch (type) {
    case "footing":
      return "#4DB380";
    case "vma":
    case "fractionne":
      return "#B34D4D";
    case "seuil":
      return "#CF9A61";
    case "longue":
      return "#4D80B3";
    case "specifique":
      return "#CDCF61";
    default:
      return "#CF9A61";
  }
};

const getRpeGradientColor = (rpeStr?: string | number) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = Number(rpeStr);
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return "0'";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m < 10 ? "0" : ""}${m}`;
};

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type ZoomableChartType = "volume" | "load" | "time" | "elevation";

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({
  activePlan,
  completedWorkouts,
  todayWorkouts,
  onSelectWorkoutDetail,
  onCreatePlanRequest,
  onNavigateToVolumeChart,
  onOpenDebrief,
  isReadOnly = false,
}) => {
  const [syncLoadingId, setSyncLoadingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ id: string; msg: string; isError?: boolean } | null>(null);

  // Modale plein écran (ordinateur)
  const [zoomedChart, setZoomedChart] = useState<ZoomableChartType | null>(null);

  // Index du carrousel mobile
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  // Modale Garmin
  const [showGarminModal, setShowGarminModal] = useState<Workout | null>(null);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");

  const [hasGarmin, setHasGarmin] = useState(false);
  const [hasCoros, setHasCoros] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gEmail = localStorage.getItem("volaris_garmin_email");
      const gPwd = localStorage.getItem("volaris_garmin_pwd");
      const cEmail = localStorage.getItem("volaris_coros_email");
      const cPwd = localStorage.getItem("volaris_coros_pwd");

      setHasGarmin(Boolean(gEmail && gPwd));
      setHasCoros(Boolean(cEmail && cPwd));

      if (gEmail) setGarminEmail(gEmail);
      if (gPwd) setGarminPassword(gPwd);
    }
  }, []);

  const currentWeekNum = activePlan
    ? getCurrentWeekNumber(
        activePlan.startDate,
        activePlan.durationWeeks || "12"
      )
    : 1;

  // Calcul du jour actuel (Lundi = 0 ... Dimanche = 6)
  const currentJsDay = new Date().getDay();
  const currentDayIndex = currentJsDay === 0 ? 6 : currentJsDay - 1;

  const handleOpenZoom = (chartType: ZoomableChartType) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      setZoomedChart(chartType);
    }
  };

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

  // Synchronisation Garmin
  const executeGarminSync = async (workout: Workout, emailToUse: string, pwdToUse: string) => {
    setSyncLoadingId(workout.id);
    setSyncStatus({ id: workout.id, msg: "⏳ Envoi vers Garmin Connect..." });

    try {
      localStorage.setItem("volaris_garmin_email", emailToUse);
      localStorage.setItem("volaris_garmin_pwd", pwdToUse);
      setHasGarmin(true);

      const res = await fetch("/api/sync-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: pwdToUse,
          workout,
          startDate: activePlan?.startDate || new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi sur Garmin Connect.");
      }

      setSyncStatus({ id: workout.id, msg: "✅ Séance synchronisée sur Garmin !" });
      setShowGarminModal(null);
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setSyncStatus({ id: workout.id, msg: `❌ ${err.message}`, isError: true });
    } finally {
      setSyncLoadingId(null);
    }
  };

  // Synchronisation COROS
  const executeCorosSync = async (workout: Workout) => {
    const emailToUse = localStorage.getItem("volaris_coros_email") || "";
    const pwdToUse = localStorage.getItem("volaris_coros_pwd") || "";

    if (!emailToUse || !pwdToUse) return;

    setSyncLoadingId(workout.id);
    setSyncStatus({ id: workout.id, msg: "⏳ Envoi vers COROS..." });

    try {
      const res = await fetch("/api/sync-coros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: pwdToUse,
          workout,
          startDate: activePlan?.startDate || new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi sur COROS.");
      }

      setSyncStatus({ id: workout.id, msg: "✅ Séance synchronisée sur COROS !" });
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setSyncStatus({ id: workout.id, msg: `❌ ${err.message}`, isError: true });
    } finally {
      setSyncLoadingId(null);
    }
  };

  const handleSyncButtonClick = (e: React.MouseEvent, workout: Workout) => {
    e.stopPropagation();

    const savedGarminEmail = localStorage.getItem("volaris_garmin_email");
    const savedGarminPwd = localStorage.getItem("volaris_garmin_pwd");
    const savedCorosEmail = localStorage.getItem("volaris_coros_email");
    const savedCorosPwd = localStorage.getItem("volaris_coros_pwd");

    if (savedGarminEmail && savedGarminPwd) {
      executeGarminSync(workout, savedGarminEmail, savedGarminPwd);
    } else if (savedCorosEmail && savedCorosPwd) {
      executeCorosSync(workout);
    } else {
      setShowGarminModal(workout);
    }
  };

  // Données journalières de la semaine en cours
  const dailyMetricsData = Array.from({ length: 7 }, (_, dIdx) => {
    const dayWorkouts = (activePlan?.workouts || []).filter(
      (w) => Number(w.weekNumber) === currentWeekNum && Number(w.dayIndex) === dIdx && !w.isRest
    );

    let plannedKm = 0;
    let completedKm = 0;
    let plannedMinutes = 0;
    let completedMinutes = 0;
    let plannedLoad = 0;
    let completedLoad = 0;
    let completedElevation = 0;

    let dayCompletedRpes: number[] = [];
    let dayPlannedRpes: number[] = [];

    dayWorkouts.forEach((w) => {
      const stepM = w.steps && w.steps.length > 0 ? calculateStepMetrics(w.steps) : { totalKm: 0, totalMinutes: 0 };

      // Distance
      if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
        plannedKm += parseFloat(String(w.km).replace(",", ".")) || 0;
      } else {
        plannedKm += stepM.totalKm || 0;
      }

      // Durée prévue
      const pMin = stepM.totalMinutes || 0;
      plannedMinutes += pMin;

      // RPE prévu
      const pRpe = w.rpe ? parseInt(String(w.rpe), 10) || 5 : 5;
      plannedLoad += pMin * pRpe;
      dayPlannedRpes.push(pRpe);

      const isDone = completedWorkouts[w.id] || w.completed;
      if (isDone) {
        // Distance réalisée
        if (w.completedKm !== undefined && w.completedKm !== null && String(w.completedKm).trim() !== "") {
          completedKm += parseFloat(String(w.completedKm).replace(",", ".")) || 0;
        } else if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
          completedKm += parseFloat(String(w.km).replace(",", ".")) || 0;
        } else {
          completedKm += stepM.totalKm || 0;
        }

        // Durée réalisée
        const cMin = w.completedTimeMinutes !== undefined && w.completedTimeMinutes !== null
          ? Number(w.completedTimeMinutes)
          : pMin;
        completedMinutes += cMin;

        // RPE & Charge réalisée
        const cRpe = w.completedRpe !== undefined && w.completedRpe !== null
          ? Number(w.completedRpe)
          : pRpe;
        completedLoad += cMin * cRpe;
        dayCompletedRpes.push(cRpe);

        // Dénivelé
        const elev = (w as any).completedElevationGain ?? (w as any).completed_elevation_gain ?? 0;
        completedElevation += Number(elev) || 0;
      }
    });

    const avgCompletedRpe = dayCompletedRpes.length > 0
      ? Math.round((dayCompletedRpes.reduce((a, b) => a + b, 0) / dayCompletedRpes.length) * 10) / 10
      : null;

    const avgPlannedRpe = dayPlannedRpes.length > 0
      ? Math.round((dayPlannedRpes.reduce((a, b) => a + b, 0) / dayPlannedRpes.length) * 10) / 10
      : null;

    return {
      dayIndex: dIdx,
      dayShort: DAYS_SHORT[dIdx],
      dayFull: DAYS_FULL[dIdx],
      isToday: dIdx === currentDayIndex,
      plannedKm: Math.round(plannedKm * 10) / 10,
      completedKm: Math.round(completedKm * 10) / 10,
      plannedMinutes: Math.round(plannedMinutes),
      completedMinutes: Math.round(completedMinutes),
      plannedLoad: Math.round(plannedLoad),
      completedLoad: Math.round(completedLoad),
      completedElevation: Math.round(completedElevation),
      avgCompletedRpe,
      avgPlannedRpe,
      hasWorkouts: dayWorkouts.length > 0,
    };
  });

  // Totaux hebdomadaires
  const weekVolumePlanned = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.plannedKm, 0) * 10) / 10;
  const weekVolumeCompleted = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.completedKm, 0) * 10) / 10;
  const weekVolumePct = weekVolumePlanned > 0
    ? Math.min(100, Math.round((weekVolumeCompleted / weekVolumePlanned) * 100))
    : (weekVolumeCompleted > 0 ? 100 : 0);

  const weekLoadPlanned = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.plannedLoad, 0));
  const weekLoadCompleted = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.completedLoad, 0));
  const weekLoadPct = weekLoadPlanned > 0
    ? Math.min(100, Math.round((weekLoadCompleted / weekLoadPlanned) * 100))
    : (weekLoadCompleted > 0 ? 100 : 0);

  const weekTimePlanned = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.plannedMinutes, 0));
  const weekTimeCompleted = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.completedMinutes, 0));
  const weekTimePct = weekTimePlanned > 0
    ? Math.min(100, Math.round((weekTimeCompleted / weekTimePlanned) * 100))
    : (weekTimeCompleted > 0 ? 100 : 0);

  const weekElevationTotal = Math.round(dailyMetricsData.reduce((acc, d) => acc + d.completedElevation, 0));
  const weekElevationMax = Math.max(...dailyMetricsData.map((d) => d.completedElevation), 0);
  const weekElevationAvg = Math.round(weekElevationTotal / 7);

  // Maximums pour l'échelle SVG
  const maxVolumeKm = Math.max(...dailyMetricsData.map((d) => Math.max(d.plannedKm, d.completedKm)), 10);
  const maxLoadVal = Math.max(...dailyMetricsData.map((d) => Math.max(d.plannedLoad, d.completedLoad)), 300);
  const maxTimeMinutes = Math.max(...dailyMetricsData.map((d) => Math.max(d.plannedMinutes, d.completedMinutes)), 60);
  const maxElevationVal = Math.max(...dailyMetricsData.map((d) => d.completedElevation), 150);

  // Histogramme générique sans pointillés
  const renderGenericBarChart = (
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
    const svgWidth = isExpanded ? 750 : 540;
    const svgHeight = isExpanded ? 240 : 165;
    const paddingLeft = 38;
    const paddingRight = 15;
    const paddingTop = 26;
    const paddingBottom = 30;
    const usableHeight = svgHeight - paddingTop - paddingBottom;
    const baselineY = svgHeight - paddingBottom;
    const usableWidth = svgWidth - paddingLeft - paddingRight;
    const colWidth = usableWidth / 7;
    const barWidth = isExpanded ? 26 : 18;

    const gradients = {
      // Volume kilométrique en bordeaux / rouge Volaris
      burgundy: { from: "#B34D4D", to: "#7f2b2b", overFrom: "#CF6361", overTo: "#B34D4D" },
      // Charge en or / ambre
      gold: { from: "#CF9A61", to: "#9c6b35", overFrom: "#eab308", overTo: "#CF9A61" },
      // Temps en bleu
      blue: { from: "#4D80B3", to: "#2d547d", overFrom: "#38bdf8", overTo: "#4D80B3" },
      // Dénivelé en vert émeraude
      green: { from: "#4DB380", to: "#2e7d55", overFrom: "#CDCF61", overTo: "#4DB380" },
    }[colorTheme];

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id={`fillGrad_${colorTheme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.from} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.to} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`overGrad_${colorTheme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradients.overFrom} stopOpacity="1" />
            <stop offset="100%" stopColor={gradients.overTo} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* AXE Y (ORDONNÉES) SANS POINTILLÉS */}
        <line
          x1={paddingLeft}
          y1={paddingTop - 6}
          x2={paddingLeft}
          y2={baselineY}
          stroke="#3f3f46"
          strokeWidth="1.2"
        />

        {[0, 0.5, 1].map((pct, idx) => {
          const y = paddingTop + usableHeight * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft - 3}
                y1={y}
                x2={paddingLeft}
                y2={y}
                stroke="#52525b"
                strokeWidth="1.2"
              />
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

        {/* AXE X (LIGNE DE BASE) */}
        <line
          x1={paddingLeft}
          y1={baselineY}
          x2={svgWidth - paddingRight}
          y2={baselineY}
          stroke="#3f3f46"
          strokeWidth="1.2"
        />

        {/* Colonnes par jour */}
        {data.map((item, i) => {
          const d = dailyMetricsData[i];
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
              {/* Fond colonne jour actuel */}
              {d.isToday && (
                <rect
                  x={colCenterX - colWidth / 2 + 3}
                  y={paddingTop - 12}
                  width={colWidth - 6}
                  height={usableHeight + 18}
                  fill={gradients.from}
                  fillOpacity="0.08"
                  rx="10"
                />
              )}

              {/* Conteneur / Jauge de fond */}
              {containerH > 0 && (
                <rect
                  x={barX}
                  y={containerY}
                  width={barWidth}
                  height={Math.max(4, containerH)}
                  fill="#1c1917"
                  stroke="#292524"
                  strokeWidth="1"
                  rx="4"
                  className="transition-colors group-hover:stroke-stone-600"
                />
              )}

              {/* Remplissage réalisé */}
              {fillH > 0 && (
                <rect
                  x={barX}
                  y={fillY}
                  width={barWidth}
                  height={Math.max(4, fillH)}
                  fill={isOver ? `url(#overGrad_${colorTheme})` : `url(#fillGrad_${colorTheme})`}
                  rx="4"
                  className="transition-all duration-200 group-hover:brightness-110"
                />
              )}

              {/* Chiffre réalisé au-dessus de la barre */}
              {item.completedVal > 0 && (
                <text
                  x={colCenterX}
                  y={topElementY - 4}
                  fill={d.isToday ? gradients.from : "#d4d4d8"}
                  fontSize={isExpanded ? "10.5" : "9"}
                  fontWeight="900"
                  textAnchor="middle"
                  className="font-mono tracking-tight"
                >
                  {item.labelValue}
                </text>
              )}

              {/* Étiquette jour */}
              <text
                x={colCenterX}
                y={baselineY + 16}
                fill={d.isToday ? gradients.from : "#a1a1aa"}
                fontSize={isExpanded ? "11" : "9.5"}
                fontWeight={d.isToday ? "900" : "700"}
                textAnchor="middle"
                className="tracking-tight"
              >
                {d.dayShort}
              </text>

              {/* Indicateur point pour aujourd'hui */}
              {d.isToday && (
                <circle
                  cx={colCenterX}
                  cy={baselineY + 23}
                  r="2"
                  fill={gradients.from}
                />
              )}

              <title>{item.tooltipText}</title>
            </g>
          );
        })}
      </svg>
    );
  };

  // Données prêtes
  const volumeChartItems = dailyMetricsData.map((d) => ({
    plannedVal: d.plannedKm,
    completedVal: d.completedKm,
    labelValue: `${d.completedKm}`,
    tooltipText: `${d.dayFull} - ${d.completedKm} km / ${d.plannedKm} km`,
  }));

  const loadChartItems = dailyMetricsData.map((d) => ({
    plannedVal: d.plannedLoad,
    completedVal: d.completedLoad,
    labelValue: `${d.completedLoad}`,
    tooltipText: `${d.dayFull} - ${d.completedLoad} charge / ${d.plannedLoad} charge`,
  }));

  const timeChartItems = dailyMetricsData.map((d) => ({
    plannedVal: d.plannedMinutes,
    completedVal: d.completedMinutes,
    labelValue: formatMinutesToHours(d.completedMinutes),
    tooltipText: `${d.dayFull} - ${formatMinutesToHours(d.completedMinutes)} / ${formatMinutesToHours(d.plannedMinutes)}`,
  }));

  const elevationChartItems = dailyMetricsData.map((d) => ({
    plannedVal: 0,
    completedVal: d.completedElevation,
    labelValue: `${d.completedElevation}m`,
    tooltipText: `${d.dayFull} - ${d.completedElevation} m D+ (réalisé)`,
  }));

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* ===================== 1. ÉVÉNEMENT CIBLE ===================== */}
      {activePlan && (
        <div className="bg-gradient-to-r from-[#CF6361]/20 via-[#CF6361]/10 to-stone-900 border border-[#CF6361]/30 p-4 md:p-5 rounded-3xl flex items-center justify-between shadow-lg w-full">
          <div className="space-y-1">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#CF6361] block">
              Évènement Cible • {activePlan.targetDistance}
            </span>
            <h3 className="text-sm md:text-base font-black uppercase text-stone-100">
              {activePlan.name}
            </h3>
            <p className="text-[10px] md:text-xs text-stone-400 font-medium">
              Date : {safeFormatDateFr(activePlan.eventDate)}
            </p>
          </div>

          {(() => {
            const daysLeft = getDaysUntilEvent(activePlan.eventDate);
            return (
              <div className="text-right shrink-0 bg-[#CF6361]/20 px-3.5 py-2.5 rounded-2xl border border-[#CF6361]/40">
                <span className="text-xl md:text-2xl font-black text-[#CF6361] block leading-none">
                  J-{daysLeft !== null ? daysLeft : "0"}
                </span>
                <span className="text-[8px] md:text-[9px] font-extrabold uppercase tracking-wider text-[#CF6361]/90">
                  Restants
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ===================== 2. CARTE SÉANCE DU JOUR ===================== */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 w-full">
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div>
            <span className="text-[10px] md:text-[11px] font-extrabold text-[#CF9A61] uppercase tracking-widest block">
              Dashboard Athlète
            </span>
            <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Séance du Jour
            </h2>
          </div>

          {activePlan && (
            <span className="text-[9.5px] md:text-xs font-extrabold uppercase px-3 py-1 rounded-full border bg-stone-950 border-stone-700 text-stone-100">
              S{currentWeekNum} / {activePlan.durationWeeks || "12"}
            </span>
          )}
        </div>

        {!activePlan ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-2xl">
              📋
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-stone-100">
                Aucun plan d'entraînement actif
              </h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed max-w-sm mx-auto">
                Créez votre plan personnalisé pour afficher vos séances du jour et suivre votre préparation.
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={onCreatePlanRequest}
                className="py-3 px-6 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Créer un plan maintenant
              </button>
            )}
          </div>
        ) : todayWorkouts.length === 0 ? (
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 text-center space-y-2">
            <h4 className="text-xs md:text-sm font-black uppercase text-stone-200">
              Aucune séance programmée pour aujourd'hui
            </h4>
            <p className="text-[11px] text-stone-400 italic">
              Consultez votre plan complet pour les jours à venir ou profitez de ce temps pour récupérer !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayWorkouts.map((todayWorkout) => {
              const typeConfig = getWorkoutTypeConfig(todayWorkout.type);
              const typeHexColor = getWorkoutTypeHexColor(todayWorkout.type);
              const isDone = completedWorkouts[todayWorkout.id];
              const rpeColor = getRpeGradientColor(todayWorkout.rpe);

              if (todayWorkout.isRest) {
                return (
                  <div
                    key={todayWorkout.id}
                    className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 md:p-5 flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-stone-400 block">
                        {todayWorkout.dayName} • Récupération
                      </span>
                      <h4 className="text-sm md:text-base font-black uppercase text-stone-200">
                        Journée de Repos
                      </h4>
                      <p className="text-[11px] md:text-xs text-stone-400 italic">
                        Hydratation, sommeil et étirements doux au programme.
                      </p>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold bg-stone-900 text-stone-400 px-3 py-1.5 rounded-xl border border-stone-800">
                      Repos
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={todayWorkout.id}
                  className={`p-4 md:p-5 rounded-2xl border border-l-8 ${typeConfig.borderClass} bg-stone-950/90 shadow-xl space-y-3 transition`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-[9.5px] md:text-[10px] font-black uppercase tracking-widest text-[#CF9A61] block">
                        {todayWorkout.dayName}{" "}
                        {todayWorkout.sessionName ? `• ${todayWorkout.sessionName}` : ""}
                      </span>
                      <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-stone-100 mt-0.5">
                        {todayWorkout.title}
                      </h3>
                    </div>

                    <span
                      className={`text-[9px] md:text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>
                  </div>

                  {todayWorkout.description && (
                    <p className="text-xs md:text-sm text-stone-300 leading-relaxed bg-stone-900/60 p-3 rounded-xl border border-stone-800/60">
                      {todayWorkout.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                    <div className="flex items-center gap-2">
                      {todayWorkout.km && (
                        <span
                          style={{
                            color: typeHexColor,
                            borderColor: `${typeHexColor}40`,
                            backgroundColor: `${typeHexColor}15`,
                          }}
                          className="text-xs md:text-sm font-black px-3 py-1 rounded-lg border"
                        >
                          {todayWorkout.km} km
                        </span>
                      )}

                      {todayWorkout.rpe && (
                        <span
                          style={{
                            color: rpeColor,
                            borderColor: `${rpeColor}40`,
                            backgroundColor: `${rpeColor}15`,
                          }}
                          className="text-xs md:text-sm font-bold px-3 py-1 rounded-lg border"
                        >
                          RPE {todayWorkout.rpe}/10
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectWorkoutDetail(todayWorkout)}
                      className="text-[11px] md:text-xs font-black text-[#CF9A61] hover:underline uppercase flex items-center gap-1 cursor-pointer"
                    >
                      Détails ➔
                    </button>
                  </div>

                  {!isReadOnly && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleSyncButtonClick(e, todayWorkout)}
                        disabled={syncLoadingId === todayWorkout.id}
                        className="py-2.5 px-3 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
                      >
                        <span className="shrink-0">{syncLoadingId === todayWorkout.id ? "⏳" : "⌚"}</span>
                        <span className="truncate">
                          {syncLoadingId === todayWorkout.id
                            ? "Synchronisation..."
                            : "Synchroniser sur la montre"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDebrief(todayWorkout)}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                          isDone
                            ? "bg-stone-800 text-stone-400 border border-stone-700"
                            : "bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 shadow-md"
                        }`}
                      >
                        <span className="whitespace-nowrap truncate">
                          {isDone ? "✓ Voir le débriefing" : "Terminer & Débriefing"}
                        </span>
                      </button>
                    </div>
                  )}

                  {syncStatus && syncStatus.id === todayWorkout.id && (
                    <div
                      className={`p-2 rounded-xl text-[10px] md:text-xs font-bold text-center ${
                        syncStatus.isError
                          ? "bg-red-950/40 text-red-400 border border-red-900/50"
                          : "bg-stone-950 text-[#CF9A61] border border-stone-800"
                      }`}
                    >
                      {syncStatus.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================== 3. GRILLE DE 4 GRAPHIQUES (1 SEUL GRAPHIQUE 100% VISIBLE SUR MOBILE AVEC SWIPE) ===================== */}
      {activePlan && (
        <div className="space-y-2 w-full">
          {/* Indicateurs de swipe sur mobile */}
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
                  aria-label={`Aller au graphique ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div
            ref={carouselScrollRef}
            onScroll={handleCarouselScroll}
            className="w-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible"
          >
            {/* 1. GRAPHIQUE VOLUME KILOMÉTRIQUE (ROUGE / BORDEAUX VOLARIS) */}
            <div
              onClick={() => handleOpenZoom("volume")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Semaine {currentWeekNum}
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#CF6361] transition">
                      Volume kilométrique
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToVolumeChart();
                      }}
                      className="text-[10px] font-black text-stone-200 hover:text-white bg-stone-950 border border-stone-800 hover:border-stone-700 px-2.5 py-1 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>Stats Plan</span>
                      <span className="text-[#CF9A61]">➔</span>
                    </button>
                    <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#CF6361] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                      <span>⛶</span>
                    </div>
                  </div>
                </div>

                {/* 3 KPIs Volume */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Volume réalisé</span>
                    <div className="text-xs font-black text-[#B34D4D] mt-0.5">
                      {weekVolumeCompleted} <span className="text-stone-500 font-normal text-[10px]">km</span>
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Volume prévu</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {weekVolumePlanned} <span className="text-stone-500 font-normal text-[10px]">km</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Taux d'accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {weekVolumePct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderGenericBarChart(volumeChartItems, maxVolumeKm, "burgundy", false)}
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

            {/* 2. GRAPHIQUE CHARGE D'ENTRAÎNEMENT (OR / DORÉ) */}
            <div
              onClick={() => handleOpenZoom("load")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Semaine {currentWeekNum}
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#CF9A61] transition">
                      Charge d'entraînement
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToVolumeChart();
                      }}
                      className="text-[10px] font-black text-stone-200 hover:text-white bg-stone-950 border border-stone-800 hover:border-stone-700 px-2.5 py-1 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>Stats Plan</span>
                      <span className="text-[#CF9A61]">➔</span>
                    </button>
                    <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#CF9A61] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                      <span>⛶</span>
                    </div>
                  </div>
                </div>

                {/* 3 KPIs Charge */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Charge réalisée</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {weekLoadCompleted}
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Charge prévue</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {weekLoadPlanned}
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Taux d'accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {weekLoadPct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderGenericBarChart(loadChartItems, maxLoadVal, "gold", false)}
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

            {/* 3. GRAPHIQUE TEMPS PASSÉ À COURIR (BLEU) */}
            <div
              onClick={() => handleOpenZoom("time")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Semaine {currentWeekNum}
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#4D80B3] transition">
                      Temps passé à courir
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#4D80B3] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                      <span>⛶</span>
                    </div>
                  </div>
                </div>

                {/* 3 KPIs Temps */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Temps réalisé</span>
                    <div className="text-xs font-black text-[#4D80B3] mt-0.5">
                      {formatMinutesToHours(weekTimeCompleted)}
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Temps prévu</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {formatMinutesToHours(weekTimePlanned)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Taux d'accomplissement</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {weekTimePct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderGenericBarChart(timeChartItems, maxTimeMinutes, "blue", false)}
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

            {/* 4. GRAPHIQUE DÉNIVELÉ POSITIF (VERT ÉMERAUDE) */}
            <div
              onClick={() => handleOpenZoom("elevation")}
              className="w-full min-w-full flex-shrink-0 snap-center sm:min-w-0 bg-stone-900/90 sm:hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans flex flex-col justify-between transition sm:cursor-pointer group"
            >
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Semaine {currentWeekNum}
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 sm:group-hover:text-[#4DB380] transition">
                      Dénivelé positif
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 text-stone-400 group-hover:text-[#4DB380] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                      <span>⛶</span>
                    </div>
                  </div>
                </div>

                {/* 3 KPIs Dénivelé */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total réalisé</span>
                    <div className="text-xs font-black text-[#4DB380] mt-0.5">
                      {weekElevationTotal} <span className="text-stone-500 text-[10px] font-normal">m D+</span>
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Max Journalier</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {weekElevationMax} <span className="text-stone-500 text-[10px] font-normal">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Moyenne / Jour</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {weekElevationAvg} <span className="text-stone-500 text-[10px] font-normal">m</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
                {renderGenericBarChart(elevationChartItems, maxElevationVal, "green", false)}
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

      {/* ===================== MODALE ZOOM PLEIN ÉCRAN (ORDINATEUR UNIQUEMENT) ===================== */}
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
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#CF9A61]">
                  Vue détaillée grand format
                </span>
                <h3 className="text-base md:text-lg font-black uppercase text-stone-100">
                  {zoomedChart === "volume" && `Volume kilométrique • Semaine ${currentWeekNum}`}
                  {zoomedChart === "load" && `Charge d'entraînement • Semaine ${currentWeekNum}`}
                  {zoomedChart === "time" && `Temps passé à courir • Semaine ${currentWeekNum}`}
                  {zoomedChart === "elevation" && `Dénivelé positif • Semaine ${currentWeekNum}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomedChart(null)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* CONTENU MODALE */}
            {zoomedChart === "volume" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Volume réalisé</span>
                    <span className="text-xl font-black text-[#B34D4D]">{weekVolumeCompleted} km</span>
                  </div>
                  <div className="border-x border-stone-800">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Volume prévu</span>
                    <span className="text-xl font-black text-stone-200">{weekVolumePlanned} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Taux d'accomplissement</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekVolumePct}%</span>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                  {renderGenericBarChart(volumeChartItems, maxVolumeKm, "burgundy", true)}
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {dailyMetricsData.map((d) => (
                    <div
                      key={d.dayIndex}
                      className={`p-2.5 rounded-xl border text-center space-y-1 ${
                        d.isToday ? "bg-[#B34D4D]/15 border-[#B34D4D]/50 shadow-md" : "bg-stone-950 border-stone-800"
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase block ${d.isToday ? "text-[#CF6361]" : "text-stone-400"}`}>
                        {d.dayFull}
                      </span>
                      <div className="text-xs font-bold text-stone-100">
                        {d.completedKm} <span className="text-[9px] text-stone-500 font-normal">/ {d.plannedKm} km</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {zoomedChart === "load" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Charge réalisée</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekLoadCompleted}</span>
                  </div>
                  <div className="border-x border-stone-800">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Charge prévue</span>
                    <span className="text-xl font-black text-stone-200">{weekLoadPlanned}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Taux d'accomplissement</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekLoadPct}%</span>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                  {renderGenericBarChart(loadChartItems, maxLoadVal, "gold", true)}
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Décomposition Journalière (RPE × Durée = Charge)
                  </span>
                  <div className="grid grid-cols-7 gap-2">
                    {dailyMetricsData.map((d) => (
                      <div
                        key={d.dayIndex}
                        className={`p-2.5 rounded-xl border text-center space-y-1 ${
                          d.isToday ? "bg-[#CF9A61]/15 border-[#CF9A61]/50 shadow-md" : "bg-stone-950 border-stone-800"
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase block ${d.isToday ? "text-[#CF9A61]" : "text-stone-400"}`}>
                          {d.dayShort}
                        </span>
                        <div className="text-[11px] font-bold text-stone-200">
                          {d.completedLoad > 0 ? (
                            <>
                              <span className="text-[#CF9A61]">{d.avgCompletedRpe ?? "-"} RPE</span>
                              <span className="text-stone-500 font-normal block text-[9.5px]">× {d.completedMinutes}'</span>
                              <span className="text-xs font-black text-stone-100 block border-t border-stone-800/80 pt-0.5 mt-0.5">
                                = {d.completedLoad}
                              </span>
                            </>
                          ) : (
                            <span className="text-stone-600 italic text-[10px] block py-1">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {zoomedChart === "time" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Temps réalisé</span>
                    <span className="text-xl font-black text-[#4D80B3]">{formatMinutesToHours(weekTimeCompleted)}</span>
                  </div>
                  <div className="border-x border-stone-800">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Temps prévu</span>
                    <span className="text-xl font-black text-stone-200">{formatMinutesToHours(weekTimePlanned)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Taux d'accomplissement</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekTimePct}%</span>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                  {renderGenericBarChart(timeChartItems, maxTimeMinutes, "blue", true)}
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {dailyMetricsData.map((d) => (
                    <div
                      key={d.dayIndex}
                      className={`p-2.5 rounded-xl border text-center space-y-1 ${
                        d.isToday ? "bg-[#4D80B3]/15 border-[#4D80B3]/50 shadow-md" : "bg-stone-950 border-stone-800"
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase block ${d.isToday ? "text-[#4D80B3]" : "text-stone-400"}`}>
                        {d.dayFull}
                      </span>
                      <div className="text-xs font-bold text-stone-100">
                        {formatMinutesToHours(d.completedMinutes)}
                        <span className="text-[9px] text-stone-500 font-normal block">
                          / {formatMinutesToHours(d.plannedMinutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {zoomedChart === "elevation" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Total réalisé</span>
                    <span className="text-xl font-black text-[#4DB380]">{weekElevationTotal} m D+</span>
                  </div>
                  <div className="border-x border-stone-800">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Max Journalier</span>
                    <span className="text-xl font-black text-stone-200">{weekElevationMax} m</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Moyenne / Jour</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekElevationAvg} m</span>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                  {renderGenericBarChart(elevationChartItems, maxElevationVal, "green", true)}
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {dailyMetricsData.map((d) => (
                    <div
                      key={d.dayIndex}
                      className={`p-2.5 rounded-xl border text-center space-y-1 ${
                        d.isToday ? "bg-[#4DB380]/15 border-[#4DB380]/50 shadow-md" : "bg-stone-950 border-stone-800"
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase block ${d.isToday ? "text-[#4DB380]" : "text-stone-400"}`}>
                        {d.dayFull}
                      </span>
                      <div className="text-xs font-black text-stone-100">
                        {d.completedElevation} <span className="text-[9px] text-stone-500 font-normal">m D+</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setZoomedChart(null)}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Fermer la vue agrandie
            </button>
          </div>
        </div>
      )}

      {/* MODALE DE CONNEXION GARMIN CONNECT */}
      {showGarminModal && (
        <div className="fixed inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-60">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h4 className="text-sm font-black uppercase text-stone-100">
                Connexion Garmin Connect
              </h4>
              <button
                type="button"
                onClick={() => setShowGarminModal(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Renseignez vos identifiants Garmin pour envoyer automatiquement vos séances sur votre montre.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeGarminSync(showGarminModal, garminEmail, garminPassword);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email Garmin
                </label>
                <input
                  type="email"
                  required
                  value={garminEmail}
                  onChange={(e) => setGarminEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Mot de passe Garmin
                </label>
                <input
                  type="password"
                  required
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <button
                type="submit"
                disabled={syncLoadingId !== null}
                style={{ backgroundColor: "#4D80B3" }}
                className="w-full py-3 hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                {syncLoadingId !== null ? "Synchronisation..." : "Envoyer sur Garmin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};