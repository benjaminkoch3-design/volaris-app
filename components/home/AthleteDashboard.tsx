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
      {/* ===================== 1. ÉVÉNEMENT CIBLE (PLEINE LARGEUR) ===================== */}
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

      {/* ===================== 2. CARTE SÉANCE DU JOUR (PLEINE LARGEUR) ===================== */}
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

      {/* ===================== 3 & 4. GRILLE 2 COLONNES (VOLUME DU PLAN & CHARGE DU PLAN) ===================== */}
      {activePlan && (() => {
        const safeTotalWeeks = Math.max(totalWeeks || 1, 1);

        // Données d'évolution kilométrique par semaine
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

        const maxVolumeKm = Math.max(
          ...volumeWeeklyData.map((d) => Math.max(d.plannedKm, d.completedKm)),
          20
        );

        // Paramètres SVG pour le volume
        const vWidth = 600;
        const vHeight = 160;
        const vPaddingLeft = 45;
        const vPaddingRight = 20;
        const vPaddingTop = 20;
        const vPaddingBottom = 35;
        const vBaselineY = vHeight - vPaddingBottom;
        const vUsableWidth = vWidth - vPaddingLeft - vPaddingRight;
        const vUsableHeight = vBaselineY - vPaddingTop;

        const getVX = (index: number) => {
          if (safeTotalWeeks <= 1) return vPaddingLeft + vUsableWidth / 2;
          return vPaddingLeft + (index / (safeTotalWeeks - 1)) * vUsableWidth;
        };
        const getVY = (value: number) => vBaselineY - (value / maxVolumeKm) * vUsableHeight;

        const pointsVolumePlanned = volumeWeeklyData.map((d, i) => `${getVX(i)},${getVY(d.plannedKm)}`).join(" ");
        const pointsVolumeCompleted = volumeWeeklyData.map((d, i) => `${getVX(i)},${getVY(d.completedKm)}`).join(" ");
        const areaVolumeCompleted = `${getVX(0)},${vBaselineY} ${pointsVolumeCompleted} ${getVX(safeTotalWeeks - 1)},${vBaselineY}`;

        const tickStep = safeTotalWeeks > 24 ? 4 : safeTotalWeeks > 14 ? 2 : 1;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            
            {/* CARTE 3 : ÉVOLUTION KILOMÉTRIQUE DU PLAN */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl space-y-3 shadow-xl font-sans w-full flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                <div>
                  <span className="text-xs font-black uppercase text-stone-100 tracking-wider block">
                    Évolution du Volume
                  </span>
                  <span className="text-[11px] font-bold text-stone-300">
                    S{currentWeekNum} :{" "}
                    <span className="text-[#4DB380] font-black">{currentWeekVolume.completedKm} km</span> /{" "}
                    {currentWeekVolume.plannedKm} km prévus
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToVolumeChart}
                  className="text-[10px] font-black text-stone-100 bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl uppercase hover:bg-stone-750 transition cursor-pointer"
                >
                  Stats Plan ➔
                </button>
              </div>

              {/* GRAPHIQUE SVG DU VOLUME */}
              <div className="relative bg-stone-950/80 rounded-2xl p-2 border border-stone-800/80 w-full overflow-hidden">
                <svg viewBox={`0 0 ${vWidth} ${vHeight}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="dashboardVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4DB380" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#4DB380" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Axe Y (km) */}
                  <text x={vPaddingLeft - 8} y={vPaddingTop + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
                    {Math.round(maxVolumeKm)} km
                  </text>
                  <text x={vPaddingLeft - 8} y={vPaddingTop + vUsableHeight / 2 + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
                    {Math.round(maxVolumeKm / 2)} km
                  </text>
                  <text x={vPaddingLeft - 8} y={vBaselineY + 4} fill="#737373" fontSize="10" textAnchor="end" fontWeight="bold">
                    0
                  </text>

                  {/* Lignes de quadrillage */}
                  <line x1={vPaddingLeft} y1={vPaddingTop} x2={vWidth - vPaddingRight} y2={vPaddingTop} stroke="#3f3f46" strokeDasharray="3,3" />
                  <line x1={vPaddingLeft} y1={vPaddingTop + vUsableHeight / 2} x2={vWidth - vPaddingRight} y2={vPaddingTop + vUsableHeight / 2} stroke="#3f3f46" strokeDasharray="3,3" />
                  <line x1={vPaddingLeft} y1={vBaselineY} x2={vWidth - vPaddingRight} y2={vBaselineY} stroke="#52525b" strokeWidth="1.5" />

                  {/* Dégradé et courbes */}
                  <polygon points={areaVolumeCompleted} fill="url(#dashboardVolumeGradient)" />
                  <polyline points={pointsVolumePlanned} fill="none" stroke="#737373" strokeWidth="2" strokeDasharray="4,4" />
                  <polyline points={pointsVolumeCompleted} fill="none" stroke="#4DB380" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Repères et abscisses alignés */}
                  {volumeWeeklyData.map((d, i) => {
                    const cx = getVX(i);
                    const cy = getVY(d.completedKm);
                    const isCurrentWeek = d.weekNum === currentWeekNum;
                    const showLabel = (d.weekNum - 1) % tickStep === 0 || d.weekNum === safeTotalWeeks;

                    return (
                      <g key={d.weekNum}>
                        <line x1={cx} y1={vBaselineY} x2={cx} y2={vBaselineY + 4} stroke="#52525b" strokeWidth="1.5" />

                        {showLabel && (
                          <text
                            x={cx}
                            y={vBaselineY + 18}
                            fill={isCurrentWeek ? "#4DB380" : "#a1a1aa"}
                            fontSize="10"
                            fontWeight={isCurrentWeek ? "900" : "bold"}
                            textAnchor="middle"
                          >
                            S{d.weekNum}
                          </text>
                        )}

                        <g className="group cursor-pointer">
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isCurrentWeek ? "5.5" : d.completedKm > 0 ? "4" : "2.5"}
                            style={{
                              fill: isCurrentWeek ? "#4DB380" : "#09090b",
                              stroke: "#4DB380",
                            }}
                            className="stroke-2 transition-all group-hover:r-7"
                          />
                          <title>{`Semaine ${d.weekNum} — Réalisé : ${d.completedKm} km | Prévu : ${d.plannedKm} km`}</title>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Légende Volume */}
              <div className="flex justify-between items-center text-[9px] font-semibold text-stone-300 pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#4DB380] inline-block"></span> Réalisé
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#737373] inline-block border-t border-dashed border-[#737373]"></span> Prévu
                  </span>
                </div>
                <span className="text-stone-400">Volume plan</span>
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