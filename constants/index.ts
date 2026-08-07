// src/constants/index.ts

import { WorkoutType, WeekType } from "../types";

export const DAYS_LIST = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export const MONTHS_LIST = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const WORKOUT_TYPES_CONFIG: Record<
  WorkoutType,
  { label: string; badgeClass: string; borderClass: string }
> = {
  repos: {
    label: "Repos",
    badgeClass: "bg-stone-800/60 text-stone-400 border-stone-700/50",
    borderClass: "border-l-stone-700",
  },
  recup: {
    label: "Récup",
    badgeClass: "bg-sky-400/20 text-sky-300 border-sky-400/40",
    borderClass: "border-l-sky-300",
  },
  footing: {
    label: "Footing",
    badgeClass: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
    borderClass: "border-l-emerald-300",
  },
  footing_actif: {
    label: "Footing actif",
    badgeClass:
      "bg-emerald-950/80 text-emerald-400 border-emerald-700/60 font-semibold",
    borderClass: "border-l-emerald-700",
  },
  cotes: {
    label: "Côtes",
    badgeClass:
      "bg-amber-950/80 text-amber-200 border-amber-800/80 font-semibold",
    borderClass: "border-l-amber-800",
  },
  vma: {
    label: "Fractionné", // Libellé mis à jour : "VMA" -> "Fractionné"
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40 font-bold",
    borderClass: "border-l-red-500",
  },
  seuil: {
    label: "Seuil",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold",
    borderClass: "border-l-orange-500",
  },
  specifique: {
    label: "Spécifique",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold",
    borderClass: "border-l-purple-400",
  },
  sortie_longue: {
    label: "Sortie longue",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/40 font-bold",
    borderClass: "border-l-pink-400",
  },
  activation: {
    label: "Activation",
    badgeClass:
      "bg-blue-900/60 text-blue-200 border-blue-700/60 font-semibold",
    borderClass: "border-l-blue-800",
  },
  course: {
    label: "Course",
    badgeClass:
      "bg-amber-400/30 text-amber-300 border-amber-400/60 font-black",
    borderClass: "border-l-amber-400",
  },
};

export const WEEK_TYPES_CONFIG: Record<
  WeekType,
  { label: string; badgeClass: string }
> = {
  recup: {
    label: "Récupération",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  charge: {
    label: "Montée en charge",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  specifique: {
    label: "Spécifique",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  affutage: {
    label: "Affûtage",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  },
  custom: {
    label: "Personnalisé",
    badgeClass: "bg-stone-800 text-stone-200 border-stone-700",
  },
};