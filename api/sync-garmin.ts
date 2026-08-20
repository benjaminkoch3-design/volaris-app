// @ts-nocheck
// api/sync-garmin.ts
import { GarminConnect } from "garmin-connect";

const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();

  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(km * 1000) };
  }

  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(m) };
  }

  if (clean.includes("h")) {
    const parts = clean.split("h");
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    return { type: "time", value: Math.round(hours * 3600 + mins * 60) };
  }

  if (clean.includes("s") && !clean.includes("min")) {
    const sec = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(sec) };
  }

  if (clean.includes("min") || clean.includes("'")) {
    const mins = parseFloat(clean.replace("'", ".")) || 0;
    return { type: "time", value: Math.round(mins * 60) };
  }

  if (clean.includes(":")) {
    const [min, sec] = clean.split(":").map((v) => parseFloat(v) || 0);
    return { type: "time", value: Math.round(min * 60 + sec) };
  }

  const rawNum = parseFloat(clean) || 0;
  if (rawNum >= 100) {
    return { type: "distance", value: Math.round(rawNum) };
  }
  return { type: "time", value: Math.round((rawNum || 5) * 60) };
};

const parsePaceStringToSeconds = (str: string): number | null => {
  if (!str) return null;
  const clean = str.toString().trim().toLowerCase();

  if (clean.includes("km/h")) {
    const kmh = parseFloat(clean.replace(",", ".")) || 0;
    return kmh > 0 ? 3600 / kmh : null;
  }

  const match = clean.match(/(\d{1,2})[':](\d{2})/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  }

  const raw = parseFloat(clean.replace(",", "."));
  if (!isNaN(raw) && raw >= 2 && raw <= 15) {
    const mins = Math.floor(raw);
    const secs = Math.round((raw - mins) * 60);
    return mins * 60 + secs;
  }

  return null;
};

const extractPaceRangeInMetersPerSecond = (
  step: any,
  workoutFallback?: string
): { slowSpeedMs: number; fastSpeedMs: number } | null => {
  let fastSec: number | null = null;
  let slowSec: number | null = null;

  // 1. Détection des champs explicites paceMin et paceMax
  const explicitMin = step.paceMin || step.targetPaceMin || step.minPace;
  const explicitMax = step.paceMax || step.targetPaceMax || step.maxPace;

  if (explicitMin && explicitMax) {
    const s1 = parsePaceStringToSeconds(explicitMin);
    const s2 = parsePaceStringToSeconds(explicitMax);
    if (s1 && s2) {
      fastSec = Math.min(s1, s2);
      slowSec = Math.max(s1, s2);
    }
  } else if (explicitMin || explicitMax) {
    const single = parsePaceStringToSeconds(explicitMin || explicitMax);
    if (single && single >= 120 && single <= 700) {
      fastSec = Math.max(60, single - 5);
      slowSec = single + 5;
    }
  }

  // 2. Détection dans les chaînes de texte concaténées
  if (!fastSec || !slowSec) {
    const textToScan = [
      step.pace,
      step.targetPace,
      step.goalValue,
      step.allure,
      step.targetSpeed,
      step.speed,
      step.description,
      step.title,
      workoutFallback,
    ]
      .filter(Boolean)
      .join(" ");

    const rangeMatch = textToScan.match(/(\d{1,2})[':](\d{2})\s*(?:-|–|—|à|to|\/|\s)\s*(\d{1,2})[':](\d{2})/i);
    if (rangeMatch) {
      const s1 = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
      const s2 = parseInt(rangeMatch[3], 10) * 60 + parseInt(rangeMatch[4], 10);
      fastSec = Math.min(s1, s2);
      slowSec = Math.max(s1, s2);
    } else {
      const singleMatch = textToScan.match(/(\d{1,2})[':](\d{2})/);
      if (singleMatch) {
        const s = parseInt(singleMatch[1], 10) * 60 + parseInt(singleMatch[2], 10);
        if (s >= 120 && s <= 700) {
          fastSec = Math.max(60, s - 5);
          slowSec = s + 5;
        }
      }
    }
  }

  if (fastSec && slowSec && fastSec > 0 && slowSec > 0) {
    return {
      slowSpeedMs: 1000 / slowSec, // vitesse minimale en m/s (allure lente)
      fastSpeedMs: 1000 / fastSec, // vitesse maximale en m/s (allure rapide)
    };
  }

  return null;
};

const getGarminStepType = (type: string) => {
  switch (type) {
    case "echauffement":
      return { stepTypeId: 1, stepTypeKey: "warmup" };
    case "recup":
      return { stepTypeId: 4, stepTypeKey: "recovery" };
    case "retour_calme":
      return { stepTypeId: 2, stepTypeKey: "cooldown" };
    default:
      return { stepTypeId: 3, stepTypeKey: "interval" };
  }
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { email, password, workout, testOnly } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Identifiants Garmin manquants." });
  }

  try {
    const gc = new GarminConnect({ username: email, password: password });
    await gc.login();

    if (testOnly || workout?.title === "Test Connexion") {
      return res.status(200).json({ success: true, message: "Authentification réussie !" });
    }

    if (!workout) {
      return res.status(400).json({ error: "Aucune séance fournie." });
    }

    const workoutTitle = (workout.title || "Séance Volaris").substring(0, 45);
    const workoutDesc = workout.description || "Synchronisé depuis Volaris Running";

    const workoutSteps: any[] = [];
    let stepOrder = 1;

    const buildStepDTO = (step: any, customOrder: number) => {
      const parsed = parseDurationOrDist(
        step.durationOrDist || step.distance || step.duration || ""
      );
      const isTime = parsed.type === "time";

      const paceRange = extractPaceRangeInMetersPerSecond(
        step,
        workout.targetPace || workout.pace || workout.description
      );

      let targetType = {
        workoutTargetTypeId: 1,
        workoutTargetTypeKey: "no.target",
        displayOrder: 1,
        displayable: true,
      };
      let targetValueOne = null;
      let targetValueTwo = null;

      if (paceRange) {
        targetType = {
          workoutTargetTypeId: 6,
          workoutTargetTypeKey: "pace.zone",
          displayOrder: 6,
          displayable: true,
        };
        // Garmin attend des nombres flottants pour targetValueOne (min speed) et targetValueTwo (max speed)
        targetValueOne = paceRange.slowSpeedMs;
        targetValueTwo = paceRange.fastSpeedMs;
      }

      return {
        type: "ExecutableStepDTO",
        stepId: null,
        stepOrder: customOrder,
        stepType: getGarminStepType(step.type),
        childStepId: null,
        description: step.description || null,
        endCondition: {
          conditionTypeId: isTime ? 2 : 3,
          conditionTypeKey: isTime ? "time" : "distance",
          displayOrder: isTime ? 2 : 3,
          displayable: true,
        },
        endConditionValue: parsed.value,
        endConditionCompare: null,
        endConditionZone: null,
        targetType: targetType,
        targetValueOne: targetValueOne,
        targetValueTwo: targetValueTwo,
        zoneNumber: null,
      };
    };

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step: any) => {
        if (step.type === "repeat" && step.nestedSteps) {
          const reps = parseInt(step.reps || step.repeatCount || "1", 10) || 1;
          const repeatSteps: any[] = [];

          step.nestedSteps.forEach((nStep: any) => {
            repeatSteps.push(buildStepDTO(nStep, stepOrder++));
          });

          workoutSteps.push({
            type: "RepeatGroupDTO",
            stepId: null,
            stepOrder: stepOrder++,
            stepType: { stepTypeId: 6, stepTypeKey: "repeat" },
            numberOfIterations: reps,
            workoutSteps: repeatSteps,
            smartRepeat: false,
          });
        } else {
          workoutSteps.push(buildStepDTO(step, stepOrder++));
        }
      });
    } else {
      workoutSteps.push(
        buildStepDTO(
          {
            type: "corps",
            durationOrDist: `${workout.km || 8}km`,
            paceMin: workout.paceMin || workout.targetPaceMin || "",
            paceMax: workout.paceMax || workout.targetPaceMax || "",
            pace: workout.targetPace || workout.pace || "",
          },
          1
        )
      );
    }

    const payload = {
      workoutId: null,
      ownerId: null,
      workoutName: workoutTitle,
      description: workoutDesc,
      sportType: { sportTypeId: 1, sportTypeKey: "running" },
      subSportType: null,
      workoutSegments: [
        {
          segmentOrder: 1,
          sportType: { sportTypeId: 1, sportTypeKey: "running" },
          workoutSteps: workoutSteps,
        },
      ],
    };

    let result: any = null;
    if (typeof gc.addWorkout === "function") {
      result = await gc.addWorkout(payload);
    } else if (typeof gc.post === "function") {
      result = await gc.post(
        "https://connect.garmin.com/modern/proxy/workout-service/workout",
        payload
      );
    } else {
      const res = await gc.client.post(
        "https://connect.garmin.com/modern/proxy/workout-service/workout",
        payload
      );
      result = res.data;
    }

    return res.status(200).json({
      success: true,
      workoutId: result?.workoutId || result?.id || "OK",
      message: `Séance « ${workoutTitle} » synchronisée avec cibles d'allure !`,
    });
  } catch (error: any) {
    console.error("Garmin Sync Error:", error);
    return res.status(400).json({
      error: error?.message || "Erreur de synchronisation.",
    });
  }
}