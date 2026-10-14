// components/workout/WorkoutDetail.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Workout, Plan, WorkoutStep } from "../../types";
import { WORKOUT_TYPES_CONFIG } from "../../constants";
import {
  calculateStepMetrics,
  getStepTypeLabel,
} from "../../utils/calculations";
import {
  GarminLogo,
  CorosLogo,
} from "../common/BrandLogos";
import { WorkoutTelemetryModal } from "./WorkoutTelemetryModal";
import { PaceProfileChart } from "./PaceProfileChart";

interface WorkoutDetailProps {
  workout: Workout;
  plan?: Plan;
  completedWorkouts?: Record<string, boolean>;
  onClose: () => void;
  onOpenDebrief?: (workout: Workout) => void;
  userRole?: "athlete" | "coach";
}

const getRpeColor = (rpe: number): { text: string; bg: string; border: string } => {
  if (rpe <= 3) return { text: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
  if (rpe <= 5) return { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" };
  if (rpe <= 7) return { text: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.3)" };
  return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" };
};

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workout,
  completedWorkouts = {},
  onClose,
  onOpenDebrief,
  userRole = "athlete",
}) => {
  const isCoach = userRole === "coach";
  const typeConfig = WORKOUT_TYPES_CONFIG[workout.type] || WORKOUT_TYPES_CONFIG.footing;
  const metrics = calculateStepMetrics(workout.steps);
  const targetRpe = workout.rpe ? Math.min(10, Math.max(1, parseInt(workout.rpe, 10) || 5)) : 5;
  const estimatedLoad = Math.round((metrics.totalMinutes || 0) * targetRpe);
  const rpeTheme = getRpeColor(targetRpe);

  const hasDebrief =
    (workout.completedRpe !== undefined && workout.completedRpe !== null) ||
    Boolean(workout.athleteComment) ||
    Boolean(workout.completedKm);

  const isDone = Boolean(
    completedWorkouts[workout.id] ||
    workout.completed ||
    workout.completedKm !== undefined ||
    workout.completedRpe !== undefined ||
    hasDebrief
  );

  const [showTelemetryModal, setShowTelemetryModal] = useState(false);

  const [connectedApps, setConnectedApps] = useState<{
    garmin: boolean;
    coros: boolean;
  }>({
    garmin: false,
    coros: false,
  });

  const [loadingPlatform, setLoadingPlatform] = useState<"garmin" | "coros" | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasGarmin = Boolean(
        localStorage.getItem("volaris_garmin_email") && localStorage.getItem("volaris_garmin_pwd")
      );
      const hasCoros = Boolean(
        localStorage.getItem("volaris_coros_email") && localStorage.getItem("volaris_coros_pwd")
      );

      setConnectedApps({
        garmin: hasGarmin,
        coros: hasCoros,
      });
    }
  }, []);

  const connectedList = (
    Object.keys(connectedApps) as Array<keyof typeof connectedApps>
  ).filter((key) => connectedApps[key]);

  const handlePushToPlatform = async (platform: "garmin" | "coros") => {
    const workoutName = workout.title || workout.sessionName || "Séance";

    if (platform === "garmin") {
      const savedEmail = localStorage.getItem("volaris_garmin_email");
      const savedPwd = localStorage.getItem("volaris_garmin_pwd");
      if (!savedEmail || !savedPwd) {
        setSyncStatus("❌ Veuillez connecter votre compte Garmin dans l'onglet Profil.");
        return;
      }

      setLoadingPlatform("garmin");
      setSyncStatus(null);

      try {
        const res = await fetch("/api/sync-garmin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: savedEmail,
            password: savedPwd,
            workout,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de synchronisation Garmin");

        setSyncStatus(`✅ Séance « ${workoutName} » envoyée sur Garmin Connect !`);
        setTimeout(() => setSyncStatus(null), 3500);
      } catch (err: any) {
        setSyncStatus(`❌ ${err.message}`);
      } finally {
        setLoadingPlatform(null);
      }
      return;
    }

    if (platform === "coros") {
      const savedEmail = localStorage.getItem("volaris_coros_email");
      const savedPwd = localStorage.getItem("volaris_coros_pwd");
      if (!savedEmail || !savedPwd) {
        setSyncStatus("❌ Veuillez connecter votre compte COROS dans l'onglet Profil.");
        return;
      }

      setLoadingPlatform("coros");
      setSyncStatus(null);

      try {
        const res = await fetch("/api/sync-coros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: savedEmail,
            password: savedPwd,
            workout,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de synchronisation COROS");

        setSyncStatus(`✅ Séance « ${workoutName} » envoyée sur COROS !`);
        setTimeout(() => setSyncStatus(null), 3500);
      } catch (err: any) {
        setSyncStatus(`❌ ${err.message}`);
      } finally {
        setLoadingPlatform(null);
      }
    }
  };

  const renderPaceBadge = (step: WorkoutStep) => {
    const slowPace = step.paceMax;
    const fastPace = step.paceMin;

    if (slowPace && fastPace) {
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Allure Cible
          </span>
          <span className="font-black text-[#CF9A61] font-mono text-[11px]">
            {slowPace} - {fastPace}
          </span>
        </div>
      );
    }

    if (slowPace || fastPace || step.targetPace) {
      const paceText = step.targetPace || slowPace || fastPace;
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Allure Cible
          </span>
          <span className="font-black text-[#CF9A61] font-mono text-[11px]">
            {paceText}
          </span>
        </div>
      );
    }

    if (step.goalValue) {
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Cible
          </span>
          <span className="font-black text-[#CF9A61]">{step.goalValue}</span>
        </div>
      );
    }

    return null;
  };

  const renderStepTree = (steps: WorkoutStep[], parentIndex = "") => {
    return (
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const stepNum = parentIndex ? `${parentIndex}.${idx + 1}` : `${idx + 1}`;

          if (step.type === "repeat") {
            return (
              <div
                key={step.id || idx}
                className="bg-stone-900/80 border border-[#CF9A61]/30 rounded-2xl p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider">
                    🔁 Répétition • {step.reps || 1}x
                  </span>
                  <span className="text-[9px] text-stone-500 font-mono">
                    Bloc #{stepNum}
                  </span>
                </div>

                {step.nestedSteps && step.nestedSteps.length > 0 && (
                  <div className="pl-3 border-l-2 border-[#CF9A61]/40 space-y-2 pt-1">
                    {renderStepTree(step.nestedSteps, stepNum)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={step.id || idx}
              className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800 shrink-0">
                  {getStepTypeLabel(step.type)}
                </span>
                <span className="font-semibold text-stone-200">
                  {step.durationOrDist || "-"}
                </span>
              </div>

              {renderPaceBadge(step)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        {showTelemetryModal && (
          <WorkoutTelemetryModal
            workout={workout}
            onClose={() => setShowTelemetryModal(false)}
          />
        )}

        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                Semaine {workout.weekNumber} • {workout.dayName}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}
              >
                {typeConfig.label}
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-stone-100">
              {workout.title || workout.sessionName || "Séance d'entraînement"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center items-center">
          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">
              Distance
            </span>
            <span className="text-sm font-black text-[#CF9A61]">
              {workout.km || metrics.totalKm} km
            </span>
          </div>

          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">
              Durée
            </span>
            <span className="text-sm font-black text-[#CF9A61]">
              {metrics.totalMinutes} min
            </span>
          </div>

          <div
            style={{
              backgroundColor: rpeTheme.bg,
              borderColor: rpeTheme.border,
            }}
            className="border rounded-xl py-1 px-1 transition-all"
          >
            <span
              style={{ color: rpeTheme.text }}
              className="block text-[8px] font-bold uppercase opacity-90"
            >
              RPE Cible
            </span>
            <span
              style={{ color: rpeTheme.text }}
              className="text-sm font-black"
            >
              {workout.rpe ? `${workout.rpe}/10` : "5/10"}
            </span>
          </div>

          <div
            style={{
              backgroundColor: rpeTheme.bg,
              borderColor: rpeTheme.border,
            }}
            className="border rounded-xl py-1 px-1 transition-all"
          >
            <span
              style={{ color: rpeTheme.text }}
              className="block text-[8px] font-bold uppercase opacity-90"
            >
              Charge
            </span>
            <span
              style={{ color: rpeTheme.text }}
              className="text-sm font-black"
            >
              {estimatedLoad}
            </span>
          </div>
        </div>

        {hasDebrief && (
          <button
            type="button"
            onClick={() => setShowTelemetryModal(true)}
            className="w-full py-3 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:border-[#CDCF61] border border-stone-800 rounded-2xl text-xs font-black uppercase text-[#CDCF61] tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <span>📈 Voir les graphiques & splits (Allure, FC, D+)</span>
          </button>
        )}

        {!isCoach && (
          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-wider block">
                Synchronisation Montre
              </span>
              {connectedList.length > 0 && (
                <span className="text-[9px] text-stone-500 font-bold">
                  Exporter la séance
                </span>
              )}
            </div>

            {connectedList.length === 0 ? (
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Aucune montre connectée. Rendez-vous dans l'onglet{" "}
                  <strong className="text-[#CF9A61]">Profil</strong> pour lier votre
                  compte.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {connectedApps.garmin && (
                  <button
                    type="button"
                    onClick={() => handlePushToPlatform("garmin")}
                    disabled={loadingPlatform !== null}
                    className="p-2.5 bg-stone-900 hover:bg-[#007CC3]/20 border border-stone-800 hover:border-[#007CC3]/50 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer group disabled:opacity-50"
                    title="Envoyer vers Garmin Connect"
                  >
                    <GarminLogo className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase text-stone-300">
                      {loadingPlatform === "garmin" ? "Envoi..." : "Garmin"}
                    </span>
                  </button>
                )}

                {connectedApps.coros && (
                  <button
                    type="button"
                    onClick={() => handlePushToPlatform("coros")}
                    disabled={loadingPlatform !== null}
                    className="p-2.5 bg-stone-900 hover:bg-[#F8283B]/20 border border-stone-800 hover:border-[#F8283B]/50 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer group disabled:opacity-50"
                    title="Envoyer vers COROS Training Hub"
                  >
                    <CorosLogo className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase text-stone-300">
                      {loadingPlatform === "coros" ? "Envoi..." : "COROS"}
                    </span>
                  </button>
                )}
              </div>
            )}

            {syncStatus && (
              <p className="text-[10px] text-center font-bold text-emerald-400 animate-fadeIn">
                {syncStatus}
              </p>
            )}
          </div>
        )}

        <PaceProfileChart steps={workout.steps} />

        {workout.description && (
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800 space-y-1">
            <span className="text-[9px] font-bold uppercase text-stone-400 block">
              Description de la séance
            </span>
            <p className="text-xs text-stone-300 leading-relaxed">
              {workout.description}
            </p>
          </div>
        )}

        {workout.remark && (
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 p-3 rounded-2xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase text-[#CDCF61] block">
              💡 Conseil du Coach
            </span>
            <p className="text-xs text-[#CDCF61]/90">{workout.remark}</p>
          </div>
        )}

        <div className="space-y-2 border-t border-stone-800 pt-3">
          <span className="text-[10px] font-black uppercase text-stone-200 tracking-wider block">
            Structure de la séance ({workout.steps?.length || 0} bloc
            {workout.steps && workout.steps.length > 1 ? "s" : ""})
          </span>

          {!workout.steps || workout.steps.length === 0 ? (
            <p className="text-xs text-stone-500 italic text-center py-2">
              Aucun bloc structuré renseigné.
            </p>
          ) : (
            <div className="max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
              {renderStepTree(workout.steps)}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
          {!isCoach && onOpenDebrief && (
            <button
              type="button"
              onClick={() => {
                onOpenDebrief(workout);
                onClose();
              }}
              className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
            >
              🏁 {isDone ? "Modifier le débrief" : "Terminer & Débriefer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};