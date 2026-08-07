// src/components/coach/ManagedAthletes.tsx

import React from "react";
import { AthleteProfile } from "../../types";

interface ManagedAthletesProps {
  managedAthletes: AthleteProfile[];
  onSelectAthlete: (id: string) => void;
  onInviteAthlete: () => void;
}

export const ManagedAthletes: React.FC<ManagedAthletesProps> = ({
  managedAthletes,
  onSelectAthlete,
  onInviteAthlete,
}) => {
  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* HEADER DE L'ESPACE ENTRAÎNEUR EN JAUNE OLIVE (#CDCF61) */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-[#CDCF61] uppercase tracking-widest block">
            Espace Entraîneur
          </span>
          <h2 className="text-xl font-black uppercase text-stone-100">
            Mes Athlètes ({managedAthletes.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={onInviteAthlete}
          className="text-[10px] font-extrabold text-[#CDCF61] bg-[#CDCF61]/10 hover:bg-[#CDCF61]/20 border border-[#CDCF61]/30 px-3 py-2 rounded-xl uppercase transition cursor-pointer"
        >
          ➕ Inviter un athlète
        </button>
      </div>

      {/* LISTE DES CARTES ATHLÈTES */}
      <div className="space-y-3">
        {managedAthletes.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-14 bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CDCF61] text-xl">
              🏃‍♂️
            </div>
            <p className="text-xs text-stone-400">
              Aucun athlète géré pour le moment. Invitez votre premier athlète pour suivre sa préparation !
            </p>
          </div>
        ) : (
          managedAthletes.map((athlete) => (
            <div
              key={athlete.id}
              onClick={() => onSelectAthlete(athlete.id)}
              className="bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/40 p-4 rounded-3xl space-y-3 shadow-xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              {/* EN-TÊTE DE LA CARTE ATHLÈTE */}
              <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-[#CDCF61] text-sm">
                    {athlete.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-stone-100">
                      {athlete.name}
                    </h3>
                    <span className="text-[10px] text-stone-400 font-medium block">
                      {athlete.email}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold text-[#CDCF61] bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800">
                  Voir l'espace ➔
                </span>
              </div>

              {/* DÉTAILS OBJECTIF CIBLE : DISTANCE, DATE ET CHRONO EN BLANC PUR (text-stone-100) */}
              <div className="grid grid-cols-3 gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800 text-center text-xs">
                <div>
                  <span className="block text-[8px] font-bold text-stone-400 uppercase">
                    Distance
                  </span>
                  <span className="font-black text-stone-100">
                    {athlete.targetGoal || "10 km"}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-stone-400 uppercase">
                    Date
                  </span>
                  <span className="font-bold text-stone-100">
                    {athlete.targetDate || "24/11/2026"}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-stone-400 uppercase">
                    Chrono Visé
                  </span>
                  <span className="font-black text-stone-100">
                    {athlete.targetTime || "42:00"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};