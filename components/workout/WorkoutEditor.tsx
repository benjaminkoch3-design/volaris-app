// src/components/workout/WorkoutEditor.tsx

import React, { useState } from "react";
import { Workout, WorkoutStep, LibraryWorkout, LibraryCategory, UserRole, ZoneTemplate } from "../../types";
import { WORKOUT_TYPES_CONFIG } from "../../constants";
import { calculateStepMetrics, getWorkoutTypeConfig } from "../../utils/calculations";
import { PaceProfileChart } from "./PaceProfileChart";

interface WorkoutEditorProps {
  workout: Workout;
  startDate: string;
  onClose: () => void;
  onUpdateWorkout: (id: string, field: keyof Workout, value: any) => void;
  onAddStep: (workoutId: string, parentPath?: string[]) => void;
  onUpdateStep: (
    workoutId: string,
    stepPath: string[],
    field: keyof WorkoutStep,
    value: any
  ) => void;
  onDeleteStep: (workoutId: string, stepPath: string[]) => void;
  onMoveStep: (
    workoutId: string,
    stepPath: string[],
    direction: "up" | "down"
  ) => void;
  onDropStep: (workoutId: string, targetPath: string[]) => void;
  draggedStepPath: string[] | null;
  setDraggedStepPath: (path: string[] | null) => void;

  libraryWorkouts?: LibraryWorkout[];
  categories?: LibraryCategory[];
  userRole?: UserRole;
  vma?: number | string;
  fcRest?: number | string;
  fcMax?: number | string;
  athleteVmaTemplates?: any[];
  athleteHrTemplates?: any[];
  coachVmaTemplates?: any[];
  coachHrTemplates?: any[];
}

const getRpeColor = (rpe: number) => {
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

const getZoneMinMax = (zone: any) => {
  if (!zone) return { min: 0, max: 0 };
  
  // Lecture universelle et robuste (supportant camelCase et snake_case)
  const rawMin = zone.minVmaPercent ?? zone.percentageMin ?? zone.minPercent ?? zone.min ?? zone.percentage_min ?? zone.min_percent ?? 0;
  const rawMax = zone.maxVmaPercent ?? zone.percentageMax ?? zone.maxPercent ?? zone.max ?? zone.percentage_max ?? zone.max_percent ?? 0;

  const min = parseFloat(String(rawMin).replace(",", ".")) || 0;
  const max = parseFloat(String(rawMax).replace(",", ".")) || 0;

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
  const maxToUse = fcMaxVal && fcMaxVal > 0 ? fcMaxVal : 190; // Valeur de secours par défaut
  const restToUse = fcRestVal && fcRestVal > 0 ? fcRestVal : 50;   // Valeur de secours par défaut
  
  if (minPercent === undefined || maxPercent === undefined) return null;
  
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

export const WorkoutEditor: React.FC<WorkoutEditorProps> = ({
  workout,
  onClose,
  onUpdateWorkout,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onMoveStep,
  libraryWorkouts = [],
  categories = [],
  userRole = "athlete",
  vma,
  fcRest,
  fcMax,
  athleteVmaTemplates = [],
  athleteHrTemplates = [],
  coachVmaTemplates = [],
  coachHrTemplates = [],
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "");

  const numericVma = typeof vma === "string" ? parseFloat(vma.replace(",", ".")) : Number(vma || 0);
  const numericFcRest = typeof fcRest === "string" ? parseFloat(fcRest) : Number(fcRest || 0);
  const numericFcMax = typeof fcMax === "string" ? parseFloat(fcMax) : Number(fcMax || 0);

  const metrics = calculateStepMetrics(workout.steps, vma);
  const selectedTypeConfig = getWorkoutTypeConfig(workout.type || "footing");

  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";
  const themeHoverBg = isCoach ? "hover:bg-[#b8bb52]" : "hover:bg-[#b88652]";

  const availableVmaTemplates = isCoach
    ? (coachVmaTemplates.length > 0 ? coachVmaTemplates : athleteVmaTemplates)
    : athleteVmaTemplates;

  const availableHrTemplates = isCoach
    ? (coachHrTemplates.length > 0 ? coachHrTemplates : athleteHrTemplates)
    : athleteHrTemplates;

  const defaultVmaTemplate =
    availableVmaTemplates.find((t: any) => t.isDefault) || availableVmaTemplates[0];

  const defaultHrTemplate =
    availableHrTemplates.find((t: any) => t.isDefault) || availableHrTemplates[0];

  const filteredLibraryWorkouts = libraryWorkouts.filter(
    (w) => !selectedCatId || w.categoryId === selectedCatId
  );

  const adaptStepsToCurrentAthleteZones = (steps: WorkoutStep[]): WorkoutStep[] => {
    return steps.map((step) => {
      let updatedStep = { ...step };

      if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
        updatedStep.nestedSteps = adaptStepsToCurrentAthleteZones(step.nestedSteps);
        return updatedStep;
      }

      if (step.goalType === "vma_zone" && step.targetZoneId && defaultVmaTemplate?.zones) {
        const originalZoneIndex = defaultVmaTemplate.zones.findIndex((z: any) => z.id === step.targetZoneId);
        if (originalZoneIndex !== -1 && defaultVmaTemplate.zones[originalZoneIndex]) {
          const matchedZone = defaultVmaTemplate.zones[originalZoneIndex];
          updatedStep.targetZoneId = matchedZone.id;
          updatedStep.targetZoneName = matchedZone.name;
        }
      } else if (step.goalType === "hr_zone" && step.targetZoneId && defaultHrTemplate?.zones) {
        const originalZoneIndex = defaultHrTemplate.zones.findIndex((z: any) => z.id === step.targetZoneId);
        if (originalZoneIndex !== -1 && defaultHrTemplate.zones[originalZoneIndex]) {
          const matchedZone = defaultHrTemplate.zones[originalZoneIndex];
          updatedStep.targetZoneId = matchedZone.id;
          updatedStep.targetZoneName = matchedZone.name;
        }
      }

      return updatedStep;
    });
  };

  const handleApplyTemplate = (template: LibraryWorkout) => {
    onUpdateWorkout(workout.id, "title", template.title);
    if ((template as any).type) {
      onUpdateWorkout(workout.id, "type", (template as any).type);
    }
    onUpdateWorkout(workout.id, "description", template.description || "");
    onUpdateWorkout(workout.id, "km", template.km || "");
    onUpdateWorkout(workout.id, "rpe", template.rpe || "5");

    const adaptedSteps = adaptStepsToCurrentAthleteZones(template.steps || []);
    onUpdateWorkout(workout.id, "steps", adaptedSteps);

    setShowImportModal(false);
  };

  const handleSaveAndClose = () => {
    if (!workout.steps || workout.steps.length === 0) {
      setErrorMsg(
        "Vous devez ajouter au moins un bloc d'entraînement pour valider et enregistrer cette séance."
      );
      return;
    }
    setErrorMsg(null);
    if (metrics.totalKm && Number(metrics.totalKm) > 0) {
      onUpdateWorkout(workout.id, "km", metrics.totalKm.toString());
    }
    onClose();
  };

  const parseStepDurationOrDist = (raw?: string, endCondition?: string) => {
    if (endCondition === "lap_button") {
      return { val: "Bouton Lap", unit: "" };
    }
    if (!raw) return { val: "", unit: endCondition === "distance" ? "m" : "min" };
    const str = raw.trim().toLowerCase();
    if (endCondition === "distance") {
      if (str.endsWith("km")) return { val: str.replace("km", "").trim(), unit: "km" };
      return { val: str.replace("m", "").trim(), unit: "m" };
    } else {
      if (str.endsWith("s") || str.endsWith("sec")) return { val: str.replace(/[a-z]/g, "").trim(), unit: "s" };
      if (str.endsWith("h")) return { val: str.replace("h", "").trim(), unit: "h" };
      return { val: str.replace(/[a-z]/g, "").trim(), unit: "min" };
    }
  };

  const cleanPaceInput = (val: string) => {
    return val.replace(/min\/km/gi, "").replace(/\/km/gi, "").trim();
  };

  const renderStepsList = (steps: WorkoutStep[], parentPath: string[] = []) => {
    return steps.map((step, idx) => {
      const currentPath = [...parentPath, idx.toString()];
      const parsed = parseStepDurationOrDist(step.durationOrDist, step.endCondition);
      const isRecoveryStep = step.type === "recup" || step.type === "recup_marche";
      const isWalkingRecovery =
        step.type === "recup_marche" || Boolean((step as any).isWalkingRecovery);

      const goalType = step.goalType || "allure";

      const selectedVmaZone = defaultVmaTemplate?.zones?.find(
        (z: any) => String(z.id) === String(step.targetZoneId) || z.name === step.targetZoneName
      );
      const selectedHrZone = defaultHrTemplate?.zones?.find(
        (z: any) => String(z.id) === String(step.targetZoneId) || z.name === step.targetZoneName
      );

      const vmaMinMax = selectedVmaZone ? getZoneMinMax(selectedVmaZone) : { min: 0, max: 0 };
      const hrMinMax = selectedHrZone ? getZoneMinMax(selectedHrZone) : { min: 0, max: 0 };

      const computedVmaPaceRange = selectedVmaZone
        ? selectedVmaZone.paceMin && selectedVmaZone.paceMax
          ? `${selectedVmaZone.paceMin} - ${selectedVmaZone.paceMax} /km`
          : calculatePaceRangeFromVma(numericVma, vmaMinMax.min, vmaMinMax.max)
        : null;

      const computedHrBpmRange = selectedHrZone
        ? selectedHrZone.minBpm && selectedHrZone.maxBpm
          ? `${selectedHrZone.minBpm} - ${selectedHrZone.maxBpm} bpm`
          : calculateHrRangeFromKarvonenOrMax(numericFcRest, numericFcMax, hrMinMax.min, hrMinMax.max)
        : null;

      return (
        <div
          key={step.id || idx}
          className="bg-stone-950 border border-stone-800 rounded-2xl p-3 space-y-2.5 font-sans"
        >
          <div className="flex justify-between items-center">
            <select
              value={step.type === "recup_marche" ? "recup" : step.type}
              onChange={(e) => {
                const nextType = e.target.value;
                onUpdateStep(
                  workout.id,
                  currentPath,
                  "type",
                  nextType === "recup" && isWalkingRecovery ? "recup_marche" : nextType
                );
              }}
              style={{ color: themeColor }}
              className="bg-stone-900 border border-stone-800 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="echauffement">Échauffement</option>
              <option value="corps">Course / Corps</option>
              <option value="recup">Récupération</option>
              <option value="retour_calme">Retour au calme</option>
              <option value="repeat">Répétition / Boucle</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveStep(workout.id, currentPath, "up")}
                className="text-stone-500 hover:text-stone-300 text-xs px-1 cursor-pointer"
                title="Monter"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => onMoveStep(workout.id, currentPath, "down")}
                className="text-stone-500 hover:text-stone-300 text-xs px-1 cursor-pointer"
                title="Descendre"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => onDeleteStep(workout.id, currentPath)}
                className="text-stone-500 hover:text-[#CF6361] text-xs px-1.5 cursor-pointer transition"
                title="Supprimer ce bloc"
              >
                ✕
              </button>
            </div>
          </div>

          {step.type === "repeat" ? (
            <div className="space-y-2.5">
              <div className="space-y-2 bg-stone-900/50 p-2.5 rounded-xl border border-stone-800">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                      Nombre de répétitions
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={step.reps ?? ""}
                      placeholder="Ex: 5"
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateStep(
                          workout.id,
                          currentPath,
                          "reps",
                          val === "" ? "" : Math.max(1, parseInt(val, 10))
                        );
                      }}
                      style={{ color: themeColor }}
                      className="w-full bg-stone-950 border border-stone-800 text-[10px] font-bold rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 text-stone-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => onAddStep(workout.id, currentPath)}
                      style={{
                        color: themeColor,
                        borderColor: `${themeColor}40`,
                        backgroundColor: `${themeColor}15`,
                      }}
                      className="w-full py-1.5 border rounded-lg text-[9px] font-bold uppercase transition cursor-pointer"
                    >
                      ➕ Sous-bloc
                    </button>
                  </div>
                </div>
              </div>

              {step.nestedSteps && step.nestedSteps.length > 0 && (
                <div
                  style={{ borderColor: `${themeColor}50` }}
                  className="pl-3 border-l-2 space-y-2"
                >
                  {renderStepsList(step.nestedSteps, currentPath)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                    Condition de fin
                  </label>
                  <select
                    value={step.endCondition || "distance"}
                    onChange={(e) => {
                      const newCond = e.target.value;
                      onUpdateStep(workout.id, currentPath, "endCondition", newCond);
                      if (newCond === "lap_button") {
                        onUpdateStep(workout.id, currentPath, "durationOrDist", "Bouton Lap");
                      } else {
                        onUpdateStep(workout.id, currentPath, "durationOrDist", "");
                      }
                    }}
                    className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-200 rounded-lg p-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="distance">Distance</option>
                    <option value="temps">Temps</option>
                    <option value="lap_button">Bouton Lap (Bip montre)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                    {step.endCondition === "lap_button" ? "Déclencheur" : "Valeur & Unité"}
                  </label>
                  {step.endCondition === "lap_button" ? (
                    <div className="w-full bg-stone-900/60 border border-stone-800 rounded-lg p-1.5 text-[10px] text-[#CF9A61] font-bold flex items-center gap-1.5">
                      <span>🔘</span>
                      <span>Appui sur touche Lap</span>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder={step.endCondition === "temps" ? "Ex: 10" : "Ex: 1000"}
                        value={parsed.val}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          if (!newVal) {
                            onUpdateStep(workout.id, currentPath, "durationOrDist", "");
                            return;
                          }
                          const formatted =
                            step.endCondition === "distance"
                              ? parsed.unit === "km"
                                ? `${newVal}km`
                                : `${newVal}m`
                              : parsed.unit === "s"
                              ? `${newVal}s`
                              : parsed.unit === "h"
                              ? `${newVal}h`
                              : `${newVal} min`;
                          onUpdateStep(workout.id, currentPath, "durationOrDist", formatted);
                        }}
                        className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-100 rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 font-mono"
                      />
                      <select
                        value={parsed.unit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          if (!parsed.val) {
                            onUpdateStep(workout.id, currentPath, "durationOrDist", "");
                            return;
                          }
                          const formatted =
                            step.endCondition === "distance"
                              ? newUnit === "km"
                                ? `${parsed.val}km`
                                : `${parsed.val}m`
                              : newUnit === "s"
                              ? `${parsed.val}s`
                              : newUnit === "h"
                              ? `${parsed.val}h`
                              : `${parsed.val} min`;
                          onUpdateStep(workout.id, currentPath, "durationOrDist", formatted);
                        }}
                        style={{ color: themeColor }}
                        className="w-20 bg-stone-900 border border-stone-800 text-[10px] font-bold rounded-lg p-1 focus:outline-none cursor-pointer"
                      >
                        {step.endCondition === "distance" ? (
                          <>
                            <option value="m">m</option>
                            <option value="km">km</option>
                          </>
                        ) : (
                          <>
                            <option value="min">min</option>
                            <option value="s">sec</option>
                            <option value="h">h</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* SÉLECTEUR DE TYPE DE CIBLE DU BLOC */}
              <div className="space-y-2 bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60">
                <div className="flex justify-between items-center">
                  <label className="block text-[8px] uppercase font-bold text-stone-400">
                    Type de cible du bloc
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => {
                      onUpdateStep(workout.id, currentPath, "goalType", e.target.value);
                    }}
                    style={{ color: themeColor }}
                    className="bg-stone-950 border border-stone-800 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="allure">Allure (Fourchette)</option>
                    <option value="vma_zone">Zone d'allure (Modèle VMA)</option>
                    <option value="hr_zone">Zone de Fréquence Cardiaque (FC)</option>
                    <option value="rpe">RPE Cible</option>
                  </select>
                </div>

                {/* 1. ALLURE BRUTE */}
                {goalType === "allure" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-[#CF6361] mb-0.5">
                        Allure Lente (Min)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 4:30"
                        value={step.paceMax ?? ""}
                        onChange={(e) =>
                          onUpdateStep(
                            workout.id,
                            currentPath,
                            "paceMax",
                            cleanPaceInput(e.target.value)
                          )
                        }
                        className="w-full bg-stone-950 border border-stone-800 text-[10px] text-stone-100 rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-[#CDCF61] mb-0.5">
                        Allure Rapide (Max)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 4:15"
                        value={step.paceMin ?? ""}
                        onChange={(e) =>
                          onUpdateStep(
                            workout.id,
                            currentPath,
                            "paceMin",
                            cleanPaceInput(e.target.value)
                          )
                        }
                        className="w-full bg-stone-950 border border-stone-800 text-[10px] text-stone-100 rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 font-mono text-center"
                      />
                    </div>
                  </div>
                )}

                {/* 2. ZONE VMA */}
                {goalType === "vma_zone" && (
                  <div className="pt-1 space-y-2">
                    {!defaultVmaTemplate ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-300">
                        ⚠️ Aucun modèle de zone VMA disponible
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[8px] uppercase font-bold text-stone-400">
                            Sélectionner la zone VMA
                          </label>
                          <span className="text-[8px] text-[#CF9A61] font-bold">
                            Modèle : {defaultVmaTemplate.name} {defaultVmaTemplate.isDefault ? "⭐" : ""}
                          </span>
                        </div>
                        <select
                          value={step.targetZoneId || ""}
                          onChange={(e) => {
                            const zoneId = e.target.value;
                            const zone = defaultVmaTemplate.zones?.find((z: any) => String(z.id) === zoneId);
                            onUpdateStep(workout.id, currentPath, "targetZoneId", zoneId);
                            if (zone) {
                              onUpdateStep(workout.id, currentPath, "targetZoneName", zone.name);
                            }
                          }}
                          className="w-full bg-stone-950 border border-stone-800 text-[10px] font-bold text-stone-100 rounded-lg p-2 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Choisir une zone --</option>
                          {defaultVmaTemplate.zones?.map((zone: any) => {
                            const { min, max } = getZoneMinMax(zone);
                            return (
                              <option key={zone.id} value={zone.id}>
                                {zone.name} ({min}% - {max}%)
                              </option>
                            );
                          })}
                        </select>

                        {computedVmaPaceRange && (
                          <div className="mt-2 p-2 bg-[#CDCF61]/10 border border-[#CDCF61]/40 rounded-xl flex justify-between items-center">
                            <span className="text-[9px] font-bold text-stone-300 uppercase">Cible Allure :</span>
                            <span className="text-xs font-black text-[#CDCF61] font-mono">{computedVmaPaceRange}</span>
                          </div>
                        )}
                        {!computedVmaPaceRange && numericVma <= 0 && (
                          <p className="text-[9px] text-amber-400 mt-1 italic">
                            ⚠️ Renseignez votre VMA dans votre profil pour calculer les allures correspondantes.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ZONE FC */}
                {goalType === "hr_zone" && (
                  <div className="pt-1 space-y-2">
                    {!defaultHrTemplate ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-300">
                        ⚠️ Aucun modèle FC disponible
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[8px] uppercase font-bold text-stone-400">
                            Sélectionner la zone de FC
                          </label>
                          <span className="text-[8px] text-[#CF9A61] font-bold">
                            Modèle : {defaultHrTemplate.name} {defaultHrTemplate.isDefault ? "⭐" : ""}
                          </span>
                        </div>
                        <select
                          value={step.targetZoneId || ""}
                          onChange={(e) => {
                            const zoneId = e.target.value;
                            const zone = defaultHrTemplate.zones?.find((z: any) => String(z.id) === zoneId);
                            onUpdateStep(workout.id, currentPath, "targetZoneId", zoneId);
                            if (zone) {
                              onUpdateStep(workout.id, currentPath, "targetZoneName", zone.name);
                            }
                          }}
                          className="w-full bg-stone-950 border border-stone-800 text-[10px] font-bold text-stone-100 rounded-lg p-2 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Choisir une zone FC --</option>
                          {defaultHrTemplate.zones?.map((zone: any) => {
                            const { min, max } = getZoneMinMax(zone);
                            return (
                              <option key={zone.id} value={zone.id}>
                                {zone.name} ({min}% - {max}%)
                              </option>
                            );
                          })}
                        </select>

                        {computedHrBpmRange && (
                          <div className="mt-2 p-2 bg-[#CDCF61]/10 border border-[#CDCF61]/40 rounded-xl flex justify-between items-center">
                            <span className="text-[9px] font-bold text-stone-300 uppercase">Cible FC :</span>
                            <span className="text-xs font-black text-[#CDCF61] font-mono">{computedHrBpmRange}</span>
                          </div>
                        )}
                        {!computedHrBpmRange && numericFcMax <= 0 && (
                          <p className="text-[9px] text-amber-400 mt-1 italic">
                            ⚠️ Renseignez la FC Max de l'athlète pour calculer les bpm correspondants.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. RPE CIBLE */}
                {goalType === "rpe" && (
                  <div className="pt-1">
                    <label className="block text-[8px] uppercase font-bold text-stone-400 mb-1">
                      Valeur de RPE Cible (1 à 10)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="Ex: 7"
                        value={step.targetRpe ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateStep(workout.id, currentPath, "targetRpe", val === "" ? "" : Math.min(10, Math.max(1, parseInt(val, 10))));
                        }}
                        className="w-20 bg-stone-950 border border-stone-800 text-[10px] font-black text-stone-100 rounded-lg p-1.5 text-center focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-stone-400">/ 10 (Effort perçu)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* OPTION RÉCUPÉRATION À LA MARCHE */}
              {isRecoveryStep && (
                <div className="pt-1.5 border-t border-stone-800/40 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-stone-300 hover:text-stone-100 transition">
                    <input
                      type="checkbox"
                      checked={isWalkingRecovery}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onUpdateStep(
                          workout.id,
                          currentPath,
                          "type",
                          checked ? "recup_marche" : "recup"
                        );
                        onUpdateStep(
                          workout.id,
                          currentPath,
                          "isWalkingRecovery" as any,
                          checked
                        );
                        if (checked && !step.paceMin && !step.paceMax) {
                          onUpdateStep(workout.id, currentPath, "paceMin", "10:00");
                          onUpdateStep(workout.id, currentPath, "paceMax", "10:30");
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-stone-700 bg-stone-950 text-[#CF9A61] focus:ring-0 cursor-pointer accent-[#CF9A61]"
                    />
                    <span className="font-semibold">
                      🚶 Récupération à la marche (allure estimée : 10'00/km)
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const currentRpeRaw = workout.rpe;
  const rpeNumeric = currentRpeRaw !== undefined && currentRpeRaw !== "" ? parseInt(String(currentRpeRaw), 10) : 5;
  const rpeColor = getRpeColor(rpeNumeric || 5);

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center border-b border-stone-800 pb-3 gap-2">
          <div>
            <span
              style={{ color: themeColor }}
              className="text-[10px] font-bold uppercase tracking-wider block"
            >
              Éditeur de Séance • {workout.dayName}
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout.title || "Nouvelle séance"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {libraryWorkouts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{ backgroundColor: themeColor }}
                className={`text-[10px] font-extrabold text-stone-950 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer shadow-md ${themeHoverBg}`}
              >
                📚 Importer modèle
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {showImportModal && (
          <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center p-4">
            <div
              style={{ borderColor: `${themeColor}60` }}
              className="bg-stone-900 border rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn"
            >
              <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                <span
                  style={{ color: themeColor }}
                  className="text-xs font-black uppercase"
                >
                  📚 Importer une séance de la bibliothèque
                </span>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="text-stone-400 hover:text-stone-100 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {categories.length > 0 && (
                <div className="flex overflow-x-auto gap-1.5 pb-1 custom-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCatId(cat.id)}
                        style={{
                          backgroundColor: isSelected ? themeColor : "#0c0a09",
                          borderColor: isSelected ? themeColor : "#27272a",
                          color: isSelected ? "#0c0a09" : "#a8a29e",
                        }}
                        className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border"
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {filteredLibraryWorkouts.length === 0 ? (
                  <p className="text-xs text-stone-500 italic text-center py-4">
                    Aucune séance modèle enregistrée dans cette catégorie.
                  </p>
                ) : (
                  filteredLibraryWorkouts.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className="p-3 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-2xl cursor-pointer transition flex justify-between items-center group"
                    >
                      <div>
                        <h4
                          style={{ color: "#f5f5f4" }}
                          className="text-xs font-black transition group-hover:text-amber-400"
                        >
                          {template.title}
                        </h4>
                        <p className="text-[10px] text-stone-400 line-clamp-1">
                          {template.description || "Aucune description"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span
                          style={{ color: themeColor }}
                          className="text-[10px] font-bold block"
                        >
                          {template.km || "-"} km
                        </span>
                        <span className="text-[9px] text-stone-400">
                          RPE {template.rpe || "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-full py-2 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800 text-center">
          <div>
            <span className="block text-[9px] font-bold text-stone-400 uppercase">
              Distance Calculée
            </span>
            <span style={{ color: themeColor }} className="text-base font-black">
              {metrics.totalKm && Number(metrics.totalKm) > 0 ? `${metrics.totalKm} km` : "-"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-stone-400 uppercase">
              Durée Estimée
            </span>
            <span style={{ color: themeColor }} className="text-base font-black">
              {metrics.totalMinutes && Number(metrics.totalMinutes) > 0 ? `${metrics.totalMinutes} min` : "-"}
            </span>
          </div>
        </div>

        <PaceProfileChart steps={workout.steps} vma={vma} />

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Titre de la séance
            </label>
            <input
              type="text"
              value={workout.title ?? ""}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "title", e.target.value)
              }
              placeholder="Ex: Fractionné court 10x400m"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] placeholder:text-stone-600 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Type de séance
              </label>
              <select
                value={workout.type || "footing"}
                onChange={(e) =>
                  onUpdateWorkout(workout.id, "type", e.target.value)
                }
                className={`w-full bg-stone-950 border rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none cursor-pointer ${selectedTypeConfig.badgeClass}`}
              >
                {Object.entries(WORKOUT_TYPES_CONFIG)
                  .filter(([key]) => key !== "repos")
                  .map(([key, config]) => {
                    const displayLabel = key === "vma" ? "Fractionné" : config.label;
                    return (
                      <option key={key} value={key} className="bg-stone-900 text-stone-100 font-normal">
                        {displayLabel}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-bold text-stone-400">
                  RPE Cible
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-stone-400">RPE</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={workout.rpe ?? ""}
                    placeholder="5"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        onUpdateWorkout(workout.id, "rpe", "");
                      } else {
                        const parsed = Math.min(10, Math.max(1, parseInt(val, 10)));
                        onUpdateWorkout(workout.id, "rpe", parsed.toString());
                      }
                    }}
                    style={{ color: rpeColor }}
                    className="w-10 bg-stone-950 border border-stone-800 rounded-lg text-center text-xs font-black py-0.5 focus:outline-none"
                  />
                  <span className="text-xs font-black text-stone-400">/ 10</span>
                </div>
              </div>

              <div className="relative w-full h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 p-0.5 mt-1.5">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpeNumeric}
                  onChange={(e) =>
                    onUpdateWorkout(workout.id, "rpe", e.target.value)
                  }
                  className="w-full opacity-0 cursor-pointer absolute inset-0 z-10"
                />
                <div
                  style={{ left: `calc(${((rpeNumeric - 1) / 9) * 100}% - 6px)` }}
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-stone-950 rounded-full shadow-md pointer-events-none transition-all"
                />
              </div>

              <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider pt-0.5">
                <span className="text-emerald-400">1-3 Facile</span>
                <span className="text-amber-400">4-7 Soutenu</span>
                <span className="text-red-500">8-10 Maximal</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Description de la séance
            </label>
            <textarea
              rows={2}
              value={workout.description || ""}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "description", e.target.value)
              }
              placeholder="Ex: Séance de soutien VMA visant à maintenir la régularité du rythme."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] placeholder:text-stone-600 custom-scrollbar resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Consignes / Remarque Coach (optionnel)
            </label>
            <input
              type="text"
              value={workout.remark || ""}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "remark", e.target.value)
              }
              placeholder="Ex: 2 min de récupération marchée entre les séries."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] placeholder:text-stone-600"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-stone-800 pt-3">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase font-black text-stone-200 tracking-wider">
              Blocs d'entraînement <span className="text-[#CF6361]">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                onAddStep(workout.id, []);
              }}
              style={{ backgroundColor: themeColor }}
              className={`px-2.5 py-1 text-stone-950 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${themeHoverBg}`}
            >
              ➕ Ajouter un bloc
            </button>
          </div>

          {errorMsg && (
            <div className="bg-[#CF6361]/10 border border-[#CF6361]/30 text-[#CF6361] p-2.5 rounded-xl text-[11px] font-bold animate-fadeIn">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5 max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
            {!workout.steps || workout.steps.length === 0 ? (
              <div className="bg-stone-950/60 border border-dashed border-stone-800 rounded-2xl p-4 text-center space-y-1">
                <p className="text-xs text-stone-400 font-bold">
                  Aucun bloc configuré
                </p>
                <p className="text-[10px] text-stone-500">
                  Ajoutez au moins un bloc pour enregistrer cette séance.
                </p>
              </div>
            ) : (
              renderStepsList(workout.steps)
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            style={{ backgroundColor: themeColor }}
            className={`flex-1 py-3 text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer ${themeHoverBg}`}
          >
            Enregistrer la séance
          </button>
        </div>
      </div>
    </div>
  );
};