// src/utils/vdot.ts

import { parseTimeToHours } from "./calculations";

export interface PerformanceScore {
  distanceLabel: string;
  distanceMeters: number;
  timeFormatted: string;
  timeSeconds: number;
  vdot: number;
  runningScore: number;
}

/**
 * Convertit un chrono (ex: "16:50", "41:30", "1:32:00") en secondes totales.
 * Réutilise parseTimeToHours pour la cohérence.
 */
export function parseTimeToSeconds(timeStr: string): number {
  const hours = parseTimeToHours(timeStr);
  if (!hours || isNaN(hours) || hours <= 0) return 0;
  return Math.round(hours * 3600);
}

/**
 * Mappage des clefs de records et libellés vers la distance en mètres.
 */
export const RECORD_DISTANCES_METERS: Record<
  string,
  { label: string; meters: number }
> = {
  r400: { label: "400m", meters: 400 },
  r800: { label: "800m", meters: 800 },
  r1500: { label: "1500m", meters: 1500 },
  r3000: { label: "3000m", meters: 3000 },
  r5k: { label: "5 km", meters: 5000 },
  r10k: { label: "10 km", meters: 10000 },
  rSemi: { label: "Semi-Marathon", meters: 21097.5 },
  rMarathon: { label: "Marathon", meters: 42195 },
};

/**
 * Calcule la consommation d'oxygène (VO2 en ml/kg/min) pour une vitesse donnée.
 * Formule Jack Daniels & Jimmy Gilbert : VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
 * @param velocityMpm Vitesse en mètres par minute
 */
function getVO2FromVelocity(velocityMpm: number): number {
  return -4.60 + 0.182258 * velocityMpm + 0.000104 * Math.pow(velocityMpm, 2);
}

/**
 * Calcule la fraction de VO2max (%VO2max) maintenable pendant une durée d'effort t (en minutes).
 * Formule Jack Daniels : %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
 * @param timeMinutes Temps d'effort en minutes
 */
function getPercentVO2Max(timeMinutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes)
  );
}

/**
 * Calcule le VDOT exact (Jack Daniels) pour une distance (mètres) et un temps (secondes) donnés.
 * Utilise une recherche par dichotomie pour inverser l'équation VDOT.
 */
export function calculateVDOT(
  distanceMeters: number,
  timeSeconds: number
): number {
  if (distanceMeters <= 0 || timeSeconds <= 0) return 0;

  const timeMinutes = timeSeconds / 60;
  const velocityMpm = distanceMeters / timeMinutes;
  const vo2Target = getVO2FromVelocity(velocityMpm);
  const percentMax = getPercentVO2Max(timeMinutes);

  // Recherche dichotomique du VDOT
  let low = 15;
  let high = 100;
  let vdot = 30;

  for (let i = 0; i < 30; i++) {
    vdot = (low + high) / 2;
    const estimatedVO2 = vdot * percentMax;

    if (estimatedVO2 < vo2Target) {
      low = vdot;
    } else {
      high = vdot;
    }
  }

  const exactVDOT = vo2Target / percentMax;
  return Math.round(exactVDOT * 10) / 10; // Arrondi à 1 décimale
}

/**
 * Calcule le Running Score propriétaire à partir du VDOT.
 * Formule : RunningScore = 1000 * (VDOT / 86)^0.55
 * Contraintes : entier arrondi, limité entre 0 et 1000.
 */
export function calculateRunningScore(vdot: number): number {
  if (vdot <= 0) return 0;
  const rawScore = 1000 * Math.pow(vdot / 86, 0.55);
  const rounded = Math.round(rawScore);
  return Math.min(1000, Math.max(0, rounded));
}

/**
 * Calcule le VDOT et le Running Score pour un record donné.
 */
export function getPerformanceScoreForRecord(
  distanceKeyOrMeters: string | number,
  timeStr: string
): PerformanceScore | null {
  const timeSeconds = parseTimeToSeconds(timeStr);
  if (!timeSeconds || timeSeconds <= 0) return null;

  let meters = 0;
  let label = "Distance";

  if (typeof distanceKeyOrMeters === "number") {
    meters = distanceKeyOrMeters;
    label = `${meters}m`;
  } else if (RECORD_DISTANCES_METERS[distanceKeyOrMeters]) {
    meters = RECORD_DISTANCES_METERS[distanceKeyOrMeters].meters;
    label = RECORD_DISTANCES_METERS[distanceKeyOrMeters].label;
  } else {
    return null;
  }

  const vdot = calculateVDOT(meters, timeSeconds);
  const runningScore = calculateRunningScore(vdot);

  return {
    distanceLabel: label,
    distanceMeters: meters,
    timeFormatted: timeStr,
    timeSeconds,
    vdot,
    runningScore,
  };
}

/**
 * Analyse un objet de records personnels
 * et retourne le meilleur Running Score global ainsi que la distance de référence associée.
 */
export function getBestAthletePerformance(
  records: Record<string, string>
): {
  bestRunningScore: number;
  bestVDOT: number;
  referenceDistance: string;
  allScores: Record<string, PerformanceScore>;
} {
  let bestRunningScore = 0;
  let bestVDOT = 0;
  let referenceDistance = "-";
  const allScores: Record<string, PerformanceScore> = {};

  Object.entries(records).forEach(([key, timeStr]) => {
    if (!timeStr || timeStr.trim() === "" || timeStr === "-") return;

    const score = getPerformanceScoreForRecord(key, timeStr);
    if (score) {
      allScores[key] = score;
      if (score.runningScore > bestRunningScore) {
        bestRunningScore = score.runningScore;
        bestVDOT = score.vdot;
        referenceDistance = score.distanceLabel;
      }
    }
  });

  return {
    bestRunningScore,
    bestVDOT,
    referenceDistance,
    allScores,
  };
}

/**
 * Extrait la distance en mètres à partir d'une chaîne texte comme "10 km", "21.1 km", "1500m".
 */
export function parseDistanceTextToMeters(distanceText: string): number {
  if (!distanceText) return 0;
  const cleanStr = distanceText.toLowerCase().replace(",", ".").trim();

  if (cleanStr.includes("km")) {
    const val = parseFloat(cleanStr.replace("km", "").trim());
    return isNaN(val) ? 0 : val * 1000;
  }
  if (cleanStr.includes("m")) {
    const val = parseFloat(cleanStr.replace("m", "").trim());
    return isNaN(val) ? 0 : val;
  }

  const numericVal = parseFloat(cleanStr);
  return isNaN(numericVal) ? 0 : numericVal;
}