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

// Ordre strict des jours de la semaine (Lundi -> Dimanche)
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

/**
 * Trie les séances par semaine puis par ordre strict du jour (Lundi -> Dimanche)
 */
export const sortWorkoutsByDay = (workouts: Workout[]): Workout[] => {
  return [...workouts].sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    const orderA = a.dayIndex !== undefined && a.dayIndex >= 0 ? a.dayIndex : getDayOrderIndex(a.dayName);
    const orderB = b.dayIndex !== undefined && b.dayIndex >= 0 ? b.dayIndex : getDayOrderIndex(b.dayName);
    return orderA - orderB;
  });
};

export const safeFormatDateFr = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const yearShort = parts[0].length === 4 ? parts[0].substring(2) : parts[0];
  return `${parts[2]}/${parts[1]}/${yearShort}`;
};

export const calculateWeeks = (startStr: string, eventStr: string) => {
  if (!startStr || !eventStr) return 4;
  const start = new Date(startStr);
  const event = new Date(eventStr);
  if (isNaN(start.getTime()) || isNaN(event.getTime())) return 4;
  const diffDays = Math.ceil((event.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);
  return weeks > 0 ? weeks : 1;
};

export const getWeekDateRange = (startStr: string, weekNum: number) => {
  if (!startStr) return "";
  const start = new Date(startStr);
  if (isNaN(start.getTime())) return "";
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startFormatted = safeFormatDateFr(start.toISOString().split("T")[0]);
  const endFormatted = safeFormatDateFr(end.toISOString().split("T")[0]);
  return `Du ${startFormatted} au ${endFormatted}`;
};

export const getExactDayDate = (startStr: string, weekNum: number, dayIndex: number) => {
  if (!startStr) return "";
  const start = new Date(startStr);
  if (isNaN(start.getTime())) return "";
  start.setDate(start.getDate() + (weekNum - 1) * 7 + dayIndex);
  return safeFormatDateFr(start.toISOString().split("T")[0]);
};

export const getCurrentWeekNumber = (startDateStr: string, totalWeeksStr: string) => {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr);
  const now = new Date();
  if (isNaN(start.getTime())) return 1;
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  const weekNum = Math.floor(diffDays / 7) + 1;
  const maxWeeks = parseInt(totalWeeksStr, 10) || 1;
  return weekNum > maxWeeks ? maxWeeks : weekNum;
};

export const getDaysUntilEvent = (eventDateStr: string) => {
  if (!eventDateStr) return null;
  const event = new Date(eventDateStr);
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

/**
 * Convertit une allure ou une fourchette d'allure en secondes par km
 */
export function parsePaceToSeconds(paceStr?: string): number {
  if (!paceStr) return 300; // 5:00 min/km par défaut

  const clean = paceStr.toString().toLowerCase().replace("min/km", "").replace("/km", "").trim();

  // Cas fourchette (ex: "4:15 - 4:25" ou "4'15 à 4'25")
  const rangeMatch = clean.match(/(\d{1,2})[':](\d{2})\s*(?:-|à|to|\/)\s*(\d{1,2})[':](\d{2})/);
  if (rangeMatch) {
    const s1 = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
    const s2 = parseInt(rangeMatch[3], 10) * 60 + parseInt(rangeMatch[4], 10);
    return Math.round((s1 + s2) / 2);
  }

  // Format mm:ss ou m'ss
  const singleMatch = clean.match(/(\d{1,2})[':](\d{2})/);
  if (singleMatch) {
    const mins = parseInt(singleMatch[1], 10) || 0;
    const secs = parseInt(singleMatch[2], 10) || 0;
    return mins * 60 + secs;
  }

  const val = parseFloat(clean.replace("'", "."));
  return !isNaN(val) && val > 0 ? Math.round(val * 60) : 300;
}

/**
 * Récupère l'allure représentative en secondes pour une étape
 */
export function getStepPaceInSeconds(step: WorkoutStep): number {
  if (step.paceMin && step.paceMax) {
    const s1 = parsePaceToSeconds(step.paceMin);
    const s2 = parsePaceToSeconds(step.paceMax);
    return Math.round((s1 + s2) / 2);
  }
  if (step.paceMin) return parsePaceToSeconds(step.paceMin);
  if (step.paceMax) return parsePaceToSeconds(step.paceMax);
  if (step.targetPace) return parsePaceToSeconds(step.targetPace);
  if (step.goalValue) return parsePaceToSeconds(step.goalValue);

  // Valeurs par défaut selon la nature du bloc
  switch (step.type) {
    case "echauffement":
      return 340; // 5:40/km
    case "recup":
    case "retour_calme":
      return 360; // 6:00/km
    case "corps":
      return 270; // 4:30/km
    default:
      return 300;
  }
}

// ==========================================
// VOLUME & STATS CALCULATIONS
// ==========================================

export const calculateWeeklyPlannedKm = (
  workouts: Workout[],
  weekNum: number
): number => {
  return workouts
    .filter((w) => w.weekNumber === weekNum && !w.isRest)
    .reduce((acc, w) => {
      const kmVal = w.km !== undefined && w.km !== null ? parseFloat(String(w.km)) : 0;
      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

export const calculateWeeklyCompletedKm = (
  workouts: Workout[],
  weekNum: number,
  completedMap: Record<string, boolean>
): number => {
  return workouts
    .filter((w) => w.weekNumber === weekNum && !w.isRest && (completedMap[w.id] || w.completed))
    .reduce((acc, w) => {
      const kmVal =
        w.completedKm !== undefined && w.completedKm !== null
          ? parseFloat(String(w.completedKm))
          : parseFloat(String(w.km || "0"));
      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

/**
 * Calcule le kilométrage réalisé sans compter plusieurs fois la même activité Garmin importée
 */
export const calculateWeeklyCompletedKmDeduplicated = (
  workouts: Workout[],
  weekNum: number,
  completedMap: Record<string, boolean>
): number => {
  const seenActivities = new Set<string>();

  return workouts
    .filter((w) => w.weekNumber === weekNum && !w.isRest && (completedMap[w.id] || w.completed))
    .reduce((acc, w) => {
      if (w.importedActivityName) {
        if (seenActivities.has(w.importedActivityName)) {
          return acc;
        }
        seenActivities.add(w.importedActivityName);
      }

      const kmVal =
        w.completedKm !== undefined && w.completedKm !== null
          ? parseFloat(String(w.completedKm))
          : parseFloat(String(w.km || "0"));

      return acc + (isNaN(kmVal) ? 0 : kmVal);
    }, 0);
};

export function calculateStepMetrics(steps?: WorkoutStep[]): { totalKm: number; totalMinutes: number } {
  let totalKm = 0;
  let totalSeconds = 0;

  if (!steps || steps.length === 0) {
    return { totalKm: 0, totalMinutes: 0 };
  }

  steps.forEach((step) => {
    const reps = step.type === "repeat" ? step.reps || 1 : 1;
    let stepKm = 0;
    let stepSec = 0;

    if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
      const nested = calculateStepMetrics(step.nestedSteps);
      stepKm = nested.totalKm * reps;
      stepSec = nested.totalMinutes * 60 * reps;
    } else {
      const rawVal = step.durationOrDist || "";
      const valueNum = parseFloat(rawVal) || 0;
      const paceSec = getStepPaceInSeconds(step);

      if (step.endCondition === "distance") {
        const isMeters = rawVal.toLowerCase().includes("m") && !rawVal.toLowerCase().includes("km");
        stepKm = isMeters ? valueNum / 1000 : valueNum;
        stepSec = stepKm * paceSec;
      } else {
        stepSec = valueNum * 60;
        stepKm = paceSec > 0 ? stepSec / paceSec : 0;
      }
    }

    totalKm += stepKm;
    totalSeconds += stepSec;
  });

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes: Math.round(totalSeconds / 60),
  };
}

// ==========================================
// PHYSIOLOGICAL THRESHOLDS (LT1 / LT2)
// ==========================================

export const calculateThresholds = (
  vma: string,
  r10kRecord: string,
  rSemiRecord: string
) => {
  const vmaNum = parseFloat(vma);
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

  let profile: PaceProfilePoint[] = [];

  steps.forEach((step) => {
    const reps = step.type === "repeat" ? step.reps || 1 : 1;

    for (let r = 0; r < reps; r++) {
      if (step.type === "repeat" && step.nestedSteps && step.nestedSteps.length > 0) {
        profile = profile.concat(generatePaceProfile(step.nestedSteps));
      } else {
        const rawVal = step.durationOrDist || "";
        const valueNum = parseFloat(rawVal) || 0;
        const paceSec = getStepPaceInSeconds(step);

        let durSec = 0;
        if (step.endCondition === "distance") {
          const isMeters = rawVal.toLowerCase().includes("m") && !rawVal.toLowerCase().includes("km");
          const km = isMeters ? valueNum / 1000 : valueNum;
          durSec = km * paceSec;
        } else {
          durSec = valueNum * 60;
        }

        const mins = Math.floor(paceSec / 60);
        const secs = Math.round(paceSec % 60);
        const paceFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

        profile.push({
          label: step.durationOrDist || step.type,
          durationSec: durSec > 0 ? durSec : 60,
          paceSecPerKm: paceSec,
          paceFormatted,
          type: step.type,
        });
      }
    }
  });

  return profile;
}