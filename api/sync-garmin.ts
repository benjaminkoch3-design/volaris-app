// @ts-nocheck
// api/sync-garmin.ts
import { GarminConnect } from "garmin-connect";

// Convertit la durée / distance Volaris en valeur exploitable par Garmin
const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();

  // Détection des distances en km (ex: 10km, 1.5 km, 10 k)
  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(km * 1000) };
  }

  // Détection des distances en mètres (ex: 400m, 1000 m)
  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { type: "distance", value: Math.round(m) };
  }

  // Détection des durées en heures (ex: 1h, 1h30)
  if (clean.includes("h")) {
    const parts = clean.split("h");
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    return { type: "time", value: Math.round(hours * 3600 + mins * 60) };
  }

  // Détection des durées en secondes (ex: 45s, 30sec)
  if (clean.includes("s") && !clean.includes("min")) {
    const sec = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(sec) };
  }

  // Détection des durées en minutes (ex: 20min, 15', 10 min)
  if (clean.includes("min") || clean.includes("'")) {
    const mins = parseFloat(clean.replace("'", ".")) || 0;
    return { type: "time", value: Math.round(mins * 60) };
  }

  // Format mm:ss (ex: 04:30)
  if (clean.includes(":")) {
    const [min, sec] = clean.split(":").map((v) => parseFloat(v) || 0);
    return { type: "time", value: Math.round(min * 60 + sec) };
  }

  // Par défaut : si c'est un nombre >= 100 on considère que ce sont des mètres, sinon des minutes
  const rawNum = parseFloat(clean) || 0;
  if (rawNum >= 100) {
    return { type: "distance", value: Math.round(rawNum) };
  }
  return { type: "time", value: Math.round((rawNum || 5) * 60) };
};

// Convertit une allure (min/km ou km/h) en vitesse m/s pour Garmin
const parsePaceToMetersPerSecond = (paceStr: string): number | null => {
  if (!paceStr) return null;
  const clean = paceStr.toString().toLowerCase().trim();

  // Si c'est déjà en km/h (ex: "14 km/h" ou "14.5")
  if (clean.includes("km/h")) {
    const speedKmh = parseFloat(clean.replace(",", ".")) || 0;
    return speedKmh > 0 ? speedKmh / 3.6 : null;
  }

  // Si c'est au format "4:30", "4'30" ou "04:30 min/km"
  const paceMatch = clean.match(/(\d+)[':](\d+)/);
  if (paceMatch) {
    const mins = parseInt(paceMatch[1], 10);
    const secs = parseInt(paceMatch[2], 10);
    const totalSecPerKm = mins * 60 + secs;
    return totalSecPerKm > 0 ? 1000 / totalSecPerKm : null;
  }

  const numericSpeed = parseFloat(clean.replace(",", "."));
  if (!isNaN(numericSpeed) && numericSpeed > 0) {
    // Si la valeur est entre 6 et 25, c'est probablement des km/h
    if (numericSpeed >= 6 && numericSpeed <= 25) {
      return numericSpeed / 3.6;
    }
  }

  return null;
};

// Types d'étapes Garmin
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
      const parsed = parseDurationOrDist(step.durationOrDist || step.distance || step.duration || "");
      const isTime = parsed.type === "time";

      // Analyse de l'allure cible
      const rawPace = step.targetPace || step.pace || step.speed || step.targetSpeed || "";
      const baseSpeedMs = parsePaceToMetersPerSecond(rawPace);

      let targetType = {
        workoutTargetTypeId: 1,
        workoutTargetTypeKey: "no.target",
      };
      let targetValueOne = null;
      let targetValueTwo = null;

      if (baseSpeedMs && baseSpeedMs > 0) {
        targetType = {
          workoutTargetTypeId: 6,
          workoutTargetTypeKey: "pace.zone",
        };
        // Marge de tolérance de ± 5% pour l'allure cible
        targetValueOne = parseFloat((baseSpeedMs * 0.95).toFixed(3)); // Borne basse (m/s)
        targetValueTwo = parseFloat((baseSpeedMs * 1.05).toFixed(3)); // Borne haute (m/s)
      }

      return {
        type: "ExecutableStepDTO",
        stepId: null,
        stepOrder: customOrder,
        stepType: getGarminStepType(step.type),
        childStepId: null,
        description: step.description || null,
        endCondition: {
          conditionTypeId: isTime ? 2 : 3, // 2 = TIME, 3 = DISTANCE chez Garmin
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
            targetPace: workout.targetPace || workout.pace || "",
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
      result = await gc.post("https://connect.garmin.com/modern/proxy/workout-service/workout", payload);
    } else {
      const res = await gc.client.post("https://connect.garmin.com/modern/proxy/workout-service/workout", payload);
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