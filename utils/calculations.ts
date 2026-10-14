// app/utils/calculations.ts

import {
  WorkoutType,
  WeekType,
  Workout,
  WorkoutStep,
} from "../types";
import {
  WORKOUT_TYPES_CONFIG,
  WEEK_TYPES_CONFIG,
} from "../constants";

// ==========================================
// CONFIGURATION & HELPER LABELS
// ==========================================

export const getWorkoutTypeConfig = (type?: WorkoutType) => {
  return WORKOUT_TYPES_CONFIG[type || "footing"] || WORKOUT_TYPES_CONFIG.footing;
};

export const getWeekTypeLabel = (typeObj?: { type: WeekType; customLabel?: string }) => {
  if (!typeObj) return "Montée en charge";
  if (typeObj.type === "custom" && typeObj.customLabel) {
    return typeObj.customLabel;
  }
  return WEEK_TYPES_CONFIG[typeObj.type]?.label || "Montée en charge";
};

export const getStepTypeLabel = (type: string) => {
  switch (type) {
    case "echauffement":
      return "Échauffement";
    case "corps":
      return "Course";
    case "recup":
    case "recup_marche":
      return "Récupération";
    case "retour_calme":
      return "Retour au calme";
    case "repeat":
      return "Répétition (boucle)";
    default:
      return "Étape";
  }
};

// ==========================================
// DATE & CALENDAR CALCULATIONS
// ==========================================

export const DAYS_LIST_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export const DAYS_ORDER_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export const getDayOrderIndex = (dayName: string): number => {
  const clean = (dayName || "").trim().toLowerCase();
  const idx = DAYS_ORDER_FR.findIndex(
    (d) => d.toLowerCase() === clean
  );
  return idx !== -1 ? idx : 0;
};

export const getDateObjectForWorkout = (
  startDateStr: string,
  weekNumber: number,
  dayIndex: number
): Date => {
  if (!startDateStr) return new Date();
  const [y, m, d] = startDateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const totalDaysOffset = (weekNumber - 1) * 7 + (dayIndex || 0);
  dateObj.setDate(dateObj.getDate() + totalDaysOffset);
  return dateObj;
};

export const getExactDayName = (
  startDateStr: string,
  weekNumber: number,
  dayIndex: number
): string => {
  const dateObj = getDateObjectForWorkout(startDateStr, weekNumber, dayIndex);
  return DAYS_LIST_FR[dateObj.getDay()] || "Lundi";
};

export const getDayNameFromDate = (dateStr: string): string => {
  if (!dateStr) return "Lundi";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayIndex = dateObj.getDay();
  return DAYS_LIST_FR[dayIndex] || "Lundi";
};

export const getDateForWorkout = (
  startDateStr: string,
  weekNumber: number,
  dayOffset: number
): string => {
  const dateObj = getDateObjectForWorkout(startDateStr, weekNumber, dayOffset);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getExactDayDate = (
  startDateStr: string,
  weekNumber: number,
  dayIndex: number
): string => {
  const dateObj = getDateObjectForWorkout(startDateStr, weekNumber, dayIndex);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yearShort = String(dateObj.getFullYear()).substring(2);
  return `${day}/${month}/${yearShort}`;
};

export const getWeekDateRange = (startDateStr: string, weekNum: number): string => {
  if (!startDateStr) return "";
  const start = getDateObjectForWorkout(startDateStr, weekNum, 0);
  const end = getDateObjectForWorkout(startDateStr, weekNum, 6);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const yearShort = String(date.getFullYear()).substring(2);
    return `${day}/${month}/${yearShort}`;
  };

  return `Du ${formatDate(start)} au ${formatDate(end)}`;
};

export const sortWorkoutsByDay = (workouts: Workout[]): Workout[] => {
  return [...workouts].sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    return (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
  });
};

export const safeFormatDateFr = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const yearShort = parts[0].length === 4 ? parts[0].substring(2) : parts[0];
  return `${parts[2]}/${parts[1]}/${yearShort}`;
};

export const calculateWeeks = (startStr: string, eventStr: string): number => {
  if (!startStr || !eventStr) return 4;
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = eventStr.split("-").map(Number);
  const start = new Date(y1, m1 - 1, d1);
  const event = new Date(y2, m2 - 1, d2);
  if (isNaN(start.getTime()) || isNaN(event.getTime())) return 4;
  const diffDays = Math.ceil((event.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);
  return weeks > 0 ? weeks : 1;
};

export const getCurrentWeekNumber = (startDateStr: string, totalWeeksStr: string): number => {
  if (!startDateStr) return 1;
  const [y, m, d] = startDateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  if (isNaN(start.getTime())) return 1;
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  const weekNum = Math.floor(diffDays / 7) + 1;
  const maxWeeks = parseInt(totalWeeksStr, 10) || 1;
  return weekNum > maxWeeks ? maxWeeks : weekNum;
};

export const getDaysUntilEvent = (eventDateStr: string): number | null => {
  if (!eventDateStr) return null;
  const [y, m, d] = eventDateStr.split("-").map(Number);
  const event = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  event.setHours(0, 0, 0, 0);
  if (isNaN(event.getTime())) return null;
  const diffTime = event.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
};

export const parseYMD = (dateStr: string) => {
  if (!dateStr) return { year: 2026, month: 0, day: 1 };
  const parts = dateStr.split("T")[0].split("-").map((p) => parseInt(p, 10));
  return {
    year: parts[0] || 2026,
    month: (parts[1] || 1) - 1,
    day: parts[2] || 1,
  };
};

export const getISOWeekNumberFromParts = (
  year: number,
  month: number,
  day: number
): number => {
  const d = new Date(Date.UTC(year, month, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const getISOWeeksForMonth = (year: number, monthIndex: number): number[] => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const weeksSet = new Set<number>();

  for (let day = 1; day <= lastDay; day++) {
    const w = getISOWeekNumberFromParts(year, monthIndex, day);
    weeksSet.add(w);
  }

  return Array.from(weeksSet).sort((a, b) => a - b);
};

// ==========================================
// PACE, SPEED & TIME PARSING
// ==========================================

export const parseTimeToHours = (str: string): number | null => {
  if (!str) return null;
  const parts = str.trim().split(":").map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 2) {
    return (parts[0] + parts[1] / 60) / 60;
  } else if (parts.length === 3) {
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }
  return null;
};

export const formatPaceFromSpeed = (speedKmH: number): string => {
  if (!speedKmH || speedKmH <= 0) return "-";
  const totalSecondsPerKm = Math.round(3600 / speedKmH);
  const mins = Math.floor(totalSecondsPerKm / 60);
  const secs = totalSecondsPerKm % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export function parsePaceToSeconds(paceStr?: string): number {
  if (!paceStr) return 300;

  const clean = paceStr
    .toString()
    .toLowerCase()
    .replace("min/km", "")
    .replace("/km", "")
    .replace(",", ".")
    .trim();

  const rangeMatch = clean.match(/(\d{1,2})[':](\d{2})\s*(?:-|à|to|\/)\s*(\d{1,2})[':](\d{2})/);
  if (rangeMatch) {
    const s1 = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
    const s2 = parseInt(rangeMatch[3], 10) * 60 + parseInt(rangeMatch[4], 10);
    return Math.round((s1 + s2) / 2);
  }

  const singleMatch = clean.match(/(\d{1,2})[':](\d{2})/);
  if (singleMatch) {
    const mins = parseInt(singleMatch[1], 10) || 0;
    const secs = parseInt(singleMatch[2], 10) || 0;
    return mins * 60 + secs;
  }

  const val = parseFloat(clean.replace("'", "."));
  return !isNaN(val) && val > 0 ? Math.round(val * 60) : 300;
}

export function getStepPaceInSeconds(step: WorkoutStep): number {
  const pMin = step.paceMin ? parsePaceToSeconds(step.paceMin) : null;
  const pMax = step.paceMax ? parsePaceToSeconds(step.paceMax) : null;

  if (pMin !== null && pMax !== null) {
    return Math.round((pMin + pMax) / 2);
  }
  if (pMin !== null) return pMin;
  if (pMax !== null) return pMax;
  if (step.targetPace) return parsePaceToSeconds(step.targetPace);
  if (step.goalValue) return parsePaceToSeconds(step.goalValue);

  switch (step.type) {
    case "echauffement":
      return 340; // 5:40 /km
    case "recup":
    case "recup_marche":
    case "retour_calme":
      return 360; // 6:00 /km
    case "corps":
      return 270; // 4:30 /km
    default:
      return 300; // 5:00 /km
  }
}

// Convertisseur précis durée / distance avec support du bouton Lap
export function parseStepMetricsValues(
  rawVal: string,
  endCondition?: "distance" | "temps" | "lap_button" | string
): { km: number; seconds: number; hasParsed: boolean } {
  // Prise en charge du bouton Lap : allocation nominale indicative de 2 min
  if (
    endCondition === "lap_button" ||
    (rawVal && rawVal.toLowerCase().includes("lap")) ||
    (rawVal && rawVal.toLowerCase().includes("bip"))
  ) {
    return { km: 0, seconds: 120, hasParsed: true };
  }

  if (!rawVal) return { km: 0, seconds: 0, hasParsed: false };

  const str = rawVal.trim().toLowerCase().replace(",", ".");
  const numMatch = str.match(/[\d.]+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 0;

  if (isNaN(num) || num <= 0) return { km: 0, seconds: 0, hasParsed: false };

  const isDist =
    endCondition === "distance" ||
    str.includes("km") ||
    (str.includes("m") && !str.includes("min") && !str.includes("sec") && !str.includes("s"));

  if (isDist) {
    let km = 0;
    if (str.includes("km")) {
      km = num;
    } else {
      km = num >= 50 ? num / 1000 : num;
    }
    return { km, seconds: 0, hasParsed: true };
  } else {
    let seconds = 0;
    if (str.endsWith("s") || str.endsWith("sec")) {
      seconds = num;
    } else if (str.endsWith("h")) {
      seconds = num * 3600;
    } else {
      seconds = num * 60;
    }
    return { km: 0, seconds, hasParsed: true };
  }
}

// ==========================================
// VOLUME & STATS CALCULATIONS
// ==========================================

export function calculateStepMetrics(steps?: WorkoutStep[]): { totalKm: number; totalMinutes: number } {
  let totalKm = 0;
  let totalSeconds = 0;

  if (!steps || steps.length === 0) {
    return { totalKm: 0, totalMinutes: 0 };
  }

  const computeSingleStep = (step: WorkoutStep) => {
    const paceSec = getStepPaceInSeconds(step);
    const { km, seconds, hasParsed } = parseStepMetricsValues(step.durationOrDist || "", step.endCondition);

    if (hasParsed) {
      if (km > 0) {
        totalKm += km;
        totalSeconds += km * paceSec;
      } else if (seconds > 0) {
        totalSeconds += seconds;
        totalKm += paceSec > 0 ? seconds / paceSec : 0;
      }
    }
  };

  const processStepList = (stepList: WorkoutStep[]) => {
    stepList.forEach((step) => {
      if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
        const reps = Math.max(1, parseInt(String(step.reps || "1"), 10) || 1);
        const skipLast = Boolean(step.skipLastRecovery);

        for (let r = 0; r < reps; r++) {
          const isLastIteration = r === reps - 1;

          step.nestedSteps.forEach((nested, nIdx) => {
            const isLastSubStep = nIdx === step.nestedSteps!.length - 1;

            if (
              isLastIteration &&
              isLastSubStep &&
              skipLast &&
              (nested.type === "recup" || nested.type === "recup_marche" || nested.type === "retour_calme")
            ) {
              return;
            }

            if (nested.type === "repeat") {
              processStepList([nested]);
            } else {
              computeSingleStep(nested);
            }
          });
        }
      } else if (step.type !== "repeat") {
        computeSingleStep(step);
      }
    });
  };

  processStepList(steps);

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes: Math.round(totalSeconds / 60),
  };
}

export const calculateWeeklyPlannedKm = (
  workouts: Workout[],
  weekNum: number
): number => {
  return workouts
    .filter((w) => Number(w.weekNumber) === Number(weekNum) && !w.isRest)
    .reduce((acc, w) => {
      let kmVal = 0;
      if (w.km !== undefined && w.km !== null && String(w.km).trim() !== "") {
        kmVal = parseFloat(String(w.km).replace(",", "."));
      } else if (w.steps && w.steps.length > 0) {
        kmVal = calculateStepMetrics(w.steps).totalKm;
      }
      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

export const calculateWeeklyCompletedKm = (
  workouts: Workout[],
  weekNum: number,
  completedMap: Record<string, boolean>
): number => {
  return workouts
    .filter((w) => Number(w.weekNumber) === Number(weekNum) && !w.isRest && (completedMap[w.id] || w.completed))
    .reduce((acc, w) => {
      const kmVal =
        w.completedKm !== undefined && w.completedKm !== null
          ? parseFloat(String(w.completedKm).replace(",", "."))
          : parseFloat(String(w.km || "0").replace(",", "."));
      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

export const calculateWeeklyCompletedKmDeduplicated = (
  workouts: Workout[],
  weekNum: number,
  completedMap: Record<string, boolean>
): number => {
  const seenActivities = new Set<string>();

  return workouts
    .filter((w) => Number(w.weekNumber) === Number(weekNum) && !w.isRest && (completedMap[w.id] || w.completed))
    .reduce((acc, w) => {
      if (w.importedActivityName) {
        if (seenActivities.has(w.importedActivityName)) {
          return acc;
        }
        seenActivities.add(w.importedActivityName);
      }

      const kmVal =
        w.completedKm !== undefined && w.completedKm !== null
          ? parseFloat(String(w.completedKm).replace(",", "."))
          : parseFloat(String(w.km || "0").replace(",", "."));

      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

// ==========================================
// PHYSIOLOGICAL THRESHOLDS (LT1 / LT2)
// ==========================================

export const calculateThresholds = (
  vma: string,
  r10kRecord: string,
  rSemiRecord: string
) => {
  const vmaNum = parseFloat(vma.replace(",", "."));
  if (!vmaNum || isNaN(vmaNum) || vmaNum <= 0) return null;

  const t10 = parseTimeToHours(r10kRecord);
  const tSemi = parseTimeToHours(rSemiRecord);

  if (!t10 || !tSemi || t10 <= 0 || tSemi <= 0) {
    const lt2Pct = 90.0;
    const lt1Pct = 78.0;
    const lt2Speed = 0.9 * vmaNum;
    const lt1Speed = 0.78 * vmaNum;

    return {
      isFallback: true,
      ie: null,
      lt2Pct: lt2Pct.toFixed(1),
      lt2Speed: lt2Speed.toFixed(1),
      lt2Pace: formatPaceFromSpeed(lt2Speed),
      lt1Pct: lt1Pct.toFixed(1),
      lt1Speed: lt1Speed.toFixed(1),
      lt1Pace: formatPaceFromSpeed(lt1Speed),
      ecart: (lt2Pct - lt1Pct).toFixed(1),
    };
  }

  const vitesse10 = 10 / t10;
  const vitesseSemi = 21.0975 / tSemi;

  const pctVMA10 = (vitesse10 / vmaNum) * 100;
  const pctVMASemi = (vitesseSemi / vmaNum) * 100;

  const ie = pctVMA10 - pctVMASemi;

  const lt2Pct = 0.7 * pctVMA10 + 0.3 * pctVMASemi;

  let ecart = 11;
  if (ie < 3) {
    ecart = 8;
  } else if (ie < 5) {
    ecart = 9;
  } else if (ie < 7) {
    ecart = 10;
  }

  const lt1Pct = lt2Pct - ecart;

  const lt2Speed = (lt2Pct / 100) * vmaNum;
  const lt1Speed = (lt1Pct / 100) * vmaNum;

  return {
    isFallback: false,
    ie: ie.toFixed(2),
    lt2Pct: lt2Pct.toFixed(1),
    lt2Speed: lt2Speed.toFixed(1),
    lt2Pace: formatPaceFromSpeed(lt2Speed),
    lt1Pct: lt1Pct.toFixed(1),
    lt1Speed: lt1Speed.toFixed(1),
    lt1Pace: formatPaceFromSpeed(lt1Speed),
    ecart,
  };
};

export interface PaceProfilePoint {
  label: string;
  durationSec: number;
  paceSecPerKm: number;
  paceFormatted: string;
  type: string;
}

export function generatePaceProfile(steps?: WorkoutStep[]): PaceProfilePoint[] {
  if (!steps || steps.length === 0) return [];

  const profile: PaceProfilePoint[] = [];

  const pushPoint = (step: WorkoutStep) => {
    const paceSec = getStepPaceInSeconds(step);
    const { km, seconds, hasParsed } = parseStepMetricsValues(
      step.durationOrDist || "",
      step.endCondition
    );

    let durSec = 60;
    if (hasParsed) {
      if (km > 0) {
        durSec = km * paceSec;
      } else if (seconds > 0) {
        durSec = seconds;
      }
    }

    const mins = Math.floor(paceSec / 60);
    const secs = Math.round(paceSec % 60);
    const paceFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    const labelText =
      step.endCondition === "lap_button"
        ? "Bouton Lap"
        : step.durationOrDist || getStepTypeLabel(step.type);

    profile.push({
      label: labelText,
      durationSec: durSec > 0 ? Math.round(durSec) : 60,
      paceSecPerKm: paceSec,
      paceFormatted,
      type: step.type,
    });
  };

  const processStepList = (stepList: WorkoutStep[]) => {
    stepList.forEach((step) => {
      if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
        const reps = Math.max(1, parseInt(String(step.reps || "1"), 10) || 1);
        const skipLast = Boolean(step.skipLastRecovery);

        for (let r = 0; r < reps; r++) {
          const isLastIteration = r === reps - 1;

          step.nestedSteps.forEach((nested, nIdx) => {
            const isLastSubStep = nIdx === step.nestedSteps!.length - 1;

            if (
              isLastIteration &&
              isLastSubStep &&
              skipLast &&
              (nested.type === "recup" || nested.type === "recup_marche" || nested.type === "retour_calme")
            ) {
              return;
            }

            if (nested.type === "repeat") {
              processStepList([nested]);
            } else {
              pushPoint(nested);
            }
          });
        }
      } else if (step.type !== "repeat") {
        pushPoint(step);
      }
    });
  };

  processStepList(steps);

  return profile;
}