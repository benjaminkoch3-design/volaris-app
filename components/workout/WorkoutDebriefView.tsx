// app/components/workout/WorkoutDebriefView.tsx

import React, { useState, useEffect } from "react";
import { Workout, Shoe } from "../../types";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";

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
  if (rpe <= 3) return "#10b981"; // Vert
  if (rpe <= 5) return "#f59e0b"; // Ambre
  if (rpe <= 7) return "#f97316"; // Orange
  return "#ef4444"; // Rouge
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

  const [avgHeartRate, setAvgHeartRate] = useState<number | null>(
    workout.actualAvgHr ? parseInt(workout.actualAvgHr, 10) : null
  );
  const [maxHeartRate, setMaxHeartRate] = useState<number | null>(
    workout.actualMaxHr ? parseInt(workout.actualMaxHr, 10) : null
  );

  const [importedActivityName, setImportedActivityName] = useState<string>(
    workout.importedActivityName || ""
  );
  const [isActivityImported, setIsActivityImported] = useState<boolean>(
    Boolean(workout.importedActivityName)
  );

  const [hasGarmin, setHasGarmin] = useState<boolean>(false);
  const [garminLoading, setGarminLoading] = useState<boolean>(false);
  const [garminError, setGarminError] = useState<string | null>(null);
  const [garminActivities, setGarminActivities] = useState<any[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState<boolean>(false);

  const isAlreadyDebriefed = Boolean(
    workout.completed || workout.completedKm !== undefined || workout.completedRpe !== undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gEmail = localStorage.getItem("volaris_garmin_email");
      const gPwd = localStorage.getItem("volaris_garmin_pwd");
      setHasGarmin(Boolean(gEmail && gPwd));
    }
  }, []);

  const handleFetchGarminActivities = async () => {
    if (typeof window === "undefined") return;
    const email = localStorage.getItem("volaris_garmin_email");
    const password = localStorage.getItem("volaris_garmin_pwd");

    if (!email || !password) {
      setGarminError("Veuillez connecter votre compte Garmin dans l'onglet Profil.");
      return;
    }

    setGarminLoading(true);
    setGarminError(null);

    try {
      const res = await fetch("/api/garmin-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, limit: 5 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de récupérer les activités Garmin.");

      if (!data.activities || data.activities.length === 0) {
        setGarminError("Aucune activité de course récente trouvée sur Garmin Connect.");
        return;
      }

      if (data.activities.length === 1) {
        applyGarminActivity(data.activities[0]);
      } else {
        setGarminActivities(data.activities);
        setShowActivityPicker(true);
      }
    } catch (err: any) {
      setGarminError(`❌ ${err.message}`);
    } finally {
      setGarminLoading(false);
    }
  };

  const applyGarminActivity = (act: any) => {
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

    const label = `${act.title || "Course Garmin"} (${act.date || ""})`;
    setImportedActivityName(label);
    setIsActivityImported(true);
    setShowActivityPicker(false);
  };

  const handleCancelDebrief = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Voulez-vous annuler complètement le débriefing de cette séance et réinitialiser vos statistiques ?")) {
      if (onDeleteImport) {
        onDeleteImport(workout.id);
      }
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
    if (lower.includes("strava")) {
      return <StravaLogo className="w-4 h-4 shrink-0" />;
    }
    if (lower.includes("coros")) {
      return <CorosLogo className="w-4 h-4 shrink-0" />;
    }
    return <GarminLogo className="w-4 h-4 shrink-0" />;
  };

  const rpeColor = getRpeColor(completedRpe);

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fadeIn my-auto">
        
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

        {/* SECTION SYNCHRONISATION MONTRES & APPAREILS */}
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-200 flex items-center gap-1.5">
              <GarminLogo className="w-4 h-4" />
              <span>Synchronisation Activité</span>
            </span>
            {isActivityImported && (
              <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                ✓ Importée
              </span>
            )}
          </div>

          {isActivityImported && importedActivityName ? (
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

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleFetchGarminActivities}
                  disabled={garminLoading}
                  className="text-[10px] font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  {garminLoading ? "⏳" : "🔄 Changer"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {hasGarmin ? (
                <button
                  type="button"
                  onClick={handleFetchGarminActivities}
                  disabled={garminLoading}
                  className="w-full py-2.5 px-3 bg-[#007CC3] hover:bg-[#006bb3] text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  <GarminLogo className="w-4 h-4" />
                  <span>{garminLoading ? "Récupération..." : "Importer depuis Garmin Connect"}</span>
                </button>
              ) : (
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-stone-400">
                    Connectez votre montre dans l'onglet <strong className="text-[#CF9A61]">Profil</strong> pour importer automatiquement vos données Garmin, COROS ou Strava.
                  </p>
                </div>
              )}
            </>
          )}

          {garminError && (
            <p className="text-[10px] text-[#ef4444] font-bold text-center animate-fadeIn">
              {garminError}
            </p>
          )}

          {showActivityPicker && (
            <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-stone-400 uppercase">
                  Sélectionnez votre sortie :
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
                {garminActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => applyGarminActivity(act)}
                    className="p-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-lg flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <GarminLogo className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="font-bold text-stone-200">{act.title}</div>
                        <div className="text-[9px] text-stone-400">
                          {act.date} • {act.distanceKm} km • {act.durationMinutes} min
                        </div>
                      </div>
                    </div>
                    <span className="text-[#007CC3] font-mono text-xs font-black">
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
              <span className="text-stone-400">❤️ FC Moyenne : <strong className="text-stone-200">{avgHeartRate} bpm</strong></span>
              {maxHeartRate && <span className="text-stone-400">⚡ FC Max : <strong className="text-stone-200">{maxHeartRate} bpm</strong></span>}
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

            {/* BOUTON D'ANNULATION DU DÉBRIEFING */}
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