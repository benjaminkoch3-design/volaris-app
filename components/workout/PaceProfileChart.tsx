// src/components/workout/PaceProfileChart.tsx

import React from "react";
import { WorkoutStep } from "../../types";
import { generatePaceProfile } from "../../utils/calculations";

export const PaceProfileChart: React.FC<{ steps?: WorkoutStep[] }> = ({ steps }) => {
  const profile = generatePaceProfile(steps);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalTimeSec === 0) return null;

  // Calcul des bornes d'allure pour l'axe des ordonnées
  const minPaceSec = Math.min(...profile.map((p) => p.paceSecPerKm));
  const maxPaceSec = Math.max(...profile.map((p) => p.paceSecPerKm));
  const paceRange = maxPaceSec - minPaceSec || 60;

  // Formate les secondes en MM:SS
  const formatPace = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Couleurs par type de bloc
  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#f59e0b"; // Amber
      case "corps":
        return "#ef4444"; // Red
      case "recup":
        return "#06b6d4"; // Cyan
      case "retour_calme":
        return "#3b82f6"; // Blue
      default:
        return "#10b981"; // Emerald
    }
  };

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2">
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
        <div className="flex flex-col justify-between text-[8px] font-bold text-stone-500 py-1 text-right w-8 select-none">
          <span className="text-amber-400">{formatPace(minPaceSec)}</span>
          <span>{formatPace(minPaceSec + paceRange / 2)}</span>
          <span className="text-stone-600">{formatPace(maxPaceSec)}</span>
        </div>

        {/* ZONE DU GRAPHIQUE EN BÂTONS (ABSCISSE = CHRONOLOGIE DE LA SÉANCE) */}
        <div className="flex-1 bg-stone-900/60 rounded-xl p-2 flex items-end gap-1 relative overflow-hidden border border-stone-800/60">
          {profile.map((point, i) => {
            const widthPct = (point.durationSec / totalTimeSec) * 100;
            // Hauteur inversée : Plus l'allure est rapide (secondes plus petites), plus la barre est haute
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
                    <div className="text-amber-400">{point.paceFormatted} min/km</div>
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
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Échauffement
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Course / Corps
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span> Récupération
          </span>
        </div>
        <span className="text-[8px] text-stone-500 italic">← Évolution dans le temps →</span>
      </div>
    </div>
  );
};