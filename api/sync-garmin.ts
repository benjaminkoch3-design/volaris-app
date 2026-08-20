// api/sync-garmin.ts
import { GarminConnect } from "garmin-connect";

const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();
  if (clean.includes("min")) {
    const mins = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(mins * 60) };
  }
  if (clean.includes("km")) {
    const km = parseFloat(clean) || 0;
    return { type: "distance", value: Math.round(km * 1000) };
  }
  if (clean.includes("m")) {
    const m = parseFloat(clean) || 0;
    return { type: "distance", value: Math.round(m) };
  }
  return { type: "time", value: 300 };
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
      return res.status(200).json({ success: true, message: "Authentification Garmin réussie !" });
    }

    if (!workout) {
      return res.status(400).json({ error: "Aucune séance fournie." });
    }

    const workoutSteps: any[] = [];
    let stepOrder = 1;

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step: any) => {
        if (step.type === "repeat" && step.nestedSteps) {
          const reps = step.reps || 1;
          const repeatSteps: any[] = [];

          step.nestedSteps.forEach((nStep: any) => {
            const parsed = parseDurationOrDist(nStep.durationOrDist || "");
            repeatSteps.push({
              type: "ExecutableStepDTO",
              stepOrder: stepOrder++,
              stepType: getGarminStepType(nStep.type),
              endCondition: {
                conditionTypeId: parsed.type === "time" ? 2 : 1,
                conditionTypeKey: parsed.type === "time" ? "time" : "distance",
              },
              endConditionValue: parsed.value,
              targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" },
            });
          });

          workoutSteps.push({
            type: "RepeatGroupDTO",
            stepOrder: stepOrder++,
            stepType: { stepTypeId: 6, stepTypeKey: "repeat" },
            numberOfIterations: reps,
            workoutSteps: repeatSteps,
          });
        } else {
          const parsed = parseDurationOrDist(step.durationOrDist || "");
          workoutSteps.push({
            type: "ExecutableStepDTO",
            stepOrder: stepOrder++,
            stepType: getGarminStepType(step.type),
            endCondition: {
              conditionTypeId: parsed.type === "time" ? 2 : 1,
              conditionTypeKey: parsed.type === "time" ? "time" : "distance",
            },
            endConditionValue: parsed.value,
            targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" },
          });
        }
      });
    } else {
      const distMeters = (parseFloat(workout.km || "8") || 8) * 1000;
      workoutSteps.push({
        type: "ExecutableStepDTO",
        stepOrder: 1,
        stepType: { stepTypeId: 3, stepTypeKey: "interval" },
        endCondition: { conditionTypeId: 1, conditionTypeKey: "distance" },
        endConditionValue: distMeters,
        targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" },
      });
    }

    const payload = {
      workoutName: workout.title || "Séance Volaris",
      description: workout.description || "Synchronisé depuis Volaris Running",
      sportType: { sportTypeId: 1, sportTypeKey: "running" },
      workoutSegments: [
        {
          segmentOrder: 1,
          sportType: { sportTypeId: 1, sportTypeKey: "running" },
          workoutSteps: workoutSteps,
        },
      ],
    };

    await gc.client.post("https://connect.garmin.com/workout-service/workout", payload);

    return res.status(200).json({
      success: true,
      message: "Séance synchronisée sur Garmin Connect avec succès !",
    });
  } catch (error: any) {
    console.error("Garmin Sync Error:", error);
    return res.status(401).json({
      error: error?.message || "Identifiants Garmin invalides ou erreur de connexion.",
    });
  }
}