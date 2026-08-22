// src/components/common/Header.tsx

import React from "react";
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
  hasBothAccounts = false,
  onToggleRole,
  onLogout,
  onNavigateToVolumeChart,
}) => {
  return (
    <header className="bg-stone-900/90 border-b border-stone-800 px-4 py-3.5 sticky top-0 z-20 backdrop-blur-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* À GAUCHE : DÉCONNEXION & TITRES */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition cursor-pointer"
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
            <h1 className="text-sm font-black uppercase tracking-wider text-stone-100 flex items-center gap-2">
              VOLARIS
            </h1>
            <p
              className={`text-[10px] font-bold ${
                userRole === "coach" ? "text-[#CDCF61]" : "text-[#CF9A61]"
              }`}
            >
              {userRole === "coach"
                ? "📋 Espace Entraîneur"
                : `Athlète : ${athleteName}`}
            </p>
          </div>
        </div>

        {/* À DROITE : BOUTON ÉVOLUTION + BASCULE (CONDITIONNELLE) + LOGO */}
        <div className="flex items-center gap-2">
          {onNavigateToVolumeChart && (
            <button
              type="button"
              onClick={onNavigateToVolumeChart}
              className="text-white bg-stone-900 border border-stone-700 hover:bg-stone-800 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              📊 ÉVOLUTION VOLUME & CHARGE
            </button>
          )}

          {/* VISIBLE UNIQUEMENT SI LES DEUX COMPTES EXISTENT */}
          {hasBothAccounts && onToggleRole && (
            <button
              type="button"
              onClick={onToggleRole}
              className={`text-[9.5px] font-black px-2.5 py-1 rounded-full transition cursor-pointer shadow-md border border-stone-800 text-stone-950 ${
                userRole === "coach"
                  ? "bg-[#CDCF61] hover:bg-[#b8bb52]"
                  : "bg-[#CF9A61] hover:bg-[#b88652]"
              }`}
              title="Basculer de mode sur le même compte"
            >
              {userRole === "coach" ? "🔄 Mode Athlète" : "🔄 Mode Coach"}
            </button>
          )}

          <img
            src="/new_logo.png"
            alt="Logo VOLARIS"
            className="w-8 h-8 object-contain rounded-xl border border-stone-800 bg-stone-950 p-0.5"
          />
        </div>
      </div>
    </header>
  );
};