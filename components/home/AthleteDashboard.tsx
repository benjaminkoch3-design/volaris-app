// src/components/home/AthleteDashboard.tsx

import React, { useState, useEffect } from "react";
import { Plan, Workout } from "../../types";
import {
  safeFormatDateFr,
  getDaysUntilEvent,
  getCurrentWeekNumber,
  getWorkoutTypeConfig,
  calculateWeeklyPlannedKm,
  calculateWeeklyCompletedKm,
} from "../../utils/calculations";
import { WeeklyLoadChart } from "../analytics/WeeklyLoadChart";

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

const getRpeGradientColor = (rpeStr?: string) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = parseInt(rpeStr, 10);
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

// Générateur de spline monotone / Bézier lissée moderne
const getSmoothSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

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

  const totalWeeks = activePlan
    ? parseInt(String(activePlan.durationWeeks || "12"), 10)
    : 12;

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

      {/* ===================== 3 & 4. GRILLE MODERNE TYPE BUSINESS / SAAS ===================== */}
      {activePlan && (() => {
        const safeTotalWeeks = Math.max(totalWeeks || 1, 1);

        const volumeWeeklyData = Array.from({ length: safeTotalWeeks }, (_, i) => i + 1).map((wNum) => {
          const plannedKm = calculateWeeklyPlannedKm(activePlan.workouts, wNum);
          const completedKm = calculateWeeklyCompletedKm(activePlan.workouts, wNum, completedWorkouts);
          return {
            weekNum: wNum,
            plannedKm: Math.round(plannedKm * 10) / 10,
            completedKm: Math.round(completedKm * 10) / 10,
          };
        });

        const currentWeekVolume = volumeWeeklyData.find((w) => w.weekNum === currentWeekNum) || {
          plannedKm: 0,
          completedKm: 0,
        };

        const totalPlannedKm = Math.round(volumeWeeklyData.reduce((acc, d) => acc + d.plannedKm, 0));
        const totalCompletedKm = Math.round(volumeWeeklyData.reduce((acc, d) => acc + d.completedKm, 0));
        const completionRate = totalPlannedKm > 0 ? Math.min(100, Math.round((totalCompletedKm / totalPlannedKm) * 100)) : 0;

        const maxVolumeKm = Math.max(
          ...volumeWeeklyData.map((d) => Math.max(d.plannedKm, d.completedKm)),
          20
        );

        // Paramètres SVG
        const vWidth = 600;
        const vHeight = 175;
        const vPaddingLeft = 40;
        const vPaddingRight = 20;
        const vPaddingTop = 15;
        const vPaddingBottom = 30;
        const vBaselineY = vHeight - vPaddingBottom;
        const vUsableWidth = vWidth - vPaddingLeft - vPaddingRight;
        const vUsableHeight = vBaselineY - vPaddingTop;

        const getVX = (index: number) => {
          if (safeTotalWeeks <= 1) return vPaddingLeft + vUsableWidth / 2;
          return vPaddingLeft + (index / (safeTotalWeeks - 1)) * vUsableWidth;
        };
        const getVY = (value: number) => vBaselineY - (value / maxVolumeKm) * vUsableHeight;

        // Points
        const plannedPoints = volumeWeeklyData.map((d, i) => ({ x: getVX(i), y: getVY(d.plannedKm) }));
        const completedPoints = volumeWeeklyData.map((d, i) => ({ x: getVX(i), y: getVY(d.completedKm) }));

        // Courbes lissées
        const smoothPlannedPath = getSmoothSvgPath(plannedPoints);
        const smoothCompletedPath = getSmoothSvgPath(completedPoints);

        // Aire lissée
        const firstX = getVX(0);
        const lastX = getVX(safeTotalWeeks - 1);
        const smoothCompletedArea = `${smoothCompletedPath} L ${lastX} ${vBaselineY} L ${firstX} ${vBaselineY} Z`;

        const tickStep = safeTotalWeeks > 20 ? 4 : safeTotalWeeks > 10 ? 2 : 1;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            
            {/* CARTE 3 : ÉVOLUTION DU VOLUME (MODERNE BUSINESS / SAAS) */}
            <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans w-full flex flex-col justify-between">
              
              {/* Entête avec métriques business */}
              <div className="space-y-3 border-b border-stone-800/80 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                      Analytique de Préparation
                    </span>
                    <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5">
                      Volume Kilométrique
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={onNavigateToVolumeChart}
                    className="text-[10px] font-black text-stone-300 hover:text-white bg-stone-950 border border-stone-800 hover:border-stone-700 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <span>Détails</span>
                    <span className="text-[#CF9A61]">➔</span>
                  </button>
                </div>

                {/* Métriques KPI rapides */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950/70 p-2.5 rounded-2xl border border-stone-800/60 text-center">
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Cette semaine</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      <span className="text-[#4DB380]">{currentWeekVolume.completedKm}</span>
                      <span className="text-stone-500 font-normal"> / {currentWeekVolume.plannedKm} km</span>
                    </div>
                  </div>
                  <div className="border-x border-stone-800/80">
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Cumul Plan</span>
                    <div className="text-xs font-black text-stone-100 mt-0.5">
                      {totalCompletedKm} <span className="text-stone-500 font-normal text-[10px]">km</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Taux d'atteinte</span>
                    <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                      {completionRate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* GRAPHIQUE SVG ULTRA MODERNE */}
              <div className="relative bg-stone-950/90 rounded-2xl p-2.5 border border-stone-800/70 w-full overflow-hidden shadow-inner">
                <svg viewBox={`0 0 ${vWidth} ${vHeight}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    {/* Dégradé doux vertical style Linear / Stripe */}
                    <linearGradient id="modernVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4DB380" stopOpacity="0.32" />
                      <stop offset="60%" stopColor="#4DB380" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#4DB380" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Filtre de glow subtil */}
                    <filter id="glowSubtle" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Lignes de quadrillage fines et sobres */}
                  {[0, 0.5, 1].map((pct, idx) => {
                    const y = vPaddingTop + vUsableHeight * (1 - pct);
                    const labelVal = Math.round(maxVolumeKm * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={vPaddingLeft}
                          y1={y}
                          x2={vWidth - vPaddingRight}
                          y2={y}
                          stroke="#27272a"
                          strokeWidth="1"
                          strokeDasharray={pct === 0 ? "none" : "2,4"}
                        />
                        <text
                          x={vPaddingLeft - 6}
                          y={y + 3.5}
                          fill="#71717a"
                          fontSize="9"
                          fontWeight="700"
                          textAnchor="end"
                          className="font-mono"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Halo et aire sous la courbe réalisée */}
                  <path d={smoothCompletedArea} fill="url(#modernVolumeGradient)" />

                  {/* Courbe prévisionnelle en pointillés discrets */}
                  <path
                    d={smoothPlannedPath}
                    fill="none"
                    stroke="#52525b"
                    strokeWidth="1.8"
                    strokeDasharray="4,5"
                    strokeLinecap="round"
                  />

                  {/* Courbe réalisée lissée avec halo lumineux */}
                  <path
                    d={smoothCompletedPath}
                    fill="none"
                    stroke="#4DB380"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glowSubtle)"
                  />

                  {/* Points interactifs de chaque semaine */}
                  {volumeWeeklyData.map((d, i) => {
                    const cx = getVX(i);
                    const cy = getVY(d.completedKm);
                    const isCurrentWeek = d.weekNum === currentWeekNum;
                    const showLabel = (d.weekNum - 1) % tickStep === 0 || d.weekNum === safeTotalWeeks;

                    return (
                      <g key={d.weekNum}>
                        {/* Étiquettes semaine alignées */}
                        {showLabel && (
                          <text
                            x={cx}
                            y={vBaselineY + 16}
                            fill={isCurrentWeek ? "#4DB380" : "#a1a1aa"}
                            fontSize="9"
                            fontWeight={isCurrentWeek ? "900" : "600"}
                            textAnchor="middle"
                            className="font-mono tracking-tight"
                          >
                            S{d.weekNum}
                          </text>
                        )}

                        {/* Halo pulsé pour la semaine en cours */}
                        {isCurrentWeek && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="9"
                            fill="#4DB380"
                            fillOpacity="0.2"
                            className="animate-pulse"
                          />
                        )}

                        {/* Point micro-donut */}
                        <g className="group cursor-pointer">
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isCurrentWeek ? "5" : d.completedKm > 0 ? "3.5" : "2.5"}
                            fill={isCurrentWeek ? "#4DB380" : "#09090b"}
                            stroke={isCurrentWeek ? "#ffffff" : "#4DB380"}
                            strokeWidth={isCurrentWeek ? "2" : "1.8"}
                            className="transition-all duration-150 group-hover:scale-125"
                          />
                          <title>{`Semaine ${d.weekNum} : ${d.completedKm} km réalisés sur ${d.plannedKm} km prévus`}</title>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Légende minimaliste */}
              <div className="flex justify-between items-center text-[9.5px] font-semibold text-stone-400 pt-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-[#4DB380] rounded-full inline-block shadow-sm"></span>
                    <span className="text-stone-200">Réalisé</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0 border-t border-dashed border-stone-500 inline-block"></span>
                    <span className="text-stone-400">Objectif plan</span>
                  </span>
                </div>
                <span className="text-[8.5px] uppercase font-bold text-stone-500 tracking-wider">
                  Progression en km
                </span>
              </div>
            </div>

            {/* CARTE 4 : ÉVOLUTION DE LA CHARGE */}
            <div className="h-full">
              <WeeklyLoadChart
                workouts={activePlan.workouts}
                currentWeekNum={currentWeekNum}
                completedWorkouts={completedWorkouts}
                onNavigateToVolumeChart={onNavigateToVolumeChart}
              />
            </div>

          </div>
        );
      })()}

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