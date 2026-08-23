// src/components/coach/ManagedAthletes.tsx

import React, { useState } from "react";
import { AthleteProfile } from "../../types";

interface ManagedAthletesProps {
  managedAthletes: AthleteProfile[];
  coachName?: string;
  onUpdateCoachName?: (newName: string) => void;
  onRenameAthlete?: (athleteId: string, customName: string) => void;
  onSelectAthlete: (id: string) => void;
  onInviteAthlete: () => void;
}

export const ManagedAthletes: React.FC<ManagedAthletesProps> = ({
  managedAthletes,
  coachName = "",
  onUpdateCoachName,
  onRenameAthlete,
  onSelectAthlete,
  onInviteAthlete,
}) => {
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [coachNameInput, setCoachNameInput] = useState(coachName);

  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [athleteNameInput, setAthleteNameInput] = useState("");

  const handleSaveCoachName = () => {
    if (coachNameInput.trim() && onUpdateCoachName) {
      onUpdateCoachName(coachNameInput.trim());
    }
    setIsEditingCoach(false);
  };

  const handleSaveAthleteName = (athleteId: string) => {
    if (athleteNameInput.trim() && onRenameAthlete) {
      onRenameAthlete(athleteId, athleteNameInput.trim());
    }
    setEditingAthleteId(null);
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* BANDEAU PROFIL COACH & CHOIX DE SON NOM */}
      <div className="bg-stone-900 border border-stone-800 p-4 rounded-3xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#CDCF61]/20 border border-[#CDCF61]/40 flex items-center justify-center font-black text-[#CDCF61] text-base">
            {coachName ? coachName.charAt(0).toUpperCase() : "C"}
          </div>

          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
              Votre Profil Coach
            </span>
            {isEditingCoach ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  value={coachNameInput}
                  onChange={(e) => setCoachNameInput(e.target.value)}
                  className="bg-stone-950 border border-stone-700 text-stone-100 text-xs px-2.5 py-1 rounded-xl focus:outline-none focus:border-[#CDCF61]"
                  placeholder="Votre nom ou pseudo..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveCoachName}
                  className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-xl"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCoach(false)}
                  className="text-[10px] bg-stone-800 text-stone-400 px-2 py-1 rounded-xl"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-sm font-black uppercase text-stone-100">
                  {coachName || "Entraîneur"}
                </h3>
                {onUpdateCoachName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoachNameInput(coachName);
                      setIsEditingCoach(true);
                    }}
                    className="text-stone-400 hover:text-stone-200 text-xs"
                    title="Modifier mon nom de coach"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onInviteAthlete}
          className="text-[10px] font-extrabold text-[#CDCF61] bg-[#CDCF61]/10 hover:bg-[#CDCF61]/20 border border-[#CDCF61]/30 px-3 py-2 rounded-xl uppercase transition cursor-pointer"
        >
          ➕ Inviter
        </button>
      </div>

      {/* TITRE LISTE ATHLÈTES */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-sm font-black uppercase text-stone-300">
          Mes Athlètes ({managedAthletes.length})
        </h2>
      </div>

      {/* LISTE DES CARTES ATHLÈTES */}
      <div className="space-y-3">
        {managedAthletes.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-14 bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CDCF61] text-xl">
              🏃‍♂️
            </div>
            <p className="text-xs text-stone-400">
              Aucun athlète géré pour le moment. Invitez votre premier athlète pour commencer sa planification !
            </p>
          </div>
        ) : (
          managedAthletes.map((item) => {
            const athlete = item as any;
            const isEditingThisAthlete = editingAthleteId === athlete.id;

            const planName: string = typeof athlete.activePlanName === "string" 
              ? athlete.activePlanName 
              : athlete.activePlan?.name || "";

            const raceString: string = typeof athlete.upcomingRace === "string" 
              ? athlete.upcomingRace 
              : "";

            const hasPlan = Boolean(planName && planName !== "Aucun");

            // Extraction Distance
            let displayDistance = "Aucun plan";
            if (athlete.targetGoal && athlete.targetGoal !== "En cours de définition") {
              displayDistance = String(athlete.targetGoal);
            } else if (hasPlan && raceString) {
              displayDistance = raceString;
            }

            // Extraction Date
            let displayDate = "-";
            if (athlete.targetDate) {
              displayDate = String(athlete.targetDate);
            } else if (raceString.includes("(") && raceString.includes(")")) {
              displayDate = raceString.split("(")[1]?.replace(")", "") || "-";
            }

            // Extraction Chrono
            let displayTime = "-";
            if (athlete.targetTime) {
              displayTime = String(athlete.targetTime);
            }

            const initialLetter = athlete.name ? String(athlete.name).charAt(0).toUpperCase() : "A";

            return (
              <div
                key={athlete.id}
                onClick={() => onSelectAthlete(athlete.id)}
                className="bg-stone-900/90 border border-stone-800 hover:border-[#CDCF61]/40 p-4 rounded-3xl space-y-3 shadow-xl cursor-pointer transition-all hover:scale-[1.01]"
              >
                {/* EN-TÊTE DE LA CARTE ATHLÈTE */}
                <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#CDCF61]/10 border border-[#CDCF61]/30 flex items-center justify-center font-black text-[#CDCF61] text-sm">
                      {initialLetter}
                    </div>
                    <div>
                      {isEditingThisAthlete ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={athleteNameInput}
                            onChange={(e) => setAthleteNameInput(e.target.value)}
                            className="bg-stone-950 border border-stone-700 text-stone-100 text-xs px-2 py-0.5 rounded-lg focus:outline-none focus:border-[#CDCF61]"
                            placeholder="Surnom athlète..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAthleteName(athlete.id)}
                            className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-bold"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAthleteId(null)}
                            className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black uppercase text-stone-100">
                            {athlete.name || "Athlète Sans Nom"}
                          </h3>
                          {onRenameAthlete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAthleteNameInput(athlete.name || "");
                                setEditingAthleteId(athlete.id);
                              }}
                              className="text-stone-500 hover:text-stone-300 text-xs"
                              title="Renommer cet athlète"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-stone-400 font-medium block">
                        {athlete.email}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold text-[#CDCF61] bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800">
                    Voir l'espace ➔
                  </span>
                </div>

                {/* DÉTAILS OBJECTIF DU PLAN ACTIF */}
                <div className="grid grid-cols-3 gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800 text-center text-xs">
                  <div>
                    <span className="block text-[8px] font-bold text-stone-400 uppercase">
                      Distance
                    </span>
                    <span className="font-black text-stone-100 truncate block">
                      {displayDistance}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-stone-400 uppercase">
                      Date
                    </span>
                    <span className="font-bold text-stone-100 truncate block">
                      {displayDate}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-stone-400 uppercase">
                      Chrono Visé
                    </span>
                    <span className="font-black text-stone-100 truncate block">
                      {displayTime}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};