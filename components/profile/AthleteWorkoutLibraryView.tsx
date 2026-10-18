// src/components/profile/AthleteWorkoutLibraryView.tsx

import React, { useState, useRef, useEffect } from "react";
import { LibraryWorkout, LibraryCategory } from "../../types";
import { getWorkoutTypeConfig } from "../../utils/calculations";

interface AthleteWorkoutLibraryViewProps {
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
  onBackToProfile: () => void;
}

const getRpeColor = (rpeVal: number) => {
  if (rpeVal <= 3) return "#10b981";
  if (rpeVal <= 5) return "#f59e0b";
  if (rpeVal <= 7) return "#f97316";
  return "#ef4444";
};

export const AthleteWorkoutLibraryView: React.FC<AthleteWorkoutLibraryViewProps> = ({
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
  onBackToProfile,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ""
  );
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Édition en ligne directe au clic sur la catégorie
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryLabel, setEditedCategoryLabel] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!categories.some((c) => c.id === selectedCategoryId) && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (editingCategoryId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingCategoryId]);

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
    <div className="space-y-6 animate-fadeIn pb-10 font-sans w-full">
      {/* HEADER DE LA BIBLIOTHÈQUE ATHLÈTE */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToProfile}
            className="text-stone-300 hover:text-white text-xs font-bold bg-stone-950 hover:bg-stone-850 px-3.5 py-2 rounded-xl border border-stone-800 transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Profil</span>
          </button>
          <div>
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-widest block">
              Mes Modèles Perso
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-stone-100 tracking-tight mt-0.5">
              Mes Séances ({libraryWorkouts.length})
            </h2>
          </div>
        </div>

        <button
          type="button"
          disabled={categories.length === 0}
          onClick={() => onCreateNewTemplate(selectedCategoryId)}
          className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] disabled:opacity-40 px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Créer une séance</span>
          <span className="text-sm">＋</span>
        </button>
      </div>

      {/* SÉLECTEUR & GESTION DES CATÉGORIES */}
      <div className="space-y-3 bg-stone-900/70 border border-stone-800 rounded-3xl p-3.5 md:p-4 shadow-lg">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
            Mes Catégories ({categories.length})
          </span>
          {!showAddCategoryInput && (
            <button
              type="button"
              onClick={() => setShowAddCategoryInput(true)}
              className="text-[10px] font-bold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 px-3 py-1.5 rounded-xl border border-[#CF9A61]/30 uppercase transition cursor-pointer flex items-center gap-1"
            >
              <span>Nouvelle catégorie</span>
              <span className="text-xs">＋</span>
            </button>
          )}
        </div>

        {showAddCategoryInput && (
          <form
            onSubmit={handleCreateCategorySubmit}
            className="flex items-center gap-2 bg-stone-950 p-2 rounded-2xl border border-stone-800 animate-fadeIn"
          >
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex : Fractionné, Sortie Longue, Côte..."
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
            <button
              type="submit"
              className="py-2 px-3.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setShowAddCategoryInput(false)}
              className="py-2 px-2.5 text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </form>
        )}

        {/* LISTE DES BADGES AVEC FLÈCHES VECTORIELLES ET CLIC DIRECT POUR RENOMMER */}
        <div className="flex overflow-x-auto gap-2 pb-1.5 custom-scrollbar items-center">
          {categories.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-2 px-1">
              Aucune catégorie. Cliquez sur « Nouvelle catégorie ».
            </p>
          ) : (
            categories.map((cat, catIdx) => {
              const isSelected = selectedCategoryId === cat.id;
              const isConfirming = categoryToDelete === cat.id;
              const isEditing = editingCategoryId === cat.id;
              const count = libraryWorkouts.filter((w) => w.categoryId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  className={`flex items-center rounded-2xl border transition-all shrink-0 ${
                    isSelected
                      ? "bg-stone-950 border-[#CF9A61]/60 shadow-md"
                      : "bg-stone-900/80 border-stone-800 hover:border-stone-700"
                  }`}
                >
                  {/* Flèche gauche moderne (SVG) */}
                  {isSelected && onMoveCategory && (
                    <button
                      type="button"
                      disabled={catIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCategory(cat.id, "left");
                      }}
                      title="Déplacer vers la gauche"
                      className="p-2 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  )}

                  {/* Clic direct pour sélectionner ou renommer sans crayon */}
                  {isEditing ? (
                    <div className="flex items-center px-1.5 py-1">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={editedCategoryLabel}
                        onChange={(e) => setEditedCategoryLabel(e.target.value)}
                        onBlur={() => handleSaveRename(cat.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(cat.id);
                          if (e.key === "Escape") setEditingCategoryId(null);
                        }}
                        className="bg-stone-900 border border-[#CF9A61] rounded-xl px-2.5 py-1 text-xs text-stone-100 font-black uppercase focus:outline-none w-32 shadow-inner"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          handleStartRename(cat);
                        } else {
                          setSelectedCategoryId(cat.id);
                          setCategoryToDelete(null);
                          setEditingCategoryId(null);
                        }
                      }}
                      title={isSelected ? "Cliquez sur le nom pour le renommer" : `Sélectionner ${cat.label}`}
                      className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "text-[#CF9A61]"
                          : "text-stone-300 hover:text-white"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-[#CF9A61]/20 text-[#CF9A61]"
                            : "bg-stone-800 text-stone-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )}

                  {/* Flèche droite moderne (SVG) */}
                  {isSelected && onMoveCategory && (
                    <button
                      type="button"
                      disabled={catIdx === categories.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCategory(cat.id, "right");
                      }}
                      title="Déplacer vers la droite"
                      className="p-2 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  )}

                  {/* Bouton supprimer */}
                  {isSelected && (
                    <>
                      {isConfirming ? (
                        <div className="flex items-center gap-1 bg-stone-950 border border-[#B34D4D]/50 px-2 py-1 rounded-xl animate-fadeIn mr-1">
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
                          className="pr-2.5 pl-1 text-stone-500 hover:text-[#B34D4D] text-xs transition cursor-pointer"
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

        {currentCategory && (
          <div className="text-[10.5px] text-stone-500 px-1 flex items-center justify-between">
            <span>
              Catégorie active : <strong className="text-stone-300">{currentCategory.label}</strong> (cliquez directement sur son nom pour la renommer)
            </span>
          </div>
        )}
      </div>

      {/* SÉANCES EN 2 COLONNES SUR ORDINATEUR (grid grid-cols-1 md:grid-cols-2) */}
      <div className="space-y-3 pt-1">
        {categories.length === 0 ? null : filteredWorkouts.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
              📚
            </div>
            <p className="text-xs text-stone-400">
              Aucune séance dans la catégorie{" "}
              <strong className="text-[#CF9A61]">{currentCategory?.label}</strong>.
            </p>
            <button
              type="button"
              onClick={() => onCreateNewTemplate(selectedCategoryId)}
              className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b8bb52] px-4 py-2 rounded-xl uppercase transition cursor-pointer shadow-md inline-block mt-1"
            >
              ＋ Créer le premier modèle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredWorkouts.map((workout, workoutIdx) => {
              const rpeVal = parseInt(workout.rpe || "5", 10);
              const rpeColor = getRpeColor(rpeVal);
              const typeConfig = getWorkoutTypeConfig((workout as any).type || "footing");

              return (
                <div
                  key={workout.id}
                  className={`p-4 rounded-3xl border border-l-8 ${typeConfig.borderClass} border-stone-800 bg-stone-900/90 shadow-xl flex flex-col justify-between space-y-3 transition hover:border-stone-700`}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* FLÈCHES DE RÉORGANISATION MODERNES (SVG) */}
                        {onMoveWorkout && (
                          <div className="flex flex-col gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0 mt-0.5 shadow-inner">
                            <button
                              type="button"
                              disabled={workoutIdx === 0}
                              onClick={() => onMoveWorkout(workout.id, "up")}
                              title="Monter la séance"
                              className="p-1 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 15l-6-6-6 6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              disabled={workoutIdx === filteredWorkouts.length - 1}
                              onClick={() => onMoveWorkout(workout.id, "down")}
                              title="Descendre la séance"
                              className="p-1 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
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
                              Modèle
                            </span>
                          </div>
                          <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-stone-100 mt-1">
                            {workout.title || "Séance sans titre"}
                          </h3>
                        </div>
                      </div>

                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border bg-stone-950 text-stone-300 border-stone-800 shrink-0 font-mono">
                        {currentCategory?.label}
                      </span>
                    </div>

                    {workout.description && (
                      <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded-2xl border border-stone-800/80 line-clamp-3">
                        {workout.description}
                      </p>
                    )}
                  </div>

                  {/* MÉTRIQUES : KM, RPE ET BOUTONS ACTIONS */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-stone-800/80">
                    <div className="flex items-center gap-2">
                      {workout.km && (
                        <span className="text-xs font-black bg-stone-950 text-stone-100 px-2.5 py-1 rounded-lg border border-stone-800 font-mono">
                          {workout.km} km
                        </span>
                      )}
                      {workout.rpe && (
                        <span
                          className="text-xs font-black bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 font-mono"
                          style={{ color: rpeColor }}
                        >
                          RPE {workout.rpe}/10
                        </span>
                      )}
                      {workout.steps && workout.steps.length > 0 && (
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
                          {workout.steps.length} bloc(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTemplate(workout.id)}
                        className="text-[10px] font-extrabold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 border border-[#CF9A61]/30 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer le modèle "${workout.title || "cette séance"}" ?`)) {
                            onDeleteTemplate(workout.id);
                          }
                        }}
                        className="text-stone-500 hover:text-[#B34D4D] text-xs px-2 py-1 transition cursor-pointer"
                        title="Supprimer la séance"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};