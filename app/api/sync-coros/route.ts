// @ts-nocheck
// app/api/sync-coros/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const md5Hash = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex");
};

// Mode COROS : 1 = Temps (sec), 2 = Distance (m), 6 = Touche Lap / Manuel
const parseDurationOrDist = (
  val: string,
  endCondition?: string
): { mode: number; value: number } => {
  if (
    endCondition === "lap_button" ||
    (val && val.toLowerCase().includes("lap")) ||
    (val && val.toLowerCase().includes("bip"))
  ) {
    return { mode: 6, value: 0 };
  }

  const clean = (val || "").toLowerCase().trim();

  if (clean.includes("km") || (clean.endsWith("k") && !clean.includes("min"))) {
    const km = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(km * 1000) };
  }

  if (clean.includes("m") && !clean.includes("min")) {
    const m = parseFloat(clean.replace(",", ".")) || 0;
    return { mode: 2, value: Math.round(m) };
  }

  if (clean.includes("h")) {
    const parts = clean.split("h");
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    return { mode: 1, value: Math.round(hours * 3600 + mins * 60) };
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
    case "recup_marche":
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

    // En-têtes pour éviter les rejets bot/WAF
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    };

    const loginPayload = JSON.stringify({
      account: email,
      accountType: 2,
      pwd: pwdMd5,
    });

    // Test de l'endpoint principal avec fallback sur le serveur Europe
    const endpoints = [
      "https://open.coros.com/v2/coros/account/login",
      "https://open-eu.coros.com/v2/coros/account/login",
      "https://teamcn.coros.com/v2/coros/account/login"
    ];

    let loginData = null;
    let successfulBaseUrl = "https://open.coros.com";

    for (const url of endpoints) {
      try {
        const loginRes = await fetch(url, {
          method: "POST",
          headers,
          body: loginPayload,
        });

        const rawText = await loginRes.text();
        if (rawText && rawText.trim().startsWith("{")) {
          const parsed = JSON.parse(rawText);
          if (parsed?.data?.accessToken || parsed?.data?.token || parsed.result === "0000") {
            loginData = parsed;
            successfulBaseUrl = new URL(url).origin;
            break;
          } else if (!loginData) {
            loginData = parsed; // Conserver la réponse pour message d'erreur si échec
          }
        }
      } catch (err) {
        // Poursuite vers l'endpoint suivant
      }
    }

    if (!loginData) {
      return NextResponse.json(
        { error: "Impossible de joindre les serveurs COROS (réponse vide ou bloquée)." },
        { status: 502 }
      );
    }

    const token = loginData?.data?.accessToken || loginData?.data?.token;

    if (!token && loginData.result !== "0000") {
      return NextResponse.json(
        { error: loginData?.message || "Identifiants COROS invalides ou compte non reconnu." },
        { status: 401 }
      );
    }

    if (testOnly || workout?.title === "Test Connexion") {
      return NextResponse.json({ success: true, message: "Connexion COROS réussie !" });
    }

    if (!workout) {
      return NextResponse.json({ error: "Aucune séance fournie." }, { status: 400 });
    }

    const workoutTitle = (workout.title || workout.sessionName || "Séance").substring(0, 30);
    const workoutStepList: any[] = [];

    const buildCorosStep = (step: any) => {
      const parsed = parseDurationOrDist(step.durationOrDist || "", step.endCondition);
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
        if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
          const reps = parseInt(step.reps || "1", 10) || 1;
          const skipLast = Boolean(step.skipLastRecovery);

          const lastNestedIndex = step.nestedSteps.length - 1;
          const lastNested = step.nestedSteps[lastNestedIndex];
          const hasRecoveryAtEnd =
            lastNested &&
            (lastNested.type === "recup" ||
              lastNested.type === "recup_marche" ||
              lastNested.type === "retour_calme");

          if (skipLast && reps > 1 && hasRecoveryAtEnd) {
            if (reps - 1 === 1) {
              step.nestedSteps.forEach((nStep: any) => {
                workoutStepList.push(buildCorosStep(nStep));
              });
            } else {
              workoutStepList.push({
                stepType: 5,
                repeatCount: reps - 1,
                subStepList: step.nestedSteps.map(buildCorosStep),
              });
            }

            const stepsWithoutLastRecovery = step.nestedSteps.slice(0, lastNestedIndex);
            stepsWithoutLastRecovery.forEach((nStep: any) => {
              workoutStepList.push(buildCorosStep(nStep));
            });
          } else {
            workoutStepList.push({
              stepType: 5,
              repeatCount: reps,
              subStepList: step.nestedSteps.map(buildCorosStep),
            });
          }
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

    const createRes = await fetch(`${successfulBaseUrl}/v2/coros/workout`, {
      method: "POST",
      headers: {
        ...headers,
        accessToken: token,
      },
      body: JSON.stringify(payload),
    });

    const createRaw = await createRes.text();
    let createData: any = {};
    if (createRaw && createRaw.trim().startsWith("{")) {
      createData = JSON.parse(createRaw);
    }

    if (createData.result && createData.result !== "0000") {
      throw new Error(createData?.message || "Erreur lors de la création de la séance sur COROS.");
    }

    return NextResponse.json({
      success: true,
      message: `Séance « ${workoutTitle} » synchronisée sur COROS !`,
    });
  } catch (error: any) {
    console.error("COROS Sync Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de communication avec COROS." },
      { status: 400 }
    );
  }
}