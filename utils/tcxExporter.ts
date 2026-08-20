// src/utils/tcxExporter.ts

import { Workout, WorkoutStep } from "../types";

const parseDurationOrDist = (val: string): { type: "Time" | "Distance"; value: number } => {
  const cleanVal = (val || "").toLowerCase().trim();
  if (cleanVal.includes("min")) {
    const mins = parseFloat(cleanVal) || 0;
    return { type: "Time", value: Math.round(mins * 60) };
  }
  if (cleanVal.includes("km")) {
    const km = parseFloat(cleanVal) || 0;
    return { type: "Distance", value: Math.round(km * 1000) };
  }
  if (cleanVal.includes("m")) {
    const m = parseFloat(cleanVal) || 0;
    return { type: "Distance", value: Math.round(m) };
  }
  return { type: "Time", value: 300 };
};

const buildStepXML = (step: WorkoutStep, stepId: number, stepName: string): string => {
  const parsed = parseDurationOrDist(step.durationOrDist || "");
  const intensity = step.type === "recup" ? "Resting" : "Active";

  let durationBlock = "";
  if (parsed.type === "Time") {
    durationBlock = `
        <Duration xsi:type="Time_t">
          <Seconds>${parsed.value}</Seconds>
        </Duration>`;
  } else {
    durationBlock = `
        <Duration xsi:type="Distance_t">
          <Meters>${parsed.value}</Meters>
        </Duration>`;
  }

  return `
      <Step xsi:type="Step_t">
        <StepId>${stepId}</StepId>
        <Name>${stepName.substring(0, 15)}</Name>
        <Intensity>${intensity}</Intensity>
        ${durationBlock}
        <Target xsi:type="None_t"/>
      </Step>`;
};

export const exportWorkoutToTCX = async (workout: Workout) => {
  let stepsXML = "";
  let currentStepId = 1;

  if (workout.steps && workout.steps.length > 0) {
    workout.steps.forEach((step, idx) => {
      if (step.type === "repeat" && step.nestedSteps) {
        const reps = step.reps || 1;
        for (let i = 0; i < reps; i++) {
          step.nestedSteps.forEach((nStep, nIdx) => {
            stepsXML += buildStepXML(nStep, currentStepId++, `R${i + 1} E${nIdx + 1}`);
          });
        }
      } else {
        stepsXML += buildStepXML(step, currentStepId++, `Etape ${idx + 1}`);
      }
    });
  } else {
    const distMeters = Math.round((parseFloat(workout.km || "8") || 8) * 1000);
    stepsXML = `
      <Step xsi:type="Step_t">
        <StepId>1</StepId>
        <Name>Course</Name>
        <Intensity>Active</Intensity>
        <Duration xsi:type="Distance_t">
          <Meters>${distMeters}</Meters>
        </Duration>
        <Target xsi:type="None_t"/>
      </Step>`;
  }

  const cleanTitle = (workout.title || "Entrainement")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/gi, "")
    .trim()
    .substring(0, 15);

  const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
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

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Séance Volaris : ${workout.title}`,
        text: `Exporter la séance vers Garmin Connect`,
        files: [file],
      });
      return;
    } catch {
      // Repli sur le téléchargement standard
    }
  }

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