// @ts-nocheck
// app/api/sync-coros/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const md5Hash = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex");
};

const parseDurationOrDist = (val: string): { mode: number; value: number } => {
  const clean = (val || "").toLowerCase().trim();

  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(km * 1000) };
  }

  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(m) };
  }

  if (clean.includes("min") || clean.includes("'")) {
    const mins = parseFloat(clean.replace("'", ".")) || 0;
    return { mode: 1, value: Math.round(mins * 60) };
  }

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
      return 1;
    case "recup":
      return 3;
    case "retour_calme":
      return 4;
    default:
      return 2;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, workout, testOnly } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants COROS manquants." }, { status: 400 });
    }

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
      return NextResponse.json({ success: true, message: "Authentification COROS réussie !" });
    }

    if (!workout) {
      return NextResponse.json({ error: "Aucune séance fournie." }, { status: 400 });
    }

    // UTILISATION DU TITRE RÉEL SANS MENTION VOLARIS
    const workoutTitle = (workout.title || workout.sessionName || "Séance").substring(0, 30);

    const workoutStepList: any[] = [];

    const buildCorosStep = (step: any) => {
      const parsed = parseDurationOrDist(step.durationOrDist || "");
      const fastSec = parsePaceToSeconds(step.paceMin || step.goalValue);
      const slowSec = parsePaceToSeconds(step.paceMax);

      let targetType = 0;
      let targetMin = 0;
      let targetMax = 0;

      if (fastSec) {
        targetType = 1;
        targetMin = fastSec;
        targetMax = slowSec || fastSec + 10;
      }

      return {
        stepType: getCorosStepType(step.type),
        mode: parsed.mode,
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
            stepType: 5,
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

    const payload = {
      name: workoutTitle,
      sportType: 1,
      workoutStepList: workoutStepList,
      description: workout.description || "",
    };

    await fetch("https://open.coros.com/v2/coros/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accessToken: token,
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: true,
      message: `Séance « ${workoutTitle} » synchronisée sur COROS !`,
    });
  } catch (error: any) {
    console.error("COROS Sync Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la synchronisation COROS." },
      { status: 400 }
    );
  }
}