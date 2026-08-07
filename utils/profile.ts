// src/utils/profile.ts

import { parseTimeToHours } from "./calculations";
import {
  RECORD_DISTANCES_METERS,
  getPerformanceScoreForRecord,
} from "./vdot";

/**
 * Constantes paramétrables pour le calcul du profil Vitesse / Endurance
 */
export const PROFILE_CONFIG = {
  // Coefficient d'ajustement de la différence de VDOT
  INDEX_SENSITIVITY_COEFF: 12,

  // Distances courtes pour le VDOT court
  SHORT_DISTANCE_KEYS: ["r1500", "r3000", "r5k"],

  // Distances longues pour le VDOT long
  LONG_DISTANCE_KEYS: ["r10k", "rSemi", "rMarathon"],

  // Seuils de catégories (% Vitesse)
  THRESHOLDS: [
    { min: 0, max: 30, label: "Très endurant", emoji: "🏔️" },
    { min: 30, max: 45, label: "Endurant", emoji: "🏃‍♂️" },
    { min: 45, max: 55, label: "Équilibré", emoji: "⚖️" },
    { min: 55, max: 70, label: "Rapide", emoji: "⚡" },
    { min: 70, max: 100, label: "Très rapide", emoji: "🚀" },
  ],
};

export interface RunnerProfileResult {
  vitessePercent: number; // Ex: 62
  endurancePercent: number; // Ex: 38
  categoryLabel: string; // Ex: "Rapide"
  categoryEmoji: string;
  vdotShort: number;
  vdotLong: number;
  vdotDiff: number;
}

/**
 * 1. Calcul du % de VMA maintenu sur un record donné.
 * %VMA = (vitesseMoyenneKmH / VMA) * 100
 * @param distanceKeyOrMeters Clé de distance (ex: "r5k") ou distance en mètres
 * @param timeStr Chrono sous forme de chaîne (ex: "16:50", "35:00")
 * @param vmaKmH VMA de l'athlète en km/h
 */
export function calculateRecordVmaPercentage(
  distanceKeyOrMeters: string | number,
  timeStr: string,
  vmaKmH: number
): number | null {
  if (!vmaKmH || vmaKmH <= 0 || !timeStr || timeStr.trim() === "" || timeStr === "-") {
    return null;
  }

  const hours = parseTimeToHours(timeStr);
  if (!hours || hours <= 0) return null;

  let meters = 0;
  if (typeof distanceKeyOrMeters === "number") {
    meters = distanceKeyOrMeters;
  } else if (RECORD_DISTANCES_METERS[distanceKeyOrMeters]) {
    meters = RECORD_DISTANCES_METERS[distanceKeyOrMeters].meters;
  } else {
    return null;
  }

  const distanceKm = meters / 1000;
  const speedKmH = distanceKm / hours;

  const vmaPct = (speedKmH / vmaKmH) * 100;
  return Math.round(vmaPct * 10) / 10; // Arrondi à 1 décimale
}

/**
 * Détermine la catégorie de profil à partir du % de Vitesse.
 */
export function getCategoryFromVitessePercent(vitessePct: number): {
  label: string;
  emoji: string;
} {
  const category = PROFILE_CONFIG.THRESHOLDS.find(
    (t) => vitessePct >= t.min && vitessePct <= t.max
  );

  return category
    ? { label: category.label, emoji: category.emoji }
    : { label: "Équilibré", emoji: "⚖️" };
}

/**
 * 2 & 3. Calcul du profil Vitesse / Endurance & Détermination de la catégorie
 * @param records Objet contenant les records de l'athlète (ex: { r5k: "16:50", r10k: "35:00" })
 */
export function calculateRunnerProfile(
  records: Record<string, string>
): RunnerProfileResult | null {
  let vdotShortMax = 0;
  let vdotLongMax = 0;

  // Calcul du VDOT court (1500m, 3km, 5km)
  PROFILE_CONFIG.SHORT_DISTANCE_KEYS.forEach((key) => {
    const timeStr = records[key];
    if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
      const perf = getPerformanceScoreForRecord(key, timeStr);
      if (perf && perf.vdot > vdotShortMax) {
        vdotShortMax = perf.vdot;
      }
    }
  });

  // Calcul du VDOT long (10km, Semi, Marathon)
  PROFILE_CONFIG.LONG_DISTANCE_KEYS.forEach((key) => {
    const timeStr = records[key];
    if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
      const perf = getPerformanceScoreForRecord(key, timeStr);
      if (perf && perf.vdot > vdotLongMax) {
        vdotLongMax = perf.vdot;
      }
    }
  });

  // Si l'un des deux VDOT est absent, on ne peut pas établir un profil comparatif
  if (vdotShortMax === 0 || vdotLongMax === 0) {
    return null;
  }

  // Indice = VDOT court - VDOT long
  const indice = vdotShortMax - vdotLongMax;

  // PourcentageVitesse = 50 + (12 * Indice)
  let vitessePct = 50 + PROFILE_CONFIG.INDEX_SENSITIVITY_COEFF * indice;

  // Limite entre 0 et 100
  vitessePct = Math.min(100, Math.max(0, Math.round(vitessePct)));

  // PourcentageEndurance = 100 - PourcentageVitesse
  const endurancePct = 100 - vitessePct;

  const { label, emoji } = getCategoryFromVitessePercent(vitessePct);

  return {
    vitessePercent: vitessePct,
    endurancePercent: endurancePct,
    categoryLabel: label,
    categoryEmoji: emoji,
    vdotShort: vdotShortMax,
    vdotLong: vdotLongMax,
    vdotDiff: Math.round(indice * 10) / 10,
  };
}