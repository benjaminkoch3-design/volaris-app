// src/types/index.ts

export type UserRole = "athlete" | "coach";

export type WeekType =
  | "recup"
  | "charge"
  | "specifique"
  | "affutage"
  | "custom";

export type WorkoutType =
  | "repos"
  | "recup"
  | "footing"
  | "footing_actif"
  | "cotes"
  | "vma"
  | "seuil"
  | "specifique"
  | "sortie_longue"
  | "activation"
  | "course"
  | string;

// ==========================================
// TYPES POUR LES SÉANCES ET LE PLAN
// ==========================================

export interface WorkoutStep {
  id: string;
  type: "echauffement" | "corps" | "recup" | "retour_calme" | "repeat" | string;
  durationOrDist?: string;
  endCondition?: "temps" | "distance" | string;
  goalType?: "allure" | "frequence_cardiaque" | "sensations" | string;
  goalValue?: string;
  reps?: number;
  nestedSteps?: WorkoutStep[];
}

export interface Workout {
  id: string;
  weekNumber: number;
  dayIndex: number;
  dayName: string;
  sessionName?: string;
  isRest: boolean;
  type: string;
  title: string;
  description?: string;
  km?: string;
  rpe?: string;
  completedRpe?: number;
  athleteComment?: string;
  shoeId?: string; 
  completedKm?: number; 
  completedTimeMinutes?: number; 
  completedElevationGain?: number; 
  remark?: string;
  steps: WorkoutStep[];
}

export interface Plan {
  id: string;
  name: string;
  title?: string;
  targetDistance: string; // ex: "10 km", "Semi-Marathon", "42.2 km"
  targetTime?: string; // ex: "42:00", "1:35:00"
  raceCategory?: "route" | "piste" | "trail" | "nature";
  elevationGain?: number;
  startDate: string; // Format YYYY-MM-DD
  eventDate: string; // Format YYYY-MM-DD
  durationWeeks?: string;
  totalWeeks?: number;
  weekTypes?: Record<number, { type: WeekType; customLabel?: string }>;
  workouts: Workout[];
}

// ==========================================
// TYPES POUR LE PROFIL ATHLÈTE & LE COACHING
// ==========================================

export interface AthleteProfile {
  id: string;
  name: string; // Nom & Prénom
  email: string;
  vma?: string;
  targetGoal?: string; // Distance cible (ex: "10 km", "Semi-Marathon")
  targetDate?: string; // Date de la course (ex: "24/11/2026")
  targetTime?: string; // Chrono visé (ex: "42:00", "1:35:00")
  weeklyKm?: number;
  adherenceRate?: number;
  lastActive?: string;
  status?: string;
}

export interface Race {
  id: string;
  name: string;
  distance: string;
  time: string;
  category?: "route" | "piste" | "trail" | "nature";
  elevationGain?: number;
  utmbIndex?: number;
}

export interface CompletedRun {
  id: string;
  date: string; // Format YYYY-MM-DD
  km: number;
  durationHours: number;
  elevation?: number;
  raceNotes?: string;
}

export interface Shoe {
  id: string;
  brand: string;
  name: string;
  currentKm: number;
  maxKm: number;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  senderRole: "athlete" | "coach";
  senderName: string;
  athleteId: string;
  text: string;
  timestamp: string;
}

// ==========================================
// TYPES POUR LA BIBLIOTHÈQUE DU COACH
// ==========================================

export interface LibraryCategory {
  id: string;
  label: string;
}

export interface LibraryWorkout {
  id: string;
  categoryId: string; // Fait référence à l'ID de la catégorie créée par le coach
  category?: string; // Alias de rétrocompatibilité
  title: string;
  description?: string;
  km?: string;
  rpe?: string;
  steps: WorkoutStep[];
  createdAt?: string;
}