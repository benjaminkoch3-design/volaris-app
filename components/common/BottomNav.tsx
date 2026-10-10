// src/components/common/BottomNav.tsx

import React from "react";
import { UserRole } from "../../types";

export type ActiveTab =
  | "accueil"
  | "plan"
  | "messages"
  | "stats"
  | "profil"
  | "athletes"
  | "today"
  | "calendar"
  | "library";

interface BottomNavProps {
  userRole: UserRole;
  activeTab: ActiveTab;
  screen: string;
  inspectingAthleteId?: string | null;
  onSelectTab: (tab: ActiveTab) => void;
}

interface NavItem {
  key: ActiveTab;
  label: string;
  icon: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  userRole,
  activeTab,
  screen,
  inspectingAthleteId = null,
  onSelectTab,
}) => {
  if (screen !== "app") return null;

  const isCoachInspecting = userRole === "coach" && inspectingAthleteId !== null;
  const isCoach = userRole === "coach" && !inspectingAthleteId;

  // Définition centralisée des onglets selon le contexte
  let items: NavItem[] = [];

  if (isCoachInspecting) {
    items = [
      { key: "plan", label: "Plan", icon: "📋" },
      { key: "messages", label: "Message", icon: "💬" },
      { key: "stats", label: "Stats", icon: "📊" },
      { key: "profil", label: "Profil", icon: "👤" },
    ];
  } else if (isCoach) {
    items = [
      { key: "today", label: "Aujourd'hui", icon: "☀️" },
      { key: "calendar", label: "Agenda", icon: "📅" },
      { key: "messages", label: "Messages", icon: "💬" },
      { key: "athletes", label: "Athlètes", icon: "🏃‍♂️" },
      { key: "library", label: "Modèles", icon: "📚" },
    ];
  } else {
    items = [
      { key: "accueil", label: "Accueil", icon: "🏠" },
      { key: "plan", label: "Plan", icon: "📋" },
      { key: "messages", label: "Coach", icon: "💬" },
      { key: "stats", label: "Stats", icon: "📊" },
      { key: "profil", label: "Profil", icon: "👤" },
    ];
  }

  const activeColor = isCoach || isCoachInspecting ? "#CDCF61" : "#CF9A61";
  const activeBg = isCoach || isCoachInspecting ? "bg-[#CDCF61]/10" : "bg-[#CF9A61]/10";
  const activeBorder = isCoach || isCoachInspecting ? "border-[#CDCF61]/30" : "border-[#CF9A61]/30";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800/80 font-sans md:top-0 md:bottom-0 md:right-auto md:w-64 md:border-t-0 md:border-r md:flex md:flex-col md:justify-between md:p-4">
      {/* ----------------- EN-TÊTE SIDEBAR DESKTOP ----------------- */}
      <div className="hidden md:flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-2.5 px-2 py-3 border-b border-stone-800/80">
          <div
            style={{ backgroundColor: `${activeColor}20`, borderColor: activeColor }}
            className="w-9 h-9 rounded-xl border flex items-center justify-center text-lg font-black"
          >
            ⚡
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-stone-100">
              Volaris
            </h1>
            <span
              style={{ color: activeColor }}
              className="text-[9px] uppercase font-bold tracking-widest block"
            >
              {isCoachInspecting ? "Consultation" : isCoach ? "Espace Coach" : "Espace Athlète"}
            </span>
          </div>
        </div>
      </div>

      {/* ----------------- LISTE DES ONGLETS (MOBILE HORIZONTAL / DESKTOP VERTICAL) ----------------- */}
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1 md:max-w-none md:mx-0 md:flex-col md:h-auto md:space-y-1.5 md:items-stretch md:justify-start md:flex-1">
        {items.map((item) => {
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              style={isActive ? { color: activeColor } : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer md:flex-initial md:flex-row md:items-center md:gap-3.5 md:px-4 md:py-3 md:rounded-2xl md:border md:text-left ${
                isActive
                  ? `font-extrabold scale-105 md:scale-100 ${activeBg}${activeBorder}`
                  : "text-stone-400 hover:text-stone-200 md:border-transparent md:hover:bg-stone-900/60"
              }`}
            >
              <span className="text-base md:text-lg mb-0.5 md:mb-0 shrink-0">
                {item.icon}
              </span>
              <span className="text-[9px] md:text-xs uppercase font-bold tracking-wider">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ----------------- PIED DE SIDEBAR DESKTOP ----------------- */}
      <div className="hidden md:block pt-3 border-t border-stone-800/60 px-2 text-[10px] text-stone-500 font-semibold text-center">
        <span>Volaris Running • v2.6</span>
      </div>
    </nav>
  );
};