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
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 COROS/3.4.0",
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
      const paceTarget = step.paceMin || step.goalValue || step.targetPace || "";
      const noteText = [step.description || step.title || "", paceTarget ? `Allure : ${paceTarget}` : ""]
        .filter(Boolean)
        .join(" - ");

      return {
        stepType: getCorosStepType(step.type),
        mode: parsed.mode,
        targetValue: parsed.value,
        intensityType: 0,
        intensityMin: 0,
        intensityMax: 0,
        note: noteText,
      };
    };

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step: any) => {
        if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
          const reps = parseInt(step.reps || "1", 10) || 1;
          workoutStepList.push({
            stepType: 5,
            repeatCount: reps,
            subStepList: step.nestedSteps.map(buildCorosStep),
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
      userId: userId ? Number(userId) : undefined,
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
          // Format non JSON
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
          errorDetails.push(`[${req.url.split("/").pop()} - HTTP ${status}] : ${detail}`);
        }
      } catch (err: any) {
        errorDetails.push(`Erreur réseau : ${err.message}`);
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