// src/components/coach/WorkoutLibraryView.tsx

import React, { useState } from "react";
import { LibraryWorkout, LibraryCategory } from "../../types";
import { getWorkoutTypeConfig } from "../../utils/calculations";

interface WorkoutLibraryViewProps {
  libraryWorkouts: LibraryWorkout[];
  categories: LibraryCategory[];
  onAddCategory: (label: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory?: (id: string, newLabel: string) => void;
  onMoveCategory?: (id: string, direction: "left" | "right") => void;
  onMoveWorkout?: (workoutId: string, direction: "up" | "down") => void;
  onCreateNewTemplate: (categoryId: string) => void;
  onEditTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

const getRpeColor = (rpeVal: number) => {
  if (rpeVal <= 3) return "#10b981";
  if (rpeVal <= 5) return "#f59e0b";
  if (rpeVal <= 7) return "#f97316";
  return "#ef4444";
};

export const WorkoutLibraryView: React.FC<WorkoutLibraryViewProps> = ({
  libraryWorkouts,
  categories,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onMoveCategory,
  onMoveWorkout,
  onCreateNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ""
  );
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // État pour renommer la catégorie
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryLabel, setEditedCategoryLabel] = useState("");

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    onAddCategory(newCategoryLabel.trim());
    setNewCategoryLabel("");
    setShowAddCategoryInput(false);
  };

  const confirmDeleteCategory = (catId: string) => {
    onDeleteCategory(catId);
    setCategoryToDelete(null);
    if (selectedCategoryId === catId) {
      const remaining = categories.filter((c) => c.id !== catId);
      setSelectedCategoryId(remaining[0]?.id || "");
    }
  };

  const handleStartRename = (cat: LibraryCategory) => {
    setEditingCategoryId(cat.id);
    setEditedCategoryLabel(cat.label);
  };

  const handleSaveRename = (catId: string) => {
    if (editedCategoryLabel.trim() && onRenameCategory) {
      onRenameCategory(catId, editedCategoryLabel.trim());
    }
    setEditingCategoryId(null);
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const filteredWorkouts = libraryWorkouts.filter(
    (w) => w.categoryId === selectedCategoryId
  );

  return (
    <div className="space-y-5 animate-fadeIn pb-10 font-sans">
      {/* HEADER DE LA BIBLIOTHÈQUE */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <span className="text-[10px] font-bold text-[#CDCF61] uppercase tracking-widest block">
            Banque de Séances
          </span>
          <h2 className="text-xl font-black uppercase text-stone-100">
            📚 Bibliothèque ({libraryWorkouts.length})
          </h2>
        </div>

        <button
          type="button"
          disabled={categories.length === 0}
          onClick={() => onCreateNewTemplate(selectedCategoryId)}
          className="text-[10px] font-extrabold text-stone-950 bg-[#CDCF61] hover:bg-[#b8bb52] disabled:opacity-50 px-3 py-2 rounded-xl uppercase transition cursor-pointer shadow-lg"
        >
          ➕ Créer une séance
        </button>
      </div>

      {/* SÉLECTEUR & GESTION DES CATÉGORIES */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold uppercase text-stone-400">
            Mes Catégories ({categories.length})
          </span>
          <button
            type="button"
            onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
            className="text-[10px] font-bold text-[#CDCF61] bg-[#CDCF61]/10 hover:bg-[#CDCF61]/20 px-2.5 py-1 rounded-lg border border-[#CDCF61]/30 uppercase transition cursor-pointer"
          >
            {showAddCategoryInput ? "✕ Annuler" : "➕ Nouvelle catégorie"}
          </button>
        </div>

        {showAddCategoryInput && (
          <form
            onSubmit={handleCreateCategorySubmit}
            className="flex items-center gap-2 bg-stone-900 p-2 rounded-2xl border border-stone-800 animate-fadeIn"
          >
            <input
              type="text"
              required
              placeholder="Ex: VMA Courte, Allure Marathon, Trail D+..."
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-[#CDCF61]"
            />
            <button
              type="submit"
              className="py-1.5 px-3 bg-[#CDCF61] hover:bg-[#b8bb52] text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer"
            >
              Ajouter
            </button>
          </form>
        )}

        {/* LISTE DES BADGES AVEC FLÈCHES ET ÉDITION */}
        <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar items-center">
          {categories.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-1">
              Aucune catégorie créée. Cliquez sur « Nouvelle catégorie » ci-dessus.
            </p>
          ) : (
            categories.map((cat, catIdx) => {
              const isSelected = selectedCategoryId === cat.id;
              const isConfirming = categoryToDelete === cat.id;
              const isEditing = editingCategoryId === cat.id;

              return (
                <div key={cat.id} className="flex items-center gap-1 shrink-0 bg-stone-900/60 p-1 rounded-2xl border border-stone-800/80">
                  {/* DÉPLACER LA CATÉGORIE VERS LA GAUCHE */}
                  {isSelected && onMoveCategory && (
                    <button
                      type="button"
                      disabled={catIdx === 0}
                      onClick={() => onMoveCategory(cat.id, "left")}
                      title="Déplacer vers la gauche"
                      className="text-stone-500 hover:text-stone-200 disabled:opacity-20 text-[10px] px-1 cursor-pointer transition"
                    >
                      ◀
                    </button>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editedCategoryLabel}
                        onChange={(e) => setEditedCategoryLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(cat.id);
                          if (e.key === "Escape") setEditingCategoryId(null);
                        }}
                        autoFocus
                        className="bg-stone-950 border border-[#CDCF61] rounded-lg px-2 py-0.5 text-xs text-stone-100 focus:outline-none w-28 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(cat.id)}
                        className="text-[10px] bg-[#CDCF61] text-stone-950 font-black px-1.5 py-0.5 rounded-md uppercase"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        className="text-stone-400 hover:text-stone-200 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryToDelete(null);
                        setEditingCategoryId(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition cursor-pointer border ${
                        isSelected
                          ? "bg-[#CDCF61] text-stone-950 border-[#CDCF61] shadow-md"
                          : "bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800"
                      }`}
                    >
                      {cat.label}
                    </button>
                  )}

                  {/* BOUTON RENOMMER */}
                  {isSelected && !isEditing && (
                    <button
                      type="button"
                      title="Renommer la catégorie"
                      onClick={() => handleStartRename(cat)}
                      className="text-stone-400 hover:text-[#CDCF61] text-xs px-1 cursor-pointer transition"
                    >
                      ✏️
                    </button>
                  )}

                  {/* DÉPLACER LA CATÉGORIE VERS LA DROITE */}
                  {isSelected && onMoveCategory && (
                    <button
                      type="button"
                      disabled={catIdx === categories.length - 1}
                      onClick={() => onMoveCategory(cat.id, "right")}
                      title="Déplacer vers la droite"
                      className="text-stone-500 hover:text-stone-200 disabled:opacity-20 text-[10px] px-1 cursor-pointer transition"
                    >
                      ▶
                    </button>
                  )}

                  {/* SUPPRESSION SÉCURISÉE */}
                  {isSelected && (
                    <>
                      {isConfirming ? (
                        <div className="flex items-center gap-1 bg-stone-950 border border-[#B34D4D]/50 px-2 py-0.5 rounded-xl animate-fadeIn ml-1">
                          <span className="text-[9px] text-[#B34D4D] font-bold">
                            Supprimer ?
                          </span>
                          <button
                            type="button"
                            onClick={() => confirmDeleteCategory(cat.id)}
                            className="text-[9px] font-black text-white bg-[#B34D4D] hover:bg-[#993b3b] px-1.5 py-0.5 rounded-md uppercase"
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(null)}
                            className="text-[9px] font-bold text-stone-400 hover:text-stone-200 px-1 py-0.5"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Supprimer la catégorie"
                          onClick={() => setCategoryToDelete(cat.id)}
                          className="text-stone-600 hover:text-[#B34D4D] text-xs px-1.5 py-1 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SÉANCES DE LA CATÉGORIE ACTIVE */}
      <div className="space-y-3 pt-2">
        {categories.length === 0 ? null : filteredWorkouts.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 bg-[#CDCF61]/10 border border-[#CDCF61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CDCF61] text-xl">
              📚
            </div>
            <p className="text-xs text-stone-400">
              Aucune séance enregistrée dans la catégorie{" "}
              <strong className="text-[#CDCF61]">
                {currentCategory?.label}
              </strong>
              .
            </p>
          </div>
        ) : (
          filteredWorkouts.map((workout, workoutIdx) => {
            const rpeVal = parseInt(workout.rpe || "5", 10);
            const rpeColor = getRpeColor(rpeVal);

            const workoutType = (workout as any).type || "footing";
            const typeConfig = getWorkoutTypeConfig(workoutType);

            return (
              <div
                key={workout.id}
                className={`p-4 rounded-3xl border border-l-8 ${typeConfig.borderClass} border-stone-800 bg-stone-900/90 shadow-xl space-y-3 transition`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2">
                    {/* FLÈCHES DE RÉORGANISATION DE LA SÉANCE */}
                    {onMoveWorkout && (
                      <div className="flex flex-col gap-0.5 bg-stone-950 p-1 rounded-lg border border-stone-800 shrink-0 mt-0.5">
                        <button
                          type="button"
                          disabled={workoutIdx === 0}
                          onClick={() => onMoveWorkout(workout.id, "up")}
                          title="Monter la séance"
                          className="text-stone-400 hover:text-[#CDCF61] disabled:opacity-20 text-[9px] px-1 transition cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={workoutIdx === filteredWorkouts.length - 1}
                          onClick={() => onMoveWorkout(workout.id, "down")}
                          title="Descendre la séance"
                          className="text-stone-400 hover:text-[#CDCF61] disabled:opacity-20 text-[9px] px-1 transition cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${typeConfig.badgeClass}`}>
                          {typeConfig.label}
                        </span>
                        <span className="text-stone-600 text-[10px]">•</span>
                        <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider">
                          Séance Modèle
                        </span>
                      </div>
                      <h3 className="text-base font-black uppercase tracking-tight text-stone-100 mt-1">
                        {workout.title || "Séance sans titre"}
                      </h3>
                    </div>
                  </div>

                  <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border bg-stone-950 text-stone-300 border-stone-800 shrink-0">
                    {currentCategory?.label}
                  </span>
                </div>

                {workout.description && (
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded-2xl border border-stone-800/80">
                    {workout.description}
                  </p>
                )}

                {/* STRUCTURE DE LA SÉANCE */}
                {workout.steps && workout.steps.length > 0 && (
                  <div className="bg-stone-950/80 p-2.5 rounded-2xl border border-stone-800 text-[10px] space-y-1">
                    <span className="font-extrabold text-stone-400 uppercase block">
                      Structure ({workout.steps.length} blocs) :
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {workout.steps.map((st, i) => (
                        <span
                          key={st.id || i}
                          className="bg-stone-900 text-stone-300 px-2 py-0.5 rounded-md border border-stone-800 font-medium"
                        >
                          {st.type === "repeat"
                            ? `${st.reps}x Intervalles`
                            : `${st.durationOrDist || st.type}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* MÉTRIQUES : KM ET RPE */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                  <div className="flex items-center gap-2">
                    {workout.km && (
                      <span className="text-xs font-black bg-stone-950 text-stone-100 px-2.5 py-1 rounded-lg border border-stone-800">
                        {workout.km} km
                      </span>
                    )}
                    {workout.rpe && (
                      <span
                        className="text-xs font-black bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800"
                        style={{ color: rpeColor }}
                      >
                        RPE {workout.rpe}/10
                      </span>
                    )}
                  </div>

                  {/* BOUTONS ACTIONS */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditTemplate(workout.id)}
                      className="text-[10px] font-extrabold text-[#CDCF61] bg-[#CDCF61]/10 hover:bg-[#CDCF61]/20 border border-[#CDCF61]/30 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                    >
                      Éditer
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(workout.id)}
                      className="text-stone-500 hover:text-[#B34D4D] text-xs px-2 py-1 transition cursor-pointer"
                      title="Supprimer la séance"
                    >
                      ✕
                    </button>
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