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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-md border-t border-stone-800/80 z-40 pb-safe font-sans">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        
        {/* 1. MODE COACH EN CONSULTATION D'UN ATHLÈTE */}
        {isCoachInspecting ? (
          <>
            <button
              type="button"
              onClick={() => onSelectTab("plan")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "plan"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📋</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Plan</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("messages")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "messages"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">💬</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Message</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("stats")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "stats"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📊</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Stats</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("profil")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "profil"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">👤</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Profil</span>
            </button>
          </>
        ) : isCoach ? (
          /* 2. MODE COACH GLOBAL (ORDRE : AUJOURD'HUI -> AGENDA -> MESSAGES -> ATHLÈTES -> MODÈLES) */
          <>
            {/* 1. AUJOURD'HUI */}
            <button
              type="button"
              onClick={() => onSelectTab("today")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "today"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">☀️</span>
              <span className="text-[9px] uppercase font-black tracking-wider">Aujourd'hui</span>
            </button>

            {/* 2. AGENDA */}
            <button
              type="button"
              onClick={() => onSelectTab("calendar")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "calendar"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📅</span>
              <span className="text-[9px] uppercase font-black tracking-wider">Agenda</span>
            </button>

            {/* 3. MESSAGES */}
            <button
              type="button"
              onClick={() => onSelectTab("messages")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "messages"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">💬</span>
              <span className="text-[9px] uppercase font-black tracking-wider">Message</span>
            </button>

            {/* 4. ATHLÈTES */}
            <button
              type="button"
              onClick={() => onSelectTab("athletes")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "athletes"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">🏃‍♂️</span>
              <span className="text-[9px] uppercase font-black tracking-wider">Athlètes</span>
            </button>

            {/* 5. MODÈLES */}
            <button
              type="button"
              onClick={() => onSelectTab("library")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "library"
                  ? "text-[#CDCF61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📚</span>
              <span className="text-[9px] uppercase font-black tracking-wider">Modèles</span>
            </button>
          </>
        ) : (
          /* 3. MODE ATHLÈTE STANDARD */
          <>
            <button
              type="button"
              onClick={() => onSelectTab("accueil")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "accueil"
                  ? "text-[#CF9A61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">🏠</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Accueil</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("plan")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "plan"
                  ? "text-[#CF9A61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📋</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Plan</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("messages")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "messages"
                  ? "text-[#CF9A61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">💬</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Coach</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("stats")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "stats"
                  ? "text-[#CF9A61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">📊</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Stats</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("profil")}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                activeTab === "profil"
                  ? "text-[#CF9A61] font-extrabold scale-105"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-base mb-0.5">👤</span>
              <span className="text-[9px] uppercase font-bold tracking-wider">Profil</span>
            </button>
          </>
        )}

      </div>
    </nav>
  );
};