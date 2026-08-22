// src/components/home/AthleteDashboard.tsx

import React, { useState, useEffect } from "react";
import { Plan, Workout } from "../../types";
import { getWorkoutTypeConfig, getExactDayDate } from "../../utils/calculations";

interface AthleteDashboardProps {
  activePlan: Plan | null;
  completedWorkouts: Record<string, boolean>;
  todayWorkouts: Workout[];
  onSelectWorkoutDetail: (workout: Workout) => void;
  onToggleWorkout: (id: string) => void;
  onOpenDebrief: (workout: Workout) => void;
  onCreatePlanRequest: () => void;
  onNavigateToVolumeChart: () => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({
  activePlan,
  completedWorkouts,
  todayWorkouts,
  onSelectWorkoutDetail,
  onOpenDebrief,
  onCreatePlanRequest,
  onNavigateToVolumeChart,
}) => {
  const [syncLoadingId, setSyncLoadingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ id: string; msg: string; isError?: boolean } | null>(null);
  
  // Modale Garmin
  const [showGarminModal, setShowGarminModal] = useState<Workout | null>(null);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");

  // Modale COROS
  const [showCorosModal, setShowCorosModal] = useState<Workout | null>(null);
  const [corosEmail, setCorosEmail] = useState("");
  const [corosPassword, setCorosPassword] = useState("");

  const [hasGarmin, setHasGarmin] = useState(false);
  const [hasCoros, setHasCoros] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gEmail = localStorage.getItem("volaris_garmin_email");
      const gPwd = localStorage.getItem("volaris_garmin_pwd");
      const cEmail = localStorage.getItem("volaris_coros_email");
      const cPwd = localStorage.getItem("volaris_coros_pwd");

      setHasGarmin(Boolean(gEmail && gPwd));
      setHasCoros(Boolean(cEmail && cPwd));

      if (gEmail) setGarminEmail(gEmail);
      if (gPwd) setGarminPassword(gPwd);
      if (cEmail) setCorosEmail(cEmail);
      if (cPwd) setCorosPassword(cPwd);
    }
  }, []);

  // Exécution de la synchronisation Garmin
  const executeGarminSync = async (workout: Workout, emailToUse: string, pwdToUse: string) => {
    setSyncLoadingId(workout.id);
    setSyncStatus({ id: workout.id, msg: "⏳ Envoi vers Garmin Connect..." });

    try {
      localStorage.setItem("volaris_garmin_email", emailToUse);
      localStorage.setItem("volaris_garmin_pwd", pwdToUse);
      setHasGarmin(true);

      const res = await fetch("/api/sync-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: pwdToUse,
          workout,
          startDate: activePlan?.startDate || new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi sur Garmin Connect.");
      }

      setSyncStatus({ id: workout.id, msg: "✅ Séance synchronisée sur Garmin !" });
      setShowGarminModal(null);
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setSyncStatus({ id: workout.id, msg: `❌ ${err.message}`, isError: true });
    } finally {
      setSyncLoadingId(null);
    }
  };

  // Exécution de la synchronisation COROS
  const executeCorosSync = async (workout: Workout, emailToUse: string, pwdToUse: string) => {
    setSyncLoadingId(workout.id);
    setSyncStatus({ id: workout.id, msg: "⏳ Envoi vers COROS..." });

    try {
      localStorage.setItem("volaris_coros_email", emailToUse);
      localStorage.setItem("volaris_coros_pwd", pwdToUse);
      setHasCoros(true);

      const res = await fetch("/api/sync-coros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: pwdToUse,
          workout,
          startDate: activePlan?.startDate || new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi sur COROS.");
      }

      setSyncStatus({ id: workout.id, msg: "✅ Séance synchronisée sur COROS !" });
      setShowCorosModal(null);
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setSyncStatus({ id: workout.id, msg: `❌ ${err.message}`, isError: true });
    } finally {
      setSyncLoadingId(null);
    }
  };

  // Gestion du clic sur le bouton Synchroniser
  const handleSyncButtonClick = (e: React.MouseEvent, workout: Workout) => {
    e.stopPropagation();
    e.preventDefault();

    const savedGarminEmail = localStorage.getItem("volaris_garmin_email");
    const savedGarminPwd = localStorage.getItem("volaris_garmin_pwd");
    const savedCorosEmail = localStorage.getItem("volaris_coros_email");
    const savedCorosPwd = localStorage.getItem("volaris_coros_pwd");

    if (savedGarminEmail && savedGarminPwd) {
      executeGarminSync(workout, savedGarminEmail, savedGarminPwd);
    } else if (savedCorosEmail && savedCorosPwd) {
      executeCorosSync(workout, savedCorosEmail, savedCorosPwd);
    } else {
      // Par défaut, ouverture de la modale Garmin
      setShowGarminModal(workout);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SÉANCE DU JOUR */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-wider text-stone-400">
            Séance du jour
          </h3>
          {activePlan && (
            <button
              onClick={onNavigateToVolumeChart}
              className="text-[10px] font-bold text-[#CF9A61] hover:underline cursor-pointer"
            >
              Voir mon volume ➔
            </button>
          )}
        </div>

        {!activePlan ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
            <p className="text-xs text-stone-400">
              Vous n'avez pas de plan d'entraînement en cours.
            </p>
            <button
              onClick={onCreatePlanRequest}
              className="px-4 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              ➕ Créer un plan
            </button>
          </div>
        ) : todayWorkouts.length === 0 ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 text-center text-xs text-stone-400 shadow-md">
            😴 Repos aujourd'hui ou aucune séance programmée.
          </div>
        ) : (
          <div className="space-y-3">
            {todayWorkouts.map((w) => {
              const isDone = completedWorkouts[w.id] || w.completed;
              const typeConfig = getWorkoutTypeConfig(w.type);
              const exactDate = activePlan
                ? getExactDayDate(activePlan.startDate, w.weekNumber, w.dayIndex)
                : "";

              return (
                <div
                  key={w.id}
                  onClick={() => onSelectWorkoutDetail(w)}
                  className={`p-4 rounded-3xl border transition space-y-3 cursor-pointer ${
                    isDone
                      ? "bg-stone-900/40 border-stone-800 text-stone-500"
                      : "bg-stone-900/90 border-[#CF9A61]/60 text-stone-100 shadow-xl"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-extrabold ${typeConfig.badgeClass}`}>
                        {typeConfig.label}
                      </span>
                      {w.km && (
                        <span className="text-[10px] font-bold text-stone-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                          {w.km} km
                        </span>
                      )}
                      {exactDate && (
                        <span className="text-[10px] font-semibold text-stone-400">
                          {exactDate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* BOUTON SYNCHRONISER LA SÉANCE */}
                      {!w.isRest && (
                        <button
                          type="button"
                          onClick={(e) => handleSyncButtonClick(e, w)}
                          disabled={syncLoadingId === w.id}
                          className="text-[10px] font-black text-white bg-[#4D80B3] hover:bg-[#3b6690] px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-md active:scale-95 disabled:opacity-50"
                          title="Envoyer la séance sur ma montre"
                        >
                          <span>{syncLoadingId === w.id ? "⏳" : "⌚"}</span>
                          <span>{syncLoadingId === w.id ? "Envoi..." : "Synchroniser"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDebrief(w);
                        }}
                        className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl uppercase transition cursor-pointer ${
                          isDone
                            ? "bg-[#4DB380]/20 text-[#4DB380] border border-[#4DB380]/40"
                            : "bg-[#CF9A61] text-stone-950 hover:bg-[#b88652]"
                        }`}
                      >
                        {isDone ? "✓ Débriefé" : "Débriefer"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black uppercase text-stone-100">
                      {w.title || "Séance du jour"}
                    </h4>
                    {w.description && (
                      <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                        {w.description}
                      </p>
                    )}
                  </div>

                  {syncStatus && syncStatus.id === w.id && (
                    <div className={`p-2 rounded-xl text-[10px] font-bold ${syncStatus.isError ? "bg-red-950/40 text-red-400 border border-red-900/50" : "bg-stone-950 text-[#CF9A61] border border-stone-800"}`}>
                      {syncStatus.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE GARMIN CONNECT */}
      {showGarminModal && (
        <div 
          className="fixed inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h4 className="text-sm font-black uppercase text-stone-100 flex items-center gap-1.5">
                <span>⌚</span> Connexion Garmin Connect
              </h4>
              <button
                type="button"
                onClick={() => setShowGarminModal(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Renseignez vos identifiants Garmin pour envoyer la séance <strong className="text-stone-200">{showGarminModal.title || "du jour"}</strong> directement sur votre montre.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeGarminSync(showGarminModal, garminEmail, garminPassword);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email Garmin
                </label>
                <input
                  type="email"
                  required
                  value={garminEmail}
                  onChange={(e) => setGarminEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Mot de passe Garmin
                </label>
                <input
                  type="password"
                  required
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <button
                type="submit"
                disabled={syncLoadingId !== null}
                style={{ backgroundColor: "#4D80B3" }}
                className="w-full py-3 hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
              >
                {syncLoadingId !== null ? "Synchronisation en cours..." : "Envoyer sur ma montre Garmin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};