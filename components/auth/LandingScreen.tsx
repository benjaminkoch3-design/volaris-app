// src/components/auth/LandingScreen.tsx

import React from "react";

interface LandingScreenProps {
  onNavigateToAuth: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onNavigateToAuth,
}) => {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between items-center p-6 font-sans relative overflow-hidden">
      {/* Halos lumineux d'ambiance aux teintes VOLARIS (#CF9A61 & #4D80B3) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#CF9A61]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#4D80B3]/10 rounded-full blur-3xl pointer-events-none" />

      {/* LOGO VOLARIS EN GRAND */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-10 my-auto py-12">
        <img
          src="/new_full_logo.png"
          alt="Logo VOLARIS Running Performance"
          className="w-72 max-w-full h-auto object-contain drop-shadow-2xl"
        />
      </div>

      {/* BOUTON D'ACCÈS EN BLANC ÉPURÉ (TEXTE NON GRAS) */}
      <div className="w-full max-w-xs z-10 pb-8">
        <button
          onClick={onNavigateToAuth}
          className="w-full py-4 rounded-2xl bg-white hover:bg-stone-200 text-stone-950 font-medium text-xs tracking-widest uppercase shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Accéder à l&apos;application</span>
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </main>
  );
};