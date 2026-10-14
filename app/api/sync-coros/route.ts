// @ts-nocheck
// app/api/sync-coros/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const md5Hash = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
};

// Mode COROS : 1 = Temps (sec), 2 = Distance (m), 6 = Manuel / Lap
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

// 100 000 / secPerKm = cm/s
const paceSecToCmPerSec = (secPerKm: number): number => {
  if (!secPerKm || secPerKm <= 0) return 0;
  return Math.round(100000 / secPerKm);
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
      return NextResponse.json(
        { error: "Identifiants COROS manquants." },
        { status: 400 }
      );
    }

    const pwdMd5 = md5Hash(password);

    const baseHeaders = {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      origin: "https://training.coros.com",
      referer: "https://training.coros.com/",
    };

    const loginPayload = JSON.stringify({
      account: email,
      accountType: 2,
      pwd: pwdMd5,
    });

    const candidateHosts = [
      "https://teameuapi.coros.com",
      "https://teamapi.coros.com",
    ];

    let token = null;
    let userId = null;
    let successfulHost = candidateHosts[0];
    let lastError = null;

    // 1. Authentification
    for (const host of candidateHosts) {
      try {
        const res = await fetch(`${host}/account/login`, {
          method: "POST",
          headers: baseHeaders,
          body: loginPayload,
        });
        const data = await res.json();
        if (
          (data?.result === "0000" || data?.code === "0000") &&
          (data?.data?.accessToken || data?.data?.token)
        ) {
          token = data.data.accessToken || data.data.token;
          userId = data.data.userId || data.data.id || data.data.account;
          successfulHost = host;
          break;
        } else if (data?.message) {
          lastError = data.message;
        }
      } catch (e) {
        // Essai sur le host suivant
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: lastError || "Identifiants COROS invalides ou rejetés." },
        { status: 401 }
      );
    }

    if (testOnly || workout?.title === "Test Connexion") {
      return NextResponse.json({ success: true, message: "Connexion COROS validée !" });
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

      let intensityType = 0;
      let intensityMin = 0;
      let intensityMax = 0;

      // COROS exige que intensityMin <= intensityMax
      if (fastSec && fastSec > 0) {
        intensityType = 1;
        const speedFast = paceSecToCmPerSec(fastSec);
        const speedSlow =
          slowSec && slowSec > fastSec
            ? paceSecToCmPerSec(slowSec)
            : paceSecToCmPerSec(fastSec + 10);

        intensityMin = Math.min(speedFast, speedSlow);
        intensityMax = Math.max(speedFast, speedSlow);
      }

      return {
        stepType: getCorosStepType(step.type),
        mode: parsed.mode,
        targetValue: parsed.value,
        intensityType: intensityType,
        intensityMin: intensityMin,
        intensityMax: intensityMax,
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
              const subList = step.nestedSteps.map(buildCorosStep);
              workoutStepList.push({
                stepType: 5,
                repeatCount: reps - 1,
                subStepList: subList,
              });
            }

            const stepsWithoutLastRecovery = step.nestedSteps.slice(0, lastNestedIndex);
            stepsWithoutLastRecovery.forEach((nStep: any) => {
              workoutStepList.push(buildCorosStep(nStep));
            });
          } else {
            const subList = step.nestedSteps.map(buildCorosStep);
            workoutStepList.push({
              stepType: 5,
              repeatCount: reps,
              subStepList: subList,
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

    const authHeaders = {
      ...baseHeaders,
      accesstoken: token,
      accessToken: token,
    };

    const workoutCore = {
      name: workoutTitle,
      sportType: 1,
      workoutType: 1,
      workoutStepList: workoutStepList,
      description: workout.description || "",
    };

    const endpointsToTry = [
      {
        url: `${successfulHost}/workout/save`,
        body: workoutCore,
      },
      {
        url: `${successfulHost}/training/save`,
        body: workoutCore,
      },
      {
        url: `${successfulHost}/workout/save`,
        body: { workout: workoutCore },
      },
    ];

    let saveSuccess = false;
    let errorDetails: string[] = [];

    for (const req of endpointsToTry) {
      try {
        const res = await fetch(req.url, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(req.body),
        });

        const status = res.status;
        if (status === 404) continue;

        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          // pas du json
        }

        const isOk =
          status === 200 &&
          (data?.result === "0000" ||
            data?.code === "0000" ||
            data?.message === "OK" ||
            data?.message === "success" ||
            Boolean(data?.data?.workoutId) ||
            Boolean(data?.data?.id) ||
            (data?.data && typeof data?.data !== "object"));

        if (isOk) {
          saveSuccess = true;
          break;
        } else {
          const detail = data?.message || data?.result || data?.code || text.slice(0, 100);
          errorDetails.push(`[${req.url.split("/").pop()} - HTTP ${status}]: ${detail}`);
        }
      } catch (err: any) {
        errorDetails.push(`Erreur: ${err.message}`);
      }
    }

    if (!saveSuccess) {
      throw new Error(errorDetails.join(" | ") || "Rejet de la séance par COROS.");
    }

    return NextResponse.json({
      success: true,
      message: `Séance « ${workoutTitle} » ajoutée à votre bibliothèque d'entraînements COROS !`,
    });
  } catch (error: any) {
    console.error("COROS Sync Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la synchronisation COROS." },
      { status: 400 }
    );
  }
}