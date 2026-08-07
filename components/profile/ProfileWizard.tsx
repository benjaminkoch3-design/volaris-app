// src/components/profile/ProfileWizard.tsx

import React from "react";
import { RECORD_DISTANCES_METERS } from "../../utils/vdot";

interface ProfileWizardProps {
  profileStep: 1 | 2 | 3;
  setProfileStep: (step: 1 | 2 | 3) => void;
  athleteName: string;
  setAthleteName: (val: string) => void;
  height: string;
  setHeight: (val: string) => void;
  weight: string;
  setWeight: (val: string) => void;
  vma: string;
  setVma: (val: string) => void;
  unknownVma: boolean;
  setUnknownVma: (val: boolean) => void;
  fcRest: string;
  setFcRest: (val: string) => void;
  fcMax: string;
  setFcMax: (val: string) => void;
  records: Record<string, string>;
  setRecords: React.Dispatch<React.SetStateAction<any>>;
  onFinishWizard: () => void;
  onBackToAuth: () => void;
}

export const ProfileWizard: React.FC<ProfileWizardProps> = ({
  profileStep,
  setProfileStep,
  athleteName,
  setAthleteName,
  height,
  setHeight,
  weight,
  setWeight,
  vma,
  setVma,
  unknownVma,
  setUnknownVma,
  fcRest,
  setFcRest,
  fcMax,
  setFcMax,
  records,
  setRecords,
  onFinishWizard,
  onBackToAuth,
}) => {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-fadeIn">
        {/* HEADER ET PROGRESSION EN 3 ÉTAPES */}
        <div className="space-y-2 border-b border-stone-800 pb-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider">
              Création du profil • Étape {profileStep} sur 3
            </span>
            <button
              type="button"
              onClick={onBackToAuth}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕ Annuler
            </button>
          </div>
          <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
            <div
              className="bg-[#CF9A61] h-full transition-all duration-300"
              style={{ width: `${(profileStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* ÉTAPE 1 : IDENTITÉ (PRÉNOM, TAILLE & POIDS) */}
        {profileStep === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfileStep(2);
            }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-black uppercase text-stone-100">
                👤 Identité
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Renseignez vos informations personnelles de base.
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Prénom de l'athlète
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Benjamin"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  placeholder="178"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold uppercase text-xs rounded-xl shadow-lg transition cursor-pointer mt-2"
            >
              Suivant : VMA & Cardio ➔
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : VMA & FRÉQUENCE CARDIAQUE */}
        {profileStep === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfileStep(3);
            }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-black uppercase text-stone-100">
                ⚡ VMA & Fréquence Cardiaque
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Ces métriques permettent d'ajuster vos allures et vos zones cardiaques.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-bold text-stone-400">
                  VMA Estimée (km/h)
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unknownVma}
                    onChange={(e) => {
                      setUnknownVma(e.target.checked);
                      if (e.target.checked) setVma("");
                    }}
                    className="accent-[#CF9A61] rounded cursor-pointer"
                  />
                  <span>Je ne la connais pas</span>
                </label>
              </div>

              {!unknownVma ? (
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 14.5"
                  value={vma}
                  onChange={(e) => setVma(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              ) : (
                <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3 text-[10px] text-stone-400 italic">
                  Pas de problème, elle pourra être estimée automatiquement par vos chronos.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  FC Repos (bpm)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 55"
                  value={fcRest}
                  onChange={(e) => setFcRest(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  FC Max (bpm)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 185"
                  value={fcMax}
                  onChange={(e) => setFcMax(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileStep(1)}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                ◀ Retour
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                Suivant : Records ➔
              </button>
            </div>
          </form>
        )}

        {/* ÉTAPE 3 : RECORDS DE RÉFÉRENCE */}
        {profileStep === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onFinishWizard();
            }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-black uppercase text-stone-100">
                🏆 Records de Référence
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Saisissez vos meilleurs chronos pour calculer vos scores physiologiques (VDOT & Running Score).
              </p>
            </div>

            <div className="space-y-2 bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800">
              <span className="text-[10px] font-bold uppercase text-[#CF9A61] tracking-wider block">
                Vos Chronos de Référence (optionnel)
              </span>

              <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                {Object.entries(RECORD_DISTANCES_METERS).map(([key, info]) => (
                  <div key={key}>
                    <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                      {info.label}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 16:50 ou 1:25:00"
                      value={records[key] || ""}
                      onChange={(e) =>
                        setRecords({ ...records, [key]: e.target.value })
                      }
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileStep(2)}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                ◀ Retour
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                🏁 Terminer & Accéder ➔
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};