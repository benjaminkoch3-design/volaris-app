// src/components/profile/PhysiologyPageView.tsx

import React from "react";
import {
  formatPaceFromSpeed,
  calculateThresholds,
} from "../../utils/calculations";
import { RECORD_DISTANCES_METERS } from "../../utils/vdot";
import { calculateRecordVmaPercentage } from "../../utils/profile";

interface PhysiologyPageViewProps {
  vma: string;
  unknownVma: boolean;
  fcRest: string;
  fcMax: string;
  records: Record<string, string>;
  onBack: () => void;
}

export const PhysiologyPageView: React.FC<PhysiologyPageViewProps> = ({
  vma,
  unknownVma,
  fcRest,
  fcMax,
  records,
  onBack,
}) => {
  const vmaNum = parseFloat(vma) || 0;
  const restNum = parseInt(fcRest, 10);
  const maxNum = parseInt(fcMax, 10);

  // Seuils LT1 & LT2
  const thresh = calculateThresholds(
    vma,
    records.r10k || "",
    records.rSemi || ""
  );

  // Association des records personnels aux pourcentages de VMA
  const recordVmaPcts: { key: string; label: string; pct: number }[] = [];
  if (vmaNum > 0) {
    Object.entries(RECORD_DISTANCES_METERS).forEach(([key, info]) => {
      const timeStr = records[key];
      if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
        const pct = calculateRecordVmaPercentage(key, timeStr, vmaNum);
        if (pct !== null) {
          recordVmaPcts.push({ key, label: info.label, pct });
        }
      }
    });
  }

  // Calcul des zones Karvonen
  const hasValidCardio = restNum > 0 && maxNum > 0 && maxNum > restNum;
  const rfc = hasValidCardio ? maxNum - restNum : 0;

  const cardioZones = hasValidCardio
    ? [
        {
          zone: "Z1",
          pct: "50–60 %",
          min: Math.round(restNum + 0.5 * rfc),
          max: Math.round(restNum + 0.6 * rfc),
          intensity: "Très facile",
          usage: "Échauffement, récupération active",
          badge: "bg-[#007CC3]/20 text-[#007CC3] border-[#007CC3]/40",
        },
        {
          zone: "Z2",
          pct: "60–70 %",
          min: Math.round(restNum + 0.6 * rfc),
          max: Math.round(restNum + 0.7 * rfc),
          intensity: "Facile",
          usage: "Endurance fondamentale",
          badge: "bg-[#4DB380]/20 text-[#4DB380] border-[#4DB380]/40",
        },
        {
          zone: "Z3",
          pct: "70–80 %",
          min: Math.round(restNum + 0.7 * rfc),
          max: Math.round(restNum + 0.8 * rfc),
          intensity: "Modérée",
          usage: "Endurance active, allure marathon",
          badge: "bg-[#CDCF61]/20 text-[#CDCF61] border-[#CDCF61]/40",
        },
        {
          zone: "Z4",
          pct: "80–90 %",
          min: Math.round(restNum + 0.8 * rfc),
          max: Math.round(restNum + 0.9 * rfc),
          intensity: "Soutenue",
          usage: "Seuil, allure 10 km",
          badge: "bg-[#CF9A61]/20 text-[#CF9A61] border-[#CF9A61]/40",
        },
        {
          zone: "Z5",
          pct: "90–100 %",
          min: Math.round(restNum + 0.9 * rfc),
          max: Math.round(restNum + 1.0 * rfc),
          intensity: "Maximale",
          usage: "VO₂max, intervalles courts",
          badge: "bg-[#F8283B]/20 text-[#F8283B] border-[#F8283B]/40",
        },
      ]
    : [];

  return (
    <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
      {/* HEADER AVEC RETOUR */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex items-center justify-between gap-4">
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
              Physiologie & Métriques
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              VMA, Seuils & Zones Cardiaques
            </h2>
          </div>
        </div>
      </div>

      {/* SECTION 1 : VMA, ALLURES & SEUILS */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h3 className="text-base font-black uppercase tracking-tight text-stone-100">
              Vitesse Maximale Aérobie (VMA) & Seuils
            </h3>
          </div>
          <span className="text-xs font-mono font-black text-[#CF9A61] bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            {unknownVma || vmaNum <= 0
              ? "VMA non définie"
              : `${vmaNum} km/h • ${formatPaceFromSpeed(vmaNum)} min/km`}
          </span>
        </div>

        {/* CARTES SEUILS LT1 ET LT2 */}
        {thresh && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-[#B34D4D]">
                  Seuil Anaérobie (LT2)
                </span>
                <span className="text-[10px] font-extrabold bg-[#B34D4D]/20 text-[#B34D4D] px-2.5 py-0.5 rounded-md border border-[#B34D4D]/30 font-mono">
                  {thresh.lt2Pct} % VMA
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-lg font-black text-stone-100 font-mono">
                  {thresh.lt2Speed} <span className="text-xs font-normal text-stone-400">km/h</span>
                </span>
                <span className="text-sm font-black text-[#CF9A61] font-mono">
                  {thresh.lt2Pace} min/km
                </span>
              </div>
              <p className="text-[10.5px] text-stone-500">
                Allure tenue environ 45 à 60 minutes en compétition (allure 10 km à semi).
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-[#4DB380]">
                  Seuil Aérobie (LT1)
                </span>
                <span className="text-[10px] font-extrabold bg-[#4DB380]/20 text-[#4DB380] px-2.5 py-0.5 rounded-md border border-[#4DB380]/30 font-mono">
                  {thresh.lt1Pct} % VMA
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-lg font-black text-stone-100 font-mono">
                  {thresh.lt1Speed} <span className="text-xs font-normal text-stone-400">km/h</span>
                </span>
                <span className="text-sm font-black text-[#CF9A61] font-mono">
                  {thresh.lt1Pace} min/km
                </span>
              </div>
              <p className="text-[10.5px] text-stone-500">
                Frontière supérieure de l'endurance fondamentale sans accumulation de lactates.
              </p>
            </div>
          </div>
        )}

        {/* GRILLE DÉTAILLÉE DES POURCENTAGES DE VMA & RECORDS ASSOCIÉS */}
        {vmaNum > 0 && !unknownVma && (
          <div className="space-y-3 pt-2 border-t border-stone-800/60">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black uppercase text-[#CF9A61] tracking-wider">
                  Échelle des Pourcentages de VMA & Records Associés
                </h4>
                <p className="text-[10.5px] text-stone-400">
                  Correspondance précise entre pourcentages de sollicitation et % de VMA maintenu sur vos records personnels.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
              {[60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125].map((pct) => {
                const speed = (vmaNum * pct) / 100;
                const pace = formatPaceFromSpeed(speed);

                const matchingRecords = recordVmaPcts.filter(
                  (r) => Math.abs(r.pct - pct) < 2.5
                );

                return (
                  <div
                    key={pct}
                    className={`p-3 rounded-2xl border text-center space-y-1 transition ${
                      matchingRecords.length > 0
                        ? "bg-[#CF9A61]/15 border-[#CF9A61] shadow-lg ring-1 ring-[#CF9A61]/30"
                        : "bg-stone-950 border-stone-800"
                    }`}
                  >
                    <div className="text-[11px] font-black text-[#CF9A61]">
                      {pct} % VMA
                    </div>
                    <div className="text-xs font-bold text-stone-100 font-mono">
                      {pace}{" "}
                      <span className="text-[8px] font-normal text-stone-400 font-sans">
                        min/km
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      {speed.toFixed(1)} km/h
                    </div>

                    {matchingRecords.length > 0 && (
                      <div className="pt-1.5 border-t border-[#CF9A61]/30 space-y-1">
                        {matchingRecords.map((rec) => (
                          <div
                            key={rec.key}
                            className="bg-[#CF9A61] text-stone-950 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm"
                            title={`Record personnel : ${rec.label} (${rec.pct}% VMA)`}
                          >
                            <div>{rec.label}</div>
                            <div className="text-[7.5px] opacity-90">{rec.pct} %</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2 : CARDIO & ZONES KARVONEN */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">❤️</span>
            <h3 className="text-base font-black uppercase tracking-tight text-stone-100">
              Fréquence Cardiaque & Zones FC (Karvonen)
            </h3>
          </div>
          {hasValidCardio && (
            <span className="text-xs font-mono font-bold text-stone-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
              RFC = {rfc} bpm
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center sm:text-left">
            <span className="text-[9.5px] text-stone-400 uppercase font-bold block">
              FC de Repos
            </span>
            <div className="text-xl font-black text-stone-100 font-mono mt-0.5">
              {fcRest ? `${fcRest} bpm` : "-"}
            </div>
          </div>
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center sm:text-left">
            <span className="text-[9.5px] text-stone-400 uppercase font-bold block">
              FC Maximale
            </span>
            <div className="text-xl font-black text-stone-100 font-mono mt-0.5">
              {fcMax ? `${fcMax} bpm` : "-"}
            </div>
          </div>
        </div>

        {!hasValidCardio ? (
          <div className="bg-stone-950/70 p-5 rounded-2xl border border-stone-800 text-center text-xs text-stone-400 italic">
            Renseignez votre FC de repos et votre FC maximale dans votre profil pour afficher vos zones d'entraînement Karvonen.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Zone (% RFC)</th>
                  <th className="py-3 px-3.5">Plage Cardiaque Cible</th>
                  <th className="py-3 px-3.5">Intensité</th>
                  <th className="py-3 px-3.5">Bénéfice & Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 bg-stone-950/60 font-mono">
                {cardioZones.map((z) => (
                  <tr key={z.zone} className="hover:bg-stone-900/40 transition">
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] border font-black ${z.badge}`}>
                        {z.zone} ({z.pct})
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-stone-100 whitespace-nowrap">
                      {z.min} - {z.max}{" "}
                      <span className="text-[9px] text-[#CF9A61] font-bold font-sans">bpm</span>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-stone-300 font-sans whitespace-nowrap">
                      {z.intensity}
                    </td>
                    <td className="py-2.5 px-3.5 text-stone-400 font-sans text-[11px]">
                      {z.usage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};