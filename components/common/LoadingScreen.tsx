// src/components/common/LoadingScreen.tsx

import React from "react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Chargement en cours",
}) => {
  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col items-center justify-center p-6 z-[9999] font-sans overflow-hidden">
      {/* Animation de découpe et révélation progressive */}
      <style>{`
        @keyframes wingReveal {
          0% {
            clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
            opacity: 0;
          }
          50% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            opacity: 1;
          }
          80% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            opacity: 1;
          }
          100% {
            clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
            opacity: 0;
          }
        }
        .animate-wing-reveal {
          animation: wingReveal 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Halos d'ambiance d'arrière-plan (Jeux de lumière) */}
      <div className="absolute w-80 h-80 bg-[#CF9A61]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-64 h-64 bg-[#4D80B3]/10 rounded-full blur-3xl pointer-events-none translate-y-12" />

      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* LOGO AVEC OMBRE LUMINEUSE ET RÉVÉLATION */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          <div className="w-full h-full animate-wing-reveal">
            <img
              src="/new_logo.png"
              alt="Logo Volaris"
              className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(207,154,97,0.4)]"
            />
          </div>
        </div>

        {/* TEXTE UNIQUE "Chargement en cours" */}
        <div className="flex items-center gap-1.5 text-stone-200 font-medium text-xs tracking-widest uppercase">
          <span>{message}</span>
          <span className="flex gap-1 ml-1">
            <span className="w-1 h-1 bg-[#CF9A61] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-[#4D80B3] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-[#4DB380] rounded-full animate-bounce" />
          </span>
        </div>
      </div>
    </div>
  );
};