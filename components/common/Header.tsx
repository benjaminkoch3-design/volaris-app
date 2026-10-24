// src/components/common/Header.tsx

import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { UserRole } from "../../types";

interface HeaderProps {
  userRole: UserRole;
  athleteName: string;
  hasBothAccounts?: boolean;
  onToggleRole?: () => void;
  onLogout?: () => void;
  onBack?: () => void;
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

  const handleLogoutClick = () => {
    if (onLogout) {
      if (confirm("Voulez-vous vous déconnecter de Volaris ?")) {
        onLogout();
      }
    }
  };

  return (
    <header className="w-full bg-white/95 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-800 px-4 md:px-8 py-3.5 sticky top-0 z-50 backdrop-blur-md font-sans transition-colors">
      <div className="w-full flex items-center justify-between gap-4">
        {/* À GAUCHE : DÉCONNEXION & TITRES */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Bouton flèche : déclenche la déconnexion */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="p-2 rounded-xl bg-[#1c1917] hover:bg-[#292524] text-[#f5f5f4] transition cursor-pointer border border-[#292524] shadow-xs"
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
                strokeWidth="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-[#1c1917] dark:text-[#f5f5f4] flex items-center gap-2">
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

        {/* À DROITE : ACTIONS & LOGO */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateToVolumeChart && (
            <button
              type="button"
              onClick={onNavigateToVolumeChart}
              className="text-[#1c1917] dark:text-[#f5f5f4] bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap hidden sm:flex"
            >
              📊 ÉVOLUTION VOLUME & CHARGE
            </button>
          )}

          {/* BOUTON ACTUALISER (DEUX FLÈCHES EN ROND) */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 p-2 rounded-xl transition cursor-pointer flex items-center justify-center shadow-md"
            title="Actualiser la page"
          >
            <span className="text-sm">🔄</span>
          </button>

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

          <ThemeToggle />

          <img
            src="/new_logo.png"
            alt="Logo VOLARIS"
            className="w-8 h-8 object-contain rounded-xl border border-stone-800 bg-[#0c0a09] p-0.5 shrink-0"
          />
        </div>
      </div>
    </header>
  );
};