// src/components/workout/WorkoutEditor.tsx

import React, { useState, useEffect } from "react";
import { Workout, WorkoutStep, LibraryWorkout, LibraryCategory, UserRole } from "../../types";
import { WORKOUT_TYPES_CONFIG } from "../../constants";
import { calculateStepMetrics, generatePaceProfile, getWorkoutTypeConfig } from "../../utils/calculations";

interface WorkoutEditorProps {
  workout: Workout;
  startDate: string;
  onClose: () => void;
  onUpdateWorkout: (id: string, field: keyof Workout, value: any) => void;
  onAddStep: (workoutId: string, parentPath?: string[]) => void;
  onUpdateStep: (
    workoutId: string,
    stepPath: string[],
    field: keyof WorkoutStep,
    value: any
  ) => void;
  onDeleteStep: (workoutId: string, stepPath: string[]) => void;
  onMoveStep: (
    workoutId: string,
    stepPath: string[],
    direction: "up" | "down"
  ) => void;
  onDropStep: (workoutId: string, targetPath: string[]) => void;
  draggedStepPath: string[] | null;
  setDraggedStepPath: (path: string[] | null) => void;

  libraryWorkouts?: LibraryWorkout[];
  categories?: LibraryCategory[];
  userRole?: UserRole;
}

const getRpeColor = (rpe: number) => {
  if (rpe <= 3) return "#10b981";
  if (rpe <= 5) return "#f59e0b";
  if (rpe <= 7) return "#f97316";
  return "#ef4444";
};

export const PaceProfileChart: React.FC<{ steps?: WorkoutStep[] }> = ({ steps }) => {
  const profile = generatePaceProfile(steps);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalTimeSec === 0) return null;

  const minPace = Math.min(...profile.map((p) => p.paceSecPerKm));
  const maxPace = Math.max(...profile.map((p) => p.paceSecPerKm));
  const paceRange = maxPace - minPace || 60;

  const formatPaceFromSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#CF6361";
      case "corps":
        return "#CF9A61";
      case "recup":
        return "#CDCF61";
      case "retour_calme":
        return "#3b82f6";
      default:
        return "#10b981";
    }
  };

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2 font-sans">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
          📈 Profil d'allure de la séance
        </span>
        <span className="text-[9px] font-semibold text-stone-400">
          Total : {Math.round(totalTimeSec / 60)} min
        </span>
      </div>

      <div className="flex gap-2 items-stretch">
        <div className="flex flex-col justify-between text-[8px] font-extrabold text-stone-400 py-1 select-none pr-1 border-r border-stone-800/80">
          <span>{formatPaceFromSec(minPace)}</span>
          <span>{formatPaceFromSec(minPace + paceRange / 2)}</span>
          <span>{formatPaceFromSec(maxPace)}</span>
        </div>

        <div className="flex-1 space-y-1">
          <div className="h-24 w-full bg-stone-900/60 rounded-xl p-2 flex items-end gap-1.5 relative overflow-hidden border border-stone-800/60">
            {profile.map((point, i) => {
              const widthPct = (point.durationSec / totalTimeSec) * 100;
              const normalizedHeight =
                paceRange === 0
                  ? 60
                  : 25 + ((maxPace - point.paceSecPerKm) / paceRange) * 65;

              return (
                <div
                  key={i}
                  style={{
                    width: `${Math.max(widthPct, 4)}%`,
                    height: `${normalizedHeight}%`,
                    backgroundColor: getColor(point.type),
                  }}
                  className="rounded-t-sm transition-all relative group cursor-pointer hover:brightness-125 flex flex-col justify-end items-center"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      <div>{point.label}</div>
                      <div className="text-[#CF9A61]">{point.paceFormatted} min/km</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5 px-2">
            {profile.map((point, i) => {
              const widthPct = (point.durationSec / totalTimeSec) * 100;
              return (
                <div
                  key={i}
                  style={{ width: `${Math.max(widthPct, 4)}%` }}
                  className="text-center overflow-hidden"
                >
                  <span className="block text-[8px] font-bold text-[#CDCF61] truncate">
                    {point.paceFormatted}
                  </span>
                  <span className="block text-[7px] font-semibold text-stone-500 truncate">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] inline-block"></span> Échauff.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF9A61] inline-block"></span> Course
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] inline-block"></span> Récup.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block"></span> Retour au calme
          </span>
        </div>
      </div>
    </div>
  );
};

export const WorkoutEditor: React.FC<WorkoutEditorProps> = ({
  workout,
  onClose,
  onUpdateWorkout,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onMoveStep,
  libraryWorkouts = [],
  categories = [],
  userRole = "athlete",
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "");

  const metrics = calculateStepMetrics(workout.steps);
  const selectedTypeConfig = getWorkoutTypeConfig(workout.type || "footing");

  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";
  const themeHoverBg = isCoach ? "hover:bg-[#b8bb52]" : "hover:bg-[#b88652]";

  useEffect(() => {
    onUpdateWorkout(workout.id, "km", metrics.totalKm.toString());
  }, [JSON.stringify(workout.steps)]);

  const filteredLibraryWorkouts = libraryWorkouts.filter(
    (w) => !selectedCatId || w.categoryId === selectedCatId
  );

  const handleApplyTemplate = (template: LibraryWorkout) => {
    onUpdateWorkout(workout.id, "title", template.title);
    onUpdateWorkout(workout.id, "description", template.description || "");
    onUpdateWorkout(workout.id, "km", template.km || "");
    onUpdateWorkout(workout.id, "rpe", template.rpe || "5");
    onUpdateWorkout(workout.id, "steps", template.steps || []);
    setShowImportModal(false);
  };

  const handleSaveAndClose = () => {
    if (!workout.steps || workout.steps.length === 0) {
      setErrorMsg(
        "⚠️ Vous devez ajouter au moins un bloc d'entraînement pour valider et enregistrer cette séance."
      );
      return;
    }
    setErrorMsg(null);
    onClose();
  };

  const renderStepsList = (steps: WorkoutStep[], parentPath: string[] = []) => {
    return steps.map((step, idx) => {
      const currentPath = [...parentPath, idx.toString()];

      return (
        <div
          key={step.id || idx}
          className="bg-stone-950 border border-stone-800 rounded-2xl p-3 space-y-2.5 font-sans"
        >
          <div className="flex justify-between items-center">
            <select
              value={step.type}
              onChange={(e) =>
                onUpdateStep(
                  workout.id,
                  currentPath,
                  "type",
                  e.target.value
                )
              }
              style={{ color: themeColor }}
              className="bg-stone-900 border border-stone-800 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="echauffement">Échauffement</option>
              <option value="corps">Course / Corps</option>
              <option value="recup">Récupération</option>
              <option value="retour_calme">Retour au calme</option>
              <option value="repeat">Répétition / Boucle</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveStep(workout.id, currentPath, "up")}
                className="text-stone-500 hover:text-stone-300 text-xs px-1 cursor-pointer"
                title="Monter"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => onMoveStep(workout.id, currentPath, "down")}
                className="text-stone-500 hover:text-stone-300 text-xs px-1 cursor-pointer"
                title="Descendre"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => onDeleteStep(workout.id, currentPath)}
                className="text-stone-500 hover:text-[#CF6361] text-xs px-1.5 cursor-pointer transition"
                title="Supprimer ce bloc"
              >
                ✕
              </button>
            </div>
          </div>

          {step.type === "repeat" ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 bg-stone-900/50 p-2 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                    Nombre de répétitions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={step.reps || 1}
                    onChange={(e) =>
                      onUpdateStep(
                        workout.id,
                        currentPath,
                        "reps",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    style={{ color: themeColor }}
                    className="w-full bg-stone-950 border border-stone-800 text-[10px] font-bold rounded-lg p-1.5 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onAddStep(workout.id, currentPath)}
                    style={{
                      color: themeColor,
                      borderColor: `${themeColor}40`,
                      backgroundColor: `${themeColor}15`,
                    }}
                    className="w-full py-1.5 border rounded-lg text-[9px] font-bold uppercase transition cursor-pointer"
                  >
                    ➕ Sous-bloc
                  </button>
                </div>
              </div>

              {step.nestedSteps && step.nestedSteps.length > 0 && (
                <div
                  style={{ borderColor: `${themeColor}50` }}
                  className="pl-3 border-l-2 space-y-2"
                >
                  {renderStepsList(step.nestedSteps, currentPath)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                  Condition
                </label>
                <select
                  value={step.endCondition || "distance"}
                  onChange={(e) =>
                    onUpdateStep(
                      workout.id,
                      currentPath,
                      "endCondition",
                      e.target.value
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-200 rounded-lg p-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="distance">Distance</option>
                  <option value="temps">Temps</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                  Valeur
                </label>
                <input
                  type="text"
                  placeholder={
                    step.endCondition === "temps"
                      ? "Ex: 10min"
                      : "Ex: 1000m ou 5km"
                  }
                  value={step.durationOrDist || ""}
                  onChange={(e) =>
                    onUpdateStep(
                      workout.id,
                      currentPath,
                      "durationOrDist",
                      e.target.value
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-200 rounded-lg p-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                  Allure Min (Rapide)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 4:15"
                  value={step.paceMin || step.goalValue || ""}
                  onChange={(e) =>
                    onUpdateStep(
                      workout.id,
                      currentPath,
                      "paceMin",
                      e.target.value
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-200 rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[8px] uppercase font-bold text-stone-500 mb-0.5">
                  Allure Max (Lente)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 4:25"
                  value={step.paceMax || ""}
                  onChange={(e) =>
                    onUpdateStep(
                      workout.id,
                      currentPath,
                      "paceMax",
                      e.target.value
                    )
                  }
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] text-stone-200 rounded-lg p-1.5 focus:outline-none placeholder:text-stone-600 font-mono"
                />
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const rpeVal = Math.min(10, Math.max(1, parseInt(workout.rpe || "5", 10) || 1));
  const rpeColor = getRpeColor(rpeVal);

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* HEADER DE L'ÉDITEUR AVEC COULEURS ADAPTÉES */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3 gap-2">
          <div>
            <span
              style={{ color: themeColor }}
              className="text-[10px] font-bold uppercase tracking-wider block"
            >
              Éditeur de Séance • {workout.dayName}
            </span>
            <h3 className="text-base font-black uppercase text-stone-100">
              {workout.title || "Nouvelle séance"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {libraryWorkouts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{ backgroundColor: themeColor }}
                className={`text-[10px] font-extrabold text-stone-950 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer shadow-md ${themeHoverBg}`}
              >
                📚 Importer modèle
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODALE DE SÉLECTION / IMPORTATION DE MODÈLE */}
        {showImportModal && (
          <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center p-4">
            <div
              style={{ borderColor: `${themeColor}60` }}
              className="bg-stone-900 border rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn"
            >
              <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                <span
                  style={{ color: themeColor }}
                  className="text-xs font-black uppercase"
                >
                  📚 Importer une séance de la bibliothèque
                </span>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="text-stone-400 hover:text-stone-100 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {categories.length > 0 && (
                <div className="flex overflow-x-auto gap-1.5 pb-1 custom-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCatId(cat.id)}
                        style={{
                          backgroundColor: isSelected ? themeColor : "#0c0a09",
                          borderColor: isSelected ? themeColor : "#27272a",
                          color: isSelected ? "#0c0a09" : "#a8a29e",
                        }}
                        className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border"
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {filteredLibraryWorkouts.length === 0 ? (
                  <p className="text-xs text-stone-500 italic text-center py-4">
                    Aucune séance modèle enregistrée dans cette catégorie.
                  </p>
                ) : (
                  filteredLibraryWorkouts.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className="p-3 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-2xl cursor-pointer transition flex justify-between items-center group"
                    >
                      <div>
                        <h4
                          style={{ color: "#f5f5f4" }}
                          className="text-xs font-black transition group-hover:text-amber-400"
                        >
                          {template.title}
                        </h4>
                        <p className="text-[10px] text-stone-400 line-clamp-1">
                          {template.description || "Aucune description"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span
                          style={{ color: themeColor }}
                          className="text-[10px] font-bold block"
                        >
                          {template.km} km
                        </span>
                        <span className="text-[9px] text-stone-400">
                          RPE {template.rpe}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-full py-2 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* MÉTRIQUES CALCULÉES */}
        <div className="grid grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800 text-center">
          <div>
            <span className="block text-[9px] font-bold text-stone-400 uppercase">
              Distance Calculée
            </span>
            <span style={{ color: themeColor }} className="text-base font-black">
              {metrics.totalKm} km
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-stone-400 uppercase">
              Durée Estimée
            </span>
            <span style={{ color: themeColor }} className="text-base font-black">
              {metrics.totalMinutes} min
            </span>
          </div>
        </div>

        <PaceProfileChart steps={workout.steps} />

        {/* PARAMÈTRES GÉNÉRAUX */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Titre de la séance
            </label>
            <input
              type="text"
              value={workout.title}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "title", e.target.value)
              }
              placeholder="Ex: Fractionné court 10x400m"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Type de séance
              </label>
              <select
                value={workout.type || "footing"}
                onChange={(e) =>
                  onUpdateWorkout(workout.id, "type", e.target.value)
                }
                className={`w-full bg-stone-950 border rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none cursor-pointer ${selectedTypeConfig.badgeClass}`}
              >
                {Object.entries(WORKOUT_TYPES_CONFIG)
                  .filter(([key]) => key !== "repos")
                  .map(([key, config]) => {
                    const displayLabel = key === "vma" ? "Fractionné" : config.label;
                    return (
                      <option key={key} value={key} className="bg-stone-900 text-stone-100 font-normal">
                        {displayLabel}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-bold text-stone-400">
                  RPE Cible
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-stone-400">RPE</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rpeVal}
                    onChange={(e) => {
                      const val = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1));
                      onUpdateWorkout(workout.id, "rpe", val.toString());
                    }}
                    style={{ color: rpeColor }}
                    className="w-10 bg-stone-950 border border-stone-800 rounded-lg text-center text-xs font-black py-0.5 focus:outline-none"
                  />
                  <span className="text-xs font-black text-stone-400">/ 10</span>
                </div>
              </div>

              <div className="relative w-full h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 p-0.5 mt-1.5">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpeVal}
                  onChange={(e) =>
                    onUpdateWorkout(workout.id, "rpe", e.target.value)
                  }
                  className="w-full opacity-0 cursor-pointer absolute inset-0 z-10"
                />
                <div
                  style={{ left: `calc(${((rpeVal - 1) / 9) * 100}% - 6px)` }}
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-stone-950 rounded-full shadow-md pointer-events-none transition-all"
                />
              </div>

              <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider pt-0.5">
                <span className="text-emerald-400">1-3 Facile</span>
                <span className="text-amber-400">4-7 Soutenu</span>
                <span className="text-red-500">8-10 Maximal</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Description de la séance
            </label>
            <textarea
              rows={2}
              value={workout.description || ""}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "description", e.target.value)
              }
              placeholder="Ex: Séance de soutien VMA visant à maintenir la régularité du rythme."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] custom-scrollbar resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
              Consignes / Remarque Coach (optionnel)
            </label>
            <input
              type="text"
              value={workout.remark || ""}
              onChange={(e) =>
                onUpdateWorkout(workout.id, "remark", e.target.value)
              }
              placeholder="Ex: 2 min de récupération marchée entre les séries."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>
        </div>

        {/* SECTION BLOCS */}
        <div className="space-y-3 border-t border-stone-800 pt-3">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase font-black text-stone-200 tracking-wider">
              Blocs d'entraînement <span className="text-[#CF6361]">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                onAddStep(workout.id, []);
              }}
              style={{ backgroundColor: themeColor }}
              className={`px-2.5 py-1 text-stone-950 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${themeHoverBg}`}
            >
              ➕ Ajouter un bloc
            </button>
          </div>

          {errorMsg && (
            <div className="bg-[#CF6361]/10 border border-[#CF6361]/30 text-[#CF6361] p-2.5 rounded-xl text-[11px] font-bold animate-fadeIn">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5 max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
            {!workout.steps || workout.steps.length === 0 ? (
              <div className="bg-stone-950/60 border border-dashed border-stone-800 rounded-2xl p-4 text-center space-y-1">
                <p className="text-xs text-stone-400 font-bold">
                  Aucun bloc configuré
                </p>
                <p className="text-[10px] text-stone-500">
                  Ajoutez au moins un bloc pour enregistrer cette séance.
                </p>
              </div>
            ) : (
              renderStepsList(workout.steps)
            )}
          </div>
        </div>

        {/* BOUTONS D'ACTION PRINCIPAUX */}
        <div className="flex gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            style={{ backgroundColor: themeColor }}
            className={`flex-1 py-3 text-stone-950 font-bold text-xs uppercase rounded-xl shadow-lg transition cursor-pointer ${themeHoverBg}`}
          >
            Enregistrer la séance
          </button>
        </div>
      </div>
    </div>
  );
};