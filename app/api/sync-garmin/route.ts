// app/api/sync-garmin/route.ts
import { NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";

// --- UTILITAIRES DE CONVERSION DE DUREE ET DISTANCE ---
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

// --- UTILITAIRES DE CONVERSION D'ALLURE (Min:Sec ou km/h -> s/km) ---
const parsePaceStringToSeconds = (str: string): number | null => {
  if (!str) return null;
  const clean = str.toString().trim().toLowerCase();

  if (clean.includes("min de recup") || clean.includes("recup")) {
    return null;
  }

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

  return null;
};

// Extraction de l'allure en m/s (Garmin attend des m/s)
const extractPaceRangeInMetersPerSecond = (
  step: any
): { slowSpeedMs: number; fastSpeedMs: number } | null => {
  let fastSec: number | null = null;
  let slowSec: number | null = null;

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

  if (!fastSec || !slowSec) {
    const textToScan = [
      step.pace,
      step.targetPace,
      step.goalValue,
      step.allure,
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

  if (fastSec && slowSec && fastSec >= 120 && slowSec <= 700) {
    return {
      slowSpeedMs: 1000 / slowSec,
      fastSpeedMs: 1000 / fastSec,
    };
  }

  return null;
};

// --- EXTRACTION ET VALIDE DES ZONES FC (BPM) ---
const extractHrRangeInBpm = (
  step: any
): { minBpm: number; maxBpm: number } | null => {
  let minBpm = parseFloat(step.hrMin || step.targetHrMin || step.minHr || step.fcMin);
  let maxBpm = parseFloat(step.hrMax || step.targetHrMax || step.maxHr || step.fcMax);

  if (!isNaN(minBpm) && !isNaN(maxBpm) && minBpm > 30 && maxBpm <= 230) {
    return {
      minBpm: Math.min(minBpm, maxBpm),
      maxBpm: Math.max(minBpm, maxBpm),
    };
  }

  // Fallback scan dans goalValue ou description si format "140-150 bpm" ou "140-150"
  const textToScan = [step.goalValue, step.description, step.targetHr]
    .filter(Boolean)
    .join(" ");

  const hrMatch = textToScan.match(/(\d{2,3})\s*(?:-|–|—|à|to|\/)\s*(\d{2,3})\s*(?:bpm|fc)?/i);
  if (hrMatch) {
    const b1 = parseInt(hrMatch[1], 10);
    const b2 = parseInt(hrMatch[2], 10);
    if (b1 >= 40 && b1 <= 220 && b2 >= 40 && b2 <= 220) {
      return {
        minBpm: Math.min(b1, b2),
        maxBpm: Math.max(b1, b2),
      };
    }
  }

  return null;
};

// --- MAPPAGE DES TYPES D'ETAPE GARMIN CONNECT ---
const getGarminStepType = (type: string) => {
  switch (type) {
    case "echauffement":
      return { stepTypeId: 1, stepTypeKey: "warmup" };
    case "recup":
    case "recup_marche":
      return { stepTypeId: 4, stepTypeKey: "recovery" };
    case "retour_calme":
      return { stepTypeId: 2, stepTypeKey: "cooldown" };
    default:
      return { stepTypeId: 3, stepTypeKey: "interval" };
  }
};

// --- ROUTE POST PRINCIPALE ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, workout, testOnly } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants Garmin manquants." }, { status: 400 });
    }

    const gc = new GarminConnect({ username: email, password: password });
    await gc.login();

    if (testOnly || workout?.title === "Test Connexion") {
      return NextResponse.json({ success: true, message: "Authentification réussie !" });
    }

    if (!workout) {
      return NextResponse.json({ error: "Aucune séance fournie." }, { status: 400 });
    }

    const workoutTitle = (workout.title || workout.sessionName || "Séance").substring(0, 45);
    const workoutDesc = workout.description || "";

    const workoutSteps: any[] = [];
    let stepOrder = 1;

    const buildStepDTO = (step: any, customOrder: number) => {
      const isLapButton =
        step.endCondition === "lap_button" ||
        (step.durationOrDist || "").toLowerCase().includes("lap") ||
        (step.durationOrDist || "").toLowerCase().includes("bip");

      const parsed = parseDurationOrDist(
        step.durationOrDist || step.distance || step.duration || ""
      );
      const isTime = parsed.type === "time";

      // 1. Détection des cibles (Cible Allure prioritaires, puis Cible FC)
      const paceRange = extractPaceRangeInMetersPerSecond(step);
      const hrRange = extractHrRangeInBpm(step);

      let targetType = {
        workoutTargetTypeId: 1,
        workoutTargetTypeKey: "no.target",
        displayOrder: 1,
        displayable: true,
      };
      let targetValueOne = null;
      let targetValueTwo = null;

      if (step.goalType === "allure" && paceRange) {
        targetType = {
          workoutTargetTypeId: 6,
          workoutTargetTypeKey: "pace.zone",
          displayOrder: 6,
          displayable: true,
        };
        targetValueOne = paceRange.slowSpeedMs;
        targetValueTwo = paceRange.fastSpeedMs;
      } else if (step.goalType === "fc" && hrRange) {
        targetType = {
          workoutTargetTypeId: 4,
          workoutTargetTypeKey: "heart.rate.zone",
          displayOrder: 4,
          displayable: true,
        };
        targetValueOne = hrRange.minBpm;
        targetValueTwo = hrRange.maxBpm;
      } else if (paceRange) { // Fallback si non explicitement précisé mais décelé
        targetType = {
          workoutTargetTypeId: 6,
          workoutTargetTypeKey: "pace.zone",
          displayOrder: 6,
          displayable: true,
        };
        targetValueOne = paceRange.slowSpeedMs;
        targetValueTwo = paceRange.fastSpeedMs;
      } else if (hrRange) {
        targetType = {
          workoutTargetTypeId: 4,
          workoutTargetTypeKey: "heart.rate.zone",
          displayOrder: 4,
          displayable: true,
        };
        targetValueOne = hrRange.minBpm;
        targetValueTwo = hrRange.maxBpm;
      }

      // 2. Gestion du RPE (Injecté dans la description Garmin car non géré comme cible)
      let stepDescription = step.description || "";
      if (step.rpe || step.goalType === "rpe") {
        const rpeVal = step.rpe || step.goalValue;
        if (rpeVal) {
          const rpeText = `[RPE ${rpeVal}/10]`;
          stepDescription = stepDescription ? `${rpeText} ${stepDescription}` : rpeText;
        }
      }

      // 3. Configuration de la condition de fin (Bouton Lap ou Durée/Distance)
      const endConditionObj = isLapButton
        ? {
            conditionTypeId: 1,
            conditionTypeKey: "lap.button",
            displayOrder: 1,
            displayable: true,
          }
        : {
            conditionTypeId: isTime ? 2 : 3,
            conditionTypeKey: isTime ? "time" : "distance",
            displayOrder: isTime ? 2 : 3,
            displayable: true,
          };

      return {
        type: "ExecutableStepDTO",
        stepId: null,
        stepOrder: customOrder,
        stepType: getGarminStepType(step.type),
        childStepId: null,
        description: stepDescription || null,
        endCondition: endConditionObj,
        endConditionValue: isLapButton ? null : parsed.value,
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
        if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
          const reps = parseInt(step.reps || step.repeatCount || "1", 10) || 1;
          const skipLast = Boolean(step.skipLastRecovery);

          const lastNestedIndex = step.nestedSteps.length - 1;
          const lastNested = step.nestedSteps[lastNestedIndex];
          const hasRecoveryAtEnd =
            lastNested &&
            (lastNested.type === "recup" ||
              lastNested.type === "recup_marche" ||
              lastNested.type === "retour_calme");

          if (skipLast && reps > 1 && hasRecoveryAtEnd) {
            const stepsWithoutLastRecovery = step.nestedSteps.slice(0, lastNestedIndex);

            if (reps - 1 === 1) {
              step.nestedSteps.forEach((nStep: any) => {
                workoutSteps.push(buildStepDTO(nStep, stepOrder++));
              });
            } else {
              const repeatSteps: any[] = [];
              step.nestedSteps.forEach((nStep: any) => {
                repeatSteps.push(buildStepDTO(nStep, stepOrder++));
              });
              workoutSteps.push({
                type: "RepeatGroupDTO",
                stepId: null,
                stepOrder: stepOrder++,
                stepType: { stepTypeId: 6, stepTypeKey: "repeat" },
                numberOfIterations: reps - 1,
                workoutSteps: repeatSteps,
                smartRepeat: false,
                skipLastRestStep: false,
              });
            }

            stepsWithoutLastRecovery.forEach((nStep: any) => {
              workoutSteps.push(buildStepDTO(nStep, stepOrder++));
            });
          } else {
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
              smartRepeat: skipLast,
              skipLastRestStep: skipLast,
            });
          }
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
            paceMin: workout.paceMin || "",
            paceMax: workout.paceMax || "",
            rpe: workout.rpe || "",
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
      result = await gc.addWorkout(payload as any);
    } else if (typeof (gc as any).post === "function") {
      result = await (gc as any).post(
        "https://connect.garmin.com/modern/proxy/workout-service/workout",
        payload as any
      );
    } else {
      const res: any = await (gc as any).client.post(
        "https://connect.garmin.com/modern/proxy/workout-service/workout",
        payload as any
      );
      result = res?.data || res;
    }

    return NextResponse.json({
      success: true,
      workoutId: result?.workoutId || result?.id || "OK",
      message: `Séance « ${workoutTitle} » synchronisée avec succès !`,
    });
  } catch (error: any) {
    console.error("Garmin Sync Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la synchronisation Garmin." },
      { status: 400 }
    );
  }
}