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
  vma?: number | string;
  fcRest?: number | string;
  fcMax?: number | string;
  athleteVmaTemplates?: any[];
  athleteHrTemplates?: any[];
  coachVmaTemplates?: any[];
  coachHrTemplates?: any[];
}

const getRpeColor = (rpe: number): { text: string; bg: string; border: string } => {
  if (rpe <= 3) return { text: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
  if (rpe <= 5) return { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" };
  if (rpe <= 7) return { text: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.3)" };
  return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" };
};

// --- UTILITAIRES DE CALCULS (ALLURES & FC) ---
const getZoneMinMax = (zone: any) => {
  if (!zone) return { min: 0, max: 0 };
  const rawMin = zone.minVmaPercent ?? zone.percentageMin ?? zone.minPercent ?? zone.min ?? zone.percentage_min ?? zone.min_percent ?? zone.fcMinPercent ?? 0;
  const rawMax = zone.maxVmaPercent ?? zone.percentageMax ?? zone.maxPercent ?? zone.max ?? zone.percentage_max ?? zone.max_percent ?? zone.fcMaxPercent ?? 0;

  let min = parseFloat(String(rawMin).replace(",", ".")) || 0;
  let max = parseFloat(String(rawMax).replace(",", ".")) || 0;

  const textSource = zone.name || zone.label || "";
  if ((min === 0 || max === 0) && textSource) {
    const matches = textSource.match(/(\d+)\s*%\s*-\s*(\d+)\s*%/);
    if (matches && matches[1] && matches[2]) {
      min = parseFloat(matches[1]);
      max = parseFloat(matches[2]);
    }
  }
  return { min, max };
};

const formatPaceFromSpeedKmH = (speedKmH: number): string => {
  if (!speedKmH || speedKmH <= 0 || isNaN(speedKmH)) return "--:--";
  const totalSeconds = 3600 / speedKmH;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const calculatePaceRangeFromVma = (vmaVal: number, minPercent?: number, maxPercent?: number) => {
  if (!vmaVal || vmaVal <= 0 || minPercent === undefined || maxPercent === undefined) return null;
  const speedSlow = (vmaVal * minPercent) / 100;
  const speedFast = (vmaVal * maxPercent) / 100;
  if (speedSlow <= 0 || speedFast <= 0) return null;
  const paceSlow = formatPaceFromSpeedKmH(speedSlow);
  const paceFast = formatPaceFromSpeedKmH(speedFast);
  return `${paceFast} - ${paceSlow} /km`;
};

const calculateHrRangeFromKarvonenOrMax = (fcRestVal: number, fcMaxVal: number, minPercent?: number, maxPercent?: number) => {
  const maxToUse = fcMaxVal && fcMaxVal > 0 ? fcMaxVal : 0;
  const restToUse = fcRestVal && fcRestVal > 0 ? fcRestVal : 0;
  if (minPercent === undefined || maxPercent === undefined || maxToUse <= 0) return null;
  
  if (maxToUse > restToUse) {
    const reserve = maxToUse - restToUse;
    const minBpm = Math.round(restToUse + reserve * (minPercent / 100));
    const maxBpm = Math.round(restToUse + reserve * (maxPercent / 100));
    return `${minBpm} - ${maxBpm} bpm`;
  } else {
    const minBpm = Math.round((minPercent / 100) * maxToUse);
    const maxBpm = Math.round((maxPercent / 100) * maxToUse);
    return `${minBpm} - ${maxBpm} bpm`;
  }
};

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workout,
  completedWorkouts = {},
  onClose,
  onOpenDebrief,
  userRole = "athlete",
  vma,
  fcRest,
  fcMax,
  athleteVmaTemplates = [],
  athleteHrTemplates = [],
  coachVmaTemplates = [],
  coachHrTemplates = [],
}) => {
  const isCoach = userRole === "coach";
  const typeConfig = WORKOUT_TYPES_CONFIG[workout.type] || WORKOUT_TYPES_CONFIG.footing;
  const metrics = calculateStepMetrics(workout.steps, vma);
  const targetRpe = workout.rpe ? Math.min(10, Math.max(1, parseInt(workout.rpe, 10) || 5)) : 5;
  const estimatedLoad = Math.round((metrics.totalMinutes || 0) * targetRpe);
  const rpeTheme = getRpeColor(targetRpe);

  const numericVma = typeof vma === "string" ? parseFloat(vma.replace(",", ".")) : Number(vma || 0);
  const numericFcRest = typeof fcRest === "string" ? parseFloat(fcRest) : Number(fcRest || 0);
  const numericFcMax = typeof fcMax === "string" ? parseFloat(fcMax) : Number(fcMax || 0);

  const availableVmaTemplates = isCoach
    ? (coachVmaTemplates.length > 0 ? coachVmaTemplates : athleteVmaTemplates)
    : athleteVmaTemplates;

  const availableHrTemplates = isCoach
    ? (coachHrTemplates.length > 0 ? coachHrTemplates : athleteHrTemplates)
    : athleteHrTemplates;

  const defaultVmaTemplate = availableVmaTemplates.find((t: any) => t.isDefault || t.is_default) || availableVmaTemplates[0];
  const defaultHrTemplate = availableHrTemplates.find((t: any) => t.isDefault || t.is_default) || availableHrTemplates[0];

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

  const [hasGarminCreds, setHasGarminCreds] = useState(false);
  const [hasCorosCreds, setHasCorosCreds] = useState(false);

  const [loadingPlatform, setLoadingPlatform] = useState<"garmin" | "coros" | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gEmail = localStorage.getItem("volaris_garmin_email");
      const gPwd = localStorage.getItem("volaris_garmin_pwd");
      setHasGarminCreds(Boolean(gEmail && gPwd));

      const cEmail = localStorage.getItem("volaris_coros_email");
      const cPwd = localStorage.getItem("volaris_coros_pwd");
      setHasCorosCreds(Boolean(cEmail && cPwd));
    }
  }, []);

  const handlePushToPlatform = async (platform: "garmin" | "coros") => {
    const workoutName = workout.title || workout.sessionName || "Séance";

    if (platform === "garmin") {
      const savedEmail = localStorage.getItem("volaris_garmin_email");
      const savedPwd = localStorage.getItem("volaris_garmin_pwd");

      if (!savedEmail || !savedPwd) {
        setSyncStatus("⚠️ Veuillez d'abord connecter votre compte Garmin dans l'onglet Profil.");
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
        setSyncStatus("⚠️ Veuillez d'abord connecter votre compte COROS dans l'onglet Profil.");
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

        setSyncStatus(`✅ Séance « ${workoutName} » envoyée sur votre compte COROS !`);
        setTimeout(() => setSyncStatus(null), 3500);
      } catch (err: any) {
        setSyncStatus(`❌ ${err.message}`);
      } finally {
        setLoadingPlatform(null);
      }
    }
  };

  const renderPaceBadge = (step: WorkoutStep) => {
    // 1. Si la cible est une zone VMA
    if (step.goalType === "vma_zone" && step.targetZoneId && defaultVmaTemplate?.zones) {
      const selectedVmaZone = defaultVmaTemplate.zones.find((z: any, zIdx: number) => 
        (step.targetZoneId && String(z.id) === String(step.targetZoneId)) || 
        (step.targetZoneId && String(z.name) === String(step.targetZoneId)) ||
        (step.targetZoneName && String(z.name) === String(step.targetZoneName)) ||
        (String(zIdx) === String(step.targetZoneId))
      );

      if (selectedVmaZone) {
        const { min, max } = getZoneMinMax(selectedVmaZone);
        const computedPace = numericVma > 0 ? calculatePaceRangeFromVma(numericVma, min, max) : null;

        return (
          <div className="text-right">
            <span className="text-[9px] text-stone-500 uppercase block font-bold">
              {selectedVmaZone.name || "Zone VMA"}
            </span>
            <span className="font-black text-[#CF9A61] font-mono text-[11px] bg-[#CF9A61]/10 px-2 py-0.5 rounded border border-[#CF9A61]/30">
              {computedPace || `${min}% - ${max}% VMA`}
            </span>
          </div>
        );
      }
    }

    // 2. Si la cible est une zone FC (affichage forcé en BPM si fcMax configuré)
    if (step.goalType === "hr_zone" && step.targetZoneId && defaultHrTemplate?.zones) {
      const selectedHrZone = defaultHrTemplate.zones.find((z: any, zIdx: number) => 
        (step.targetZoneId && String(z.id) === String(step.targetZoneId)) || 
        (step.targetZoneId && String(z.name) === String(step.targetZoneId)) ||
        (step.targetZoneName && String(z.name) === String(step.targetZoneName)) ||
        (String(zIdx) === String(step.targetZoneId))
      );

      if (selectedHrZone) {
        const { min, max } = getZoneMinMax(selectedHrZone);
        const computedBpm = numericFcMax > 0 
          ? calculateHrRangeFromKarvonenOrMax(numericFcRest, numericFcMax, min, max) 
          : `${min}% - ${max}%`;

        return (
          <div className="text-right">
            <span className="text-[9px] text-stone-500 uppercase block font-bold">
              {selectedHrZone.name || "Zone FC"}
            </span>
            <span className="font-black text-[#CF9A61] font-mono text-[11px] bg-[#CF9A61]/10 px-2 py-0.5 rounded border border-[#CF9A61]/30">
              {computedBpm}
            </span>
          </div>
        );
      }
    }

    // 3. Si la cible est basée sur le RPE spécifique à l'étape
    if (step.goalType === "rpe" && step.targetRpe) {
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            RPE Cible
          </span>
          <span className="font-black text-amber-400 font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            RPE {step.targetRpe}
          </span>
        </div>
      );
    }

    // 4. Sinon, gestion classique de l'allure brute
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

        {/* HEADER */}
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

        {/* MÉTRIQUES CIBLES */}
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

        {/* BOUTON D'ACCÈS AUX GRAPHIQUES TÉLÉMÉTRIQUES */}
        {hasDebrief && (
          <button
            type="button"
            onClick={() => setShowTelemetryModal(true)}
            className="w-full py-3 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:border-[#CDCF61] border border-stone-800 rounded-2xl text-xs font-black uppercase text-[#CDCF61] tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <span>📈 Voir les graphiques & splits (Allure, FC, D+)</span>
          </button>
        )}

        {/* SYNCHRONISATION MONTRES */}
        {!isCoach && (
          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-wider block">
                Synchronisation Montre
              </span>
              <span className="text-[9px] text-stone-500 font-bold">
                Exporter la séance
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePushToPlatform("garmin")}
                disabled={loadingPlatform !== null}
                className="p-2.5 bg-stone-900 hover:bg-[#007CC3]/20 border border-stone-800 hover:border-[#007CC3]/50 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer group disabled:opacity-50"
                title={hasGarminCreds ? "Envoyer vers Garmin Connect" : "Connecter Garmin dans le profil"}
              >
                <GarminLogo className="w-5 h-5" />
                <span className="text-xs font-bold uppercase text-stone-300">
                  {loadingPlatform === "garmin" ? "Envoi..." : "Garmin"}
                </span>
                {!hasGarminCreds && (
                  <span className="text-[8px] text-stone-500 font-normal">
                    (non lié)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePushToPlatform("coros")}
                disabled={loadingPlatform !== null}
                className="p-2.5 bg-stone-900 hover:bg-[#F8283B]/20 border border-stone-800 hover:border-[#F8283B]/50 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer group disabled:opacity-50"
                title={hasCorosCreds ? "Envoyer vers COROS Training Hub" : "Connecter COROS dans le profil"}
              >
                <CorosLogo className="w-5 h-5" />
                <span className="text-xs font-bold uppercase text-stone-300">
                  {loadingPlatform === "coros" ? "Envoi..." : "COROS"}
                </span>
                {!hasCorosCreds && (
                  <span className="text-[8px] text-stone-500 font-normal">
                    (non lié)
                  </span>
                )}
              </button>
            </div>

            {syncStatus && (
              <p className={`text-[10px] text-center font-bold animate-fadeIn ${
                syncStatus.startsWith("✅")
                  ? "text-emerald-400"
                  : syncStatus.startsWith("⚠️")
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}>
                {syncStatus}
              </p>
            )}
          </div>
        )}

        {/* PROFIL D'ALLURE CHRONOLOGIQUE */}
        <PaceProfileChart steps={workout.steps} vma={vma} />

        {/* DESCRIPTION */}
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

        {/* REMARQUE COACH */}
        {workout.remark && (
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 p-3 rounded-2xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase text-[#CDCF61] block">
              💡 Conseil du Coach
            </span>
            <p className="text-xs text-[#CDCF61]/90">{workout.remark}</p>
          </div>
        )}

        {/* STRUCTURE DES BLOCS */}
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

        {/* ACTIONS */}
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