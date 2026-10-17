// src/components/stats/AnnualStats.tsx

import React, { useState, useEffect, useRef } from "react";
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

  // Plein écran horizontal pour mobile / zoom grand format
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);

  // Référence du carrousel de mois mobile pour le swipe
  const monthsSwipeRef = useRef<HTMLDivElement>(null);

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

  // Synchronisation du swipe mobile des mois
  const handleMonthsScroll = () => {
    if (monthsSwipeRef.current) {
      const { scrollLeft, offsetWidth } = monthsSwipeRef.current;
      if (offsetWidth > 0) {
        const nextMonth = Math.round(scrollLeft / offsetWidth);
        if (nextMonth !== selectedMonthIndex && nextMonth >= 0 && nextMonth <= 11) {
          setSelectedMonthIndex(nextMonth);
        }
      }
    }
  };

  const scrollToMonth = (mIdx: number) => {
    setSelectedMonthIndex(mIdx);
    if (monthsSwipeRef.current) {
      const width = monthsSwipeRef.current.offsetWidth;
      monthsSwipeRef.current.scrollTo({
        left: mIdx * width,
        behavior: "smooth",
      });
    }
  };

  const currentMonthColor = getMonthThemeColor(selectedMonthIndex);

  // =========================================================================
  // CALCULS STATISTIQUES ANNUELLES
  // =========================================================================
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

  // Calcul des données des 52 semaines pour l'histogramme
  const weekDataMap: Record<number, { km: number; count: number; hours: number; elev: number }> = {};
  for (let w = 1; w <= 52; w++) {
    weekDataMap[w] = { km: 0, count: 0, hours: 0, elev: 0 };
  }

  yearRuns.forEach((run) => {
    const { year, month, day } = parseYMD(run.date);
    const weekNum = getISOWeekNumberFromParts(year, month, day);
    if (weekDataMap[weekNum]) {
      weekDataMap[weekNum].km += run.km;
      weekDataMap[weekNum].count += 1;
      weekDataMap[weekNum].hours += run.durationHours;
      weekDataMap[weekNum].elev += run.elevation || 0;
    }
  });

  const maxWeekKm = Math.max(
    ...Object.values(weekDataMap).map((w) => w.km),
    20
  );

  // Rendu de l'histogramme moderne des 52 semaines
  const renderAnnualHistogram = (isExpanded = false) => {
    const svgWidth = isExpanded ? 1150 : 920;
    const svgHeight = isExpanded ? 260 : 190;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 24;
    const paddingBottom = 40;
    const usableHeight = svgHeight - paddingTop - paddingBottom;
    const baselineY = svgHeight - paddingBottom;
    const usableWidth = svgWidth - paddingLeft - paddingRight;
    const colWidth = usableWidth / 52;
    const barWidth = Math.max(4, colWidth * 0.65);

    const tickWeeks = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 52];

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <line
          x1={paddingLeft}
          y1={paddingTop - 6}
          x2={paddingLeft}
          y2={baselineY}
          stroke="#3f3f46"
          strokeWidth="1.2"
        />

        {[0, 0.5, 1].map((pct, idx) => {
          const y = paddingTop + usableHeight * (1 - pct);
          const val = Math.round(maxWeekKm * pct);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft - 3}
                y1={y}
                x2={paddingLeft}
                y2={y}
                stroke="#52525b"
                strokeWidth="1.2"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3.5}
                fill="#71717a"
                fontSize={isExpanded ? "11" : "9.5"}
                fontWeight="700"
                textAnchor="end"
                className="font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          y1={baselineY}
          x2={svgWidth - paddingRight}
          y2={baselineY}
          stroke="#3f3f46"
          strokeWidth="1.2"
        />

        {Array.from({ length: 52 }, (_, i) => {
          const wNum = i + 1;
          const wData = weekDataMap[wNum];
          const mIdx = getMonthIndexForWeek(wNum);
          const monthColor = RAINBOW_PASTEL_COLORS[mIdx];

          const colCenterX = paddingLeft + i * colWidth + colWidth / 2;
          const barX = colCenterX - barWidth / 2;

          const barHeight = wData.km > 0 ? (wData.km / maxWeekKm) * usableHeight : 0;
          const barY = baselineY - barHeight;

          return (
            <g key={wNum} className="group cursor-pointer">
              {/* Fond de jauge sobre */}
              <rect
                x={barX}
                y={paddingTop}
                width={barWidth}
                height={usableHeight}
                fill="#1c1917"
                rx="2"
                opacity="0.3"
              />

              {/* Barre de volume effectif */}
              {barHeight > 0 && (
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(3, barHeight)}
                  fill={monthColor}
                  rx="2"
                  className="transition-all duration-150 group-hover:brightness-125"
                />
              )}

              {/* Infobulle native */}
              <title>{`Semaine ${wNum} (${MONTHS_LIST[mIdx]}) : ${wData.km.toFixed(1)} km • ${wData.count} sortie(s)`}</title>
            </g>
          );
        })}

        {/* Graduations Semaines */}
        {tickWeeks.map((wNum) => {
          const colCenterX = paddingLeft + (wNum - 1) * colWidth + colWidth / 2;
          return (
            <g key={`tick-${wNum}`}>
              <line
                x1={colCenterX}
                y1={baselineY}
                x2={colCenterX}
                y2={baselineY + 4}
                stroke="#52525b"
                strokeWidth="1.2"
              />
              <text
                x={colCenterX}
                y={baselineY + 16}
                fill="#a1a1aa"
                fontSize={isExpanded ? "10" : "8.5"}
                fontWeight="700"
                textAnchor="middle"
                className="font-mono"
              >
                S{wNum}
              </text>
            </g>
          );
        })}

        {/* Graduations Mois en bas */}
        {MONTHS_LIST.map((mName, mIdx) => {
          const mStartWeek = Math.round((mIdx * 52) / 12);
          const mEndWeek = Math.round(((mIdx + 1) * 52) / 12) - 1;
          const x1 = paddingLeft + mStartWeek * colWidth;
          const x2 = paddingLeft + mEndWeek * colWidth + colWidth;
          const centerX = (x1 + x2) / 2;
          const color = RAINBOW_PASTEL_COLORS[mIdx];

          return (
            <text
              key={mName}
              x={centerX}
              y={baselineY + 31}
              fill={color}
              fontSize={isExpanded ? "10" : "8.5"}
              fontWeight="900"
              textAnchor="middle"
              className="uppercase tracking-wider"
            >
              {mName.slice(0, 3)}
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* SÉLECTEUR D'ONGLETS MAJEURS */}
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

      {/* 1. ONGLET PLAN EN COURS */}
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

      {/* 2. ONGLET BILAN ANNUEL */}
      {activeTab === "annual" && (
        <div className="space-y-6 animate-fadeIn w-full">
          {/* EN-TÊTE ANNÉE ET ACTIONS */}
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
                onChange={(e) => setSelectedStatsYear(parseInt(e.target.value, 10))}
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

          {/* FORMULAIRE DE SAISIE SORTIE */}
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
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Date</label>
                  <input
                    type="date"
                    required
                    value={newRunForm.date}
                    onChange={(e) => setNewRunForm({ ...newRunForm, date: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 12.5"
                    value={newRunForm.km}
                    onChange={(e) => setNewRunForm({ ...newRunForm, km: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Durée (minutes)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="Ex: 45"
                    value={newRunForm.durationMin}
                    onChange={(e) => setNewRunForm({ ...newRunForm, durationMin: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Dénivelé (m D+)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Ex: 150"
                    value={newRunForm.elevation}
                    onChange={(e) => setNewRunForm({ ...newRunForm, elevation: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#B34D4D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-[#B34D4D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRunForm.isRace}
                    onChange={(e) => setNewRunForm({ ...newRunForm, isRace: e.target.checked })}
                    className="accent-[#B34D4D] rounded cursor-pointer"
                  />
                  <span>Il s'agit d'une course officielle</span>
                </label>

                {newRunForm.isRace && (
                  <input
                    type="text"
                    placeholder="Intitulé (ex: Ronde du Salbert: 9,72km)"
                    value={newRunForm.raceNotes}
                    onChange={(e) => setNewRunForm({ ...newRunForm, raceNotes: e.target.value })}
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

          {/* TABLEAU RÉSUMÉ GLOBAL DE L'ANNÉE */}
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
                  <td className="py-2 px-2 border border-stone-800 uppercase bg-[#B34D4D]/30 text-[#B34D4D]">Total</td>
                  <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">{totalKm.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">{totalHours.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">{Math.round(totalElev)}</td>
                  <td className="py-2 px-2 border border-stone-800 text-[#B34D4D]">{totalRuns}</td>
                </tr>

                <tr>
                  <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">Moy / sortie</td>
                  <td className="py-2 px-2 border border-stone-800">{moySortieKm.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moySortieHours.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moySortieElev.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800 text-stone-500">-</td>
                </tr>

                <tr>
                  <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">Moy / jour</td>
                  <td className="py-2 px-2 border border-stone-800">{moyJourKm.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moyJourHours.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moyJourElev.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800 text-stone-400 text-[10px]">{((totalRuns / 365) * 100).toFixed(1)}%</td>
                </tr>

                <tr>
                  <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">Moy / semaine</td>
                  <td className="py-2 px-2 border border-stone-800">{moySemaineKm.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moySemaineHours.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moySemaineElev.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moySemaineRuns.toFixed(2)}</td>
                </tr>

                <tr>
                  <td className="py-2 px-2 border border-stone-800 bg-stone-900 text-stone-300 text-[10px] uppercase">Moy / mois</td>
                  <td className="py-2 px-2 border border-stone-800">{moyMoisKm.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moyMoisHours.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moyMoisElev.toFixed(2)}</td>
                  <td className="py-2 px-2 border border-stone-800">{moyMoisRuns.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1. DÉTAIL MENSUEL (AFFICHÉ EN PERMANENCE : SWIPE SUR MOBILE, FLÈCHES PRO SUR DESKTOP) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-sm md:text-base font-black uppercase tracking-tight text-stone-100">
                  Détail Mensuel
                </h4>
                <p className="text-[11px] text-stone-400 font-medium">
                  Consultez la synthèse hebdomadaire mois par mois
                </p>
              </div>

              {/* Indicateur mobile swipe */}
              <div className="sm:hidden text-[10px] font-bold text-[#CF9A61] flex items-center gap-1">
                <span>👈 Glissez pour changer de mois 👉</span>
              </div>

              {/* Navigation professionnelle sur Ordinateur */}
              <div className="hidden sm:flex items-center gap-2 bg-stone-950 p-1 rounded-2xl border border-stone-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => scrollToMonth(selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1)}
                  className="w-8 h-8 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition border border-stone-800/80 cursor-pointer shadow-sm"
                  title="Mois précédent"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <select
                  value={selectedMonthIndex}
                  onChange={(e) => scrollToMonth(parseInt(e.target.value, 10))}
                  style={{ color: currentMonthColor }}
                  className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-1.5 text-xs font-black uppercase focus:outline-none cursor-pointer text-center min-w-[140px]"
                >
                  {MONTHS_LIST.map((mName, idx) => (
                    <option key={mName} value={idx} className="bg-stone-900 font-bold" style={{ color: RAINBOW_PASTEL_COLORS[idx] }}>
                      {mName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => scrollToMonth(selectedMonthIndex === 11 ? 0 : selectedMonthIndex + 1)}
                  className="w-8 h-8 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition border border-stone-800/80 cursor-pointer shadow-sm"
                  title="Mois suivant"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Pagination par puces sur mobile */}
            <div className="sm:hidden flex items-center justify-center gap-1.5 overflow-x-auto py-1">
              {MONTHS_LIST.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => scrollToMonth(idx)}
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-all ${
                    selectedMonthIndex === idx
                      ? "bg-stone-100 text-stone-950 shadow-sm"
                      : "text-stone-500 bg-stone-950"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Carrousel swipeable sur mobile / simple vue sur desktop */}
            <div
              ref={monthsSwipeRef}
              onScroll={handleMonthsScroll}
              className="flex sm:block overflow-x-auto sm:overflow-visible snap-x snap-mandatory w-full custom-scrollbar"
            >
              {MONTHS_LIST.map((monthName, mIdx) => {
                const monthRuns = yearRuns.filter((r) => {
                  const { month } = parseYMD(r.date);
                  return month === mIdx;
                });

                const weekMap: Record<number, { km: number; hours: number; elev: number; count: number }> = {};
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
                const totalMonthHours = monthRuns.reduce((sum, r) => sum + r.durationHours, 0);
                const totalMonthElev = monthRuns.reduce((sum, r) => sum + (r.elevation || 0), 0);
                const totalMonthRuns = monthRuns.length;

                const weekNumbersList = Object.keys(weekMap).map((w) => parseInt(w, 10)).sort((a, b) => a - b);
                const monthColor = RAINBOW_PASTEL_COLORS[mIdx];

                // Sur desktop, on n'affiche que le mois sélectionné
                const isHiddenOnDesktop = mIdx !== selectedMonthIndex;

                return (
                  <div
                    key={monthName}
                    className={`min-w-full w-full flex-shrink-0 snap-center ${
                      isHiddenOnDesktop ? "hidden sm:hidden" : "block sm:block"
                    }`}
                  >
                    <div className="sm:hidden mb-2 flex items-center justify-between border-b border-stone-800 pb-1.5">
                      <span style={{ color: monthColor }} className="text-xs font-black uppercase">
                        {monthName} {selectedStatsYear}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold font-mono">
                        {totalMonthKm.toFixed(1)} km
                      </span>
                    </div>

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
                              <td colSpan={5} className="py-5 text-xs text-stone-500 italic">
                                Aucune sortie enregistrée en {monthName}.
                              </td>
                            </tr>
                          ) : (
                            weekNumbersList.map((wNum) => {
                              const data = weekMap[wNum];
                              return (
                                <tr key={wNum} className="hover:bg-stone-900/60 transition">
                                  <td style={{ color: monthColor }} className="py-2 px-1.5 border border-stone-800/80 font-black text-xs font-mono">
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

                          <tr style={{ backgroundColor: `${monthColor}20`, color: monthColor }} className="font-black">
                            <td style={{ backgroundColor: `${monthColor}30` }} className="py-2 px-1.5 border border-stone-800 uppercase text-[10px]">
                              Total
                            </td>
                            <td className="py-2 px-1.5 border border-stone-800 font-mono">{totalMonthKm.toFixed(2)}</td>
                            <td className="py-2 px-1.5 border border-stone-800 font-mono">{totalMonthHours.toFixed(2)}</td>
                            <td className="py-2 px-1.5 border border-stone-800 font-mono">{Math.round(totalMonthElev)}</td>
                            <td className="py-2 px-2 border border-stone-800 font-mono">{totalMonthRuns}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. ÉVOLUTION DU VOLUME ANNUEL (AFFICHÉ EN PERMANENCE, RECTANGLE KPI + HISTOGRAMME MODERNE) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 w-full">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-sm md:text-base font-black uppercase tracking-tight text-stone-100">
                  Évolution du volume annuel
                </h4>
                <p className="text-[11px] text-stone-400 font-medium">
                  52 semaines réparties selon le code couleur saisonnier
                </p>
              </div>

              {/* Bouton plein écran horizontal sur mobile / agrandir sur desktop */}
              <button
                type="button"
                onClick={() => setIsLandscapeFullscreen(true)}
                className="text-[10px] md:text-xs font-black uppercase text-stone-200 hover:text-white bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-stone-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>⛶</span>
                <span className="sm:hidden">Plein écran horizontal</span>
                <span className="hidden sm:inline">Agrandir</span>
              </button>
            </div>

            {/* RECTANGLE AVEC LES 3 INFOS CLÉS */}
            <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-3 rounded-2xl border border-stone-800/70 text-center shadow-inner">
              <div>
                <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Total Année</span>
                <div className="text-xs md:text-sm font-black text-stone-100 mt-0.5">
                  {totalKm.toFixed(1)} <span className="text-stone-500 font-normal text-[10px]">km</span>
                </div>
              </div>
              <div className="border-x border-stone-800/80">
                <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Max Semaine</span>
                <div className="text-xs md:text-sm font-black text-[#A3E635] mt-0.5">
                  {Math.round(maxWeekKm)} <span className="text-stone-500 font-normal text-[10px]">km</span>
                </div>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-stone-500 uppercase block">Moyenne / Semaine</span>
                <div className="text-xs md:text-sm font-black text-[#CF9A61] mt-0.5">
                  {moySemaineKm.toFixed(1)} <span className="text-stone-500 font-normal text-[10px]">km</span>
                </div>
              </div>
            </div>

            {/* HISTOGRAMME MODERNE */}
            <div className="bg-stone-950 rounded-2xl p-3 md:p-4 border border-stone-800 relative w-full overflow-hidden shadow-inner">
              {renderAnnualHistogram(false)}
            </div>

            {/* Légende */}
            <div className="flex justify-between items-center text-[9px] md:text-xs font-semibold text-stone-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#C084FC] via-[#A3E635] to-[#F87171] inline-block shadow-sm"></span>
                <span>Barres colorées par saison</span>
              </span>
              <span className="font-mono text-stone-500">52 semaines</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE PLEIN ÉCRAN HORIZONTAL (PAYSAGE SUR MOBILE, GRAND FORMAT SUR PC) */}
      {/* ========================================================================= */}
      {isLandscapeFullscreen && (
        <div
          onClick={() => setIsLandscapeFullscreen(false)}
          className="fixed inset-0 bg-stone-950/98 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn"
        >
          {/* Conteneur avec classe forcée en rotation horizontale sur smartphone si besoin */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-5 md:p-6 w-full max-w-6xl shadow-2xl flex flex-col justify-between max-h-[96vh] overflow-hidden"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
                  Vue panoramique
                </span>
                <h3 className="text-sm md:text-base font-black uppercase text-stone-100">
                  Évolution du volume annuel {selectedStatsYear} (52 semaines)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLandscapeFullscreen(false)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center justify-center cursor-pointer transition shadow-md"
              >
                ✕
              </button>
            </div>

            <div className="my-3 bg-stone-950 rounded-2xl p-3 md:p-5 border border-stone-800 w-full overflow-hidden shadow-inner flex items-center">
              {renderAnnualHistogram(true)}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-3 text-xs text-stone-300 font-mono">
                <span>Total : <strong className="text-white">{totalKm.toFixed(1)} km</strong></span>
                <span>•</span>
                <span>Record hebdo : <strong className="text-[#A3E635]">{Math.round(maxWeekKm)} km</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsLandscapeFullscreen(false)}
                className="py-2 px-5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};