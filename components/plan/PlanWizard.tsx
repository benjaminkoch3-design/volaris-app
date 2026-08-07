// src/components/plan/PlanWizard.tsx

import React from "react";
import { Workout, WeekType } from "../../types";
import { DAYS_LIST, WEEK_TYPES_CONFIG } from "../../constants";
import {
  calculateWeeks,
  safeFormatDateFr,
  getWeekTypeLabel,
  getWeekDateRange,
  getExactDayDate,
  calculateWeeklyPlannedKm,
  getWorkoutTypeConfig,
} from "../../utils/calculations";

interface PlanWizardProps {
  planCreationStep: 1 | 2;
  setPlanCreationStep: React.Dispatch<React.SetStateAction<1 | 2>>;
  newPlanForm: {
    name: string;
    raceCategory: "route" | "trail" | "piste" | "nature";
    roadPreset: string;
    trackPreset: string;
    customDistance: string;
    targetTime: string;
    elevationGain: string;
    startDate: string;
    eventDate: string;
  };
  setNewPlanForm: React.Dispatch<React.SetStateAction<any>>;
  draftWeekTypes: Record<number, { type: WeekType; customLabel?: string }>;
  draftWorkouts: Workout[];
  openCreationWeeks: Record<number, boolean>;
  toggleCreationWeekAccordion: (wNum: number) => void;
  onStartSetup: (e: React.FormEvent) => void;
  onUpdateWeekType: (weekNum: number, type: WeekType, customLabel?: string) => void;
  onAddWorkoutToDay: (weekNumber: number, dayIndex: number) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onUpdateDraftWorkout: (id: string, field: keyof Workout, value: any) => void;
  onEditWorkout: (workoutId: string) => void;
  onFinalizePlan: () => void;
  onCancel: () => void;
}

// Helper pour calculer la couleur du RPE basée sur le gradient d'effort
const getRpeGradientColor = (rpeStr?: string) => {
  if (!rpeStr) return "#CF9A61";
  const rpe = parseInt(rpeStr, 10);
  if (rpe <= 3) return "#10b981"; // Vert
  if (rpe <= 5) return "#f59e0b"; // Ambre
  if (rpe <= 7) return "#f97316"; // Orange
  return "#ef4444"; // Rouge
};

export const PlanWizard: React.FC<PlanWizardProps> = ({
  planCreationStep,
  setPlanCreationStep,
  newPlanForm,
  setNewPlanForm,
  draftWeekTypes,
  draftWorkouts,
  openCreationWeeks,
  toggleCreationWeekAccordion,
  onStartSetup,
  onUpdateWeekType,
  onAddWorkoutToDay,
  onDeleteWorkout,
  onUpdateDraftWorkout,
  onEditWorkout,
  onFinalizePlan,
  onCancel,
}) => {
  const totalWeeks = calculateWeeks(newPlanForm.startDate, newPlanForm.eventDate);

  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 space-y-5 shadow-xl backdrop-blur-md font-sans">
      {/* ÉTAPE 1 : CONFIGURATION GÉNÉRALE DU PLAN */}
      {planCreationStep === 1 && (
        <form onSubmit={onStartSetup} className="space-y-4">
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                Étape 1/2 • Configuration de la course
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-100">
                Nouveau Plan
              </h3>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-stone-500 hover:text-stone-300 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Nom du plan (ex: Prépa Semi de Paris)
            </label>
            <input
              type="text"
              placeholder="Ex: Objectif Sub 45 min"
              value={newPlanForm.name}
              onChange={(e) =>
                setNewPlanForm({ ...newPlanForm, name: e.target.value })
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1.5">
              Type de course
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() =>
                  setNewPlanForm({ ...newPlanForm, raceCategory: "route" })
                }
                className={`py-2 px-2 text-[10px] font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  newPlanForm.raceCategory === "route"
                    ? "bg-[#CF9A61]/20 border-[#CF9A61] text-[#CF9A61]"
                    : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                <span>🛣️</span>
                <span>Route</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewPlanForm({ ...newPlanForm, raceCategory: "trail" })
                }
                className={`py-2 px-2 text-[10px] font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  newPlanForm.raceCategory === "trail"
                    ? "bg-[#CF9A61]/20 border-[#CF9A61] text-[#CF9A61]"
                    : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                <span>⛰️</span>
                <span>Trail</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewPlanForm({ ...newPlanForm, raceCategory: "piste" })
                }
                className={`py-2 px-2 text-[10px] font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  newPlanForm.raceCategory === "piste"
                    ? "bg-[#CF9A61]/20 border-[#CF9A61] text-[#CF9A61]"
                    : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                <span>🏟️</span>
                <span>Piste</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewPlanForm({ ...newPlanForm, raceCategory: "nature" })
                }
                className={`py-2 px-2 text-[10px] font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  newPlanForm.raceCategory === "nature"
                    ? "bg-[#CF9A61]/20 border-[#CF9A61] text-[#CF9A61]"
                    : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                <span>🌲</span>
                <span>Nature</span>
              </button>
            </div>
          </div>

          {/* SÉLECTION DISTANCE, DÉNIVELÉ & CHRONO CIBLE */}
          <div className="space-y-3 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800">
            {newPlanForm.raceCategory === "route" && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Distance Cible Route
                </label>
                <select
                  value={newPlanForm.roadPreset}
                  onChange={(e) =>
                    setNewPlanForm({ ...newPlanForm, roadPreset: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer font-bold"
                >
                  <option value="5 km">5 km</option>
                  <option value="10 km">10 km</option>
                  <option value="Semi-Marathon">Semi-Marathon (21.1 km)</option>
                  <option value="Marathon">Marathon (42.2 km)</option>
                  <option value="custom">Distance personnalisée (km)...</option>
                </select>

                {newPlanForm.roadPreset === "custom" && (
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 15"
                    value={newPlanForm.customDistance}
                    onChange={(e) =>
                      setNewPlanForm({
                        ...newPlanForm,
                        customDistance: e.target.value,
                      })
                    }
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 mt-2 focus:outline-none focus:border-[#CF9A61]"
                  />
                )}
              </div>
            )}

            {newPlanForm.raceCategory === "piste" && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Distance Piste
                </label>
                <select
                  value={newPlanForm.trackPreset}
                  onChange={(e) =>
                    setNewPlanForm({ ...newPlanForm, trackPreset: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer font-bold"
                >
                  <option value="400 m">400 m</option>
                  <option value="800 m">800 m</option>
                  <option value="1 500 m">1 500 m</option>
                  <option value="3 000 m">3 000 m</option>
                  <option value="5 000 m">5 000 m</option>
                  <option value="10 000 m">10 000 m</option>
                  <option value="custom">Distance personnalisée (mètres)...</option>
                </select>

                {newPlanForm.trackPreset === "custom" && (
                  <input
                    type="text"
                    placeholder="Ex: 2000 m"
                    value={newPlanForm.customDistance}
                    onChange={(e) =>
                      setNewPlanForm({
                        ...newPlanForm,
                        customDistance: e.target.value,
                      })
                    }
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 mt-2 focus:outline-none focus:border-[#CF9A61]"
                  />
                )}
              </div>
            )}

            {(newPlanForm.raceCategory === "trail" ||
              newPlanForm.raceCategory === "nature") && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 35"
                    value={newPlanForm.customDistance}
                    onChange={(e) =>
                      setNewPlanForm({
                        ...newPlanForm,
                        customDistance: e.target.value,
                      })
                    }
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                    Dénivelé (m D+)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 1500"
                    value={newPlanForm.elevationGain}
                    onChange={(e) =>
                      setNewPlanForm({
                        ...newPlanForm,
                        elevationGain: e.target.value,
                      })
                    }
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Chrono / Temps Cible (optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: 42:00, 1:28:00, 3:45:00"
                value={newPlanForm.targetTime}
                onChange={(e) =>
                  setNewPlanForm({ ...newPlanForm, targetTime: e.target.value })
                }
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>
          </div>

          <div className="space-y-3 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Début du plan
                </label>
                <input
                  type="date"
                  value={newPlanForm.startDate}
                  onChange={(e) =>
                    setNewPlanForm({ ...newPlanForm, startDate: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Date de l'évènement
                </label>
                <input
                  type="date"
                  value={newPlanForm.eventDate}
                  onChange={(e) =>
                    setNewPlanForm({ ...newPlanForm, eventDate: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#CF9A61]/10 border border-[#CF9A61]/20 rounded-xl p-2.5 text-[10px] text-[#CF9A61] font-medium flex items-center justify-between">
              <span>
                Du {safeFormatDateFr(newPlanForm.startDate)} au{" "}
                {safeFormatDateFr(newPlanForm.eventDate)} :
              </span>
              <span className="font-bold uppercase">
                {totalWeeks} semaine(s)
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
            >
              Créer les séances ➔
            </button>
          </div>
        </form>
      )}

      {/* ÉTAPE 2 : STRUCTURATION DU PROGRAMME */}
      {planCreationStep === 2 && (
        <div className="space-y-4">
          <div className="border-b border-stone-800/80 pb-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider">
                Étape 2/2 • Structuration du programme
              </span>
              <button
                type="button"
                onClick={() => setPlanCreationStep(1)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
              >
                ← Retour config
              </button>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-2 pt-1">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-stone-100">
                  Semaines du plan ({totalWeeks} sem.)
                </h3>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((wNum) => {
              const isOpen = openCreationWeeks[wNum] ?? wNum === 1;
              const wTypeObj = draftWeekTypes[wNum];
              const wLabel = getWeekTypeLabel(wTypeObj);
              const weekTypeBadgeClass =
                wTypeObj && WEEK_TYPES_CONFIG[wTypeObj.type]
                  ? WEEK_TYPES_CONFIG[wTypeObj.type].badgeClass
                  : "bg-stone-900 text-stone-300 border-stone-800";

              const weekWorkouts = draftWorkouts.filter(
                (w) => w.weekNumber === wNum
              );
              const nonRestCount = weekWorkouts.filter((w) => !w.isRest).length;
              const weeklyPlannedKm = calculateWeeklyPlannedKm(
                draftWorkouts,
                wNum
              );

              return (
                <div
                  key={wNum}
                  className="rounded-3xl border border-stone-800/80 bg-stone-950/80 overflow-hidden shadow-lg"
                >
                  <div
                    onClick={() => toggleCreationWeekAccordion(wNum)}
                    className="p-4 flex items-center justify-between text-left cursor-pointer hover:bg-stone-900/60 transition gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black uppercase text-stone-100">
                          Semaine {wNum}
                        </span>

                        {/* PHASE DE SEMAINE COLORÉE AVEC LA CONFIGURATION EXACTE */}
                        {wTypeObj && (
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${weekTypeBadgeClass}`}
                          >
                            {wLabel}
                          </span>
                        )}

                        <span className="text-[9.5px] font-black bg-stone-900 text-stone-100 border border-stone-800 px-2 py-0.5 rounded-md">
                          {weeklyPlannedKm.toFixed(1)} km
                        </span>
                      </div>

                      <p className="text-[11px] font-medium text-stone-400">
                        {getWeekDateRange(newPlanForm.startDate, wNum)} •{" "}
                        {nonRestCount} séance(s)
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={draftWeekTypes[wNum]?.type || "charge"}
                        onChange={(e) =>
                          onUpdateWeekType(
                            wNum,
                            e.target.value as WeekType,
                            draftWeekTypes[wNum]?.customLabel
                          )
                        }
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border focus:outline-none cursor-pointer ${
                          WEEK_TYPES_CONFIG[
                            draftWeekTypes[wNum]?.type || "charge"
                          ]?.badgeClass
                        }`}
                      >
                        <option value="recup" className="bg-stone-900 text-sky-300">
                          Récupération
                        </option>
                        <option value="charge" className="bg-stone-900 text-orange-300">
                          Montée en charge
                        </option>
                        <option value="specifique" className="bg-stone-900 text-purple-300">
                          Spécifique
                        </option>
                        <option value="affutage" className="bg-stone-900 text-pink-300">
                          Affûtage
                        </option>
                        <option value="custom" className="bg-stone-900 text-stone-200">
                          Autre...
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleCreationWeekAccordion(wNum)}
                        className="text-stone-400 text-xs font-bold bg-stone-900 px-2.5 py-1 rounded-xl border border-stone-800 cursor-pointer"
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 pt-2 space-y-4 border-t border-stone-800/60 bg-stone-900/40">
                      {DAYS_LIST.map((dayName, dIdx) => {
                        const dayWorkouts = weekWorkouts.filter(
                          (w) => w.dayIndex === dIdx
                        );
                        const exactDate = getExactDayDate(
                          newPlanForm.startDate,
                          wNum,
                          dIdx
                        );

                        return (
                          <div
                            key={dIdx}
                            className="space-y-2 pt-2 border-t border-stone-800/80 first:border-0 first:pt-0"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {/* JOURS DE LA SEMAINE EN BLANC PUR */}
                                <span className="font-black text-xs text-stone-100 uppercase tracking-wide">
                                  {dayName}
                                </span>
                                <span className="text-[10px] text-stone-400 font-medium">
                                  {exactDate}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => onAddWorkoutToDay(wNum, dIdx)}
                                className="text-[9px] font-bold bg-[#CF9A61]/10 border border-[#CF9A61]/30 text-[#CF9A61] px-2 py-1 rounded-lg hover:bg-[#CF9A61]/20 transition cursor-pointer flex items-center gap-1"
                              >
                                <span>➕</span> Entraînement sup.
                              </button>
                            </div>

                            <div className="space-y-2">
                              {dayWorkouts.map((workout, wIdx) => {
                                const typeConfig = getWorkoutTypeConfig(workout.type);
                                const rpeColor = getRpeGradientColor(workout.rpe);

                                if (workout.isRest) {
                                  return (
                                    <div
                                      key={workout.id}
                                      className="p-2.5 px-3 bg-stone-950/40 border border-stone-800/60 rounded-2xl flex justify-between items-center"
                                    >
                                      <span className="text-[11px] font-semibold text-stone-500 italic">
                                        Journée de repos
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateDraftWorkout(
                                            workout.id,
                                            "isRest",
                                            false
                                          );
                                          onEditWorkout(workout.id);
                                        }}
                                        className="text-[10px] font-bold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 border border-[#CF9A61]/30 px-3 py-1 rounded-xl transition cursor-pointer"
                                      >
                                        ➕ Créer une séance
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={workout.id}
                                    className={`p-3 rounded-2xl border border-l-4 ${typeConfig.borderClass} bg-stone-950/80 border-stone-800 space-y-2`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${typeConfig.badgeClass}`}
                                        >
                                          {typeConfig.label}
                                        </span>
                                        {dayWorkouts.length > 1 && (
                                          <span className="text-[9px] font-bold text-[#CF9A61] bg-stone-900 px-2 py-0.5 rounded border border-[#CF9A61]/30">
                                            {workout.sessionName ||
                                              `Séance #${wIdx + 1}`}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => onEditWorkout(workout.id)}
                                          className="text-[10px] font-extrabold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 border border-[#CF9A61]/30 px-2.5 py-1 rounded-xl transition cursor-pointer"
                                        >
                                          ✏️ Éditer la séance
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => onDeleteWorkout(workout.id)}
                                          className="text-stone-500 hover:text-red-400 text-xs px-1.5 py-0.5 font-bold transition cursor-pointer"
                                          title="Supprimer cette séance"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <h5 className="text-xs font-bold text-stone-100">
                                        {workout.title}
                                      </h5>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* KM EN BLANC PUR */}
                                        {workout.km && (
                                          <span className="text-[9px] font-extrabold bg-stone-900 text-stone-100 px-2 py-0.5 rounded border border-stone-800">
                                            {workout.km} km
                                          </span>
                                        )}

                                        {/* RPE AVEC LA COULEUR DU GRADIENT D'EFFORT */}
                                        {workout.rpe && (
                                          <span
                                            style={{
                                              color: rpeColor,
                                              borderColor: `${rpeColor}40`,
                                              backgroundColor: `${rpeColor}15`,
                                            }}
                                            className="text-[9px] font-bold px-2 py-0.5 rounded border"
                                          >
                                            RPE {workout.rpe}/10
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {workout.description && (
                                      <p className="text-[10.5px] text-stone-400 line-clamp-1">
                                        {workout.description}
                                      </p>
                                    )}

                                    {workout.steps && workout.steps.length > 0 && (
                                      <div className="text-[9.5px] font-medium text-[#CF9A61]/90 pt-1 border-t border-stone-800/60">
                                        {workout.steps.length} bloc(s)
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onFinalizePlan}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
            >
              Valider le plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};