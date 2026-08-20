// @ts-nocheck
// src/utils/fitExporter.ts

import { Encoder, Stream, Profile } from "@garmin/fitsdk";
import { Workout, WorkoutStep } from "../types";

// Constantes FIT officielles Garmin
const MESG_FILE_ID = Profile?.MesgNum?.FILE_ID ?? 0;
const MESG_WORKOUT = Profile?.MesgNum?.WORKOUT ?? 26;
const MESG_WORKOUT_STEP = Profile?.MesgNum?.WORKOUT_STEP ?? 27;

const FILE_TYPE_WORKOUT = Profile?.FileType?.WORKOUT ?? 5;
const MANUFACTURER_GARMIN = Profile?.Manufacturer?.GARMIN ?? 1;
const SPORT_RUNNING = Profile?.Sport?.RUNNING ?? 1;

const INTENSITY_ACTIVE = Profile?.Intensity?.ACTIVE ?? 0;
const INTENSITY_REST = Profile?.Intensity?.REST ?? 1;

const DURATION_TIME = Profile?.WktStepDuration?.TIME ?? 0;
const DURATION_DISTANCE = Profile?.WktStepDuration?.DISTANCE ?? 1;
const TARGET_OPEN = Profile?.WktStepTarget?.OPEN ?? 0;

// Conversion de la durée ou distance ("1000m", "45min", "5km") en unités FIT
const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();
  if (clean.includes("min")) {
    const mins = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(mins * 60 * 1000) }; // ms
  }
  if (clean.includes("km")) {
    const km = parseFloat(clean) || 0;
    return { type: "distance", value: Math.round(km * 1000 * 100) }; // cm
  }
  if (clean.includes("m")) {
    const m = parseFloat(clean) || 0;
    return { type: "distance", value: Math.round(m * 100) }; // cm
  }
  return { type: "time", value: 300 * 1000 };
};

export const exportWorkoutToFIT = async (workout: Workout) => {
  const stream = new Stream();
  const encoder = new Encoder(stream);

  // 1. En-tête FILE_ID
  encoder.writeMesg({
    mesgNum: MESG_FILE_ID,
    type: FILE_TYPE_WORKOUT,
    manufacturer: MANUFACTURER_GARMIN,
    product: 0,
    serialNumber: 0,
    timeCreated: new Date(),
  });

  // 2. Nettoyage du titre de la séance
  const cleanTitle = (workout.title || "Entrainement Volaris")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/gi, "")
    .trim()
    .substring(0, 15);

  const stepsList = [];
  let stepIndex = 0;

  if (workout.steps && workout.steps.length > 0) {
    workout.steps.forEach((step) => {
      if (step.type === "repeat" && step.nestedSteps) {
        const reps = step.reps || 1;
        for (let i = 0; i < reps; i++) {
          step.nestedSteps.forEach((nStep) => {
            const parsed = parseDurationOrDist(nStep.durationOrDist || "");
            stepsList.push({
              mesgNum: MESG_WORKOUT_STEP,
              messageIndex: stepIndex++,
              wktStepName: `R${i + 1}`,
              durationValue: parsed.value,
              durationValueType: parsed.type === "time" ? DURATION_TIME : DURATION_DISTANCE,
              targetType: TARGET_OPEN,
              intensity: nStep.type === "recup" ? INTENSITY_REST : INTENSITY_ACTIVE,
            });
          });
        }
      } else {
        const parsed = parseDurationOrDist(step.durationOrDist || "");
        stepsList.push({
          mesgNum: MESG_WORKOUT_STEP,
          messageIndex: stepIndex++,
          wktStepName: `Etape ${stepIndex + 1}`,
          durationValue: parsed.value,
          durationValueType: parsed.type === "time" ? DURATION_TIME : DURATION_DISTANCE,
          targetType: TARGET_OPEN,
          intensity: step.type === "recup" ? INTENSITY_REST : INTENSITY_ACTIVE,
        });
      }
    });
  } else {
    const distMeters = Math.round((parseFloat(workout.km || "8") || 8) * 1000 * 100);
    stepsList.push({
      mesgNum: MESG_WORKOUT_STEP,
      messageIndex: 0,
      wktStepName: "Course",
      durationValue: distMeters,
      durationValueType: DURATION_DISTANCE,
      targetType: TARGET_OPEN,
      intensity: INTENSITY_ACTIVE,
    });
  }

  // 3. Définition du Workout
  encoder.writeMesg({
    mesgNum: MESG_WORKOUT,
    sport: SPORT_RUNNING,
    capabilities: 32,
    numValidSteps: stepsList.length,
    wktName: cleanTitle,
  });

  // 4. Écriture des blocs
  stepsList.forEach((stepMesg) => {
    encoder.writeMesg(stepMesg);
  });

  // 5. Récupération du buffer binaire
  const bufferData =
    stream.bytes ||
    (typeof stream.getBuffer === "function" ? stream.getBuffer() : null) ||
    new Uint8Array(stream.buffer || []);

  const fileName = `Volaris_${cleanTitle.replace(/\s+/g, "_")}.fit`;
  const file = new File([bufferData], fileName, { type: "application/octet-stream" });

  // 6. Partage mobile natif
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Séance Volaris : ${workout.title}`,
        text: `Exporter l'entraînement vers Garmin Connect`,
        files: [file],
      });
      return;
    } catch {
      // Repli en cas d'annulation
    }
  }

  // 7. Téléchargement pour navigateur PC
  const blob = new Blob([bufferData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};