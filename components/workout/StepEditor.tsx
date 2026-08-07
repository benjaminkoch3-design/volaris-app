// src/components/workout/StepEditor.tsx

import React from "react";
import { WorkoutStep, StepType, EndCondition, GoalType } from "../../types";
import { getStepTypeLabel } from "../../utils/calculations";

interface StepEditorProps {
  workoutId: string;
  step: WorkoutStep;
  path: string[];
  totalInLevel: number;
  onUpdateStep: (workoutId: string, path: string[], field: keyof WorkoutStep, value: any) => void;
  onDeleteStep: (workoutId: string, path: string[]) => void;
  onMoveStep: (workoutId: string, path: string[], direction: "up" | "down") => void;
  onAddStep: (workoutId: string, parentPath: string[]) => void;
  onDropStep: (workoutId: string, targetPath: string[]) => void;
  draggedStepPath: string[] | null;
  setDraggedStepPath: (path: string[] | null) => void;
}

/**
 * Composant d'édition récursif pour les étapes et boucles de répétition
 */
export const StepEditor: React.FC<StepEditorProps> = ({
  workoutId,
  step,
  path,
  totalInLevel,
  onUpdateStep,
  onDeleteStep,
  onMoveStep,
  onAddStep,
  onDropStep,
  setDraggedStepPath,
}) => {
  const isRepeat = step.type === "repeat";
  const currentIndex = parseInt(path[path.length - 1], 10);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setDraggedStepPath(path);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDropStep(workoutId, path);
      }}
      className={`p-2.5 sm:p-3 rounded-xl border space-y-2 text-xs transition w-full max-w-full overflow-hidden ${
        isRepeat
          ? "bg-amber-950/20 border-amber-500/40 ml-1 sm:ml-2 border-l-4"
          : "bg-stone-900 border-stone-800"
      }`}
    >
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <span
            className="text-stone-500 hover:text-stone-300 font-black cursor-grab active:cursor-grabbing px-1 select-none text-sm"
            title="Glisser-déposer pour déplacer"
          >
            ☰
          </span>

          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
            {getStepTypeLabel(step.type)}
          </span>

          <select
            value={step.type}
            onChange={(e) =>
              onUpdateStep(workoutId, path, "type", e.target.value as StepType)
            }
            className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-[10px] text-stone-100 cursor-pointer shrink-0"
          >
            <option value="echauffement">Échauffement</option>
            <option value="corps">Course</option>
            <option value="recup">Récupération</option>
            <option value="retour_calme">Retour au calme</option>
            <option value="repeat">Répétition (boucle)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-stone-950 border border-stone-800 rounded-lg p-0.5">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => onMoveStep(workoutId, path, "up")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-stone-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer"
              title="Monter l'étape"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={currentIndex === totalInLevel - 1}
              onClick={() => onMoveStep(workoutId, path, "down")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-stone-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer"
              title="Descendre l'étape"
            >
              ▼
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDeleteStep(workoutId, path)}
            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition cursor-pointer"
          >
            ✕ Supprimer
          </button>
        </div>
      </div>

      {isRepeat ? (
        <div className="space-y-3 pt-1 w-full">
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase font-bold text-amber-300 shrink-0">
              Nombre de répétitions :
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={step.reps || 1}
              onChange={(e) =>
                onUpdateStep(
                  workoutId,
                  path,
                  "reps",
                  parseInt(e.target.value, 10) || 1
                )
              }
              className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-100 text-center font-bold"
            />
            <span className="text-xs text-stone-400 font-bold">fois</span>
          </div>

          <div className="space-y-2 pl-1.5 sm:pl-2 border-l border-amber-500/30 w-full">
            <div className="text-[9.5px] uppercase font-extrabold text-amber-400">
              Étapes dans cette répétition ({step.nestedSteps?.length || 0}) :
            </div>

            {(step.nestedSteps || []).map((nestedStep, idx) => (
              <StepEditor
                key={nestedStep.id}
                workoutId={workoutId}
                step={nestedStep}
                path={[...path, idx.toString()]}
                totalInLevel={step.nestedSteps?.length || 0}
                onUpdateStep={onUpdateStep}
                onDeleteStep={onDeleteStep}
                onMoveStep={onMoveStep}
                onAddStep={onAddStep}
                onDropStep={onDropStep}
                draggedStepPath={null}
                setDraggedStepPath={setDraggedStepPath}
              />
            ))}

            <button
              type="button"
              onClick={() => onAddStep(workoutId, path)}
              className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[10px] rounded-lg transition uppercase tracking-wider cursor-pointer text-center"
            >
              ➕ Ajouter une étape dans la boucle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 pt-1 w-full">
          <div className="space-y-1 w-full">
            <label className="block text-[9px] uppercase font-bold text-stone-400">
              Condition de fin
            </label>
            <div className="flex items-center gap-1.5 w-full">
              <select
                value={step.endCondition || "temps"}
                onChange={(e) =>
                  onUpdateStep(
                    workoutId,
                    path,
                    "endCondition",
                    e.target.value as EndCondition
                  )
                }
                className="w-24 shrink-0 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-100 cursor-pointer"
              >
                <option value="temps">Temps</option>
                <option value="distance">Distance</option>
              </select>
              <input
                type="text"
                placeholder={
                  step.endCondition === "distance"
                    ? "Ex: 1000m"
                    : "Ex: 1'30 ou 45 min"
                }
                value={step.durationOrDist || ""}
                onChange={(e) =>
                  onUpdateStep(workoutId, path, "durationOrDist", e.target.value)
                }
                className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
              />
            </div>
          </div>

          <div className="space-y-1 w-full">
            <label className="block text-[9px] uppercase font-bold text-stone-400">
              Objectif cible
            </label>
            <div className="flex items-center gap-1.5 w-full">
              <select
                value={step.goalType || "allure"}
                onChange={(e) =>
                  onUpdateStep(
                    workoutId,
                    path,
                    "goalType",
                    e.target.value as GoalType
                  )
                }
                className="w-24 shrink-0 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-100 cursor-pointer"
              >
                <option value="allure">Allure</option>
                <option value="vitesse">Vitesse</option>
                <option value="fc">Cardio</option>
              </select>
              <input
                type="text"
                placeholder={
                  step.goalType === "vitesse"
                    ? "Ex: 15 km/h"
                    : step.goalType === "fc"
                    ? "Ex: 165 bpm"
                    : "Ex: 4:15/km"
                }
                value={step.goalValue || ""}
                onChange={(e) =>
                  onUpdateStep(workoutId, path, "goalValue", e.target.value)
                }
                className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Composant en lecture seule pour la consultation des étapes
 */
export const StepViewer: React.FC<{ step: WorkoutStep; index: number }> = ({
  step,
  index,
}) => {
  if (step.type === "repeat") {
    return (
      <div className="p-3 bg-stone-950/90 border border-amber-500/30 rounded-xl space-y-2 my-1">
        <div className="flex items-center justify-between text-xs font-black text-amber-400">
          <span>🔄 Répéter {step.reps || 1} fois :</span>
          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Boucle #{index + 1}
          </span>
        </div>

        <div className="pl-3 border-l-2 border-amber-500/40 space-y-2">
          {(step.nestedSteps || []).map((nestedStep, nIdx) => (
            <StepViewer key={nestedStep.id} step={nestedStep} index={nIdx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-stone-900 text-stone-200 border border-stone-800">
          {getStepTypeLabel(step.type)}
        </span>
        <span className="font-extrabold text-stone-100">
          {step.durationOrDist || "-"}
        </span>
      </div>

      {step.goalValue && (
        <div className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          🎯{" "}
          {step.goalType === "vitesse"
            ? "Vit: "
            : step.goalType === "fc"
            ? "FC: "
            : "Allure: "}
          {step.goalValue}
        </div>
      )}
    </div>
  );
};