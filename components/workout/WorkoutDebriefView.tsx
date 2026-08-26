// app/components/workout/WorkoutDebriefView.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Workout, Shoe } from "../../types";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";
import { WorkoutTelemetryModal } from "./WorkoutTelemetryModal";

interface WorkoutDebriefViewProps {
  workout: Workout;
  shoes?: Shoe[];
  onClose: () => void;
  onSaveDebrief: (data: {
    workoutId: string;
    completedRpe: number;
    comment: string;
    shoeId: string;
    completedKm: number;
    completedTimeMinutes: number;
    completedElevationGain: number;
    importedActivityName?: string;
    activityTelemetry?: any;
  }) => void;
  onDeleteImport?: (workoutId: string) => void;
}

const getRpeTheme = (rpe: number) => {
  if (rpe <= 3) return { text: "#10b981", label: "Facile / Récupération" };
  if (rpe <= 5) return { text: "#f59e0b", label: "Modéré / Endurance" };
  if (rpe <= 7) return { text: "#f97316", label: "Soutenu / Seuil" };
  if (rpe <= 9) return { text: "#ef4444", label: "Très difficile" };
  return { text: "#dc2626", label: "Effort Maximal" };
};

export const WorkoutDebriefView: React.FC<WorkoutDebriefViewProps> = ({
  workout,
  shoes = [],
  onClose,
  onSaveDebrief,
  onDeleteImport,
}) => {
  const safeShoes = Array.isArray(shoes) ? shoes : [];
  const targetKm = parseFloat(String(workout?.km || "0")) || 0;
  
  const initialTotalMinutes =
    workout?.completedTimeMinutes !== undefined && !isNaN(Number(workout.completedTimeMinutes))
      ? Number(workout.completedTimeMinutes)
      : Math.round(targetKm > 0 ? targetKm * 5.2 : 45);

  const [distanceKm, setDistanceKm] = useState<number>(
    workout?.completedKm !== undefined && !isNaN(Number(workout.completedKm))
      ? Number(workout.completedKm)
      : targetKm
  );

  const [hours, setHours] = useState<number>(Math.floor(initialTotalMinutes / 60) || 0);
  const [minutes, setMinutes] = useState<number>(Math.floor(initialTotalMinutes % 60) || 0);
  const [seconds, setSeconds] = useState<number>(0);

  const [elevationGain, setElevationGain] = useState<number>(
    workout?.completedElevationGain ?? 0
  );
  const [avgHeartRate, setAvgHeartRate] = useState<string>(
    (workout as any)?.avgHr ? String((workout as any).avgHr) : ""
  );

  const [completedRpe, setCompletedRpe] = useState<number>(
    workout?.completedRpe ?? (workout?.rpe ? parseInt(String(workout.rpe), 10) || 5 : 5)
  );
  const [comment, setComment] = useState<string>(workout?.athleteComment || "");
  const [selectedShoeId, setSelectedShoeId] = useState<string>(
    workout?.shoeId || safeShoes.find((s) => s.isActive)?.id || ""
  );

  const [activeTabMode, setActiveTabMode] = useState<"manual" | "watch">("manual");
  const [importedActivityName, setImportedActivityName] = useState<string>(
    workout?.importedActivityName || ""
  );
  const [isActivityImported, setIsActivityImported] = useState<boolean>(
    Boolean(workout?.importedActivityName)
  );
  const [activityTelemetry, setActivityTelemetry] = useState<any>(
    (workout as any)?.activityTelemetry || (workout as any)?.activity_telemetry || null
  );
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);

  const [connectedApps, setConnectedApps] = useState<{
    garmin: boolean;
    coros: boolean;
    strava: boolean;
  }>({ garmin: false, coros: false, strava: false });

  const [fetchLoading, setFetchLoading] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState<boolean>(false);

  const isAlreadyDebriefed = Boolean(
    workout?.completed || workout?.completedKm !== undefined || workout?.completedRpe !== undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setConnectedApps({
        garmin: Boolean(localStorage.getItem("volaris_garmin_email") && localStorage.getItem("volaris_garmin_pwd")),
        coros: Boolean(localStorage.getItem("volaris_coros_email") && localStorage.getItem("volaris_coros_pwd")),
        strava: localStorage.getItem("volaris_strava_connected") === "true",
      });
    }
  }, []);

  const totalTimeSeconds = useMemo(() => {
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const s = Number(seconds) || 0;
    return (h * 3600) + (m * 60) + s;
  }, [hours, minutes, seconds]);

  const calculatedPace = useMemo(() => {
    if (!distanceKm || distanceKm <= 0 || totalTimeSeconds <= 0) return null;
    const secPerKm = Math.round(totalTimeSeconds / distanceKm);
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    const speedKmh = ((distanceKm / totalTimeSeconds) * 3600).toFixed(1);
    return {
      paceFormatted: `${m}:${s < 10 ? "0" : ""}${s}`,
      speedKmh,
    };
  }, [distanceKm, totalTimeSeconds]);

  const handleFetchActivities = async (platform: "garmin" | "coros" | "strava") => {
    setFetchLoading(platform);
    setSyncError(null);

    let apiUrl = "";
    let payload: any = { limit: 10 };

    if (platform === "garmin") {
      apiUrl = "/api/garmin-activities";
      payload.email = localStorage.getItem("volaris_garmin_email");
      payload.password = localStorage.getItem("volaris_garmin_pwd");
    } else if (platform === "coros") {
      apiUrl = "/api/coros-activities";
      payload.email = localStorage.getItem("volaris_coros_email");
      payload.password = localStorage.getItem("volaris_coros_pwd");
    } else if (platform === "strava") {
      apiUrl = "/api/strava-activities";
      payload.email = localStorage.getItem("volaris_strava_email");
    }

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur de récupération ${platform.toUpperCase()}`);

      if (!data.activities || data.activities.length === 0) {
        setSyncError(`Aucune course récente trouvée sur votre compte ${platform.toUpperCase()}.`);
        return;
      }

      if (data.activities.length === 1) {
        applyActivity(data.activities[0], platform);
      } else {
        setActivitiesList(data.activities.map((a: any) => ({ ...a, platform })));
        setShowActivityPicker(true);
      }
    } catch (err: any) {
      setSyncError(`❌ ${err.message}`);
    } finally {
      setFetchLoading(null);
    }
  };

  const applyActivity = (act: any, platformName?: string) => {
    const dist = parseFloat(String(act?.distanceKm)) || 0;
    const durSec = act?.durationSeconds || ((act?.durationMinutes || 0) * 60);
    const elev = parseInt(String(act?.elevationGain || 0), 10) || 0;

    setDistanceKm(dist);
    setHours(Math.floor(durSec / 3600));
    setMinutes(Math.floor((durSec % 3600) / 60));
    setSeconds(Math.round(durSec % 60));
    setElevationGain(elev);

    if (act?.avgHr) setAvgHeartRate(String(act.avgHr));
    if (act?.activityTelemetry) setActivityTelemetry(act.activityTelemetry);

    const platform = (platformName || act?.platform || "Montre").toUpperCase();
    setImportedActivityName(`${act?.title || "Course"} (${platform} • ${act?.date || ""})`);
    setIsActivityImported(true);
    setShowActivityPicker(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const completedTotalMinutes = Math.round((totalTimeSeconds / 60) * 10) / 10;

    onSaveDebrief({
      workoutId: workout.id,
      completedRpe,
      comment,
      shoeId: selectedShoeId,
      completedKm: Number(distanceKm) || 0,
      completedTimeMinutes: completedTotalMinutes || 0,
      completedElevationGain: Number(elevationGain) || 0,
      importedActivityName: isActivityImported ? importedActivityName : undefined,
      activityTelemetry: isActivityImported ? activityTelemetry : undefined,
    });

    onClose();
  };

  const rpeTheme = getRpeTheme(completedRpe);

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-5 shadow-2xl animate-fadeIn my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        
        {/* MODALE TÉLÉMÉTRIE */}
        {showTelemetryModal && (
          <WorkoutTelemetryModal
            workout={{
              ...workout,
              completedKm: distanceKm,
              completedTimeMinutes: totalTimeSeconds / 60,
              completedElevationGain: elevationGain,
              actualAvgHr: avgHeartRate || undefined,
              title: importedActivityName || workout?.title,
              activityTelemetry,
            } as any}
            onClose={() => setShowTelemetryModal(false)}
          />
        )}

        {/* EN-TÊTE */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-black text-[#CF9A61] uppercase tracking-widest block">
              Débriefing de la séance
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout?.title || workout?.sessionName || "Séance terminée"}
            </h3>
            {targetKm > 0 && (
              <p className="text-[11px] text-stone-400 font-semibold mt-0.5">
                Objectif initial : <strong className="text-stone-300">{targetKm} km</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* SÉLECTEUR DE MODE */}
        <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTabMode("manual")}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition cursor-pointer ${
              activeTabMode === "manual"
                ? "bg-[#CF9A61] text-stone-950 shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ✏️ Saisie Manuelle
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMode("watch")}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTabMode === "watch"
                ? "bg-stone-800 text-stone-100 shadow-md border border-stone-700"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <span>⌚ Importer Montre</span>
            {isActivityImported && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* SAISIE MANUELLE */}
        {activeTabMode === "manual" && (
          <div className="space-y-4 animate-fadeIn">
            {/* DISTANCE */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-stone-400">
                  Distance Parcourue
                </span>
                <span className="text-xs font-black text-[#CF9A61]">
                  {(Number(distanceKm) || 0).toFixed(2)} km
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={distanceKm !== undefined ? distanceKm : ""}
                  onChange={(e) => setDistanceKm(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-lg font-black font-mono text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
                <span className="text-sm font-bold text-stone-400">km</span>
              </div>

              <div className="flex gap-1.5 pt-1">
                {[+0.5, +1, +2, +5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setDistanceKm((prev) => Math.max(0, Math.round(((Number(prev) || 0) + delta) * 100) / 100))}
                    className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[10px] font-bold text-stone-300 rounded-lg transition cursor-pointer"
                  >
                    +{delta} km
                  </button>
                ))}
              </div>
            </div>

            {/* TEMPS */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-stone-400">
                  Temps Écoulé
                </span>
                {calculatedPace && (
                  <span className="text-xs font-black text-[#CDCF61]">
                    ⚡ {calculatedPace.paceFormatted} /km ({calculatedPace.speedKmh} km/h)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={hours !== undefined ? hours : ""}
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-full text-center text-base font-black font-mono text-stone-100 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-stone-400 pr-1">h</span>
                  </div>
                  <span className="text-[8px] uppercase font-bold text-stone-400">Heures</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes !== undefined ? minutes : ""}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                      placeholder="00"
                      className="w-full text-center text-base font-black font-mono text-stone-100 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-stone-400 pr-1">min</span>
                  </div>
                  <span className="text-[8px] uppercase font-bold text-stone-400">Minutes</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds !== undefined ? seconds : ""}
                      onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                      placeholder="00"
                      className="w-full text-center text-base font-black font-mono text-stone-100 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-stone-400 pr-1">sec</span>
                  </div>
                  <span className="text-[8px] uppercase font-bold text-stone-400">Secondes</span>
                </div>
              </div>
            </div>

            {/* DÉNIVELÉ & CARDIO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-stone-400 block">
                  ⛰️ Dénivelé (D+)
                </span>
                <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={elevationGain !== undefined ? elevationGain : ""}
                    onChange={(e) => setElevationGain(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full text-sm font-black font-mono text-emerald-400 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">m</span>
                </div>
              </div>

              <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-stone-400 block">
                  ❤️ Cardio Moyen
                </span>
                <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5">
                  <input
                    type="number"
                    min="40"
                    max="230"
                    value={avgHeartRate}
                    onChange={(e) => setAvgHeartRate(e.target.value)}
                    placeholder="145"
                    className="w-full text-sm font-black font-mono text-rose-400 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">bpm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IMPORT MONTRE */}
        {activeTabMode === "watch" && (
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3 animate-fadeIn">
            <span className="text-xs font-black uppercase text-stone-200 block">
              Synchronisation montre
            </span>

            {isActivityImported && importedActivityName ? (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] font-bold uppercase text-emerald-400 block">
                    ✓ Activité liée
                  </span>
                  <p className="text-xs font-bold text-stone-200 truncate">
                    {importedActivityName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTelemetryModal(true)}
                  className="text-[10px] font-black uppercase text-[#CDCF61] bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-stone-700 transition cursor-pointer shrink-0"
                >
                  📊 Analyser
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {connectedApps.garmin && (
                    <button
                      type="button"
                      onClick={() => handleFetchActivities("garmin")}
                      disabled={Boolean(fetchLoading)}
                      className="p-3 bg-stone-900 hover:bg-[#007CC3]/20 border border-[#007CC3]/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <GarminLogo className="w-5 h-5" />
                      <span className="text-[10px] font-black text-stone-200 uppercase">Garmin</span>
                    </button>
                  )}
                  {connectedApps.coros && (
                    <button
                      type="button"
                      onClick={() => handleFetchActivities("coros")}
                      disabled={Boolean(fetchLoading)}
                      className="p-3 bg-stone-900 hover:bg-[#F8283B]/20 border border-[#F8283B]/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <CorosLogo className="w-5 h-5" />
                      <span className="text-[10px] font-black text-stone-200 uppercase">COROS</span>
                    </button>
                  )}
                  {connectedApps.strava && (
                    <button
                      type="button"
                      onClick={() => handleFetchActivities("strava")}
                      disabled={Boolean(fetchLoading)}
                      className="p-3 bg-stone-900 hover:bg-[#FC5200]/20 border border-[#FC5200]/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <StravaLogo className="w-5 h-5" />
                      <span className="text-[10px] font-black text-stone-200 uppercase">Strava</span>
                    </button>
                  )}
                </div>

                {fetchLoading && (
                  <p className="text-[10px] text-center font-bold text-[#CF9A61] animate-pulse">
                    Récupération de vos sorties...
                  </p>
                )}
              </div>
            )}

            {syncError && (
              <p className="text-[10px] text-rose-400 font-bold text-center">
                {syncError}
              </p>
            )}

            {showActivityPicker && (
              <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 space-y-2">
                <span className="text-[9px] font-bold text-stone-400 uppercase block">
                  Sélectionnez la course :
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {activitiesList.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => applyActivity(act, act.platform)}
                      className="p-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-lg flex items-center justify-between cursor-pointer transition text-xs"
                    >
                      <div>
                        <div className="font-bold text-stone-200">{act.title}</div>
                        <div className="text-[9px] text-stone-400">
                          {act.date} • {act.distanceKm} km • {act.durationMinutes} min
                        </div>
                      </div>
                      <span className="text-[#CF9A61] font-mono font-black text-xs">
                        {act.avgPace} /km ➔
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FORMULAIRE DÉBRIEFING */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Chaussures */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-stone-400">
              👟 Chaussures utilisées
            </label>
            <select
              value={selectedShoeId}
              onChange={(e) => setSelectedShoeId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
            >
              <option value="">-- Aucune paire spécifique --</option>
              {safeShoes.map((shoe) => (
                <option key={shoe.id} value={shoe.id}>
                  {shoe.brand} {shoe.name} ({Number(shoe.currentKm || 0).toFixed(0)} / {shoe.maxKm} km)
                </option>
              ))}
            </select>
          </div>

          {/* RPE */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase font-bold text-stone-400">
                Effort Ressenti (RPE)
              </label>
              <span className="text-xs font-black" style={{ color: rpeTheme.text }}>
                {completedRpe}/10 • {rpeTheme.label}
              </span>
            </div>

            <div className="relative w-full h-3.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 p-0.5 mt-2">
              <input
                type="range"
                min="1"
                max="10"
                value={completedRpe}
                onChange={(e) => setCompletedRpe(parseInt(e.target.value, 10))}
                className="w-full opacity-0 cursor-pointer absolute inset-0 z-10"
              />
              <div
                style={{ left: `calc(${((completedRpe - 1) / 9) * 100}% - 7px)` }}
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-stone-950 rounded-full shadow-md pointer-events-none transition-all"
              />
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-stone-400">
              Commentaires & Sensations (Optionnel)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Sensations, météo, fatigue..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] resize-none custom-scrollbar"
            />
          </div>

          {/* ACTIONS */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                Enregistrer le débrief
              </button>
            </div>

            {isAlreadyDebriefed && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Voulez-vous annuler le débriefing de cette séance ?")) {
                    if (onDeleteImport) onDeleteImport(workout.id);
                    onClose();
                  }
                }}
                className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                🗑️ Annuler le débriefing
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};