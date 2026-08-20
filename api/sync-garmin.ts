// @ts-nocheck
// api/sync-garmin.ts
import { GarminConnect } from "garmin-connect";

// 1. Analyse et conversion de la durée ou distance
const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();

  // Distances en km (ex: 10km, 1.5 km, 10 k)
  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(km * 1000) };
  }

  // Distances en mètres (ex: 400m, 1000 m)
  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(m) };
  }

  // Durées en heures (ex: 1h, 1h30)
  if (clean.includes("h")) {
    const parts = clean.split("h");
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    return { type: "time", value: Math.round(hours * 3600 + mins * 60) };
  }

  // Durées en secondes (ex: 45s, 30sec)
  if (clean.includes("s") && !clean.includes("min")) {
    const sec = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(sec) };
  }

  // Durées en minutes (ex: 20min, 15', 10 min)
  if (clean.includes("min") || clean.includes("'")) {
    const mins = parseFloat(clean.replace("'", ".")) || 0;
    return { type: "time", value: Math.round(mins * 60) };
  }

  // Format mm:ss (ex: 04:30)
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

// 2. Analyse et extraction d'une fourchette d'allure (min/km ou km/h) vers des vitesses en m/s pour Garmin
const parsePaceRangeToMetersPerSecond = (
  step: any,
  workoutFallback?: string
): { minSpeed: number; maxSpeed: number } | null => {
  // Liste de tous les champs potentiels où l'allure peut se trouver
  const sources = [
    step.pace,
    step.targetPace,
    step.allure,
    step.targetSpeed,
    step.speed,
    step.target,
    step.intensity,
    step.description,
    step.title,
    workoutFallback,
  ];

  const textToScan = sources.filter(Boolean).join(" ");
  if (!textToScan) return null;

  // Cas 1 : Fourchette d'allure explicite (ex: "4:15 - 4:25", "4'15 à 4'25", "04:10/04:20")
  const rangeMatch = textToScan.match(/(\d+)[':](\d+)\s*(?:-|à|to|\/)\s*(\d+)[':](\d+)/i);
  if (rangeMatch) {
    const fastSec = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
    const slowSec = parseInt(rangeMatch[3], 10) * 60 + parseInt(rangeMatch[4], 10);
    const actualFastSec = Math.min(fastSec, slowSec);
    const actualSlowSec = Math.max(fastSec, slowSec);
    if (actualFastSec > 0 && actualSlowSec > 0) {
      return {
        minSpeed: 1000 / actualSlowSec, // Borne basse en m/s (allure plus lente)
        maxSpeed: 1000 / actualFastSec, // Borne haute en m/s (allure plus rapide)
      };
    }
  }

  // Cas 2 : Allure unique au format min/km (ex: "4:30", "4'30", "4:30 min/km", "@ 4:15")
  const singlePaceMatch = textToScan.match(/(\d{1,2})[':](\d{2})(?:\s*(?:min\/km|\/km|min))?/i);
  if (singlePaceMatch) {
    const min = parseInt(singlePaceMatch[1], 10);
    const sec = parseInt(singlePaceMatch[2], 10);
    // Filtrage pour éviter de confondre une durée avec une allure (ex: allure réaliste entre 2:30 et 10:00 min/km)
    if (min >= 2 && min <= 10 && sec < 60) {
      const paceSec = min * 60 + sec;
      // Tolérance standard de ± 5 secondes au kilomètre pour la cible Garmin
      const slowSec = paceSec + 5;
      const fastSec = Math.max(1, paceSec - 5);
      return {
        minSpeed: 1000 / slowSec,
        maxSpeed: 1000 / fastSec,
      };
    }
  }

  // Cas 3 : Vitesse en km/h (ex: "14.5 km/h", "15km/h")
  const speedMatch = textToScan.match(/(\d+(?:[.,]\d+)?)\s*km\/h/i);
  if (speedMatch) {
    const kmh = parseFloat(speedMatch[1].replace(",", "."));
    if (kmh > 0) {
      const baseMs = kmh / 3.6;
      return {
        minSpeed: baseMs * 0.95,
        maxSpeed: baseMs * 1.05,
      };
    }
  }

  return null;
};

// 3. Typage d'étape Garmin
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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

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

      // Détection de l'allure cible
      const paceRange = parsePaceRangeToMetersPerSecond(
        step,
        workout.targetPace || workout.pace || workout.description
      );

      let targetType = {
        workoutTargetTypeId: 1,
        workoutTargetTypeKey: "no.target",
      };
      let targetValueOne = null;
      let targetValueTwo = null;

      // Type 6 = pace.zone chez Garmin (targetValueOne = min speed, targetValueTwo = max speed)
      if (paceRange && paceRange.minSpeed > 0 && paceRange.maxSpeed > 0) {
        targetType = {
          workoutTargetTypeId: 6,
          workoutTargetTypeKey: "pace.zone",
        };
        targetValueOne = parseFloat(paceRange.minSpeed.toFixed(4));
        targetValueTwo = parseFloat(paceRange.maxSpeed.toFixed(4));
      }

      return {
        type: "ExecutableStepDTO",
        stepId: null,
        stepOrder: customOrder,
        stepType: getGarminStepType(step.type),
        childStepId: null,
        description: step.description || null,
        endCondition: {
          conditionTypeId: isTime ? 2 : 3, // 2 = temps, 3 = distance
          conditionTypeKey: isTime ? "time" : "distance",
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

    const workoutId = result?.workoutId || result?.id || "OK";

    return res.status(200).json({
      success: true,
      workoutId: workoutId,
      message: `Séance « ${workoutTitle} » synchronisée avec cibles d'allure et distances !`,
    });
  } catch (error: any) {
    console.error("Garmin Sync Error:", error);
    return res.status(400).json({
      error: error?.message || "Erreur de synchronisation.",
    });
  }
}