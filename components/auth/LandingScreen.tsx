// src/components/auth/LandingScreen.tsx

import React from "react";

interface LandingScreenProps {
  onNavigateToAuth: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onNavigateToAuth,
}) => {
  return (
    <main className="min-h-screen bg-[#0c0a09] text-[#f5f5f4] flex flex-col justify-between items-center p-6 font-sans relative overflow-hidden select-none">
      {/* Halos lumineux d'ambiance VOLARIS (#CF9A61 & #4D80B3) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CF9A61]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#4D80B3]/15 rounded-full blur-3xl pointer-events-none" />

      {/* LOGO VOLARIS BIEN DÉTACHÉ ET VISIBLE */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-10 my-auto py-12 px-4 w-full max-w-sm">
        <div className="p-6 rounded-3xl bg-[#141210]/80 border border-stone-800/80 shadow-2xl backdrop-blur-md flex items-center justify-center w-full">
          <img
            src="/new_full_logo.png"
            alt="Logo VOLARIS Running Performance"
            className="w-64 max-w-full h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>

      {/* BOUTON D'ACCÈS HAUTE VISIBILITÉ */}
      <div className="w-full max-w-xs z-10 pb-10">
        <button
          type="button"
          onClick={onNavigateToAuth}
          className="w-full py-4 px-6 rounded-2xl bg-[#CF9A61] hover:bg-[#b88652] active:scale-[0.98] text-[#1c1917] font-black text-xs tracking-widest uppercase shadow-[0_10px_25px_rgba(207,154,97,0.3)] hover:shadow-[0_12px_30px_rgba(207,154,97,0.45)] border border-[#e0aa70]/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <span>Accéder à l&apos;application</span>
          <svg
            className="w-4 h-4 stroke-[2.5]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </main>
  );
};