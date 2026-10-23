// src/components/common/PaceCalculatorsView.tsx

import React, { useState, useMemo } from "react";
import { UserRole } from "../../types";

interface PaceCalculatorsViewProps {
  userRole?: UserRole;
  initialVma?: string | number;
  onBack?: () => void;
}

type TabType = "vma" | "vdot" | "speed_and_race";

interface RaceReference {
  id: string;
  distMeters: number;
  h: number | "";
  m: number | "";
  s: number | "";
}

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

const calculateVDOTFromRace = (distMeters: number, timeMinutes: number): number => {
  if (distMeters <= 0 || timeMinutes <= 0) return 0;
  const speed = distMeters / timeMinutes;
  const vo2 = -4.60 + 0.182258 * speed + 0.000104 * Math.pow(speed, 2);
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return Math.round((vo2 / percentMax) * 10) / 10;
};

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
  // 1. ALLURES CIBLES & VMA
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
  // 2. MODÉLISATION VDOT & SEUILS MULTI-CHRONOS
  // ==========================================
  const [raceReferences, setRaceReferences] = useState<RaceReference[]>([
    { id: "ref_1", distMeters: 5000, h: "", m: 19, s: 30 },
    { id: "ref_2", distMeters: 10000, h: "", m: 40, s: 45 },
  ]);

  const handleAddReference = () => {
    setRaceReferences((prev) => [
      ...prev,
      { id: `ref_${Date.now()}`, distMeters: 10000, h: "", m: 45, s: 0 },
    ]);
  };

  const handleRemoveReference = (id: string) => {
    if (raceReferences.length <= 1) return;
    setRaceReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateReference = (id: string, field: keyof RaceReference, val: any) => {
    setRaceReferences((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const calculatedVdots = useMemo(() => {
    return raceReferences.map((ref) => {
      const totalMin =
        ((Number(ref.h) || 0) * 3600 + (Number(ref.m) || 0) * 60 + (Number(ref.s) || 0)) / 60;
      if (totalMin <= 0) return { ...ref, vdot: 0 };
      const score = calculateVDOTFromRace(ref.distMeters, totalMin);
      return { ...ref, vdot: score };
    });
  }, [raceReferences]);

  const validVdots = calculatedVdots.filter((r) => r.vdot > 0);
  const averageVdot = useMemo(() => {
    if (validVdots.length === 0) return 0;
    const sum = validVdots.reduce((acc, curr) => acc + curr.vdot, 0);
    return Math.round((sum / validVdots.length) * 10) / 10;
  }, [validVdots]);

  const vdotThresholdDetails = useMemo(() => {
    if (averageVdot <= 0) return null;
    const baseThresholdSec = vdotToPace(averageVdot, 0.88);

    // Ajustements demandés sur l'allure (sec/km) :
    // Courts : -1% à +1% de l'allure de seuil
    const shortPaceMin = baseThresholdSec * 0.99;
    const shortPaceMax = baseThresholdSec * 1.01;

    // Moyens : +3% à +6% (allure légèrement plus lente/accessible)
    const medPaceMin = baseThresholdSec * 1.03;
    const medPaceMax = baseThresholdSec * 1.06;

    // Longs : +6% à +9% (allure plus durable)
    const longPaceMin = baseThresholdSec * 1.06;
    const longPaceMax = baseThresholdSec * 1.09;

    return {
      baseThresholdPace: formatTime(baseThresholdSec),
      baseThresholdSpeed: (3600 / baseThresholdSec).toFixed(2),
      shortIntervals: {
        pace: `${formatTime(shortPaceMin)} — ${formatTime(shortPaceMax)}`,
        speed: `${(3600 / shortPaceMax).toFixed(2)} — ${(3600 / shortPaceMin).toFixed(2)} km/h`,
      },
      mediumIntervals: {
        pace: `${formatTime(medPaceMin)} — ${formatTime(medPaceMax)}`,
        speed: `${(3600 / medPaceMax).toFixed(2)} — ${(3600 / medPaceMin).toFixed(2)} km/h`,
      },
      longIntervals: {
        pace: `${formatTime(longPaceMin)} — ${formatTime(longPaceMax)}`,
        speed: `${(3600 / longPaceMax).toFixed(2)} — ${(3600 / longPaceMin).toFixed(2)} km/h`,
      },
      classicZones: {
        easy: `${formatTime(vdotToPace(averageVdot, 0.62))} — ${formatTime(vdotToPace(averageVdot, 0.70))}`,
        marathon: formatTime(vdotToPace(averageVdot, 0.80)),
        interval: formatTime(vdotToPace(averageVdot, 0.98)),
        repetition: formatTime(vdotToPace(averageVdot, 1.05)),
      },
    };
  }, [averageVdot]);

  // ==========================================
  // 3. MÉTRIQUES & CONVERSIONS
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
        { label: "Semi-marathon", time: formatTime(paceSec * 21.0975) },
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
              {isCoach ? "Analyse & Prescription d'allures" : "Calculateur d'allures & Physiologie"}
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-stone-100 tracking-tight mt-0.5">
              Plateforme de Calcul Métrique
            </h2>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR D'ONGLETS MODERNISÉ SANS EMOJIS */}
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
          Allures cibles & VMA
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
          Modélisation VDOT & Seuils
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
          Métriques & Conversions
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. ALLURES CIBLES & VMA                                    */}
      {/* ========================================================= */}
      {activeTab === "vma" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-200">
              Paramètres personnalisés
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

          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-200">
                Tableau des correspondances (VMA {vmaInput || "--"} km/h)
              </h3>
              <span className="text-[10px] font-bold text-stone-500 uppercase">60 % à 110 %</span>
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
      {/* 2. MODÉLISATION VDOT & SEUILS MULTI-CHRONOS               */}
      {/* ========================================================= */}
      {activeTab === "vdot" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
                  Indice VDOT pondéré
                </span>
                <h3 className="text-base font-black uppercase text-stone-100 mt-0.5">
                  Performances de référence
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddReference}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-850 text-stone-200 transition cursor-pointer"
              >
                + Ajouter une course
              </button>
            </div>

            <div className="space-y-2.5">
              {calculatedVdots.map((ref, idx) => (
                <div
                  key={ref.id}
                  className="bg-stone-950 p-3 rounded-2xl border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-[10px] font-mono font-bold text-stone-500 w-5">#{idx + 1}</span>
                    <select
                      value={ref.distMeters}
                      onChange={(e) =>
                        handleUpdateReference(ref.id, "distMeters", parseInt(e.target.value, 10))
                      }
                      className="bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-100 focus:outline-none cursor-pointer"
                    >
                      <option value={1500}>1 500 m</option>
                      <option value={3000}>3 000 m</option>
                      <option value={5000}>5 km</option>
                      <option value={10000}>10 km</option>
                      <option value={21097.5}>Semi-marathon (21.1 km)</option>
                      <option value={42195}>Marathon (42.2 km)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-[10px] uppercase text-stone-400 font-bold">Chrono :</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="h"
                      value={ref.h}
                      onChange={(e) =>
                        handleUpdateReference(
                          ref.id,
                          "h",
                          e.target.value === "" ? "" : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-12 bg-stone-900 border border-stone-800 rounded-xl px-1.5 py-1 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="min"
                      value={ref.m}
                      onChange={(e) =>
                        handleUpdateReference(
                          ref.id,
                          "m",
                          e.target.value === "" ? "" : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-14 bg-stone-900 border border-stone-800 rounded-xl px-1.5 py-1 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="s"
                      value={ref.s}
                      onChange={(e) =>
                        handleUpdateReference(
                          ref.id,
                          "s",
                          e.target.value === "" ? "" : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-14 bg-stone-900 border border-stone-800 rounded-xl px-1.5 py-1 text-center text-xs font-mono font-bold text-stone-100 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                    <span className="text-xs font-mono font-black" style={{ color: themeColor }}>
                      VDOT : {ref.vdot > 0 ? ref.vdot : "--"}
                    </span>
                    {raceReferences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReference(ref.id)}
                        className="text-stone-500 hover:text-red-400 text-xs px-1 cursor-pointer"
                        title="Supprimer la référence"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">VDOT moyen calculé</span>
                <p className="text-2xl font-black font-mono mt-0.5" style={{ color: themeColor }}>
                  {averageVdot > 0 ? averageVdot : "--"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400">Allure de seuil étalon (T-Pace)</span>
                <p className="text-xl font-black font-mono text-stone-100 mt-0.5">
                  {vdotThresholdDetails ? `${vdotThresholdDetails.baseThresholdPace} /km` : "--:--"}
                </p>
                <p className="text-[10px] font-mono text-stone-400">
                  {vdotThresholdDetails ? `(${vdotThresholdDetails.baseThresholdSpeed} km/h)` : ""}
                </p>
              </div>
            </div>

            {vdotThresholdDetails && (
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-200">
                    Seuils cibles par format d'intervalle
                  </h4>
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Allures dérivées</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles courts</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        -1 % à +1 %
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.shortIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.shortIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions rapides (ex: 400 m à 1 000 m ou 60s à 3 min). Travail nerveux sous contrôle d'acide lactique.
                    </p>
                  </div>

                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles moyens</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        +3 % à +6 %
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.mediumIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.mediumIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions médianes (ex: 1 000 m à 2 000 m ou 3 à 6 min). Stabilisation du débit aérobie au seuil.
                    </p>
                  </div>

                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-stone-200">Intervalles longs</span>
                      <span className="text-[9px] font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                        +6 % à +9 %
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-stone-100 block">
                      {vdotThresholdDetails.longIntervals.pace} <span className="text-xs text-stone-400">/km</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      {vdotThresholdDetails.longIntervals.speed}
                    </span>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      Fractions longues ou tempo continu (ex: 2 000 m à 4 000 m ou 8 à 15 min). Tenue d'allure semi-marathon.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-emerald-400 block">Endurance fondamentale</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.easy} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-blue-400 block">Allure marathon</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.marathon} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-orange-400 block">Allure VO2max</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.interval} /km</span>
                  </div>
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 text-center">
                    <span className="text-[9px] uppercase font-bold text-rose-400 block">Vitesse pure</span>
                    <span className="text-xs font-mono font-bold text-stone-200 mt-0.5 block">{vdotThresholdDetails.classicZones.repetition} /km</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MÉTRIQUES & CONVERSIONS                                 */}
      {/* ========================================================= */}
      {activeTab === "speed_and_race" && (
        <div className="space-y-6 animate-fadeIn">
          {/* CONVERTISSEUR INSTANTANÉ SYNCHRONISÉ */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
              Synchronisation instantanée
            </span>
            <h3 className="text-sm font-black uppercase text-stone-100">
              Vitesse (km/h) ⇄ Allure (min/km)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400 block">
                  Vitesse
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

              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-stone-400 block">
                  Allure
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

          {/* CALCULATEUR CHRONO & TEMPS DE PASSAGE */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: themeColor }}>
                Estimation chronométrique
              </span>
              <h3 className="text-base font-black uppercase text-stone-100 mt-0.5">
                Allure moyenne & temps de passage
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
                  <option value="21097.5">Semi-marathon (21.097 km)</option>
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
                    Temps de passage à allure équivalente
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