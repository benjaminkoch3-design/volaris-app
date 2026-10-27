// app/types/index.ts

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

export type StepType =
  | "echauffement"
  | "corps"
  | "recup"
  | "retour_calme"
  | "repeat"
  | string;

export type EndCondition = "temps" | "distance" | string;
export type GoalType = "allure" | "vma_zone" | "hr_zone" | "rpe" | "frequence_cardiaque" | "sensations" | string;

export interface WorkoutStep {
  id: string;
  type: StepType;
  durationOrDist?: string;
  endCondition?: EndCondition;
  
  // Gestion des cibles (allure brute, zone vma, zone fc, rpe)
  goalType?: GoalType;
  goalValue?: string;
  
  // Allure brute existante
  paceMin?: string; // Allure rapide (ex: "4:15")
  paceMax?: string; // Allure lente (ex: "4:25")
  targetPace?: string; // Texte libre ou allure simple (ex: "4:15 - 4:25" ou "4:20")

  // Nouveaux champs pour stocker la sélection de zone ou de RPE
  targetZoneId?: string;       // ID de la zone VMA ou FC sélectionnée
  targetZoneName?: string;     // Nom de la zone (ex: "Zone 3 - Seuil")
  targetRpe?: string | number; // Valeur de RPE cible (ex: "7")

  reps?: number;
  nestedSteps?: WorkoutStep[];
  description?: string;
  skipLastRecovery?: boolean;
}

export interface Workout {
  id: string;
  planId?: string;
  userId?: string;
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
  remark?: string;

  // Données de réalisation et débriefing
  completed?: boolean;
  completedRpe?: number;
  athleteComment?: string;
  feedback?: string;
  shoeId?: string;
  completedKm?: number;
  completedTimeMinutes?: number;
  completedElevationGain?: number;
  importedActivityName?: string;
  activityTelemetry?: any;
  activity_telemetry?: any;
  avgHr?: number | null;
  maxHr?: number | null;
  avgPaceSec?: number;
  avgCadence?: number | null;

  actualDuration?: string;
  actualKm?: string;
  actualPace?: string;
  actualAvgHr?: string;
  actualMaxHr?: string;
  actualElevation?: string;
  actualRpe?: string;

  // Allure générale optionnelle
  targetPace?: string;
  paceMin?: string;
  paceMax?: string;
  steps: WorkoutStep[];
}

export interface Plan {
  id: string;
  userId?: string;
  user_id?: string;
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
  isActive?: boolean;
  is_active?: boolean;
  isArchived?: boolean;
  is_archived?: boolean;
  workouts: Workout[];
}

// ==========================================
// TYPES POUR LE PROFIL ATHLÈTE & LE COACHING
// ==========================================

export interface AthleteProfile {
  id: string;
  name: string; // Nom & Prénom
  email: string;
  avatarUrl?: string; // Photo de profil
  avatar_url?: string; // Alias base de données Supabase
  vma?: string;
  targetGoal?: string; // Distance cible (ex: "10 km", "Semi-Marathon")
  targetDate?: string; // Date de la course (ex: "24/11/2026")
  targetTime?: string; // Chrono visé (ex: "42:00", "1:35:00")
  weeklyKm?: number;
  adherenceRate?: number;
  lastActive?: string;
  status?: string;
  activePlanName?: string;
  weeklyVolume?: string;
  upcomingRace?: string;
  weeksToRace?: number;
  hasUnreadMessage?: boolean;
  joinedDate?: string;
  height?: string;
  weight?: string;
  fcRest?: string;
  fcMax?: string;
  records?: Record<string, string>;
}

export interface Race {
  id: string;
  name: string;
  distance: string;
  time: string;
  date?: string; // Format YYYY-MM-DD
  category?: "route" | "piste" | "trail" | "nature";
  elevationGain?: number | string;
  rank?: string; // ex: "14e / 450", "3e M1H"
  utmbIndex?: number | string;
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
  senderId?: string;
  senderAvatar?: string; // Photo de profil dans les messages
  athleteId: string;
  coachId?: string; // Identifiant du coach associé pour cloisonner l'historique
  text: string;
  timestamp: string;
}

// ==========================================
// TYPES POUR LA BIBLIOTHÈQUE DU COACH ET DE L'ATHLÈTE
// ==========================================

export interface LibraryCategory {
  id: string;
  label: string;
  color?: string; // Code couleur hexadécimal optionnel (ex: "#CF9A61", "#3B82F6", "#10B981")
}

export interface LibraryWorkout {
  id: string;
  categoryId: string; // Fait référence à l'ID de la catégorie
  category?: string; // Alias de rétrocompatibilité
  type?: WorkoutType | string;
  title: string;
  description?: string;
  km?: string;
  rpe?: string;
  targetPace?: string;
  paceMin?: string;
  paceMax?: string;
  steps: WorkoutStep[];
  createdAt?: string;
}