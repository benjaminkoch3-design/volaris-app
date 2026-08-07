// src/components/profile/AthleteWorkoutLibraryView.tsx

import React, { useState } from "react";
import { LibraryWorkout, LibraryCategory } from "../../types";

interface AthleteWorkoutLibraryViewProps {
  libraryWorkouts: LibraryWorkout[];
  categories: LibraryCategory[];
  onAddCategory: (label: string) => void;
  onDeleteCategory: (id: string) => void;
  onCreateNewTemplate: (categoryId: string) => void;
  onEditTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onBackToProfile: () => void;
}

const getRpeColor = (rpeVal: number) => {
  if (rpeVal <= 3) return "#10b981"; // Vert
  if (rpeVal <= 5) return "#f59e0b"; // Ambre
  if (rpeVal <= 7) return "#f97316"; // Orange
  return "#ef4444"; // Rouge
};

export const AthleteWorkoutLibraryView: React.FC<AthleteWorkoutLibraryViewProps> = ({
  libraryWorkouts,
  categories,
  onAddCategory,
  onDeleteCategory,
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

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    onAddCategory(newCategoryLabel.trim());
    setNewCategoryLabel("");
    setShowAddCategoryInput(false);
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const filteredWorkouts = libraryWorkouts.filter(
    (w) => w.categoryId === selectedCategoryId
  );

  return (
    <div className="space-y-5 animate-fadeIn pb-10 font-sans">
      {/* HEADER DE LA BIBLIOTHÈQUE ATHLÈTE EN OCRE / BRUN (#CF9A61) */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToProfile}
            className="text-stone-400 hover:text-stone-100 text-xs font-bold bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 transition cursor-pointer"
          >
            ← Profil
          </button>
          <div>
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-widest block">
              Mes Modèles Perso
            </span>
            <h2 className="text-xl font-black uppercase text-stone-100">
              📚 Mes Séances ({libraryWorkouts.length})
            </h2>
          </div>
        </div>

        <button
          type="button"
          disabled={categories.length === 0}
          onClick={() => onCreateNewTemplate(selectedCategoryId)}
          className="text-[10px] font-extrabold text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] disabled:opacity-50 px-3 py-2 rounded-xl uppercase transition cursor-pointer shadow-lg"
        >
          ➕ Créer une séance
        </button>
      </div>

      {/* SÉLECTEUR & CRÉATION DE CATÉGORIES */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold uppercase text-stone-400">
            Mes Catégories ({categories.length})
          </span>
          <button
            type="button"
            onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
            className="text-[10px] font-bold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 px-2.5 py-1 rounded-lg border border-[#CF9A61]/30 uppercase transition cursor-pointer"
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
              placeholder="Ex: Fractionné, Sortie Longue, Cote..."
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
            <button
              type="submit"
              className="py-1.5 px-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer"
            >
              Ajouter
            </button>
          </form>
        )}

        {/* LISTE DES BADGES DES CATÉGORIES */}
        <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar">
          {categories.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-1">
              Aucune catégorie. Cliquez sur "Nouvelle catégorie".
            </p>
          ) : (
            categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div key={cat.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition cursor-pointer border ${
                      isSelected
                        ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61] shadow-md"
                        : "bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800"
                    }`}
                  >
                    {cat.label}
                  </button>

                  {isSelected && (
                    <button
                      type="button"
                      title="Supprimer la catégorie"
                      onClick={() => onDeleteCategory(cat.id)}
                      className="text-stone-500 hover:text-[#B34D4D] text-xs px-1 transition cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* LISTE DES SÉANCES */}
      <div className="space-y-3 pt-2">
        {categories.length === 0 ? null : filteredWorkouts.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
              📚
            </div>
            <p className="text-xs text-stone-400">
              Aucune séance dans la catégorie{" "}
              <strong className="text-[#CF9A61]">{currentCategory?.label}</strong>.
            </p>
          </div>
        ) : (
          filteredWorkouts.map((workout) => {
            const rpeVal = parseInt(workout.rpe || "5", 10);
            const rpeColor = getRpeColor(rpeVal);

            return (
              <div
                key={workout.id}
                className="p-4 rounded-3xl border border-l-8 border-l-[#CF9A61] border-stone-800 bg-stone-900/90 shadow-xl space-y-3 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#CF9A61] block">
                      Séance Modèle
                    </span>
                    <h3 className="text-base font-black uppercase tracking-tight text-stone-100 mt-0.5">
                      {workout.title}
                    </h3>
                  </div>

                  <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border bg-[#CF9A61]/20 text-[#CF9A61] border-[#CF9A61]/40">
                    {currentCategory?.label}
                  </span>
                </div>

                {workout.description && (
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded-2xl border border-stone-800/80">
                    {workout.description}
                  </p>
                )}

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