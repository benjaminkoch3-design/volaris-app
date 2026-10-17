// src/components/stats/AnnualStats.tsx

import React, { useState, useEffect } from "react";
import { CompletedRun, Plan, Workout } from "../../types";
import { MONTHS_LIST } from "../../constants";
import {
  parseYMD,
  getISOWeekNumberFromParts,
} from "../../utils/calculations";
import { exportAthleteStatsToExcel } from "../../utils/excelExport";
import { PlanStatsView } from "../analytics/PlanStatsView";

interface AnnualStatsProps {
  completedRuns: CompletedRun[];
  activePlan?: Plan | null;
  completedWorkouts?: Record<string, boolean>;
  onAddRun: (run: CompletedRun) => void;
  draftWorkouts?: Workout[];
  newPlanForm?: any;
  draftWeekTypes?: any;
  goal?: string;
  initialSubTab?: "plan" | "annual";
  onBackToDashboard?: () => void;
  isReadOnly?: boolean;
  vma?: number | string;
}

const RAINBOW_PASTEL_COLORS: Record<number, string> = {
  0: "#C084FC",
  1: "#A78BFA",
  2: "#93C5FD",
  3: "#A5F3FC",
  4: "#6EE7B7",
  5: "#A3E635",
  6: "#FDE047",
  7: "#FDBA74",
  8: "#FB923C",
  9: "#F87171",
  10: "#F472B6",
  11: "#E879F9",
};

const getMonthThemeColor = (monthIndex: number): string => {
  return RAINBOW_PASTEL_COLORS[monthIndex] || "#93C5FD";
};

const getMonthIndexForWeek = (weekNum: number): number => {
  const dayOfYear = (weekNum - 1) * 7 + 3;
  return Math.min(11, Math.max(0, Math.floor(dayOfYear / 30.5)));
};

const getWeekMonthColor = (weekNum: number): string => {
  return RAINBOW_PASTEL_COLORS[getMonthIndexForWeek(weekNum)] || "#6EE7B7";
};

export const AnnualStats: React.FC<AnnualStatsProps> = ({
  completedRuns,
  activePlan,
  completedWorkouts = {},
  onAddRun,
  initialSubTab = "annual",
  isReadOnly = false,
  vma,
}) => {
  const [activeTab, setActiveTab] = useState<"plan" | "annual">(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [selectedStatsYear, setSelectedStatsYear] = useState<number>(2026);
  const [showAddRunForm, setShowAddRunForm] = useState<boolean>(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(
    () => new Date().getMonth()
  );

  const [showVolumeChart, setShowVolumeChart] = useState<boolean>(true);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState<boolean>(true);

  const [newRunForm, setNewRunForm] = useState({
    date: new Date().toISOString().split("T")[0],
    km: "",
    durationMin: "",
    elevation: "",
    isRace: false,
    raceNotes: "",
  });

  const handleAddRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const kmNum = parseFloat(newRunForm.km);
    const durMinNum = parseFloat(newRunForm.durationMin);
    const elevNum = parseFloat(newRunForm.elevation) || 0;

    if (
      !newRunForm.date ||
      isNaN(kmNum) ||
      kmNum <= 0 ||
      isNaN(durMinNum) ||
      durMinNum <= 0
    ) {
      return;
    }

    const runToAdd: CompletedRun = {
      id: Date.now().toString(),
      date: newRunForm.date,
      km: kmNum,
      durationHours: durMinNum / 60,
      elevation: elevNum,
      raceNotes:
        newRunForm.isRace && newRunForm.raceNotes
          ? newRunForm.raceNotes
          : undefined,
    };

    onAddRun(runToAdd);
    setNewRunForm({
      date: new Date().toISOString().split("T")[0],
      km: "",
      durationMin: "",
      elevation: "",
      isRace: false,
      raceNotes: "",
    });
    setShowAddRunForm(false);
  };

  const handleExportExcel = () => {
    exportAthleteStatsToExcel(completedRuns, "Athlete", selectedStatsYear);
  };

  const currentMonthColor = getMonthThemeColor(selectedMonthIndex);

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* Sélecteur d'onglets */}
      <div className="flex bg-stone-900 p-1.5 rounded-2xl border border-stone-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer ${
            activeTab === "plan"
              ? "bg-[#CF9A61] text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Plan en cours
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("annual")}
          className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer ${
            activeTab === "annual"
              ? "bg-[#B34D4D] text-stone-100 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Bilan annuel
        </button>
      </div>

      {/* 1. PLAN EN COURS (COMPOSANT MUTUALISÉ) */}
      {activeTab === "plan" && (
        <div className="animate-fadeIn w-full">
          {!activePlan ? (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-2xl">
                📊
              </div>
              <h3 className="text-sm font-black uppercase text-stone-100">
                Aucun plan d'entraînement actif
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
                Créez un plan personnalisé pour observer vos projections kilométriques et les courbes de charge.
              </p>
            </div>
          ) : (
            <PlanStatsView
              activePlan={activePlan}
              completedWorkouts={completedWorkouts}
              vma={vma}
            />
          )}
        </div>
      )}

      {/* 2. BILAN ANNUEL */}
      {activeTab === "annual" && (
        <div className="space-y-6 animate-fadeIn w-full">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-black uppercase text-stone-100">
              Statistiques annuelles {selectedStatsYear}
            </h3>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Télécharger le bilan au format Excel conforme"
                >
                  <span>Exporter Excel</span>
                </button>
              )}

              <select
                value={selectedStatsYear}
                onChange={(e) =>
                  setSelectedStatsYear(parseInt(e.target.value, 10))
                }
                className="bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-bold focus:outline-none focus:border-[#B34D4D] cursor-pointer"
              >
                <option value={2026}>Année 2026</option>
                <option value={2025}>Année 2025</option>
              </select>

              {!isReadOnly && (
                <button
                  onClick={() => setShowAddRunForm(!showAddRunForm)}
                  className={`text-[10px] font-black px-3 py-2 rounded-xl uppercase transition cursor-pointer border ${
                    showAddRunForm
                      ? "text-[#CF6361] bg-[#CF6361]/10 border-[#CF6361]/30 hover:bg-[#CF6361]/20"
                      : "text-[#B34D4D] bg-[#B34D4D]/10 border-[#B34D4D]/30 hover:bg-[#B34D4D]/20"
                  }`}
                >
                  {showAddRunForm ? "Fermer" : "Entrer une sortie"}
                </button>
              )}
            </div>
          </div>

          {!isReadOnly && showAddRunForm && (
            <form
              onSubmit={handleAddRunSubmit}
              className="bg-stone-900/90 border border-[#B34D4D]/50 rounded-3xl p-4 space-y-3 shadow-2xl animate-fadeIn"
            >
              <div className="text-xs font-black text-[#B34D4D] uppercase tracking-wider border-b border-stone-800 pb-2">
                Saisir une nouvelle sortie effectuée
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newRunForm.date}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, date: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 12.5"
                    value={newRunForm.km}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, km: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="Ex: 45"
                    value={newRunForm.durationMin}
                    onChange={(e) =>
                      setNewRunForm({
                        ...newRunForm,
                        durationMin: e.target.value,
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    Dénivelé (m D+)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Ex: 150"
                    value={newRunForm.elevation}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, elevation: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-[#B34D4D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRunForm.isRace}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, isRace: e.target.checked })
                    }
                    className="accent-[#B34D4D] rounded cursor-pointer"
                  />
                  <span>Il s'agit d'une course officielle</span>
                </label>

                {newRunForm.isRace && (
                  <input
                    type="text"
                    placeholder="Intitulé (ex: Ronde du Salbert: 9,72km)"
                    value={newRunForm.raceNotes}
                    onChange={(e) =>
                      setNewRunForm({ ...newRunForm, raceNotes: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B34D4D] hover:bg-[#993d3d] text-stone-100 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Enregistrer la sortie
              </button>
            </form>
          )}

          {(() => {
            const yearRuns = completedRuns.filter((r) => {
              const { year } = parseYMD(r.date);
              return year === selectedStatsYear;
            });

            const totalKm = yearRuns.reduce((sum, r) => sum + r.km, 0);
            const totalHours = yearRuns.reduce((sum, r) => sum + r.durationHours, 0);
            const totalElev = yearRuns.reduce((sum, r) => sum + (r.elevation || 0), 0);
            const totalRuns = yearRuns.length;

            const moySortieKm = totalRuns > 0 ? totalKm / totalRuns : 0;
            const moySortieHours = totalRuns > 0 ? totalHours / totalRuns : 0;
            const moySortieElev = totalRuns > 0 ? totalElev / totalRuns : 0;

            const moyJourKm = totalKm / 365;
            const moyJourHours = totalHours / 365;
            const moyJourElev = totalElev / 365;

            const moySemaineKm = totalKm / 52;
            const moySemaineHours = totalHours / 52;
            const moySemaineElev = totalElev / 52;
            const moySemaineRuns = totalRuns / 52;

            const moyMoisKm = totalKm / 12;
            const moyMoisHours = totalHours / 12;
            const moyMoisElev = totalElev / 12;
            const moyMoisRuns = totalRuns / 12;

            return (
              <div className="bg-[#B34D4D]/10 border-2 border-[#B34D4D]/50 rounded-3xl p-4 space-y-3 shadow-xl overflow-x-auto custom-scrollbar">
                <div className="text-center pb-1 border-b border-[#B34D4D]/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#B34D4D]">
                    Résumé global année {selectedStatsYear}
                  </span>
                </div>

                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#B34D4D] text-stone-100 font-black text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-2 border border-stone-800">Catégorie</th>
                      <th className="py-2 px-2 border border-stone-800">Distance (km)</th>
                      <th className="py-2 px-2 border border-stone-800">Temps (h)</th>
                      <th className="py-2 px-2 border border-stone-800">Dénivelé (m)</th>
                      <th className="py-2 px-2 border border-stone-800">Sorties (nb)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 bg-stone-950/80 font-bold text-stone-100">
                    <tr className="bg-[#B34D4D]/20 text-[#B34D4D] font-black">
                      <td className="py-2 px-2 border border-stone-800 uppercase bg-[#B34D4D]/30 text-[#B34D4D]">
                        Total
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalKm.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalHours.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {Math.round(totalElev)}
                      </td>
                      <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">
                        {totalRuns}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / sortie
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySortieElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800 text-stone-500">-</td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / jour
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyJourElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800 text-stone-400 text-[10px]">
                        {((totalRuns / 365) * 100).toFixed(1)}%
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / semaine
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moySemaineRuns.toFixed(2)}</td>
                    </tr>

                    <tr>
                      <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">
                        Moy / mois
                      </td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisKm.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisHours.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisElev.toFixed(2)}</td>
                      <td className="py-2 px-2 border border-stone-800">{moyMoisRuns.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* DÉTAIL MENSUEL */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
                Détail mensuel
              </h4>

              <button
                type="button"
                onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 cursor-pointer transition"
              >
                {showMonthlyDetails ? "▲" : "▼"}
              </button>
            </div>

            {showMonthlyDetails && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-2xl border border-stone-800 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonthIndex((prev) => (prev === 0 ? 11 : prev - 1))
                    }
                    style={{ color: currentMonthColor }}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 font-black rounded-xl text-xs transition cursor-pointer"
                    title="Mois précédent"
                  >
                    ◀
                  </button>

                  <div className="flex-1 flex items-center justify-center">
                    <select
                      value={selectedMonthIndex}
                      onChange={(e) =>
                        setSelectedMonthIndex(parseInt(e.target.value, 10))
                      }
                      style={{
                        color: currentMonthColor,
                        borderColor: `${currentMonthColor}60`,
                      }}
                      className="bg-stone-900 border rounded-xl px-4 py-2 text-xs font-black uppercase focus:outline-none cursor-pointer text-center w-full max-w-[200px]"
                    >
                      {MONTHS_LIST.map((mName, idx) => (
                        <option
                          key={mName}
                          value={idx}
                          className="bg-stone-900 font-bold"
                          style={{ color: RAINBOW_PASTEL_COLORS[idx] }}
                        >
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonthIndex((prev) => (prev === 11 ? 0 : prev + 1))
                    }
                    style={{ color: currentMonthColor }}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 font-black rounded-xl text-xs transition cursor-pointer"
                    title="Mois suivant"
                  >
                    ▶
                  </button>
                </div>

                {(() => {
                  const mIdx = selectedMonthIndex;
                  const monthName = MONTHS_LIST[mIdx];
                  const monthRuns = completedRuns.filter((r) => {
                    const { year, month } = parseYMD(r.date);
                    return year === selectedStatsYear && month === mIdx;
                  });

                  const weekMap: Record<
                    number,
                    { km: number; hours: number; elev: number; count: number }
                  > = {};

                  monthRuns.forEach((run) => {
                    const { year, month, day } = parseYMD(run.date);
                    const wNum = getISOWeekNumberFromParts(year, month, day);
                    if (!weekMap[wNum]) {
                      weekMap[wNum] = { km: 0, hours: 0, elev: 0, count: 0 };
                    }
                    weekMap[wNum].km += run.km;
                    weekMap[wNum].hours += run.durationHours;
                    weekMap[wNum].elev += run.elevation || 0;
                    weekMap[wNum].count += 1;
                  });

                  const totalMonthKm = monthRuns.reduce((sum, r) => sum + r.km, 0);
                  const totalMonthHours = monthRuns.reduce(
                    (sum, r) => sum + r.durationHours,
                    0
                  );
                  const totalMonthElev = monthRuns.reduce(
                    (sum, r) => sum + (r.elevation || 0),
                    0
                  );
                  const totalMonthRuns = monthRuns.length;

                  const weekNumbersList = Object.keys(weekMap)
                    .map((w) => parseInt(w, 10))
                    .sort((a, b) => a - b);

                  return (
                    <div className="space-y-3">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-center border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 font-extrabold text-[9.5px] uppercase">
                              <th className="py-2 px-1.5 border border-stone-800/80">Semaine</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Distance (km)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Temps (h)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Dénivelé (m)</th>
                              <th className="py-2 px-1.5 border border-stone-800/80">Sorties (nb)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/80 bg-stone-950/40 text-stone-200 font-semibold">
                            {weekNumbersList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-4 text-xs text-stone-500 italic">
                                  Aucune sortie enregistrée en {monthName}.
                                </td>
                              </tr>
                            ) : (
                              weekNumbersList.map((wNum) => {
                                const data = weekMap[wNum];
                                return (
                                  <tr key={wNum} className="hover:bg-stone-900/60 transition">
                                    <td
                                      style={{ color: currentMonthColor }}
                                      className="py-2 px-1.5 border border-stone-800/80 font-black text-xs"
                                    >
                                      S{wNum}
                                    </td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.km.toFixed(2)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.hours.toFixed(2)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{Math.round(data.elev)}</td>
                                    <td className="py-2 px-1.5 border border-stone-800/80">{data.count}</td>
                                  </tr>
                                );
                              })
                            )}

                            <tr
                              style={{
                                backgroundColor: `${currentMonthColor}20`,
                                color: currentMonthColor,
                              }}
                              className="font-black"
                            >
                              <td
                                style={{ backgroundColor: `${currentMonthColor}30` }}
                                className="py-2 px-1.5 border border-stone-800 uppercase text-[10px]"
                              >
                                Total
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {totalMonthKm.toFixed(2)}
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {totalMonthHours.toFixed(2)}
                              </td>
                              <td className="py-2 px-1.5 border border-stone-800">
                                {Math.round(totalMonthElev)}
                              </td>
                              <td className="py-2 px-2 border border-stone-800">
                                {totalMonthRuns}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ÉVOLUTION DU VOLUME ANNUEL */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 md:p-6 shadow-xl space-y-4 w-full">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
                  Évolution du volume
                </h4>
                <span className="text-[10px] font-medium text-stone-400 block -mt-0.5">
                  (km par semaine)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowVolumeChart(!showVolumeChart)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 cursor-pointer transition"
              >
                {showVolumeChart ? "▲" : "▼"}
              </button>
            </div>

            {showVolumeChart && (() => {
              const weekDataMap: Record<number, { km: number; count: number }> = {};
              for (let w = 1; w <= 52; w++) {
                weekDataMap[w] = { km: 0, count: 0 };
              }

              completedRuns.forEach((run) => {
                const { year, month, day } = parseYMD(run.date);
                if (year === selectedStatsYear) {
                  const weekNum = getISOWeekNumberFromParts(year, month, day);
                  if (weekDataMap[weekNum]) {
                    weekDataMap[weekNum].km += run.km;
                    weekDataMap[weekNum].count += 1;
                  }
                }
              });

              const maxWeekKm = Math.max(
                ...Object.values(weekDataMap).map((w) => w.km),
                20
              );

              const width = 1000;
              const height = 240;
              const paddingLeft = 55;
              const paddingRight = 20;
              const paddingTop = 20;
              const paddingBottom = 55;
              const usableWidth = width - paddingLeft - paddingRight;
              const usableHeight = height - paddingTop - paddingBottom;
              const baselineY = height - paddingBottom;

              const pointsArray = Array.from({ length: 52 }, (_, i) => {
                const wNum = i + 1;
                const km = weekDataMap[wNum].km;
                const x = paddingLeft + (i / 51) * usableWidth;
                const y = baselineY - (km / maxWeekKm) * usableHeight;
                const monthColor = getWeekMonthColor(wNum);
                return { x, y, km, wNum, count: weekDataMap[wNum].count, monthColor };
              });

              const pathD = pointsArray.reduce((acc, p, idx) => {
                return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
              }, "");

              const areaD = `${pathD} L ${pointsArray[51].x},${baselineY} L ${pointsArray[0].x},${baselineY} Z`;

              const tickWeeks = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 52];

              return (
                <div className="bg-stone-950 p-3 md:p-4 rounded-2xl border border-stone-800 relative animate-fadeIn w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="annualRainbowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.35" />
                        <stop offset="50%" stopColor="#34D399" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <text x={paddingLeft - 8} y={paddingTop + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      {Math.round(maxWeekKm)} km
                    </text>
                    <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      {Math.round(maxWeekKm / 2)} km
                    </text>
                    <text x={paddingLeft - 8} y={baselineY + 4} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="bold">
                      0 km
                    </text>

                    <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#27272a" strokeDasharray="3,3" />
                    <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={width - paddingRight} y2={paddingTop + usableHeight / 2} stroke="#27272a" strokeDasharray="3,3" />
                    <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#3f3f46" strokeWidth="1.5" />

                    <path d={areaD} fill="url(#annualRainbowGradient)" />
                    <path d={pathD} fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {tickWeeks.map((wNum) => {
                      const point = pointsArray[wNum - 1];
                      return (
                        <g key={`tick-${wNum}`}>
                          <line
                            x1={point.x}
                            y1={baselineY}
                            x2={point.x}
                            y2={baselineY + 5}
                            stroke="#52525b"
                            strokeWidth="1.5"
                          />
                          <text
                            x={point.x}
                            y={baselineY + 16}
                            fill="#a1a1aa"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            S{wNum}
                          </text>
                        </g>
                      );
                    })}

                    {MONTHS_LIST.map((mName, mIdx) => {
                      const mStartWeek = Math.round((mIdx * 52) / 12);
                      const mEndWeek = Math.round(((mIdx + 1) * 52) / 12) - 1;
                      const x1 = pointsArray[Math.min(51, Math.max(0, mStartWeek))].x;
                      const x2 = pointsArray[Math.min(51, Math.max(0, mEndWeek))].x;
                      const centerX = (x1 + x2) / 2;
                      const monthColor = RAINBOW_PASTEL_COLORS[mIdx];

                      return (
                        <text
                          key={mName}
                          x={centerX}
                          y={baselineY + 34}
                          fill={monthColor}
                          fontSize="9"
                          fontWeight="900"
                          textAnchor="middle"
                          className="uppercase tracking-wider"
                        >
                          {mName.slice(0, 3)}
                        </text>
                      );
                    })}

                    {pointsArray.map((p) => (
                      <g key={p.wNum} className="group cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.km > 0 ? "4" : "1.8"}
                          style={{ fill: p.monthColor, stroke: "#09090b" }}
                          className="stroke-1 group-hover:r-6 transition-all"
                        />
                        <title>{`Semaine ${p.wNum} : ${p.km.toFixed(1)} km (${p.count} sortie${p.count > 1 ? "s" : ""})`}</title>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};