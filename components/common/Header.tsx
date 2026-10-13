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
  onBack?: () => void; // 👈 Callback de retour personnalisé (changement d'onglet ou retour vue précédente)
  onNavigateToVolumeChart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  athleteName,
  hasBothAccounts = true,
  onToggleRole,
  onBack,
  onNavigateToVolumeChart,
}) => {
  const isCoach = userRole === "coach";

  const handleGoBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <header className="w-full bg-white/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 px-4 md:px-8 py-3.5 sticky top-0 z-50 backdrop-blur-md font-sans transition-colors">
      <div className="w-full flex items-center justify-between gap-4">
        {/* À GAUCHE : BOUTON RETOUR & TITRES */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGoBack}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#1c1917] dark:text-[#f5f5f4] transition cursor-pointer border border-stone-300 dark:border-stone-700"
            title="Retour"
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
            {/* VOLARIS : Couleur hexadécimale explicite pour forcer le noir en clair et le blanc en sombre */}
            <h1 className="text-sm font-black uppercase tracking-wider text-[#1c1917] dark:text-[#f5f5f4] flex items-center gap-2">
              VOLARIS
            </h1>
            <p
              className={`text-[10px] font-bold ${
                isCoach ? "text-[#9e7039] dark:text-[#CDCF61]" : "text-[#b47a3e] dark:text-[#CF9A61]"
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

          {/* Logo : fond sombre fixe pour garder son aspect intact */}
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