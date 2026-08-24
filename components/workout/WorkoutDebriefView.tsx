// app/components/workout/WorkoutDebriefView.tsx

import React, { useState, useEffect } from "react";
import { Workout, Shoe } from "../../types";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";
import { WorkoutTelemetryModal } from "./WorkoutTelemetryModal";

interface WorkoutDebriefViewProps {
  workout: Workout;
  shoes: Shoe[];
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
  }) => void;
  onDeleteImport?: (workoutId: string) => void;
}

const getRpeColor = (rpe: number) => {
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

export const WorkoutDebriefView: React.FC<WorkoutDebriefViewProps> = ({
  workout,
  shoes,
  onClose,
  onSaveDebrief,
  onDeleteImport,
}) => {
  const defaultKm = parseFloat(String(workout.km || "0")) || 0;

  const [completedRpe, setCompletedRpe] = useState<number>(
    workout.completedRpe ?? (workout.rpe ? parseInt(String(workout.rpe), 10) : 5)
  );
  const [comment, setComment] = useState<string>(workout.athleteComment || "");
  const [selectedShoeId, setSelectedShoeId] = useState<string>(
    workout.shoeId || shoes.find((s) => s.isActive)?.id || ""
  );

  const [completedKm, setCompletedKm] = useState<number>(
    workout.completedKm !== undefined ? workout.completedKm : defaultKm
  );
  const [completedTimeMinutes, setCompletedTimeMinutes] = useState<number>(
    workout.completedTimeMinutes !== undefined
      ? workout.completedTimeMinutes
      : Math.round(defaultKm * 5.5)
  );
  const [completedElevationGain, setCompletedElevationGain] = useState<number>(
    workout.completedElevationGain ?? 0
  );

  const [avgHeartRate, setAvgHeartRate] = useState<number | null>(null);
  const [maxHeartRate, setMaxHeartRate] = useState<number | null>(null);

  const [importedActivityName, setImportedActivityName] = useState<string>(
    workout.importedActivityName || ""
  );
  const [isActivityImported, setIsActivityImported] = useState<boolean>(
    Boolean(workout.importedActivityName)
  );

  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);

  // Détection des plateformes réellement liées dans le profil
  const [connectedApps, setConnectedApps] = useState<{
    garmin: boolean;
    coros: boolean;
    strava: boolean;
  }>({
    garmin: false,
    coros: false,
    strava: false,
  });

  const [fetchLoading, setFetchLoading] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState<boolean>(false);

  const isAlreadyDebriefed = Boolean(
    workout.completed || workout.completedKm !== undefined || workout.completedRpe !== undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasGarmin = Boolean(
        localStorage.getItem("volaris_garmin_email") && localStorage.getItem("volaris_garmin_pwd")
      );
      const hasCoros = Boolean(
        localStorage.getItem("volaris_coros_email") && localStorage.getItem("volaris_coros_pwd")
      );
      const hasStrava = localStorage.getItem("volaris_strava_connected") === "true";

      setConnectedApps({
        garmin: hasGarmin,
        coros: hasCoros,
        strava: hasStrava,
      });
    }
  }, []);

  const connectedList = (
    Object.keys(connectedApps) as Array<keyof typeof connectedApps>
  ).filter((key) => connectedApps[key]);

  // Appel de l'API dédiée selon la montre choisie
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
    const dist = parseFloat(String(act.distanceKm)) || 0;
    const dur = parseInt(String(act.durationMinutes), 10) || 0;
    const elev = parseInt(String(act.elevationGain || 0), 10) || 0;
    const hr = parseInt(String(act.avgHr || 0), 10) || null;
    const maxHr = parseInt(String(act.maxHr || 0), 10) || null;

    setCompletedKm(dist);
    setCompletedTimeMinutes(dur);
    setCompletedElevationGain(elev);
    setAvgHeartRate(hr);
    setMaxHeartRate(maxHr);

    const platform = (platformName || act.platform || "Montre").toUpperCase();
    const label = `${act.title || "Course"} (${platform} • ${act.date || ""})`;
    setImportedActivityName(label);
    setIsActivityImported(true);
    setShowActivityPicker(false);
  };

  const handleCancelDebrief = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Voulez-vous annuler complètement le débriefing de cette séance et réinitialiser vos statistiques ?")) {
      if (onDeleteImport) onDeleteImport(workout.id);
      onClose();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveDebrief({
      workoutId: workout.id,
      completedRpe,
      comment,
      shoeId: selectedShoeId,
      completedKm,
      completedTimeMinutes,
      completedElevationGain,
      importedActivityName: isActivityImported ? importedActivityName : undefined,
    });

    onClose();
  };

  const renderActivityBrandLogo = (nameStr: string) => {
    const lower = nameStr.toLowerCase();
    if (lower.includes("strava")) return <StravaLogo className="w-4 h-4 shrink-0" />;
    if (lower.includes("coros")) return <CorosLogo className="w-4 h-4 shrink-0" />;
    return <GarminLogo className="w-4 h-4 shrink-0" />;
  };

  const rpeColor = getRpeColor(completedRpe);

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* MODALE D'ANALYSE GRAPHIQUE */}
        {showTelemetryModal && (
          <WorkoutTelemetryModal
            workout={{
              ...workout,
              completedKm,
              completedTimeMinutes,
              completedElevationGain,
              title: importedActivityName || workout.title,
            }}
            onClose={() => setShowTelemetryModal(false)}
          />
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
              Bilan & Débriefing Post-Séance
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* SECTION SYNCHRONISATION MONTRES */}
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-200">
              ⌚ Récupérer la sortie de la montre
            </span>
            {isActivityImported && (
              <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                ✓ Importée
              </span>
            )}
          </div>

          {isActivityImported && importedActivityName ? (
            <div className="space-y-2">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0">
                    {renderActivityBrandLogo(importedActivityName)}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="text-[9px] font-bold uppercase text-stone-400 block">
                      Activité liée
                    </span>
                    <p className="text-xs font-bold text-stone-200 truncate">
                      {importedActivityName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActivityImported(false)}
                  className="text-[10px] font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0"
                >
                  🔄 Changer
                </button>
              </div>

              {/* BOUTON D'ACCÈS AUX GRAPHIQUES POUR L'ATHLÈTE */}
              <button
                type="button"
                onClick={() => setShowTelemetryModal(true)}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-[#CDCF61]/50 rounded-xl text-xs font-black uppercase text-[#CDCF61] tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>📈 Voir les graphiques de la sortie (FC, Allure, D+)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* CAS 0 : AUCUN COMPTE LIÉ */}
              {connectedList.length === 0 && (
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-stone-400">
                    Connectez votre montre dans l'onglet <strong className="text-[#CF9A61]">Profil</strong> (Garmin, COROS ou Strava) pour importer directement vos sorties réelles.
                  </p>
                </div>
              )}

              {/* CAS 1 : UN SEUL COMPTE LIÉ (BOUTON UNIQUE DIRECT) */}
              {connectedList.length === 1 && (
                <button
                  type="button"
                  onClick={() => handleFetchActivities(connectedList[0])}
                  disabled={Boolean(fetchLoading)}
                  style={{
                    backgroundColor:
                      connectedList[0] === "garmin"
                        ? "#007CC3"
                        : connectedList[0] === "coros"
                        ? "#F8283B"
                        : "#FC5200",
                  }}
                  className="w-full py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:brightness-110 disabled:opacity-50"
                >
                  {connectedList[0] === "garmin" && <GarminLogo className="w-4 h-4" />}
                  {connectedList[0] === "coros" && <CorosLogo className="w-4 h-4" />}
                  {connectedList[0] === "strava" && <StravaLogo className="w-4 h-4" />}
                  <span>
                    {fetchLoading
                      ? "Récupération des données..."
                      : `Importer depuis ${connectedList[0].toUpperCase()}`}
                  </span>
                </button>
              )}

              {/* CAS 2 : PLUSIEURS COMPTES LIÉS */}
              {connectedList.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-stone-400 uppercase block text-center">
                    Sélectionnez votre montre connectée :
                  </span>
                  <div
                    className={`grid gap-2 ${
                      connectedList.length === 2 ? "grid-cols-2" : "grid-cols-3"
                    }`}
                  >
                    {connectedApps.garmin && (
                      <button
                        type="button"
                        onClick={() => handleFetchActivities("garmin")}
                        disabled={Boolean(fetchLoading)}
                        className="p-2.5 bg-stone-900 hover:bg-[#007CC3]/20 border border-[#007CC3]/40 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <GarminLogo className="w-4 h-4" />
                        <span className="text-xs font-bold text-stone-200 uppercase">Garmin</span>
                      </button>
                    )}
                    {connectedApps.coros && (
                      <button
                        type="button"
                        onClick={() => handleFetchActivities("coros")}
                        disabled={Boolean(fetchLoading)}
                        className="p-2.5 bg-stone-900 hover:bg-[#F8283B]/20 border border-[#F8283B]/40 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <CorosLogo className="w-4 h-4" />
                        <span className="text-xs font-bold text-stone-200 uppercase">COROS</span>
                      </button>
                    )}
                    {connectedApps.strava && (
                      <button
                        type="button"
                        onClick={() => handleFetchActivities("strava")}
                        disabled={Boolean(fetchLoading)}
                        className="p-2.5 bg-stone-900 hover:bg-[#FC5200]/20 border border-[#FC5200]/40 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <StravaLogo className="w-4 h-4" />
                        <span className="text-xs font-bold text-stone-200 uppercase">Strava</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {syncError && (
            <p className="text-[10px] text-[#ef4444] font-bold text-center animate-fadeIn">
              {syncError}
            </p>
          )}

          {/* SÉLECTEUR DE SORTIES RÉCENTES RÉCUPÉRÉES DE LA MONTRE */}
          {showActivityPicker && (
            <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-stone-400 uppercase">
                  Sélectionnez la course réalisée :
                </span>
                <button
                  type="button"
                  onClick={() => setShowActivityPicker(false)}
                  className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {activitiesList.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => applyActivity(act, act.platform)}
                    className="p-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-lg flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {renderActivityBrandLogo(act.platform || act.title)}
                      <div>
                        <div className="font-bold text-stone-200">{act.title}</div>
                        <div className="text-[9px] text-stone-400">
                          {act.date} • {act.distanceKm} km • {act.durationMinutes} min
                        </div>
                      </div>
                    </div>
                    <span className="text-[#CF9A61] font-mono text-xs font-black">
                      {act.avgPace} /km ➔
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RÉCAPITULATIF DES MÉTRIQUES RÉELLES */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800">
              <span className="block text-[8px] font-bold text-stone-400 uppercase">Distance</span>
              <input
                type="number"
                step="0.01"
                value={completedKm}
                onChange={(e) => setCompletedKm(parseFloat(e.target.value) || 0)}
                className="w-full text-center text-xs font-black text-[#CF9A61] bg-transparent focus:outline-none"
              />
              <span className="text-[8px] text-stone-500">km</span>
            </div>

            <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800">
              <span className="block text-[8px] font-bold text-stone-400 uppercase">Durée</span>
              <input
                type="number"
                value={completedTimeMinutes}
                onChange={(e) => setCompletedTimeMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full text-center text-xs font-black text-[#CF9A61] bg-transparent focus:outline-none"
              />
              <span className="text-[8px] text-stone-500">min</span>
            </div>

            <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800">
              <span className="block text-[8px] font-bold text-stone-400 uppercase">Dénivelé</span>
              <input
                type="number"
                value={completedElevationGain}
                onChange={(e) => setCompletedElevationGain(parseInt(e.target.value, 10) || 0)}
                className="w-full text-center text-xs font-black text-[#CF9A61] bg-transparent focus:outline-none"
              />
              <span className="text-[8px] text-stone-500">m D+</span>
            </div>
          </div>

          {avgHeartRate && (
            <div className="flex justify-around items-center bg-stone-900/40 p-2 rounded-xl border border-stone-800/80 text-[10px]">
              <span className="text-stone-400">
                ❤️ FC Moyenne : <strong className="text-stone-200">{avgHeartRate} bpm</strong>
              </span>
              {maxHeartRate && (
                <span className="text-stone-400">
                  ⚡ FC Max : <strong className="text-stone-200">{maxHeartRate} bpm</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* FORMULAIRE DÉBRIEFING */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-stone-400">
              👟 Chaussures utilisées
            </label>
            <select
              value={selectedShoeId}
              onChange={(e) => setSelectedShoeId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
            >
              <option value="">-- Sélectionner une paire --</option>
              {shoes.map((shoe) => (
                <option key={shoe.id} value={shoe.id}>
                  {shoe.brand} {shoe.name} ({shoe.currentKm.toFixed(0)} / {shoe.maxKm} km)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase font-bold text-stone-400">
                Effort Réellement Ressenti (RPE)
              </label>
              <span className="text-xs font-black" style={{ color: rpeColor }}>
                RPE {completedRpe} / 10
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

            <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider pt-1">
              <span className="text-emerald-400">1-3 Facile</span>
              <span className="text-amber-400">4-7 Soutenu</span>
              <span className="text-red-500">8-10 Maximal</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-stone-400">
              Commentaires & Sensations (Optionnel)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex : Bonnes sensations, un peu lourd sur les 2 dernières répétitions..."
              className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] custom-scrollbar resize-none"
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
                className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                Enregistrer le débrief
              </button>
            </div>

            {isAlreadyDebriefed && (
              <button
                type="button"
                onClick={handleCancelDebrief}
                className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                🗑️ Annuler le débriefing de cette séance
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};