// src/components/profile/PersonalBestsPageView.tsx

import React, { useState, useMemo } from "react";
import { Race } from "../../types";
import { parseDistanceTextToMeters, getPerformanceScoreForRecord } from "../../utils/vdot";

interface PersonalBestsPageViewProps {
  races: Race[];
  onBack: () => void;
  onOpenRaceList?: () => void;
}

type StandardFormat = "5 km" | "10 km" | "Semi-Marathon" | "Marathon";

const FORMATS: { key: StandardFormat; label: string }[] = [
  { key: "5 km", label: "5 km" },
  { key: "10 km", label: "10 km" },
  { key: "Semi-Marathon", label: "Semi-Marathon" },
  { key: "Marathon", label: "Marathon" },
];

const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

const formatSeconds = (totalSec: number): string => {
  if (!totalSec || totalSec <= 0) return "--:--";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const getDistanceCategory = (distanceStr: string): StandardFormat | null => {
  if (!distanceStr) return null;
  const m = parseDistanceTextToMeters(distanceStr);
  if (m >= 4800 && m <= 5200) return "5 km";
  if (m >= 9800 && m <= 10200) return "10 km";
  if (m >= 20900 && m <= 21300) return "Semi-Marathon";
  if (m >= 41800 && m <= 42500) return "Marathon";
  return null;
};

export const PersonalBestsPageView: React.FC<PersonalBestsPageViewProps> = ({
  races,
  onBack,
  onOpenRaceList,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<StandardFormat>("10 km");

  // Regroupement des courses par distance et par année
  const statsByFormat = useMemo(() => {
    const validRaces = races.filter((r) => {
      const cat = getDistanceCategory(r.distance);
      const sec = timeToSeconds(r.time);
      return cat === selectedFormat && sec > 0 && r.date;
    });

    if (validRaces.length === 0) {
      return { absoluteBest: null, yearlyProgression: [] };
    }

    // Regrouper par année en ne retenant que la meilleure course de l'année
    const byYearMap: Record<number, { bestRace: Race; seconds: number }> = {};

    validRaces.forEach((r) => {
      const year = new Date(r.date!).getFullYear();
      const sec = timeToSeconds(r.time);
      if (!byYearMap[year] || sec < byYearMap[year].seconds) {
        byYearMap[year] = { bestRace: r, seconds: sec };
      }
    });

    const yearlyProgression = Object.entries(byYearMap)
      .map(([year, data]) => ({
        year: parseInt(year, 10),
        race: data.bestRace,
        seconds: data.seconds,
      }))
      .sort((a, b) => a.year - b.year);

    // Record absolu (le temps le plus bas de toutes les courses)
    let absoluteBest = validRaces[0];
    let minSec = timeToSeconds(absoluteBest.time);

    validRaces.forEach((r) => {
      const s = timeToSeconds(r.time);
      if (s < minSec) {
        minSec = s;
        absoluteBest = r;
      }
    });

    return { absoluteBest, yearlyProgression };
  }, [races, selectedFormat]);

  const { absoluteBest, yearlyProgression } = statsByFormat;

  // Calcul des coordonnées pour le graphe SVG
  const graphData = useMemo(() => {
    if (yearlyProgression.length < 2) return null;

    const times = yearlyProgression.map((d) => d.seconds);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const padding = (maxTime - minTime) * 0.15 || 60;
    const yMin = minTime - padding;
    const yMax = maxTime + padding;

    const width = 600;
    const height = 220;
    const margin = { top: 20, right: 30, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const points = yearlyProgression.map((d, idx) => {
      const x = margin.left + (idx / (yearlyProgression.length - 1)) * innerWidth;
      // Inversion : le meilleur temps (plus petit) est en haut du graphe
      const y = margin.top + ((d.seconds - yMin) / (yMax - yMin)) * innerHeight;
      return { ...d, x, y };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");

    return { points, pathD, width, height, margin };
  }, [yearlyProgression]);

  const distMeters = absoluteBest ? parseDistanceTextToMeters(absoluteBest.distance) : 0;
  const bestScore =
    absoluteBest && distMeters > 0
      ? getPerformanceScoreForRecord(distMeters, absoluteBest.time)
      : null;

  return (
    <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
      {/* HEADER DE LA PAGE */}
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
              Historique des Records
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Records Personnels & Évolution
            </h2>
          </div>
        </div>

        {onOpenRaceList && (
          <button
            type="button"
            onClick={onOpenRaceList}
            className="px-4 py-2 bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
          >
            Voir tout le palmarès ➔
          </button>
        )}
      </div>

      {/* SÉLECTEUR DE DISTANCE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FORMATS.map((fmt) => {
          const isSelected = selectedFormat === fmt.key;
          return (
            <button
              key={fmt.key}
              type="button"
              onClick={() => setSelectedFormat(fmt.key)}
              className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer border flex items-center justify-center gap-2 ${
                isSelected
                  ? "bg-[#CF9A61] text-stone-950 border-[#CF9A61] shadow-lg"
                  : "bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <span>⚡</span>
              <span>{fmt.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENU PRINCIPAL */}
      {!absoluteBest ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
            ⏱️
          </div>
          <p className="text-xs text-stone-400">
            Aucune course officielle enregistrée sur <strong>{selectedFormat}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARTE DU RECORD ABSOLU AVEC ORIGINE DE LA COURSE */}
          <div className="p-6 rounded-3xl border border-stone-800 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
                  Meilleure marque absolue • {selectedFormat}
                </span>
                <div className="text-3xl md:text-4xl font-black text-stone-100 font-mono tracking-tight mt-1">
                  ⏱️ {absoluteBest.time}
                </div>
              </div>

              {bestScore && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 text-stone-300">
                    VDOT <strong className="text-stone-100">{bestScore.vdot}</strong>
                  </span>
                  <span className="bg-[#B34D4D]/20 text-[#B34D4D] px-3 py-1.5 rounded-xl border border-[#B34D4D]/40 font-bold">
                    Score : {bestScore.runningScore}
                  </span>
                </div>
              )}
            </div>

            {/* DÉTAIL DE LA COURSE D'ORIGINE */}
            <div className="bg-stone-950/70 p-4 rounded-2xl border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">
                  Course d'origine
                </span>
                <h4 className="text-base font-black text-stone-100 uppercase tracking-tight mt-0.5">
                  {absoluteBest.name}
                </h4>
                <div className="text-xs text-stone-400 font-mono mt-0.5">
                  Le {absoluteBest.date} • {absoluteBest.category || "Route"}
                </div>
              </div>

              {absoluteBest.rank && (
                <div className="bg-amber-400/10 border border-amber-400/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shrink-0">
                  <span>🏁</span>
                  <span>{absoluteBest.rank}</span>
                </div>
              )}
            </div>
          </div>

          {/* GRAPHIQUE D'ÉVOLUTION ANNUELLE */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-stone-100 tracking-wider">
                  📈 Évolution du Record par Année
                </h3>
                <p className="text-[10.5px] text-stone-400 mt-0.5">
                  Meilleure course retenue pour chaque année civile
                </p>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                {yearlyProgression.length} année(s) comparée(s)
              </span>
            </div>

            {graphData ? (
              <div className="w-full overflow-x-auto custom-scrollbar">
                <svg
                  viewBox={`0 0 ${graphData.width} ${graphData.height}`}
                  className="w-full h-56 select-none"
                >
                  {/* Ligne de courbe */}
                  <path
                    d={graphData.pathD}
                    fill="none"
                    stroke="#CF9A61"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points et étiquettes */}
                  {graphData.points.map((p) => (
                    <g key={p.year}>
                      {/* Ligne repère verticale */}
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={p.x}
                        y2={graphData.height - graphData.margin.bottom}
                        stroke="#292524"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />

                      {/* Point */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        fill="#CF9A61"
                        stroke="#0c0a09"
                        strokeWidth="3"
                      />

                      {/* Bulle Chrono */}
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fill="#f5f5f4"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatSeconds(p.seconds)}
                      </text>

                      {/* Année en bas */}
                      <text
                        x={p.x}
                        y={graphData.height - 12}
                        textAnchor="middle"
                        fill="#a8a29e"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {p.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-500 italic bg-stone-950/50 rounded-2xl border border-stone-800">
                Il faut au moins 2 années différentes de courses sur {selectedFormat} pour tracer le graphique d'évolution.
              </div>
            )}
          </div>

          {/* HISTORIQUE DÉTAILLÉ ANNÉE PAR ANNÉE */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase text-stone-200 tracking-wider px-1">
              Détail Année par Année
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {yearlyProgression.map((item, idx) => {
                const prev = idx > 0 ? yearlyProgression[idx - 1] : null;
                const diffSec = prev ? prev.seconds - item.seconds : 0; // positif = gain de temps

                return (
                  <div
                    key={item.year}
                    className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 shadow-md space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#CF9A61] font-mono">
                            {item.year}
                          </span>
                          <span className="text-[11px] font-bold text-stone-200 uppercase truncate max-w-[200px]">
                            {item.race.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                          {item.race.date}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-stone-100 font-mono block">
                          {item.race.time}
                        </span>
                        {prev && diffSec !== 0 && (
                          <span
                            className={`text-[9.5px] font-bold font-mono ${
                              diffSec > 0 ? "text-[#4DB380]" : "text-[#B34D4D]"
                            }`}
                          >
                            {diffSec > 0 ? `- ${formatSeconds(diffSec)}` : `+ ${formatSeconds(Math.abs(diffSec))}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};