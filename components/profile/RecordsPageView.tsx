// src/components/profile/RecordsPageView.tsx
'use client';

import React, { useState, useMemo } from "react";
import { Race } from "../../types";
import { parseDistanceTextToMeters } from "../../utils/vdot";

interface RecordsPageViewProps {
  races: Race[];
  onBack: () => void;
  onAddRace: (e: React.FormEvent) => void;
  onUpdateRace?: (id: string, updatedData: Partial<Race>) => void;
  onDeleteRace: (id: string) => void;
  isReadOnly?: boolean;
}

type StandardDistanceCategory = "5 km" | "10 km" | "Semi-Marathon" | "Marathon" | "Autres distances";

const CATEGORY_TABS: { key: "all" | "route" | "piste" | "trail" | "nature"; label: string }[] = [
  { key: "all", label: "Toutes les épreuves" },
  { key: "route", label: "Route" },
  { key: "piste", label: "Piste" },
  { key: "trail", label: "Trail" },
  { key: "nature", label: "Course nature" },
];

// Fonction robuste pour catégoriser sans erreur (résout le bug des semi/marathons dans "Autres")
const getStandardDistanceCategory = (distanceStr: string): StandardDistanceCategory => {
  if (!distanceStr) return "Autres distances";
  const lower = distanceStr.toLowerCase().trim();

  if (lower.includes("semi") || lower.includes("21.1") || lower.includes("21 km")) {
    return "Semi-Marathon";
  }
  if (lower.includes("marathon") && !lower.includes("semi")) {
    return "Marathon";
  }
  if (lower.includes("10k") || lower.includes("10 km") || lower.includes("10000")) {
    return "10 km";
  }
  if (lower.includes("5k") || lower.includes("5 km") || lower.includes("5000")) {
    return "5 km";
  }

  const meters = parseDistanceTextToMeters(distanceStr);
  if (meters >= 4500 && meters <= 5500) return "5 km";
  if (meters >= 9500 && meters <= 10500) return "10 km";
  if (meters >= 20000 && meters <= 22000) return "Semi-Marathon";
  if (meters >= 41000 && meters <= 43000) return "Marathon";

  return "Autres distances";
};

const DISTANCE_PRIORITY: Record<StandardDistanceCategory, number> = {
  "5 km": 1,
  "10 km": 2,
  "Semi-Marathon": 3,
  "Marathon": 4,
  "Autres distances": 5,
};

const timeToSeconds = (h: number, m: number, s: number): number => {
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
};

const secondsToFormattedTime = (totalSec: number): string => {
  if (!totalSec || totalSec <= 0) return "00:00";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

const parseTimeStringToParts = (timeStr: string) => {
  if (!timeStr) return { h: "", m: "", s: "" };
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) return { h: parts[0] > 0 ? String(parts[0]) : "", m: String(parts[1]), s: String(parts[2]) };
  if (parts.length === 2) return { h: "", m: String(parts[0]), s: String(parts[1]) };
  return { h: "", m: "", s: "" };
};

const extractYear = (dateStr?: string) => {
  if (!dateStr) return "";
  const match = dateStr.match(/^\d{4}/);
  if (match) return match[0];
  const parts = dateStr.split(/[-/]/);
  return parts[0]?.length === 4 ? parts[0] : parts[parts.length - 1] || "";
};

export const RecordsPageView: React.FC<RecordsPageViewProps> = ({
  races,
  onBack,
  onAddRace,
  onUpdateRace,
  onDeleteRace,
  isReadOnly = false,
}) => {
  const [selectedType, setSelectedType] = useState<"all" | "route" | "piste" | "trail" | "nature">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
  const [inspectingRace, setInspectingRace] = useState<Race | null>(null);

  // Formulaire de saisie
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"route" | "piste" | "trail" | "nature">("route");
  const [formDistancePreset, setFormDistancePreset] = useState("10 km");
  const [formCustomDistance, setFormCustomDistance] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formHours, setFormHours] = useState("");
  const [formMinutes, setFormMinutes] = useState("");
  const [formSeconds, setFormSeconds] = useState("");
  const [formElevation, setFormElevation] = useState("");
  const [formRank, setFormRank] = useState("");
  const [formUtmb, setFormUtmb] = useState("");

  const handleOpenAdd = (defaultDist = "10 km", defaultCategory: "route" | "piste" | "trail" | "nature" = "route") => {
    setEditingRaceId(null);
    setFormName("");
    setFormCategory(defaultCategory);
    const validPresets = ["5 km", "10 km", "Semi-Marathon", "Marathon"];
    setFormDistancePreset(validPresets.includes(defaultDist) ? defaultDist : "custom");
    setFormCustomDistance(validPresets.includes(defaultDist) ? "" : defaultDist);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormHours("");
    setFormMinutes("");
    setFormSeconds("");
    setFormElevation("");
    setFormRank("");
    setFormUtmb("");
    setShowAddForm(true);
  };

  const handleOpenEdit = (race: Race) => {
    setInspectingRace(null);
    setEditingRaceId(race.id);
    setFormName(race.name);
    setFormCategory((race.category as any) || "route");
    const validPresets = ["5 km", "10 km", "Semi-Marathon", "Marathon"];
    const isPreset = validPresets.includes(race.distance);
    setFormDistancePreset(isPreset ? race.distance : "custom");
    setFormCustomDistance(isPreset ? "" : race.distance);
    setFormDate(race.date || new Date().toISOString().split("T")[0]);

    const parts = parseTimeStringToParts(race.time);
    setFormHours(parts.h);
    setFormMinutes(parts.m);
    setFormSeconds(parts.s);

    setFormElevation(race.elevationGain !== undefined && race.elevationGain !== null ? String(race.elevationGain) : "");
    setFormRank(race.rank || "");
    setFormUtmb(race.utmbIndex !== undefined && race.utmbIndex !== null ? String(race.utmbIndex) : "");
    setShowAddForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSec = timeToSeconds(
      parseInt(formHours, 10) || 0,
      parseInt(formMinutes, 10) || 0,
      parseInt(formSeconds, 10) || 0
    );
    const formattedTime = secondsToFormattedTime(totalSec);
    const finalDistance = formDistancePreset === "custom" ? (formCustomDistance || "10 km") : formDistancePreset;

    if (editingRaceId && onUpdateRace) {
      onUpdateRace(editingRaceId, {
        name: formName,
        distance: finalDistance,
        time: formattedTime,
        category: formCategory,
        elevationGain: formElevation ? parseFloat(formElevation) : undefined,
        rank: formRank.trim() || undefined,
        utmbIndex: formUtmb ? parseFloat(formUtmb) : undefined,
        date: formDate,
      });
      setShowAddForm(false);
      setEditingRaceId(null);
    } else {
      (window as any).__volaris_temp_race = {
        name: formName,
        distance: finalDistance,
        time: formattedTime,
        category: formCategory,
        elevationGain: formElevation ? parseFloat(formElevation) : undefined,
        rank: formRank.trim() || undefined,
        utmbIndex: formUtmb ? parseFloat(formUtmb) : undefined,
        date: formDate,
      };
      onAddRace(e);
      setShowAddForm(false);
    }
  };

  const groupedRaces = useMemo(() => {
    const filtered = races.filter((r) => {
      if (selectedType === "all") return true;
      return (r.category || "route") === selectedType;
    });

    const groups: Record<StandardDistanceCategory, Race[]> = {
      "5 km": [],
      "10 km": [],
      "Semi-Marathon": [],
      "Marathon": [],
      "Autres distances": [],
    };

    filtered.forEach((r) => {
      const cat = getStandardDistanceCategory(r.distance);
      groups[cat].push(r);
    });

    (Object.keys(groups) as StandardDistanceCategory[]).forEach((cat) => {
      groups[cat].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
    });

    return groups;
  }, [races, selectedType]);

  const totalFilteredCount = Object.values(groupedRaces).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-300 hover:text-white text-xs font-bold bg-stone-950 hover:bg-stone-850 px-3.5 py-2 rounded-xl border border-stone-800 transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Retour profil</span>
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
              Palmarès & compétitions
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Historique des courses
            </h2>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => handleOpenAdd("10 km", selectedType === "all" ? "route" : selectedType)}
            className="px-4 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Ajouter une course</span>
            <span className="text-sm">＋</span>
          </button>
        )}
      </div>

      {/* FORMULAIRE D'AJOUT / ÉDITION */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="bg-stone-900 border border-[#CF9A61]/50 rounded-3xl p-5 space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#CF9A61]">
              {editingRaceId ? "Modifier l'épreuve" : "Nouvelle compétition"}
            </h4>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingRaceId(null); }}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Nom de la course *
              </label>
              <input
                type="text"
                required
                placeholder="Ex. Marathon de Paris, Trail des Aiguilles..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Discipline
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-bold focus:outline-none focus:border-[#CF9A61] cursor-pointer"
              >
                <option value="route">Route</option>
                <option value="piste">Piste</option>
                <option value="trail">Trail</option>
                <option value="nature">Course nature</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Date de l'épreuve *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Distance
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { key: "5 km", label: "5 km" },
                  { key: "10 km", label: "10 km" },
                  { key: "Semi-Marathon", label: "Semi" },
                  { key: "Marathon", label: "Marathon" },
                  { key: "custom", label: "Autre" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFormDistancePreset(item.key)}
                    className={`py-2 px-1 text-[10px] font-black uppercase rounded-xl border transition cursor-pointer ${
                      formDistancePreset === item.key
                        ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61]"
                        : "bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {formDistancePreset === "custom" && (
                <input
                  type="text"
                  required
                  placeholder="Ex. 24 km, 800 m, 45 km..."
                  value={formCustomDistance}
                  onChange={(e) => setFormCustomDistance(e.target.value)}
                  className="w-full mt-2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
              )}
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Temps officiel (h / min / sec) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="00"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
                <span className="text-stone-500 font-bold">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  required
                  placeholder="00"
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(e.target.value)}
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
                <span className="text-stone-500 font-bold">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="00"
                  value={formSeconds}
                  onChange={(e) => setFormSeconds(e.target.value)}
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Classement (ex. 1er, 2e, 14e / 450)
              </label>
              <input
                type="text"
                placeholder="Ex. 1er ou 3e scratch"
                value={formRank}
                onChange={(e) => setFormRank(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Dénivelé positif (+m D+)
              </label>
              <input
                type="number"
                placeholder="Ex. 850"
                value={formElevation}
                onChange={(e) => setFormElevation(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            {(formCategory === "trail" || formCategory === "nature") && (
              <div>
                <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                  Index UTMB (pts)
                </label>
                <input
                  type="number"
                  placeholder="Ex. 540"
                  value={formUtmb}
                  onChange={(e) => setFormUtmb(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-stone-800">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingRaceId(null); }}
              className="px-4 py-2 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl shadow-md transition cursor-pointer"
            >
              {editingRaceId ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      {/* FILTRES PAR DISCIPLINE */}
      <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar items-center">
        {CATEGORY_TABS.map((tab) => {
          const isSelected = selectedType === tab.key;
          const count =
            tab.key === "all"
              ? races.length
              : races.filter((r) => (r.category || "route") === tab.key).length;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedType(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border shrink-0 ${
                isSelected
                  ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61] shadow-md"
                  : "bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-md font-bold ${isSelected ? "bg-stone-950/20 text-stone-950" : "bg-stone-950 text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LISTE DES COURSES PAR DISTANCE */}
      {totalFilteredCount === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-2 shadow-xl">
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">
            Aucune épreuve enregistrée dans cette catégorie
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(groupedRaces) as StandardDistanceCategory[])
            .sort((a, b) => DISTANCE_PRIORITY[a] - DISTANCE_PRIORITY[b])
            .map((distanceCategory) => {
              const raceList = groupedRaces[distanceCategory];
              if (raceList.length === 0) return null;

              return (
                <div key={distanceCategory} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2 px-1">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="text-sm font-black uppercase tracking-wider text-stone-100 font-mono">
                        {distanceCategory}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-850">
                        {raceList.length} {raceList.length > 1 ? "courses" : "course"}
                      </span>
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(distanceCategory === "Autres distances" ? "custom" : distanceCategory, selectedType === "all" ? "route" : selectedType)}
                        className="text-[10px] font-black text-[#CF9A61] hover:text-[#b88652] uppercase tracking-wider cursor-pointer transition"
                      >
                        ＋ Ajouter
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {raceList.map((race) => {
                      const isTrailOrNature = race.category === "trail" || race.category === "nature";
                      const raceYear = extractYear(race.date);

                      return (
                        <div
                          key={race.id}
                          onClick={() => setInspectingRace(race)}
                          className="p-4 rounded-2xl border border-stone-800 hover:border-[#CF9A61]/40 bg-stone-900 hover:bg-stone-850 shadow-md transition cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="font-black text-xs text-stone-100 group-hover:text-[#CF9A61] transition truncate">
                              {race.name}
                            </h4>

                            {isTrailOrNature ? (
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-400 font-mono">
                                {raceYear && <span>{raceYear}</span>}
                                {raceYear && <span>•</span>}
                                <span className="font-bold text-stone-300">{race.distance}</span>
                                {race.elevationGain ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#CDCF61] font-bold">+{race.elevationGain}m D+</span>
                                  </>
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-[11px] text-stone-400 font-mono">
                                {raceYear || "Date non définie"}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-[#CF9A61] font-mono tracking-tight block">
                              {race.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* MODALE DE CONSULTATION DÉTAILLÉE */}
      {inspectingRace && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3">
              <div>
                <span className="text-[9.5px] font-black uppercase text-[#CF9A61] tracking-widest block">
                  Fiche de course
                </span>
                <h3 className="text-base font-black uppercase text-stone-100 mt-0.5">
                  {inspectingRace.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRace(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-950 p-4 rounded-2xl border border-stone-800">
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Temps officiel</span>
                <span className="text-sm font-black text-[#CF9A61] font-mono">{inspectingRace.time}</span>
              </div>
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Distance</span>
                <span className="text-xs font-extrabold text-stone-200">{inspectingRace.distance}</span>
              </div>
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Date</span>
                <span className="font-semibold text-stone-300">{inspectingRace.date || "-"}</span>
              </div>
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Discipline</span>
                <span className="font-semibold text-stone-300">
                  {inspectingRace.category === "piste"
                    ? "Piste"
                    : inspectingRace.category === "trail"
                    ? "Trail"
                    : inspectingRace.category === "nature"
                    ? "Course nature"
                    : "Route"}
                </span>
              </div>

              {inspectingRace.elevationGain !== undefined && inspectingRace.elevationGain !== null && (
                <div>
                  <span className="text-[9px] text-stone-500 uppercase font-bold block">Dénivelé positif</span>
                  <span className="font-extrabold text-[#CDCF61]">+{inspectingRace.elevationGain}m D+</span>
                </div>
              )}

              {inspectingRace.rank && (
                <div>
                  <span className="text-[9px] text-stone-500 uppercase font-bold block">Classement</span>
                  <span className="font-bold text-stone-200">{inspectingRace.rank}</span>
                </div>
              )}

              {inspectingRace.utmbIndex !== undefined && inspectingRace.utmbIndex !== null && (
                <div className="col-span-2 pt-1 border-t border-stone-800/60">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block">Index UTMB</span>
                  <span className="font-black text-[#4DB380]">{inspectingRace.utmbIndex} pts</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setInspectingRace(null)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>

              {!isReadOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(inspectingRace)}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Supprimer définitivement la course "${inspectingRace.name}" ?`)) {
                        onDeleteRace(inspectingRace.id);
                        setInspectingRace(null);
                      }
                    }}
                    className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};