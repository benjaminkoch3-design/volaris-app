// src/components/common/PaceCalculatorsView.tsx

import React, { useState, useMemo } from "react";
import { UserRole } from "../../types";

interface PaceCalculatorsViewProps {
  userRole?: UserRole;
  initialVma?: string | number;
  onBack?: () => void;
}

type TabType = "vma" | "vdot" | "speed_and_race";

const formatTime = (totalSec: number): string => {
  if (isNaN(totalSec) || totalSec <= 0 || !isFinite(totalSec)) return "--:--";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

// Formule Jack Daniels VDOT
const calculateVDOTFromRace = (distMeters: number, timeMinutes: number): number => {
  if (distMeters <= 0 || timeMinutes <= 0) return 0;
  const speed = distMeters / timeMinutes; // m/min
  const vo2 = -4.60 + 0.182258 * speed + 0.000104 * Math.pow(speed, 2);
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return Math.round((vo2 / percentMax) * 10) / 10;
};

// Vitesse m/min -> Allure sec/km
const vdotToPace = (vdot: number, intensity: number): number => {
  const targetVo2 = vdot * intensity;
  const a = 0.000104;
  const b = 0.182258;
  const c = -(targetVo2 + 4.60);
  const delta = b * b - 4 * a * c;
  if (delta < 0) return 0;
  const velocityMPerMin = (-b + Math.sqrt(delta)) / (2 * a);
  const velocityKmh = (velocityMPerMin * 60) / 1000;
  return 3600 / velocityKmh;
};

export const PaceCalculatorsView: React.FC<PaceCalculatorsViewProps> = ({
  userRole = "coach",
  initialVma,
  onBack,
}) => {
  const isCoach = userRole === "coach";
  const themeColor = isCoach ? "#CDCF61" : "#CF9A61";

  const [activeTab, setActiveTab] = useState<TabType>("vma");

  // ==========================================
  // 1. ÉTAT VMA (200m, 400m, 800m & 60% à 110%)
  // ==========================================
  const defaultVma = initialVma ? parseFloat(String(initialVma)) || 16 : 16;
  const [vmaInput, setVmaInput] = useState<number | "">(defaultVma);
  const [percentInput, setPercentInput] = useState<number | "">(85);

  const vmaCalc = useMemo(() => {
    const vma = Number(vmaInput) || 0;
    const pct = Number(percentInput) || 0;
    if (vma <= 0) return null;
    const speed = (vma * pct) / 100;
    const paceSec = speed > 0 ? 3600 / speed : 0;
    return {
      speedKmh: speed.toFixed(2),
      paceKm: formatTime(paceSec),
      time200m: speed > 0 ? (720 / speed).toFixed(1) : "-",
      time400m: speed > 0 ? formatTime(1440 / speed) : "-",
      time800m: speed > 0 ? formatTime(2880 / speed) : "-",
    };
  }, [vmaInput, percentInput]);

  const vmaTable = useMemo(() => {
    const vma = Number(vmaInput) || 0;
    if (vma <= 0) return [];
    // 60% à 110% par pas de 5%
    const percentages = [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110];
    return percentages.map((pct) => {
      const spd = (vma * pct) / 100;
      const secKm = 3600 / spd;
      return {
        pct,
        spd: spd.toFixed(2),
        paceKm: formatTime(secKm),
        t200: (720 / spd).toFixed(1),
        t400: formatTime(1440 / spd),
        t800: formatTime(2880 / spd),
      };
    });
  }, [vmaInput]);

  // ==========================================
  // 2. ÉTAT VDOT & SEUILS MARIUS BAKKEN
  // ==========================================
  const [vdotDistM, setVdotDistM] = useState<number>(5000);
  const [vdotH, setVdotH] = useState<number | "">("");
  const [vdotM, setVdotM] = useState<number | "">(20);
  const [vdotS, setVdotS] = useState<number | "">(0);

  const vdotScore = useMemo(() => {
    const totalMin =
      ((Number(vdotH) || 0) * 3600 + (Number(vdotM) || 0) * 60 + (Number(vdotS) || 0)) / 60;
    if (totalMin <= 0) return 0;
    return calculateVDOTFromRace(vdotDistM, totalMin);
  }, [vdotDistM, vdotH, vdotM, vdotS]);

  const vdotThresholdDetails = useMemo(() => {
    if (vdotScore <= 0) return null;
    const baseThresholdSec = vdotToPace(vdotScore, 0.88);
    const baseSpeed = 3600 / baseThresholdSec;

    // Calculs selon Bakken :
    // Courts : -1% à +1% de la vitesse de seuil
    const shortMinSpeed = baseSpeed * 0.99;
    const shortMaxSpeed = baseSpeed * 1.01;
    // Moyens : -2% à 0% de la vitesse de seuil
    const medMinSpeed = baseSpeed * 0.98;
    const medMaxSpeed = baseSpeed * 1.00;
    // Longs : -4% à -2% de la vitesse de seuil
    const longMinSpeed = baseSpeed * 0.96;
    const longMaxSpeed = baseSpeed * 0.98;

    return {
      baseThresholdPace: formatTime(baseThresholdSec),
      baseThresholdSpeed: baseSpeed.toFixed(2),
      shortIntervals: {
        pace: `${formatTime(3600 / shortMaxSpeed)} - ${formatTime(3600 / shortMinSpeed)}`,
        speed: `${shortMinSpeed.toFixed(2)} - ${shortMaxSpeed.toFixed(2)} km/h`,
      },
      mediumIntervals: {
        pace: `${formatTime(3600 / medMaxSpeed)} - ${formatTime(3600 / medMinSpeed)}`,
        speed: `${medMinSpeed.toFixed(2)} - ${medMaxSpeed.toFixed(2)} km/h`,
      },
      longIntervals: {
        pace: `${formatTime(3600 / longMaxSpeed)} - ${formatTime(3600 / longMinSpeed)}`,
        speed: `${longMinSpeed.toFixed(2)} - ${longMaxSpeed.toFixed(2)} km/h`,
      },
      classicZones: {
        easy: `${formatTime(vdotToPace(vdotScore, 0.62))} - ${formatTime(vdotToPace(vdotScore, 0.70))}`,
        marathon: formatTime(vdotToPace(vdotScore, 0.80)),
        interval: formatTime(vdotToPace(vdotScore, 0.98)),
        repetition: formatTime(vdotToPace(vdotScore, 1.05)),
      },
    };
  }, [vdotScore]);

  // ==========================================
  // 3. ÉTAT FUSIONNÉ : CONVERTISSEUR & CHRONO
  // ==========================================
  const [speedVal, setSpeedVal] = useState<number | "">(12);
  const [paceMin, setPaceMin] = useState<number | "">(5);
  const [paceSec, setPaceSec] = useState<number | "">(0);

  const handleSpeedChange = (val: number | "") => {
    setSpeedVal(val);
    if (val !== "" && val > 0) {
      const totalSec = 3600 / val;
      setPaceMin(Math.floor(totalSec / 60));
      setPaceSec(Math.round(totalSec % 60));
    }
  };

  const handlePaceChange = (m: number | "", s: number | "") => {
    setPaceMin(m);
    setPaceSec(s);
    const totalSec = (Number(m) || 0) * 60 + (Number(s) || 0);
    if (totalSec > 0) {
      setSpeedVal(parseFloat((3600 / totalSec).toFixed(2)));
    }
  };

  const [raceDistPreset, setRaceDistPreset] = useState<string>("10000");
  const [customDistanceM, setCustomDistanceM] = useState<number | "">(10000);
  const [chronoH, setChronoH] = useState<number | "">(0);
  const [chronoM, setChronoM] = useState<number | "">(45);
  const [chronoS, setChronoS] = useState<number | "">(0);

  const runMotionCalc = useMemo(() => {
    const distM =
      raceDistPreset === "custom" ? Number(customDistanceM) || 0 : Number(raceDistPreset) || 0;
    const totalSec =
      (Number(chronoH) || 0) * 3600 + (Number(chronoM) || 0) * 60 + (Number(chronoS) || 0);
    if (distM <= 0 || totalSec <= 0) return null;

    const km = distM / 1000;
    const speed = (km / totalSec) * 3600;
    const paceSec = totalSec / km;

    return {
      km: km.toFixed(2),
      speedKmh: speed.toFixed(2),
      paceFormatted: formatTime(paceSec),
      passages: [
        { label: "1 km", time: formatTime(paceSec) },
        { label: "5 km", time: formatTime(paceSec * 5) },
        { label: "10 km", time: formatTime(paceSec * 10) },
        { label: "Semi-Marathon", time: formatTime(paceSec * 21.0975) },
        { label: "Marathon", time: formatTime(paceSec * 42.195) },
      ],
    };
  }, [raceDistPreset, customDistanceM, chronoH, chronoM, chronoS]);

  return (
    <div className="space-y-6 animate-fadeIn pb-10 font-sans w-full">
      {/* HEADER */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-stone-300 hover:text-white text-xs font-bold bg-stone-950 hover:bg-stone-850 px-3.5 py-2 rounded-xl border border-stone-800 transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Retour</span>
            </button>
          )}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
              {isCoach ? "Outils & Assistance • Entraîneur" : "Mes Outils de Calcul • Athlète"}
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-stone-100 tracking-tight mt-0.5">
              Calculateur d'Allures & VDOT
            </h2>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR D'ONGLETS (3 ONGLETS) */}
      <div className="flex bg-stone-900/70 border border-stone-800 p-1.5 rounded-2xl gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("vma")}
          className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === "vma"
              ? "text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40"
          }`}
          style={activeTab === "vma" ? { backgroundColor: themeColor } : undefined}
        >
          🎯 VMA & Allures Cibles
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vdot")}
          className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === "vdot"
              ? "text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40"
          }`}
          style={activeTab === "vdot" ? { backgroundColor: themeColor } : undefined}
        >
          📊 VDOT & Seuils par Intervalles
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("speed_and_race")}
          className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === "speed_and_race"
              ? "text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40"
          }`}
          style={activeTab === "speed_and_race" ? { backgroundColor: themeColor } : undefined}
        >
          ⏱️ Allures, Conversions & Chrono
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. VMA & POURCENTAGES (200m, 400m, 800m & 60% à 110%)     */}
      {/* ========================================================= */}
      {activeTab === "vma" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-200">
              Calculateur personnalisé
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">
                  VMA (km/h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="26"
                  value={vmaInput}
                  onChange={(e) => setVmaInput(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-base font-black font-mono focus:outline-none"
                  style={{ color: themeColor }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">
                  Pourcentage ciblé (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="40"
                  max="140"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-stone-100 focus:outline-none"
                />
              </div>
            </div>

            {vmaCalc && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-stone-800">
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Vitesse</span>
                  <span className="text-base font-black font-mono" style={{ color: themeColor }}>
                    {vmaCalc.speedKmh} km/h
                  </span>
                </div>
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Allure /km</span>
                  <span className="text-base font-black font-mono text-stone-100">{vmaCalc.paceKm}</span>
                </div>
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">200 m</span>
                  <span className="text-base font-black font-mono text-stone-300">{vmaCalc.time200m}s</span>
                </div>
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">400 m</span>
                  <span className="text-base font-black font-mono text-stone-300">{vmaCalc.time400m}</span>
                </div>
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">800 m</span>
                  <span className="text-base font-black font-mono text-stone-300">{vmaCalc.time800m}</span>
                </div>
              </div>
            )}
          </div>

          {/* TABLEAU 60% À 110% */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-200">
                Tableau complet des allures (base VMA {vmaInput || "--"} km/h)
              </h3>
              <span className="text-[10px] font-bold text-stone-500 uppercase">60% à 110% par 5%</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-stone-800 text-[10px] uppercase font-sans text-stone-400">
                    <th className="py-2.5 px-3">% VMA</th>
                    <th className="py-2.5 px-3">Vitesse</th>
                    <th className="py-2.5 px-3">Allure /km</th>
                    <th className="py-2.5 px-3">200 m</th>
                    <th className="py-2.5 px-3">400 m</th>
                    <th className="py-2.5 px-3">800 m</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {vmaTable.map((row) => (
                    <tr
                      key={row.pct}
                      className={`hover:bg-stone-800/40 transition ${
                        row.pct === 100
                          ? "bg-stone-800/50 font-black"
                          : row.pct === 85 || row.pct === 90
                          ? "bg-stone-800/20 text-stone-200"
                          : "text-stone-300"
                      }`}
                      style={row.pct === 100 ? { color: themeColor } : undefined}
                    >
                      <td className="py-2.5 px-3 font-bold">{row.pct} %</td>
                      <td className="py-2.5 px-3">{row.spd} km/h</td>
                      <td className="py-2.5 px-3 font-black text-stone-100">{row.paceKm}</td>
                      <td className="py-2.5 px-3 text-stone-400">{row.t200}s</td>
                      <td className="py-2.5 px-3 text-stone-400">{row.t400}</td>
                      <td className="py-2.5 px-3 text-stone-400">{row.t800}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VDOT & SEUILS MARIUS BAKKEN (COURT / MOYEN / LONG)      */}
      {/* ========================================================= */}
      {activeTab === "vdot" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
                Méthode Jack Daniels & Marius Bakken
              </span>
              <h3 className="text-base font-black uppercase text-stone-100 mt-0.5">
                Calculer le VDOT et moduler le seuil par type d'intervalle
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">
                  Distance de référence
                </label>
                <select
                  value={vdotDistM}
                  onChange={(e) => setVdotDistM(parseInt(e.target.value, 10))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-100 focus:outline-none cursor-pointer"
                >
                  <option value={1500}>1 500 m</option>
                  <option value={3000}>3 000 m</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={21097}>Semi-Marathon (21.1 km)</option>
                  <option value={42195}>Marathon (42.2 km)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">
                  Temps réalisé (h / min / sec)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0 h"
                    value={vdotH}
                    onChange={(e) => setVdotH(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="20 min"
                    value={vdotM}
                    onChange={(e) => setVdotM(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="00 s"
                    value={vdotS}
                    onChange={(e) => setVdotS(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Score VDOT</span>
                <p className="text-2xl font-black font-mono mt-0.5" style={{ color: themeColor }}>
                  {vdotScore > 0 ? vdotScore : "--"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400">Seuil de base (T-Pace)</span>
                <p className="text-xl font-black font-mono text-stone-100 mt-0.5">
                  {vdotThresholdDetails ? `${vdotThresholdDetails.baseThresholdPace} /km` : "--:--"}
                </p>
                <p className="text-[10px] font-mono text-stone-400">
                  {vdotThresholdDetails ? `(${vdotThresholdDetails.baseThresholdSpeed} km/h)` : ""}
                </p>
              </div>
            </div>

            {/* SEUILS PAR TYPE D'INTERVALLES SELON MARIUS BAKKEN */}
            {vdotThresholdDetails && (
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    ⚡ Modulations du seuil selon l'intervalle (Méthode Bakken)
                  </h4>
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Allures cibles lactates</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Courts */}
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles Courts</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        -1% à +1%
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.shortIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.shortIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions courtes (ex: 400 m à 1 000 m ou 60s à 3 min). Rythme dynamique sans dérive lactique.
                    </p>
                  </div>

                  {/* Moyens */}
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles Moyens</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        -2% à 0%
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.mediumIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.mediumIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions moyennes (ex: 1 000 m à 2 000 m ou 3 à 6 min). Cœur de la charge au seuil.
                    </p>
                  </div>

                  {/* Longs */}
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles Longs</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        -4% à -2%
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.longIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.longIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions longues ou tempo (ex: 2 000 m à 4 000 m ou 8 à 15 min). Allure contrôlée et durable.
                    </p>
                  </div>
                </div>

                {/* AUTRES ALLURES DANIELS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-emerald-400 block">Endurance (Easy)</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.easy} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-blue-400 block">Marathon</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.marathon} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-orange-400 block">Intervalle (VO2)</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.interval} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-rose-400 block">Répétition (Vitesse)</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.repetition} /km</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. FUSION : CONVERTISSEUR SYNCHRO & CHRONO RUN-MOTION     */}
      {/* ========================================================= */}
      {activeTab === "speed_and_race" && (
        <div className="space-y-6 animate-fadeIn">
          {/* CONVERTISSEUR INTERACTIF SYNCHRONISÉ */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
              Convertisseur instantané bidirectionnel
            </span>
            <h3 className="text-sm font-black uppercase text-stone-100">
              Vitesse (km/h) ⇄ Allure (min/km)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Vitesse */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400 block">
                  Vitesse en km/h
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="30"
                    value={speedVal}
                    onChange={(e) => handleSpeedChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-base font-black font-mono text-stone-100 focus:outline-none"
                    style={{ borderColor: themeColor }}
                  />
                  <span className="text-xs font-bold text-stone-400">km/h</span>
                </div>
              </div>

              {/* Allure */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400 block">
                  Allure équivalente (min : sec)
                </label>
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2">
                      <input
                        type="number"
                        min="2"
                        max="20"
                        placeholder="min"
                        value={paceMin}
                        onChange={(e) => handlePaceChange(e.target.value === "" ? "" : parseInt(e.target.value, 10), paceSec)}
                        className="w-full text-center text-sm font-mono font-black text-stone-100 bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-stone-500">m</span>
                    </div>
                    <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="sec"
                        value={paceSec}
                        onChange={(e) => handlePaceChange(paceMin, e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                        className="w-full text-center text-sm font-mono font-black text-stone-100 bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-stone-500">s</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-stone-400">/km</span>
                </div>
              </div>
            </div>
          </div>

          {/* CALCULATEUR DISTANCE / TEMPS / CHRONO (STYLE RUN-MOTION) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
                Calculateur Distance & Temps
              </span>
              <h3 className="text-base font-black uppercase text-stone-100 mt-0.5">
                Vitesse moyenne, allure et temps de passage
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">Distance</label>
                <select
                  value={raceDistPreset}
                  onChange={(e) => setRaceDistPreset(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-100 focus:outline-none cursor-pointer"
                >
                  <option value="5000">5 km</option>
                  <option value="10000">10 km</option>
                  <option value="21097.5">Semi-Marathon (21.097 km)</option>
                  <option value="42195">Marathon (42.195 km)</option>
                  <option value="custom">Distance personnalisée (mètres)</option>
                </select>

                {raceDistPreset === "custom" && (
                  <input
                    type="number"
                    placeholder="Ex : 12500"
                    value={customDistanceM}
                    onChange={(e) => setCustomDistanceM(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-100 focus:outline-none mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400">Temps total</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0 h"
                    value={chronoH}
                    onChange={(e) => setChronoH(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="45 min"
                    value={chronoM}
                    onChange={(e) => setChronoM(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="00 s"
                    value={chronoS}
                    onChange={(e) => setChronoS(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {runMotionCalc && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Allure moyenne</span>
                    <span className="text-2xl font-black font-mono mt-1 block" style={{ color: themeColor }}>
                      {runMotionCalc.paceFormatted} <span className="text-xs text-stone-400 font-sans">/km</span>
                    </span>
                  </div>
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Vitesse moyenne</span>
                    <span className="text-2xl font-black font-mono text-stone-100 mt-1 block">
                      {runMotionCalc.speedKmh} <span className="text-xs text-stone-400 font-sans">km/h</span>
                    </span>
                  </div>
                </div>

                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[10px] uppercase font-black text-stone-400 tracking-wider block">
                    Temps de passage à cette même allure
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {runMotionCalc.passages.map((p) => (
                      <div key={p.label} className="p-2 rounded-xl bg-stone-900 border border-stone-800/80 text-center">
                        <span className="text-[9px] text-stone-400 block">{p.label}</span>
                        <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{p.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};