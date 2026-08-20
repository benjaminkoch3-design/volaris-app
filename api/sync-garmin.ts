// api/sync-garmin.ts
import { GarminConnect } from "garmin-connect";

const parseDurationOrDist = (val: string): { type: "time" | "distance"; value: number } => {
  const clean = (val || "").toLowerCase().trim();
  if (clean.includes("min")) {
    const mins = parseFloat(clean) || 0;
    return { type: "time", value: Math.round(mins * 60) }; // secondes
  }
  if (clean.includes("km")) {
    const km = parseFloat(clean) || 0;
    return { type: "distance", value: Math.round(km * 1000) }; // mètres
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
      return res.status(200).json({ success: true, message: "Authentification réussie !" });
    }

    if (!workout) {
      return res.status(400).json({ error: "Aucune séance fournie." });
    }

    const workoutSteps: any[] = [];
    let stepOrder = 1;

    const buildStepDTO = (step: any, customOrder: number) => {
      const parsed = parseDurationOrDist(step.durationOrDist || "");
      const isTime = parsed.type === "time";
      return {
        type: "ExecutableStepDTO",
        stepId: null,
        stepOrder: customOrder,
        stepType: getGarminStepType(step.type),
        childStepId: null,
        description: null,
        endCondition: {
          conditionTypeId: isTime ? 2 : 1,
          conditionTypeKey: isTime ? "time" : "distance",
          displayOrder: isTime ? 2 : 1,
          displayable: true,
        },
        endConditionValue: parsed.value,
        endConditionCompare: null,
        endConditionZone: null,
        targetType: {
          workoutTargetTypeId: 1,
          workoutTargetTypeKey: "no.target",
          displayOrder: 1,
          displayable: true,
        },
        targetValueOne: null,
        targetValueTwo: null,
        zoneNumber: null,
      };
    };

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step: any) => {
        if (step.type === "repeat" && step.nestedSteps) {
          const reps = step.reps || 1;
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
          { type: "corps", durationOrDist: `${workout.km || 8}km` },
          1
        )
      );
    }

    const payload = {
      workoutId: null,
      ownerId: null,
      workoutName: (workout.title || "Séance Volaris").substring(0, 50),
      description: workout.description || "Synchronisé depuis Volaris Running",
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

    // Envoi de l'entraînement
    const response = await gc.client.post(
      "https://connect.garmin.com/workout-service/workout",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "NK": "NT",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    const garminResult = response?.data;
    const workoutId = garminResult?.workoutId || garminResult?.id;

    if (!workoutId && typeof garminResult === "string" && garminResult.includes("<!DOCTYPE")) {
      throw new Error("Garmin a rejeté la requête (session non authentifiée).");
    }

    return res.status(200).json({
      success: true,
      workoutId: workoutId,
      message: `Séance créée avec succès dans Garmin Connect (ID: ${workoutId || "OK"}) !`,
    });
  } catch (error: any) {
    console.error("Garmin Sync Error:", error);
    const errorDetails =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Erreur de synchronisation Garmin";

    return res.status(400).json({
      error: typeof errorDetails === "string" ? errorDetails : JSON.stringify(errorDetails),
    });
  }
}