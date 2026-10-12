// src/components/common/Header.tsx

import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { UserRole } from "../../types";

interface HeaderProps {
  userRole: UserRole;
  athleteName: string;
  hasBothAccounts?: boolean;
  onToggleRole?: () => void;
  onLogout: () => void;
  onNavigateToVolumeChart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  athleteName,
  hasBothAccounts = true,
  onToggleRole,
  onLogout,
  onNavigateToVolumeChart,
}) => {
  const isCoach = userRole === "coach";

  return (
    <header className="w-full bg-white/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 px-4 md:px-8 py-3.5 sticky top-0 z-50 backdrop-blur-md font-sans transition-colors">
      <div className="w-full flex items-center justify-between gap-4">
        {/* À GAUCHE : DÉCONNEXION & TITRES */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 transition cursor-pointer border border-stone-200 dark:border-transparent"
            title="Déconnexion"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-2">
              VOLARIS
            </h1>
            <p
              className={`text-[10px] font-bold ${
                isCoach ? "text-[#CDCF61]" : "text-[#CF9A61]"
              }`}
            >
              {isCoach
                ? "📋 Espace Entraîneur"
                : `Athlète : ${athleteName}`}
            </p>
          </div>
        </div>

        {/* À DROITE : BOUTON ÉVOLUTION + BASCULE DE RÔLE + TOGGLE THÈME + LOGO */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateToVolumeChart && (
            <button
              type="button"
              onClick={onNavigateToVolumeChart}
              className="text-stone-800 dark:text-white bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap hidden sm:flex"
            >
              📊 ÉVOLUTION VOLUME & CHARGE
            </button>
          )}

          {onToggleRole && (
            <button
              type="button"
              onClick={onToggleRole}
              className={`text-[9.5px] font-black px-3 py-1.5 rounded-full transition cursor-pointer shadow-md border border-stone-800/20 dark:border-stone-800 text-stone-950 flex items-center gap-1.5 whitespace-nowrap ${
                isCoach
                  ? "bg-[#CF9A61] hover:bg-[#b88652]"
                  : "bg-[#CDCF61] hover:bg-[#b8bb52]"
              }`}
              title={isCoach ? "Basculer sur mon compte Athlète" : "Basculer sur mon compte Coach"}
            >
              <span>🔄</span>
              <span>{isCoach ? "Passer Athlète" : "Passer Coach"}</span>
            </button>
          )}

          {/* BOUTON THÈME */}
          <ThemeToggle />

          <img
            src="/new_logo.png"
            alt="Logo VOLARIS"
            className="w-8 h-8 object-contain rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-0.5 shrink-0"
          />
        </div>
      </div>
    </header>
  );
};