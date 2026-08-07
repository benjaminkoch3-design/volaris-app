// src/utils/trainingLoad.ts

import { Workout } from "../types";
import { calculateStepMetrics } from "./calculations";

/**
 * 1. CHARGE D'UNE SÉANCE (Méthode de Foster / session-RPE)
 * Charge = Durée réelle/estimée (en minutes) × RPE réel
 */
export function calculateWorkoutLoad(workout: Workout): number {
  if (workout.isRest) return 0;

  // Récupération de la durée en minutes à partir des blocs
  const metrics = calculateStepMetrics(workout.steps);
  const durationMin = metrics.totalMinutes || 0;

  // Récupération du RPE réel renseigné par l'athlète (fallback sur RPE cible si absent)
  const rpeValue = workout.completedRpe ?? (parseInt(workout.rpe || "0", 10) || 0);

  if (durationMin <= 0 || rpeValue <= 0) return 0;

  return Math.round(durationMin * rpeValue);
}

/**
 * 2. CHARGE HEBDOMADAIRE (Semaine spécifique)
 */
export function calculateWeeklyLoad(
  workouts: Workout[],
  weekNum: number,
  completedMap?: Record<string, boolean>
): number {
  if (!workouts || workouts.length === 0) return 0;

  return workouts
    .filter((w) => w.weekNumber === weekNum && !w.isRest)
    .filter((w) => (completedMap ? completedMap[w.id] : true)) // Filtrer les réalisées si map fournie
    .reduce((total, w) => total + calculateWorkoutLoad(w), 0);
}

/**
 * 3. CHARGE DU PLAN COMPLET (Toutes les semaines)
 */
export function calculateTotalPlanLoad(
  workouts: Workout[],
  completedMap?: Record<string, boolean>
): number {
  if (!workouts || workouts.length === 0) return 0;

  return workouts
    .filter((w) => !w.isRest)
    .filter((w) => (completedMap ? completedMap[w.id] : true))
    .reduce((total, w) => total + calculateWorkoutLoad(w), 0);
}

/**
 * 4. ÉVOLUTION ET COMPARISON DES CHARGES
 * Calcule la variation en pourcentage entre deux charges
 */
export function calculateLoadVariationPercentage(currentLoad: number, previousLoad: number): number {
  if (previousLoad <= 0) return currentLoad > 0 ? 100 : 0;
  const variation = ((currentLoad - previousLoad) / previousLoad) * 100;
  return Math.round(variation);
}

/**
 * 5. EXTENSION FUTURE (Préparation pour ACWR, TRIMP, etc.)
 */
export interface LoadMetrics {
  sessionLoad: number;
  weeklyLoad: number;
  totalPlanLoad: number;
  weeklyVariationPct: number;
}