// @ts-nocheck
// api/sync-coros.ts
import crypto from "crypto";

const md5Hash = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex");
};

const parseDurationOrDist = (val: string): { mode: number; value: number } => {
  const clean = (val || "").toLowerCase().trim();

  // Distance en km -> mètres (COROS mode 2 = Distance en mètres)
  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(km * 1000) };
  }

  // Distance en m -> mètres
  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(m) };
  }

  // Temps en minutes -> secondes (COROS mode 1 = Temps en secondes)
  if (clean.includes("min") || clean.includes("'")) {
    const mins = parseFloat(clean.replace("'", ".")) || 0;
    return { mode: 1, value: Math.round(mins * 60) };
  }

  // Temps en secondes
  if (clean.includes("s") && !clean.includes("min")) {
    const sec = parseFloat(clean) || 0;
    return { mode: 1, value: Math.round(sec) };
  }

  const rawNum = parseFloat(clean) || 0;
  if (rawNum >= 100) {
    return { mode: 2, value: Math.round(rawNum) };
  }
  return { mode: 1, value: Math.round((rawNum || 5) * 60) };
};

const parsePaceToSeconds = (str: string): number | null => {
  if (!str) return null;
  const clean = str.toString().trim().toLowerCase();
  const match = clean.match(/(\d{1,2})[':](\d{2})/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  }
  return null;
};

const getCorosStepType = (type: string) => {
  switch (type) {
    case "echauffement":
      return 1; // Warm up
    case "recup":
      return 3; // Rest / Recovery
    case "retour_calme":
      return 4; // Cool down
    default:
      return 2; // Training / Interval
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
    return res.status(400).json({ error: "Identifiants COROS manquants." });
  }

  try {
    // 1. Authentification COROS
    const pwdMd5 = md5Hash(password);
    const loginRes = await fetch("https://open.coros.com/v2/coros/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: email,
        accountType: 2,
        pwd: pwdMd5,
      }),
    });

    const loginData = await loginRes.json();
    const token = loginData?.data?.accessToken || loginData?.data?.token;

    if (!token && loginData.result !== "0000") {
      throw new Error(loginData?.message || "Identifiants COROS invalides.");
    }

    if (testOnly || workout?.title === "Test Connexion") {
      return res.status(200).json({ success: true, message: "Authentification COROS réussie !" });
    }

    if (!workout) {
      return res.status(400).json({ error: "Aucune séance fournie." });
    }

    // 2. Construction des blocs pour COROS
    const workoutStepList: any[] = [];

    const buildCorosStep = (step: any) => {
      const parsed = parseDurationOrDist(step.durationOrDist || "");
      const fastSec = parsePaceToSeconds(step.paceMin || step.goalValue);
      const slowSec = parsePaceToSeconds(step.paceMax);

      let targetType = 0; // Aucun
      let targetMin = 0;
      let targetMax = 0;

      if (fastSec) {
        targetType = 1; // Allure (Pace en s/km)
        targetMin = fastSec;
        targetMax = slowSec || fastSec + 10;
      }

      return {
        stepType: getCorosStepType(step.type),
        mode: parsed.mode, // 1: Temps (sec), 2: Distance (m)
        targetValue: parsed.value,
        intensityType: targetType,
        intensityMin: targetMin,
        intensityMax: targetMax,
        note: step.description || "",
      };
    };

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step: any) => {
        if (step.type === "repeat" && step.nestedSteps) {
          const reps = parseInt(step.reps || "1", 10) || 1;
          const subSteps = step.nestedSteps.map(buildCorosStep);
          workoutStepList.push({
            stepType: 5, // Repeat group COROS
            repeatCount: reps,
            subStepList: subSteps,
          });
        } else {
          workoutStepList.push(buildCorosStep(step));
        }
      });
    } else {
      workoutStepList.push(
        buildCorosStep({
          type: "corps",
          durationOrDist: `${workout.km || 8}km`,
          paceMin: workout.paceMin,
          paceMax: workout.paceMax,
        })
      );
    }

    // 3. Envoi du workout vers le cloud COROS
    const payload = {
      name: (workout.title || "Séance Volaris").substring(0, 30),
      sportType: 1, // Course à pied
      workoutStepList: workoutStepList,
      description: workout.description || "Synchronisé depuis Volaris Running",
    };

    const syncRes = await fetch("https://open.coros.com/v2/coros/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accessToken": token,
      },
      body: JSON.stringify(payload),
    });

    const syncData = await syncRes.json();

    return res.status(200).json({
      success: true,
      message: `Séance synchronisée sur COROS avec succès !`,
    });
  } catch (error: any) {
    console.error("COROS Sync Error:", error);
    return res.status(400).json({
      error: error?.message || "Erreur lors de la synchronisation COROS.",
    });
  }
}