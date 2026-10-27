// src/components/profile/AthleteWorkoutLibraryView.tsx

import React, { useState, useRef, useEffect } from "react";
import { LibraryWorkout, LibraryCategory } from "../../types";
import { getWorkoutTypeConfig } from "../../utils/calculations";
import { supabase } from "../../lib/supabaseClient";

interface AthleteWorkoutLibraryViewProps {
  libraryWorkouts: LibraryWorkout[];
  categories: LibraryCategory[];
  athleteId: string;
  athleteVma?: number | string;
  athleteFcRest?: number | string;
  athleteFcMax?: number | string;
  athleteVmaTemplates?: any[];
  athleteHrTemplates?: any[];
  onSaveAthleteZoneTemplate?: (template: any) => void;
  onDeleteAthleteZoneTemplate?: (templateId: string) => void;
  onAddCategory: (label: string, color?: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory?: (id: string, newLabel: string) => void;
  onUpdateCategoryColor?: (id: string, color: string) => void;
  onMoveCategory?: (id: string, direction: "left" | "right") => void;
  onMoveWorkout?: (workoutId: string, direction: "up" | "down") => void;
  onCreateNewTemplate: (categoryId: string) => void;
  onEditTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onBackToProfile: () => void;
}

interface ZoneTemplate {
  id: string;
  name: string;
  type: 'vma' | 'hr';
  zones: any[];
}

const EXTENDED_COLOR_PALETTE = [
  "#CF9A61", "#CDCF61", "#F59E0B", "#D97706",
  "#EF4444", "#DC2626", "#F43F5E", "#BE123C",
  "#EC4899", "#A855F7", "#7C3AED", "#6366F1",
  "#3B82F6", "#0284C7", "#06B6D4", "#0D9488",
  "#10B981", "#059669", "#84CC16", "#65A30D",
  "#E2E8F0", "#94A3B8", "#475569", "#1E293B",
];

const getContrastTextColor = (hexColor?: string): "#ffffff" | "#0a0a0a" => {
  if (!hexColor) return "#0a0a0a";
  const hex = hexColor.replace("#", "");
  const fullHex = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0a0a0a" : "#ffffff";
};

const hexToRgba = (hexColor: string, opacity: number): string => {
  const hex = hexColor.replace("#", "");
  const fullHex = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getRpeColor = (rpeVal: number) => {
  if (rpeVal <= 3) return "#10b981";
  if (rpeVal <= 5) return "#f59e0b";
  if (rpeVal <= 7) return "#f97316";
  return "#ef4444";
};

const speedToPace = (speedKmH: number): string => {
  if (!speedKmH || speedKmH <= 0 || isNaN(speedKmH)) return "-";
  const totalSeconds = Math.round(3600 / speedKmH);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}/km`;
};

export const AthleteWorkoutLibraryView: React.FC<AthleteWorkoutLibraryViewProps> = ({
  libraryWorkouts,
  categories,
  athleteId,
  athleteVma = 14,
  athleteFcRest = 50,
  athleteFcMax = 190,
  athleteVmaTemplates = [],
  athleteHrTemplates = [],
  onSaveAthleteZoneTemplate,
  onDeleteAthleteZoneTemplate,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onUpdateCategoryColor,
  onMoveCategory,
  onMoveWorkout,
  onCreateNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onBackToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<"workouts" | "zones">("workouts");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ""
  );
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<string>(EXTENDED_COLOR_PALETTE[0]);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryLabel, setEditedCategoryLabel] = useState("");
  const [colorPickerCatId, setColorPickerCatId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Gestion de la sélection de l'athlète depuis Supabase
  const [selectedVmaTmplId, setSelectedVmaTmplId] = useState<string>("");
  const [selectedHrTmplId, setSelectedHrTmplId] = useState<string>("");
  const [savingZones, setSavingZones] = useState(false);
  const [zoneSaveMsg, setZoneSaveMsg] = useState("");

  // Formulaire création nouveau modèle perso
  const [showNewZoneForm, setShowNewZoneForm] = useState<"vma" | "hr" | null>(null);
  const [newTmplName, setNewTmplName] = useState("");
  const [newTmplZones, setNewTmplZones] = useState<any[]>([
    { name: "Endurance (Z1)", min: 50, max: 65, color: "#3B82F6" },
    { name: "Endurance active (Z2)", min: 65, max: 75, color: "#10B981" },
    { name: "Tempo (Z3)", min: 75, max: 85, color: "#F59E0B" },
    { name: "Seuil (Z4)", min: 85, max: 95, color: "#F97316" },
    { name: "VMA (Z5)", min: 95, max: 105, color: "#EF4444" },
  ]);

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

  // Charger la sélection actuelle de l'athlète depuis Supabase
  useEffect(() => {
    const fetchAthleteProfileZones = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("athlete_vma_template_id, athlete_hr_template_id")
        .eq("id", athleteId)
        .maybeSingle();

      if (data) {
        if (data.athlete_vma_template_id) setSelectedVmaTmplId(data.athlete_vma_template_id);
        if (data.athlete_hr_template_id) setSelectedHrTmplId(data.athlete_hr_template_id);
      }
    };
    if (athleteId) fetchAthleteProfileZones();
  }, [athleteId]);

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    onAddCategory(newCategoryLabel.trim(), newCategoryColor);
    setNewCategoryLabel("");
    setNewCategoryColor(EXTENDED_COLOR_PALETTE[0]);
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

  const handleSaveSelections = async () => {
    setSavingZones(true);
    setZoneSaveMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({
        athlete_vma_template_id: selectedVmaTmplId || null,
        athlete_hr_template_id: selectedHrTmplId || null,
      })
      .eq("id", athleteId);

    setSavingZones(false);
    if (error) {
      setZoneSaveMsg(`Erreur : ${error.message}`);
    } else {
      setZoneSaveMsg("Vos modèles personnels ont été enregistrés avec succès !");
      setTimeout(() => setZoneSaveMsg(""), 3000);
    }
  };

  const handleCreateTemplateSubmit = async (type: 'vma' | 'hr') => {
    if (!newTmplName.trim()) return;
    const newId = crypto.randomUUID();
    const newTmpl = {
      id: newId,
      user_id: athleteId,
      type,
      name: newTmplName.trim(),
      zones: newTmplZones,
    };

    if (onSaveAthleteZoneTemplate) {
      onSaveAthleteZoneTemplate(newTmpl);
    }

    if (type === 'vma') setSelectedVmaTmplId(newId);
    if (type === 'hr') setSelectedHrTmplId(newId);
    setShowNewZoneForm(null);
    setNewTmplName("");
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const filteredWorkouts = libraryWorkouts.filter(
    (w) => w.categoryId === selectedCategoryId
  );

  const activeVmaTmpl = athleteVmaTemplates.find((t) => String(t.id) === String(selectedVmaTmplId));
  const activeHrTmpl = athleteHrTemplates.find((t) => String(t.id) === String(selectedHrTmplId));

  const numVma = parseFloat(String(athleteVma)) || 14;
  const numFcRest = parseFloat(String(athleteFcRest)) || 50;
  const numFcMax = parseFloat(String(athleteFcMax)) || 190;
  const fcReserve = numFcMax - numFcRest;

  return (
    <div className="space-y-6 animate-fadeIn pb-10 font-sans w-full">
      {/* HEADER DE LA PAGE MODÈLES */}
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
              Espace Personnel
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-stone-100 tracking-tight mt-0.5">
              Mes Modèles
            </h2>
          </div>
        </div>

        {/* ONGLETS DE NAVIGATION INTERNE */}
        <div className="flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab("workouts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
              activeTab === "workouts" ? "bg-[#CF9A61] text-stone-950 font-black shadow-md" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Séances ({libraryWorkouts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zones")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
              activeTab === "zones" ? "bg-[#CF9A61] text-stone-950 font-black shadow-md" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Allures & Fréquence Cardiaque
          </button>
        </div>
      </div>

      {/* CONTENU ONGLET 1 : SÉANCES (BIBLIOTHÈQUE) */}
      {activeTab === "workouts" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={categories.length === 0}
              onClick={() => onCreateNewTemplate(selectedCategoryId)}
              className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] disabled:opacity-40 px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
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
                className="space-y-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800 animate-fadeIn"
              >
                <div className="flex items-center gap-2">
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
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-stone-900">
                  <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                    Couleur de fond :
                  </span>
                  <div className="grid grid-cols-12 gap-1.5 max-w-md">
                    {EXTENDED_COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCategoryColor(c)}
                        className={`w-5 h-5 rounded-md transition-transform cursor-pointer border ${
                          newCategoryColor === c ? "scale-125 border-white shadow-md ring-2 ring-stone-950" : "border-stone-800 hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </form>
            )}

            <div className="flex overflow-x-auto md:overflow-visible md:flex-wrap gap-2 pb-1.5 custom-scrollbar items-center">
              {categories.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-2 px-1">
                  Aucune catégorie. Cliquez sur « Nouvelle catégorie ».
                </p>
              ) : (
                categories.map((cat, catIdx) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const isConfirming = categoryToDelete === cat.id;
                  const isEditing = editingCategoryId === cat.id;
                  const isPickingColor = colorPickerCatId === cat.id;
                  const count = libraryWorkouts.filter((w) => w.categoryId === cat.id).length;
                  const rawColor = cat.color || "#CF9A61";
                  const bgStyle = isSelected ? rawColor : hexToRgba(rawColor, 0.22);
                  const borderStyle = isSelected ? rawColor : hexToRgba(rawColor, 0.55);
                  const textStyle = isSelected ? getContrastTextColor(rawColor) : rawColor;

                  return (
                    <div
                      key={cat.id}
                      className={`relative flex items-center rounded-2xl border transition-all shrink-0 max-w-[200px] md:max-w-[240px] ${
                        isPickingColor ? "z-40 shadow-2xl ring-2 ring-stone-400" : isSelected ? "z-20 shadow-lg scale-[1.02]" : "z-10"
                      }`}
                      style={{
                        backgroundColor: bgStyle,
                        borderColor: borderStyle,
                      }}
                    >
                      {isSelected && onMoveCategory && (
                        <button
                          type="button"
                          disabled={catIdx === 0}
                          onClick={(e) => { e.stopPropagation(); onMoveCategory(cat.id, "left"); }}
                          className="p-2 disabled:opacity-25 transition cursor-pointer shrink-0"
                          style={{ color: textStyle }}
                        >
                          ‹
                        </button>
                      )}

                      {isSelected && onUpdateCategoryColor && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setColorPickerCatId(isPickingColor ? null : cat.id); }}
                          className="w-4 h-4 rounded-full ml-2 shrink-0 cursor-pointer border shadow-sm"
                          style={{ backgroundColor: rawColor }}
                        />
                      )}

                      {isEditing ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={editedCategoryLabel}
                          onChange={(e) => setEditedCategoryLabel(e.target.value)}
                          onBlur={() => {
                            if (editedCategoryLabel.trim() && onRenameCategory) onRenameCategory(cat.id, editedCategoryLabel.trim());
                            setEditingCategoryId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editedCategoryLabel.trim() && onRenameCategory) onRenameCategory(cat.id, editedCategoryLabel.trim());
                              setEditingCategoryId(null);
                            }
                          }}
                          className="bg-stone-950 border rounded-xl px-2 py-1 text-xs font-black uppercase w-28 mx-1"
                          style={{ color: textStyle }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditingCategoryId(cat.id);
                              setEditedCategoryLabel(cat.label);
                            } else {
                              setSelectedCategoryId(cat.id);
                              setCategoryToDelete(null);
                            }
                          }}
                          className="px-3 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-between gap-2 text-left flex-1 min-w-0"
                          style={{ color: textStyle }}
                        >
                          <span className="truncate">{cat.label}</span>
                          <span className="text-[9px] font-mono px-1 rounded" style={{ backgroundColor: hexToRgba(rawColor, 0.3) }}>
                            {count}
                          </span>
                        </button>
                      )}

                      {isSelected && onMoveCategory && (
                        <button
                          type="button"
                          disabled={catIdx === categories.length - 1}
                          onClick={(e) => { e.stopPropagation(); onMoveCategory(cat.id, "right"); }}
                          className="p-2 disabled:opacity-25 transition cursor-pointer shrink-0"
                          style={{ color: textStyle }}
                        >
                          ›
                        </button>
                      )}

                      {isSelected && (
                        isConfirming ? (
                          <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl mr-1">
                            <span className="text-[9px] text-red-400 font-bold">Sûr ?</span>
                            <button type="button" onClick={() => confirmDeleteCategory(cat.id)} className="text-[9px] font-black text-white bg-red-600 px-1 rounded">Oui</button>
                            <button type="button" onClick={() => setCategoryToDelete(null)} className="text-[9px] text-stone-400 px-1">Non</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setCategoryToDelete(cat.id)} className="pr-2.5 pl-1 opacity-60 hover:opacity-100 text-xs" style={{ color: textStyle }}>✕</button>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LISTE DES SÉANCES */}
          <div className="space-y-3">
            {filteredWorkouts.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
                <p className="text-xs text-stone-400">Aucune séance dans cette catégorie.</p>
                <button
                  type="button"
                  onClick={() => onCreateNewTemplate(selectedCategoryId)}
                  className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] px-4 py-2 rounded-xl uppercase transition cursor-pointer"
                >
                  ＋ Créer un modèle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredWorkouts.map((workout, workoutIdx) => {
                  const rpeVal = parseInt(workout.rpe || "5", 10);
                  const rpeColor = getRpeColor(rpeVal);
                  const typeConfig = getWorkoutTypeConfig((workout as any).type || "footing");
                  const catColor = currentCategory?.color || "#CF9A61";

                  return (
                    <div key={workout.id} className={`p-4 rounded-3xl border border-l-8 ${typeConfig.borderClass} border-stone-800 bg-stone-900 shadow-xl space-y-3`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2.5">
                          {onMoveWorkout && (
                            <div className="flex flex-col gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0">
                              <button type="button" disabled={workoutIdx === 0} onClick={() => onMoveWorkout(workout.id, "up")} className="p-1 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 cursor-pointer">▲</button>
                              <button type="button" disabled={workoutIdx === filteredWorkouts.length - 1} onClick={() => onMoveWorkout(workout.id, "down")} className="p-1 text-stone-400 hover:text-[#CF9A61] disabled:opacity-20 cursor-pointer">▼</button>
                            </div>
                          )}
                          <div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${typeConfig.badgeClass}`}>
                              {typeConfig.label}
                            </span>
                            <h3 className="text-sm font-black uppercase text-stone-100 mt-1">{workout.title}</h3>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg" style={{ backgroundColor: catColor, color: getContrastTextColor(catColor) }}>
                          {currentCategory?.label}
                        </span>
                      </div>

                      {workout.description && (
                        <p className="text-xs text-stone-300 bg-stone-950/60 p-2.5 rounded-2xl border border-stone-800/80 line-clamp-2">
                          {workout.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                        <div className="flex items-center gap-2">
                          {workout.km && <span className="text-xs font-mono font-black bg-stone-950 text-stone-100 px-2.5 py-1 rounded-lg border border-stone-800">{workout.km} km</span>}
                          {workout.rpe && <span className="text-xs font-mono font-black bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800" style={{ color: rpeColor }}>RPE {workout.rpe}/10</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onEditTemplate(workout.id)} className="text-[10px] font-bold text-[#CF9A61] bg-[#CF9A61]/10 px-3 py-1.5 rounded-xl uppercase">Éditer</button>
                          <button type="button" onClick={() => onDeleteTemplate(workout.id)} className="text-stone-500 hover:text-red-400 text-xs px-2">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : MODÈLES D'ALLURES & FRÉQUENCE CARDIAQUE PERSO */}
      {activeTab === "zones" && (
        <div className="space-y-6 animate-fadeIn bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#CF9A61] block">
                Paramètres Personnels
              </span>
              <h3 className="text-base font-black uppercase text-stone-100">
                Modèles d'Allure & Fréquence Cardiaque (Athlète)
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Définissez vos propres modèles de zones. Ils s'appliqueront automatiquement à votre profil.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSelections}
              disabled={savingZones}
              className="px-5 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            >
              {savingZones ? "Enregistrement..." : "Enregistrer mes choix"}
            </button>
          </div>

          {zoneSaveMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-3 rounded-2xl text-center">
              {zoneSaveMsg}
            </div>
          )}

          {/* RAPPEL PROFIL ATHLÈTE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">Ma VMA de Référence</span>
              <span className="text-lg font-black text-[#CF9A61]">{numVma} km/h</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">FC Repos / Min</span>
              <span className="text-lg font-black text-stone-100">{numFcRest} bpm</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-stone-400 uppercase block">FC Max</span>
              <span className="text-lg font-black text-stone-100">{numFcMax} bpm</span>
            </div>
          </div>

          {/* SECTION MODÈLE D'ALLURE PERSONNEL */}
          <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-stone-100">Mon Modèle d'Allure</h4>
                <p className="text-[11px] text-stone-400">Basé sur votre VMA ({numVma} km/h)</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedVmaTmplId}
                  onChange={(e) => setSelectedVmaTmplId(e.target.value)}
                  className="flex-1 sm:w-64 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                >
                  <option value="">-- Aucun modèle d'allure personnel --</option>
                  {athleteVmaTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewZoneForm(showNewZoneForm === 'vma' ? null : 'vma')}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-[#CF9A61] border border-stone-800 text-xs font-black rounded-xl uppercase shrink-0 cursor-pointer"
                >
                  ＋ Créer
                </button>
              </div>
            </div>

            {/* FORMULAIRE CRÉATION MODÈLE VMA */}
            {showNewZoneForm === 'vma' && (
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-700 space-y-3 animate-fadeIn">
                <h5 className="text-xs font-black uppercase text-[#CF9A61]">Nouveau modèle d'allure personnel</h5>
                <input
                  type="text"
                  placeholder="Nom du modèle (ex : Mes Allures Perso)"
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
                <button
                  type="button"
                  onClick={() => handleCreateTemplateSubmit('vma')}
                  className="px-4 py-2 bg-[#CF9A61] text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer"
                >
                  Enregistrer ce modèle d'allure
                </button>
              </div>
            )}

            {activeVmaTmpl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {activeVmaTmpl.zones?.map((zone: any, idx: number) => {
                  const pMin = parseFloat(zone.min || zone.minVmaPercent || 0);
                  const pMax = parseFloat(zone.max || zone.maxVmaPercent || 0);
                  const sMin = (numVma * pMin) / 100;
                  const sMax = (numVma * pMax) / 100;
                  return (
                    <div key={idx} className="p-3 rounded-xl border bg-stone-900 space-y-1" style={{ borderColor: zone.color || "#CF9A61" }}>
                      <div className="flex justify-between items-center text-xs font-black text-stone-100">
                        <span>{zone.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold" style={{ backgroundColor: zone.color || "#CF9A61" }}>{pMin}%-{pMax}%</span>
                      </div>
                      <p className="text-xs font-bold text-stone-300 font-mono">{speedToPace(sMax)} à {speedToPace(sMin)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION MODÈLE FRÉQUENCE CARDIAQUE PERSONNEL */}
          <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-stone-100">Mon Modèle de Fréquence Cardiaque</h4>
                <p className="text-[11px] text-stone-400">Basé sur Karvonen (FCR : {numFcRest} bpm / Max : {numFcMax} bpm)</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedHrTmplId}
                  onChange={(e) => setSelectedHrTmplId(e.target.value)}
                  className="flex-1 sm:w-64 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                >
                  <option value="">-- Aucun modèle FC personnel --</option>
                  {athleteHrTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewZoneForm(showNewZoneForm === 'hr' ? null : 'hr')}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-[#CF9A61] border border-stone-800 text-xs font-black rounded-xl uppercase shrink-0 cursor-pointer"
                >
                  ＋ Créer
                </button>
              </div>
            </div>

            {/* FORMULAIRE CRÉATION MODÈLE FC */}
            {showNewZoneForm === 'hr' && (
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-700 space-y-3 animate-fadeIn">
                <h5 className="text-xs font-black uppercase text-[#CF9A61]">Nouveau modèle FC personnel</h5>
                <input
                  type="text"
                  placeholder="Nom du modèle (ex : Mes Zones FC Perso)"
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
                <button
                  type="button"
                  onClick={() => handleCreateTemplateSubmit('hr')}
                  className="px-4 py-2 bg-[#CF9A61] text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer"
                >
                  Enregistrer ce modèle FC
                </button>
              </div>
            )}

            {activeHrTmpl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {activeHrTmpl.zones?.map((zone: any, idx: number) => {
                  const pMin = parseFloat(zone.min || zone.percentageMin || 0);
                  const pMax = parseFloat(zone.max || zone.percentageMax || 0);
                  const fcMinCalc = Math.round(numFcRest + fcReserve * (pMin / 100));
                  const fcMaxCalc = Math.round(numFcRest + fcReserve * (pMax / 100));
                  return (
                    <div key={idx} className="p-3 rounded-xl border bg-stone-900 space-y-0.5" style={{ borderColor: zone.color || "#CF9A61" }}>
                      <div className="flex justify-between items-center text-xs font-black text-stone-100">
                        <span>{zone.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold" style={{ backgroundColor: zone.color || "#CF9A61" }}>{pMin}%-{pMax}%</span>
                      </div>
                      <p className="text-xs font-bold text-stone-300">{fcMinCalc} à {fcMaxCalc} bpm</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};