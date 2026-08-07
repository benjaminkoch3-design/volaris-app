// src/components/auth/AuthScreen.tsx

import React from "react";
import { UserRole } from "../../types";

interface AuthScreenProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  athleteName: string;
  setAthleteName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSocialAuth: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  userRole,
  setUserRole,
  authMode,
  setAuthMode,
  athleteName,
  setAthleteName,
  email,
  setEmail,
  password,
  setPassword,
  onBack,
  onSubmit,
  onSocialAuth,
}) => {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-6 font-sans relative">
      <div className="w-full max-w-sm bg-stone-900/80 border border-stone-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <button
          onClick={onBack}
          className="text-stone-400 hover:text-stone-100 text-xs font-medium flex items-center gap-1 mb-6 transition cursor-pointer"
        >
          ← Retour
        </button>

        <div className="text-center mb-6">
          {/* BADGE AVEC TOOLTIP INTERACTIF AU SURVOL */}
          <div className="relative inline-block group mb-2 cursor-help">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#B34D4D]/10 border border-[#B34D4D]/30 rounded-full text-[10px] font-bold uppercase text-[#B34D4D] transition group-hover:bg-[#B34D4D]/20">
              <span>Connexion avec compte unique</span>
              <span className="text-[11px] font-black">ⓘ</span>
            </div>

            {/* INFOBULLE / TOOLTIP (S'affiche vers le bas pour ne plus être coupée) */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-3 bg-stone-950 border border-stone-700 text-stone-300 text-[10px] leading-relaxed rounded-2xl shadow-2xl z-50 pointer-events-none transition-all animate-fadeIn">
              {/* Petite flèche orientée vers le haut */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-stone-950" />

              <p className="font-semibold text-stone-200 mb-1 text-center">
                💡 Un seul identifiant pour tout Volaris
              </p>
              {/* TEXTES JUSTIFIÉS GRÂCE À 'text-justify' */}
              <p className="text-stone-400 text-justify">
                Vos identifiants (email et mot de passe) sont identiques, que vous soyez <strong>Athlète</strong> ou <strong>Coach</strong>.
              </p>
              <p className="text-stone-400 text-justify mt-1">
                Basculez simplement entre les onglets ci-dessous pour choisir l'interface que vous souhaitez consulter.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-black uppercase tracking-wider text-stone-100">
            {userRole === "coach" ? "Espace Coach" : "Espace Athlète"}
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            {userRole === "coach"
              ? "Gérez vos athlètes et créez leurs plans d'entraînement"
              : "Connectez-vous pour suivre votre progression"}
          </p>
        </div>

        {/* SWITCH DE RÔLE : ATHLÈTE (#CF9A61) VS COACH (#CDCF61) */}
        <div className="bg-stone-950 p-1 rounded-xl mb-4 border border-stone-800 flex">
          <button
            type="button"
            onClick={() => setUserRole("athlete")}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              userRole === "athlete"
                ? "bg-[#CF9A61] text-stone-950 font-black shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            🏃‍♂️ Espace Athlète
          </button>
          <button
            type="button"
            onClick={() => setUserRole("coach")}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              userRole === "coach"
                ? "bg-[#CDCF61] text-stone-950 font-black shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            📋 Espace Coach
          </button>
        </div>

        {/* ONGLETS LOGIN / SIGNUP */}
        <div className="flex bg-stone-950 p-1 rounded-xl mb-6 border border-stone-800">
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              authMode === "login"
                ? userRole === "coach"
                  ? "bg-[#CDCF61] text-stone-950 font-black shadow"
                  : "bg-[#CF9A61] text-stone-950 font-black shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              authMode === "signup"
                ? userRole === "coach"
                  ? "bg-[#CDCF61] text-stone-950 font-black shadow"
                  : "bg-[#CF9A61] text-stone-950 font-black shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            S&apos;inscrire
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {authMode === "signup" && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Benjamin"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                className={`w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-100 focus:outline-none transition ${
                  userRole === "coach"
                    ? "focus:border-[#CDCF61]"
                    : "focus:border-[#CF9A61]"
                }`}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Adresse Email (Même compte Coach & Athlète)
            </label>
            <input
              type="email"
              required
              placeholder="athlete.coach@running.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-100 focus:outline-none transition ${
                userRole === "coach"
                  ? "focus:border-[#CDCF61]"
                  : "focus:border-[#CF9A61]"
              }`}
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-100 focus:outline-none transition ${
                userRole === "coach"
                  ? "focus:border-[#CDCF61]"
                  : "focus:border-[#CF9A61]"
              }`}
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition mt-2 cursor-pointer ${
              userRole === "coach"
                ? "bg-[#CDCF61] hover:bg-[#b8bb52] text-stone-950"
                : "bg-[#CF9A61] hover:bg-[#b88652] text-stone-950"
            }`}
          >
            {authMode === "login"
              ? `Accéder à l'espace ${userRole === "coach" ? "Coach" : "Athlète"}`
              : "Créer mon compte"}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-800" />
          </div>
          <span className="relative bg-stone-900 px-3 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            Ou continuer avec
          </span>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onSocialAuth}
            className="w-full py-3 px-4 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold flex items-center justify-center gap-3 transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          <button
            type="button"
            onClick={onSocialAuth}
            className="w-full py-3 px-4 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold flex items-center justify-center gap-3 transition cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.05-0.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-.01 2.98.02.02 2.17.18 2.83-1.37z" />
            </svg>
            <span>Continuer avec Apple</span>
          </button>
        </div>
      </div>
    </main>
  );
};