// src/components/workout/PaceProfileChart.tsx

import React from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

export const PaceProfileChart: React.FC<{ steps?: WorkoutStep[] }> = ({ steps }) => {
  const profile = generatePaceProfile(steps);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalTimeSec === 0) return null;

  // Calcul des bornes d'allure
  const minPaceSec = Math.min(...profile.map((p) => p.paceSecPerKm));
  const maxPaceSec = Math.max(...profile.map((p) => p.paceSecPerKm));
  const paceRange = maxPaceSec - minPaceSec || 60;

  // Formate les secondes en MM:SS
  const formatPace = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Couleurs Volaris par type de bloc
  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#CF6361"; // Rouge léger / Échauffement
      case "corps":
        return "#CF9A61"; // Ocre / Course
      case "recup":
        return "#CDCF61"; // Jaune-Vert / Récup
      case "retour_calme":
        return "#3b82f6"; // Bleu / Cooldown
      default:
        return "#10b981"; // Vert
    }
  };

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2 font-sans">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
          📈 Profil d'allure de la séance
        </span>
        <span className="text-[9px] text-stone-500 font-semibold">
          Durée Totale : {Math.round(totalTimeSec / 60)} min
        </span>
      </div>

      <div className="flex gap-2 items-stretch h-28">
        {/* AXE DES ORDONNÉES (Y) : GRADUATION DES ALLURES (MIN/KM) */}
        <div className="flex flex-col justify-between text-[8px] font-extrabold text-stone-500 py-1 text-right w-8 select-none border-r border-stone-800/80 pr-1">
          <span className="text-[#CF9A61]">{formatPace(minPaceSec)}</span>
          <span>{formatPace(minPaceSec + paceRange / 2)}</span>
          <span className="text-stone-600">{formatPace(maxPaceSec)}</span>
        </div>

        {/* ZONE DU GRAPHIQUE */}
        <div className="flex-1 bg-stone-900/60 rounded-xl p-2 flex items-end gap-1 relative overflow-hidden border border-stone-800/60">
          {profile.map((point, i) => {
            const widthPct = (point.durationSec / totalTimeSec) * 100;
            const normalizedHeight =
              paceRange === 0
                ? 60
                : 20 + ((maxPaceSec - point.paceSecPerKm) / paceRange) * 75;

            return (
              <div
                key={i}
                style={{
                  width: `${Math.max(widthPct, 2)}%`,
                  height: `${normalizedHeight}%`,
                  backgroundColor: getColor(point.type),
                }}
                className="rounded-t-sm transition-all relative group cursor-pointer hover:brightness-125"
              >
                {/* TOOLTIP INFOBULLE AU SURVOL */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    <div>{point.label}</div>
                    <div className="text-[#CF9A61]">{point.paceFormatted} min/km</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LÉGENDE DE PIED DE GRAPHIQUE */}
      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] inline-block"></span> Échauff.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF9A61] inline-block"></span> Course
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] inline-block"></span> Récup.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block"></span> Calme
          </span>
        </div>
        <span className="text-[8px] text-stone-500 italic">← Évolution dans le temps →</span>
      </div>
    </div>
  );
};