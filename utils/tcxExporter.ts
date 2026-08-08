// src/utils/tcxExporter.ts

import { Workout, WorkoutStep } from "../types";

// Convertit la durée ou la distance Volaris (ex: "1000m", "45min", "5km") en secondes ou mètres pour Garmin
const parseDurationOrDist = (val: string): { type: "Time" | "Distance"; value: number } => {
  const cleanVal = val.toLowerCase().trim();
  if (cleanVal.includes("min")) {
    const mins = parseFloat(cleanVal) || 0;
    return { type: "Time", value: mins * 60 };
  }
  if (cleanVal.includes("km")) {
    const km = parseFloat(cleanVal) || 0;
    return { type: "Distance", value: km * 1000 };
  }
  if (cleanVal.includes("m")) {
    const m = parseFloat(cleanVal) || 0;
    return { type: "Distance", value: m };
  }
  // Par défaut : 300 secondes (5 min) si la donnée n'est pas reconnue
  return { type: "Time", value: 300 };
};

// Génère les balises XML TCX compatibles Garmin Connect
const buildStepXML = (step: WorkoutStep, stepName: string): string => {
  const parsed = parseDurationOrDist(step.durationOrDist || "");
  const durationType = parsed.type === "Time" ? "Time" : "Distance";
  const intensity = step.type === "recup" ? "Resting" : "Active";

  return `
      <Step Name="${stepName}">
        <Intensity>${intensity}</Intensity>
        <DurationType>${durationType}</DurationType>
        <DurationValue>${parsed.value}</DurationValue>
      </Step>`;
};

// Fonction principale d'exportation avec support du partage Bluetooth / Garmin Connect
export const exportWorkoutToTCX = async (workout: Workout) => {
  let stepsXML = "";

  if (workout.steps && workout.steps.length > 0) {
    workout.steps.forEach((step, idx) => {
      if (step.type === "repeat" && step.nestedSteps) {
        const reps = step.reps || 1;
        for (let i = 0; i < reps; i++) {
          step.nestedSteps.forEach((nStep, nIdx) => {
            stepsXML += buildStepXML(nStep, `Rep ${i + 1}/${reps} - Bloc ${nIdx + 1}`);
          });
        }
      } else {
        stepsXML += buildStepXML(step, `Etape ${idx + 1}`);
      }
    });
  } else {
    const distMeters = (parseFloat(workout.km || "8") || 8) * 1000;
    stepsXML = `
      <Step Name="${workout.title}">
        <Intensity>Active</Intensity>
        <DurationType>Distance</DurationType>
        <DurationValue>${distMeters}</DurationValue>
      </Step>`;
  }

  const cleanTitle = workout.title.replace(/[^\w\s-]/gi, "") || "Seance_Volaris";

  const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Workouts>
    <Workout Sport="Running">
      <Name>${cleanTitle}</Name>
      ${stepsXML}
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;

  const fileName = `Volaris_${cleanTitle.replace(/\s+/g, "_")}.tcx`;
  const file = new File([tcxContent], fileName, {
    type: "application/vnd.garmin.tcx+xml",
  });

  // 1. SUR MOBILE : Utilise le partage natif pour ouvrir directement dans Garmin Connect
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Séance Volaris : ${workout.title}`,
        text: `Exporter la séance vers Garmin Connect`,
        files: [file],
      });
      return;
    } catch (err) {
      console.log("Partage annuler ou non supporté, repli sur le téléchargement classique.");
    }
  }

  // 2. SUR ORDINATEUR : Téléchargement du fichier classique
  const blob = new Blob([tcxContent], { type: "application/vnd.garmin.tcx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};