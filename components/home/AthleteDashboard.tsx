// src/components/home/AthleteDashboard.tsx

import React, { useState, useEffect } from "react";
import { Plan, Workout } from "../../types";
import {
  safeFormatDateFr,
  getDaysUntilEvent,
  getCurrentWeekNumber,
  getWorkoutTypeConfig,
  calculateStepMetrics,
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

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

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

  // Modale plein écran pour les graphiques
  const [zoomedChart, setZoomedChart] = useState<"volume" | "load" | null>(null);

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
  const dailyVolumeData = Array.from({ length: 7 }, (_, dIdx) => {
    const dayWorkouts = (activePlan?.workouts || []).filter(
      (w) => Number(w.weekNumber) === currentWeekNum && Number(w.dayIndex) === dIdx && !w.isRest
    );

    const plannedKm = dayWorkouts.reduce((acc, w) => {
      let val = 0;
      if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
        val = parseFloat(String(w.km).replace(",", "."));
      } else if (w.steps && w.steps.length > 0) {
        val = calculateStepMetrics(w.steps).totalKm;
      }
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const completedKm = dayWorkouts.reduce((acc, w) => {
      const isDone = completedWorkouts[w.id] || w.completed;
      if (!isDone) return acc;
      let val = 0;
      if (w.completedKm !== undefined && w.completedKm !== null && String(w.completedKm).trim() !== "") {
        val = parseFloat(String(w.completedKm).replace(",", "."));
      } else if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
        val = parseFloat(String(w.km).replace(",", "."));
      } else if (w.steps && w.steps.length > 0) {
        val = calculateStepMetrics(w.steps).totalKm;
      }
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    return {
      dayIndex: dIdx,
      dayShort: DAYS_SHORT[dIdx],
      dayFull: DAYS_FULL[dIdx],
      isToday: dIdx === currentDayIndex,
      plannedKm: Math.round(plannedKm * 10) / 10,
      completedKm: Math.round(completedKm * 10) / 10,
      hasWorkouts: dayWorkouts.length > 0,
    };
  });

  const weekPlannedTotal = Math.round(dailyVolumeData.reduce((acc, d) => acc + d.plannedKm, 0) * 10) / 10;
  const weekCompletedTotal = Math.round(dailyVolumeData.reduce((acc, d) => acc + d.completedKm, 0) * 10) / 10;
  const weekCompletionPct = weekPlannedTotal > 0
    ? Math.min(100, Math.round((weekCompletedTotal / weekPlannedTotal) * 100))
    : (weekCompletedTotal > 0 ? 100 : 0);
  const remainingKm = Math.max(0, Math.round((weekPlannedTotal - weekCompletedTotal) * 10) / 10);

  const maxDailyKm = Math.max(
    ...dailyVolumeData.map((d) => Math.max(d.plannedKm, d.completedKm)),
    10
  );

  // Rendu de l'histogramme avec remplissage (Bar in Bar / Progress Bar) sans pointillés de repères
  const renderDailyHistogram = (isExpanded = false) => {
    const svgWidth = isExpanded ? 750 : 540;
    const svgHeight = isExpanded ? 240 : 160;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;
    const usableHeight = svgHeight - paddingTop - paddingBottom;
    const baselineY = svgHeight - paddingBottom;
    const usableWidth = svgWidth - paddingLeft - paddingRight;
    const colWidth = usableWidth / 7;
    const barWidth = isExpanded ? 26 : 18;

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="fillBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4DB380" stopOpacity="1" />
            <stop offset="100%" stopColor="#2e7d55" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="overflowBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CDCF61" stopOpacity="1" />
            <stop offset="100%" stopColor="#4DB380" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Lignes de quadrillage */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = paddingTop + usableHeight * (1 - pct);
          const val = Math.round(maxDailyKm * pct);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray={pct === 0 ? "none" : "2,4"}
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

        {/* Colonnes par jour avec remplissage */}
        {dailyVolumeData.map((d, i) => {
          const colCenterX = paddingLeft + i * colWidth + colWidth / 2;
          const barX = colCenterX - barWidth / 2;

          // Hauteur du conteneur (fond prévu, ou réalisé si pas de prévu)
          const baseTargetKm = Math.max(d.plannedKm, d.completedKm);
          const containerH = baseTargetKm > 0 ? (baseTargetKm / maxDailyKm) * usableHeight : 0;
          const containerY = baselineY - containerH;

          // Hauteur du remplissage réalisé
          const fillH = d.completedKm > 0 ? (d.completedKm / maxDailyKm) * usableHeight : 0;
          const fillY = baselineY - fillH;

          const isOvercompleted = d.plannedKm > 0 && d.completedKm > d.plannedKm;

          return (
            <g key={d.dayIndex} className="group cursor-pointer">
              {/* Fond de colonne pour aujourd'hui */}
              {d.isToday && (
                <rect
                  x={colCenterX - colWidth / 2 + 3}
                  y={paddingTop - 6}
                  width={colWidth - 6}
                  height={usableHeight + 12}
                  fill="#4DB380"
                  fillOpacity="0.08"
                  rx="10"
                />
              )}

              {/* 1. CONTENEUR / JAUGE DE FOND (Objectif prévu) */}
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

              {/* 2. REMPLISSAGE RÉALISÉ (Monte à l'intérieur de la jauge) */}
              {fillH > 0 && (
                <rect
                  x={barX}
                  y={fillY}
                  width={barWidth}
                  height={Math.max(4, fillH)}
                  fill={isOvercompleted ? "url(#overflowBarGradient)" : "url(#fillBarGradient)"}
                  rx="4"
                  className="transition-all duration-200 group-hover:brightness-110"
                />
              )}

              {/* Étiquette jour */}
              <text
                x={colCenterX}
                y={baselineY + 16}
                fill={d.isToday ? "#4DB380" : "#a1a1aa"}
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
                  fill="#4DB380"
                />
              )}

              {/* Tooltip au format : Jour - volume réalisé / volume prévu */}
              <title>{`${d.dayFull} - ${d.completedKm} km / ${d.plannedKm} km`}</title>
            </g>
          );
        })}
      </svg>
    );
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

      {/* ===================== 3 & 4. GRILLE 2 COLONNES (HISTOGRAMME AVEC REMPLISSAGE & CHARGE) ===================== */}
      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          
          {/* CARTE 3 : HISTOGRAMME DU VOLUME DE LA SEMAINE */}
          <div
            onClick={() => setZoomedChart("volume")}
            className="bg-stone-900/90 hover:border-stone-700 border border-stone-800 p-5 rounded-3xl space-y-4 shadow-xl font-sans w-full flex flex-col justify-between transition cursor-pointer group"
          >
            {/* Entête avec métriques KPI et boutons d'action */}
            <div className="space-y-3 border-b border-stone-800/80 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#CF9A61] tracking-widest block">
                    Semaine {currentWeekNum}
                  </span>
                  <h3 className="text-sm md:text-base font-black uppercase text-stone-100 tracking-tight mt-0.5 group-hover:text-[#CF9A61] transition">
                    Volume Journalier (Lun - Dim)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton vers les stats du plan en cours */}
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

                  {/* Bouton Agrandir */}
                  <div className="flex items-center gap-1 text-stone-400 group-hover:text-[#CF9A61] transition text-xs font-bold bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                    <span>⛶</span>
                  </div>
                </div>
              </div>

              {/* Boîte de petites stats KPI */}
              <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800/70 text-center shadow-inner">
                <div>
                  <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Réalisé / Prévu</span>
                  <div className="text-xs font-black text-stone-100 mt-0.5">
                    <span className="text-[#4DB380]">{weekCompletedTotal}</span>
                    <span className="text-stone-500 font-normal"> / {weekPlannedTotal} km</span>
                  </div>
                </div>
                <div className="border-x border-stone-800/80">
                  <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Accomplissement</span>
                  <div className="text-xs font-black text-[#CF9A61] mt-0.5">
                    {weekCompletionPct}%
                  </div>
                </div>
                <div>
                  <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Reste à faire</span>
                  <div className="text-xs font-black text-stone-300 mt-0.5">
                    {remainingKm} <span className="text-stone-500 text-[10px] font-normal">km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HISTOGRAMME SVG À REMPLISSAGE */}
            <div className="bg-stone-950/90 rounded-2xl p-3 border border-stone-800/80 w-full overflow-hidden shadow-inner">
              {renderDailyHistogram(false)}
            </div>

            {/* Légende demandée : point vert pour réalisé, carré noir pour prévu */}
            <div className="flex justify-between items-center text-[9.5px] font-semibold text-stone-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4DB380] inline-block shadow-sm"></span>
                  <span className="text-stone-200 font-bold">Volume réalisé</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1c1917] border border-[#3f3f46] inline-block"></span>
                  <span className="text-stone-400 font-medium">Volume prévu</span>
                </span>
              </div>
              <span className="text-[8.5px] uppercase font-bold text-stone-500">
                Aujourd'hui surligné
              </span>
            </div>
          </div>

          {/* CARTE 4 : ÉVOLUTION DE LA CHARGE (CLIQUABLE POUR AGRANDIR) */}
          <div
            onClick={() => setZoomedChart("load")}
            className="h-full relative group cursor-pointer"
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 text-stone-400 group-hover:text-[#CDCF61] transition text-[10px] font-bold bg-stone-950/90 px-2.5 py-1 rounded-xl border border-stone-800">
              <span>⛶</span>
              <span className="uppercase">Agrandir</span>
            </div>
            <WeeklyLoadChart
              workouts={activePlan.workouts}
              currentWeekNum={currentWeekNum}
              completedWorkouts={completedWorkouts}
              onNavigateToVolumeChart={onNavigateToVolumeChart}
            />
          </div>

        </div>
      )}

      {/* ===================== MODALE ZOOM PLEIN ÉCRAN ===================== */}
      {zoomedChart && (
        <div
          onClick={() => setZoomedChart(null)}
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"
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
                  {zoomedChart === "volume"
                    ? `Volume Quotidien de la Semaine ${currentWeekNum}`
                    : "Charge d'Entraînement & Fatigue"}
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

            {zoomedChart === "volume" ? (
              <div className="space-y-4">
                {/* Stats récapitulatives dans la modale */}
                <div className="grid grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Distance réalisée</span>
                    <span className="text-xl font-black text-[#4DB380]">{weekCompletedTotal} km</span>
                  </div>
                  <div className="border-x border-stone-800">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Distance prévue</span>
                    <span className="text-xl font-black text-stone-200">{weekPlannedTotal} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Taux d'accomplissement</span>
                    <span className="text-xl font-black text-[#CF9A61]">{weekCompletionPct}%</span>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800">
                  {renderDailyHistogram(true)}
                </div>

                {/* Détail jour par jour */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
                  {dailyVolumeData.map((d) => (
                    <div
                      key={d.dayIndex}
                      className={`p-2.5 rounded-xl border text-center space-y-1 ${
                        d.isToday
                          ? "bg-[#4DB380]/15 border-[#4DB380]/50 shadow-md"
                          : "bg-stone-950 border-stone-800"
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase block ${d.isToday ? "text-[#4DB380]" : "text-stone-400"}`}>
                        {d.dayFull}
                      </span>
                      <div className="text-xs font-bold text-stone-100">
                        {d.completedKm} <span className="text-[9px] text-stone-500 font-normal">/ {d.plannedKm} km</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activePlan && (
                  <WeeklyLoadChart
                    workouts={activePlan.workouts}
                    currentWeekNum={currentWeekNum}
                    completedWorkouts={completedWorkouts}
                    onNavigateToVolumeChart={() => {
                      setZoomedChart(null);
                      onNavigateToVolumeChart();
                    }}
                  />
                )}
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