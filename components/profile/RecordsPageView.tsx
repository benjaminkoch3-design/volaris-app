// src/components/profile/RecordsPageView.tsx

import React, { useState, useMemo } from "react";
import { Race } from "../../types";
import { parseDistanceTextToMeters, getPerformanceScoreForRecord } from "../../utils/vdot";

interface RecordsPageViewProps {
  races: Race[];
  onBack: () => void;
  onAddRace: (e: React.FormEvent) => void;
  onUpdateRace?: (id: string, updatedData: Partial<Race>) => void;
  onDeleteRace: (id: string) => void;
  isReadOnly?: boolean;
}

type StandardDistanceCategory = "5 km" | "10 km" | "Semi-Marathon" | "Marathon" | "Autres";

const CATEGORY_TABS: { key: "route" | "trail" | "piste" | "nature" | "all"; label: string; icon: string }[] = [
  { key: "all", label: "Toutes", icon: "🌐" },
  { key: "route", label: "Route", icon: "🛣️" },
  { key: "trail", label: "Trail", icon: "⛰️" },
  { key: "piste", label: "Piste", icon: "🏟️" },
  { key: "nature", label: "Nature", icon: "🌲" },
];

const getStandardDistanceCategory = (distanceStr: string): StandardDistanceCategory => {
  if (!distanceStr) return "Autres";
  const meters = parseDistanceTextToMeters(distanceStr);

  if (meters >= 4800 && meters <= 5200) return "5 km";
  if (meters >= 9800 && meters <= 10200) return "10 km";
  if (meters >= 20900 && meters <= 21300) return "Semi-Marathon";
  if (meters >= 41800 && meters <= 42500) return "Marathon";

  return "Autres";
};

const DISTANCE_PRIORITY: Record<StandardDistanceCategory, number> = {
  "5 km": 1,
  "10 km": 2,
  "Semi-Marathon": 3,
  "Marathon": 4,
  "Autres": 5,
};

// Couleurs précises des médailles pour les podiums
const getPodiumBadge = (rankText?: string) => {
  if (!rankText) return null;
  const clean = rankText.toLowerCase().trim();

  // 1ère place : Or
  if (/^(1er|1ère|1re|1e|1\b|1er\/|1\/)/i.test(clean)) {
    return {
      medal: "🥇",
      bgClass: "bg-amber-400/15 border-amber-400/50 text-amber-300",
      borderAccent: "border-l-[#F59E0B]",
    };
  }
  // 2ème place : Argent
  if (/^(2e|2ème|2nd|2nde|2\b|2e\/|2\/)/i.test(clean)) {
    return {
      medal: "🥈",
      bgClass: "bg-slate-300/15 border-slate-300/50 text-slate-200",
      borderAccent: "border-l-[#E2E8F0]",
    };
  }
  // 3ème place : Bronze
  if (/^(3e|3ème|3\b|3e\/|3\/)/i.test(clean)) {
    return {
      medal: "🥉",
      bgClass: "bg-amber-700/20 border-amber-600/50 text-amber-500",
      borderAccent: "border-l-[#B45309]",
    };
  }

  // Finisher / Classement général
  return {
    medal: "🏁",
    bgClass: "bg-stone-900 border-stone-800 text-stone-300",
    borderAccent: "border-l-stone-700",
  };
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

export const RecordsPageView: React.FC<RecordsPageViewProps> = ({
  races,
  onBack,
  onAddRace,
  onUpdateRace,
  onDeleteRace,
  isReadOnly = false,
}) => {
  const [selectedType, setSelectedType] = useState<"all" | "route" | "trail" | "piste" | "nature">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRaceId, setEditingRaceId] = useState<string | null>(null);

  // Formulaire Course
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

  const handleOpenAdd = (defaultDist = "10 km") => {
    setEditingRaceId(null);
    setFormName("");
    setFormCategory("route");
    setFormDistancePreset(["5 km", "10 km", "Semi-Marathon", "Marathon"].includes(defaultDist) ? defaultDist : "custom");
    setFormCustomDistance(defaultDist === "custom" ? "" : defaultDist);
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
    setEditingRaceId(race.id);
    setFormName(race.name);
    setFormCategory(race.category || "route");
    const isPreset = ["5 km", "10 km", "Semi-Marathon", "Marathon"].includes(race.distance);
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

  // Groupement par type -> distance -> tri par date décroissante
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
      "Autres": [],
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
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-300 hover:text-white text-xs font-bold bg-stone-950 hover:bg-stone-850 px-3.5 py-2 rounded-xl border border-stone-800 transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Retour Profil</span>
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
              Palmarès & Historique
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Mes Records & Courses
            </h2>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Ajouter une course</span>
            <span className="text-sm">＋</span>
          </button>
        )}
      </div>

      {/* FORMULAIRE MODAL OU DÉPLIABLE D'AJOUT/ÉDITION */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="bg-stone-900 border border-[#CF9A61]/50 rounded-3xl p-5 space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#CF9A61]">
              {editingRaceId ? "Modifier la course" : "Nouvelle course officielle"}
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
                placeholder="Ex : Marathon de Paris"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Type d'épreuve
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-bold focus:outline-none focus:border-[#CF9A61] cursor-pointer"
              >
                <option value="route">Route</option>
                <option value="trail">Trail</option>
                <option value="piste">Piste</option>
                <option value="nature">Course Nature</option>
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
                {(["5 km", "10 km", "Semi-Marathon", "Marathon", "custom"] as const).map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => setFormDistancePreset(dist)}
                    className={`py-2 px-1 text-[10px] font-black uppercase rounded-xl border transition ${
                      formDistancePreset === dist
                        ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61]"
                        : "bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {dist === "custom" ? "Autre" : dist.replace("-Marathon", " Semi")}
                  </button>
                ))}
              </div>
              {formDistancePreset === "custom" && (
                <input
                  type="text"
                  required
                  placeholder="Ex : 15 km ou 800 m"
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
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100"
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
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100"
                />
                <span className="text-stone-500 font-bold">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="00"
                  value={formSeconds}
                  onChange={(e) => setFormSeconds(e.target.value)}
                  className="w-16 bg-stone-950 border border-stone-800 rounded-xl py-2 text-center text-xs font-mono font-bold text-stone-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Classement (ex : 1er, 2e, 14e / 450)
              </label>
              <input
                type="text"
                placeholder="Ex : 1er ou 3e Scratch"
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
                placeholder="Ex : 350"
                value={formElevation}
                onChange={(e) => setFormElevation(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            {formCategory === "trail" && (
              <div>
                <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                  UTMB Index (pts)
                </label>
                <input
                  type="number"
                  placeholder="Ex : 540"
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
              className="px-4 py-2 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl shadow-md transition"
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
              className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border shrink-0 ${
                isSelected
                  ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61] shadow-md"
                  : "bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-md ${isSelected ? "bg-stone-950/20 text-stone-950" : "bg-stone-950 text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* GROUPES DE COURSES PAR DISTANCE PUIS PAR DATE DÉCROISSANTE */}
      {totalFilteredCount === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
            🏆
          </div>
          <p className="text-xs text-stone-400">
            Aucune course enregistrée dans cette sélection.
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
                <div key={distanceCategory} className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2 px-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#CF9A61]" />
                      <h3 className="text-sm font-black uppercase text-stone-200 tracking-wider">
                        {distanceCategory === "Autres" ? "Autres distances" : distanceCategory}
                      </h3>
                      <span className="text-[10px] text-stone-500 font-mono">
                        ({raceList.length})
                      </span>
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(distanceCategory === "Autres" ? "custom" : distanceCategory)}
                        className="text-[10px] font-bold text-[#CF9A61] hover:underline uppercase"
                      >
                        ＋ Ajouter à ce format
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {raceList.map((race) => {
                      const podium = getPodiumBadge(race.rank);
                      const distMeters = parseDistanceTextToMeters(race.distance);
                      const score =
                        race.category !== "trail" && distMeters > 0
                          ? getPerformanceScoreForRecord(distMeters, race.time)
                          : null;

                      return (
                        <div
                          key={race.id}
                          className={`p-4 rounded-3xl border bg-stone-900/80 shadow-lg space-y-3 transition flex flex-col justify-between ${
                            podium ? `border-l-4 ${podium.borderAccent}` : "border-stone-800"
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-sm text-stone-100 uppercase tracking-tight">
                                    {race.name}
                                  </h4>
                                  <span className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-md border bg-stone-950 text-stone-400 border-stone-800">
                                    {race.category || "Route"}
                                  </span>
                                </div>

                                {race.date && (
                                  <span className="text-[10.5px] text-stone-500 font-mono block mt-0.5">
                                    {race.date}
                                  </span>
                                )}
                              </div>

                              {/* CLASSEMENT PODIUM COULEURS RÉELLES */}
                              {podium && race.rank && (
                                <div className={`px-2.5 py-1 rounded-xl border text-[10.5px] font-black uppercase flex items-center gap-1.5 shrink-0 ${podium.bgClass}`}>
                                  <span>{podium.medal}</span>
                                  <span>{race.rank}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                              <span className="bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-stone-200 font-bold">
                                {race.distance}
                              </span>

                              <span className="bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-[#CF9A61] font-black">
                                ⏱️ {race.time}
                              </span>

                              {race.elevationGain ? (
                                <span className="bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-[#4DB380] font-bold">
                                  +{race.elevationGain}m D+
                                </span>
                              ) : null}

                              {race.utmbIndex ? (
                                <span className="bg-[#4DB380]/10 border border-[#4DB380]/30 px-2 py-1 rounded-lg text-[#4DB380] text-[10px] font-extrabold">
                                  UTMB {race.utmbIndex} pts
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/60">
                            <div>
                              {score ? (
                                <div className="text-[10px] text-stone-400 font-mono">
                                  VDOT <strong className="text-stone-200">{score.vdot}</strong> • Score <strong className="text-[#B34D4D]">{score.runningScore}</strong>
                                </div>
                              ) : (
                                <span className="text-[10px] text-stone-600 italic">Épreuve officielle</span>
                              )}
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(race)}
                                  className="text-[10px] font-bold text-stone-400 hover:text-white bg-stone-950 border border-stone-800 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Supprimer la course "${race.name}" ?`)) {
                                      onDeleteRace(race.id);
                                    }
                                  }}
                                  className="text-stone-500 hover:text-[#B34D4D] text-xs px-2 py-1 transition cursor-pointer"
                                  title="Supprimer"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
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
    </div>
  );
};