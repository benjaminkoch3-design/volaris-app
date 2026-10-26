// src/components/coach/CoachAthleteProfileView.tsx
'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AthleteProfile, Race } from "../../types";
import { getBestAthletePerformance } from "../../utils/vdot";
import { calculateRunnerProfile } from "../../utils/profile";

interface ZoneTemplate {
  id: string;
  name: string;
  zones: any[];
}

interface HrZoneTemplate {
  id: string;
  name: string;
  zones: any[];
}

interface CoachAthleteProfileViewProps {
  athlete: AthleteProfile & { [key: string]: any };
  coachId: string;
  races?: Race[];
  onBack: () => void;
}

// Convertit une vitesse en km/h vers une allure min:sec /km
const speedToPace = (speedKmH: number): string => {
  if (!speedKmH || speedKmH <= 0 || isNaN(speedKmH)) return "-";
  const totalSeconds = Math.round(3600 / speedKmH);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}/km`;
};

// Extraction exacte basée sur minVmaPercent et maxVmaPercent de la bibliothèque
const extractZoneVmaPercentages = (zone: any) => {
  if (!zone) return { pMin: 0, pMax: 0 };
  
  const rawMin = zone.minVmaPercent ?? zone.percentageMin ?? zone.minPercent ?? zone.min ?? 0;
  const rawMax = zone.maxVmaPercent ?? zone.percentageMax ?? zone.maxPercent ?? zone.max ?? 0;

  const pMin = parseFloat(String(rawMin).replace(",", ".")) || 0;
  const pMax = parseFloat(String(rawMax).replace(",", ".")) || 0;

  return { pMin, pMax };
};

// Extraction pour la Fréquence Cardiaque
const extractZoneHrPercentages = (zone: any) => {
  if (!zone) return { pMin: 0, pMax: 0 };
  
  const rawMin = zone.percentageMin ?? zone.minPercent ?? zone.min ?? 0;
  const rawMax = zone.percentageMax ?? zone.maxPercent ?? zone.max ?? 0;

  const pMin = parseFloat(String(rawMin).replace(",", ".")) || 0;
  const pMax = parseFloat(String(rawMax).replace(",", ".")) || 0;

  return { pMin, pMax };
};

export const CoachAthleteProfileView: React.FC<CoachAthleteProfileViewProps> = ({
  athlete,
  coachId,
  races = [],
  onBack,
}) => {
  const cleanVal = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/[^0-9.,]/g, "").replace(",", ".");
  };

  const athleteName = athlete.name || athlete.full_name || "Athlète";
  const avatarUrl = athlete.avatarUrl || athlete.avatar_url;
  const height = cleanVal(athlete.height);
  const weight = cleanVal(athlete.weight);

  const initialVma = cleanVal(athlete.vma) || "14";
  const initialFcMin = cleanVal(athlete.fcRest || athlete.fc_rest) || "50";
  const initialFcMax = cleanVal(athlete.fcMax || athlete.fc_max) || "190";

  const [customVma, setCustomVma] = useState<string>(initialVma);
  const [customFcMin, setCustomFcMin] = useState<string>(initialFcMin);
  const [customFcMax, setCustomFcMax] = useState<string>(initialFcMax);
  
  const [selectedVmaTemplateId, setSelectedVmaTemplateId] = useState<string>("");
  const [selectedHrTemplateId, setSelectedHrTemplateId] = useState<string>("");

  const [vmaTemplates, setVmaTemplates] = useState<ZoneTemplate[]>([]);
  const [hrTemplates, setHrTemplates] = useState<HrZoneTemplate[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const fetchCoachData = async () => {
      // 1. Charger en premier les listes de modèles pour que les <select> connaissent les IDs
      const { data: vmaTmpls } = await supabase
        .from("coach_zone_templates")
        .select("*")
        .eq("user_id", coachId);
      if (vmaTmpls) setVmaTemplates(vmaTmpls);

      const { data: hrTmpls } = await supabase
        .from("coach_hr_zone_templates")
        .select("*")
        .eq("user_id", coachId);
      if (hrTmpls) setHrTemplates(hrTmpls);

      // 2. Charger les réglages spécifiques enregistrés pour cet athlète
      const { data: settingsData } = await supabase
        .from("coach_athlete_settings")
        .select("*")
        .eq("coach_id", coachId)
        .eq("athlete_id", athlete.id)
        .maybeSingle();

      if (settingsData) {
        if (settingsData.custom_vma !== null && settingsData.custom_vma !== undefined) {
          setCustomVma(String(settingsData.custom_vma));
        }
        if (settingsData.custom_fc_min !== null && settingsData.custom_fc_min !== undefined) {
          setCustomFcMin(String(settingsData.custom_fc_min));
        }
        if (settingsData.custom_fc_max !== null && settingsData.custom_fc_max !== undefined) {
          setCustomFcMax(String(settingsData.custom_fc_max));
        }
        if (settingsData.vma_zone_template_id) {
          setSelectedVmaTemplateId(String(settingsData.vma_zone_template_id));
        }
        if (settingsData.hr_zone_template_id) {
          setSelectedHrTemplateId(String(settingsData.hr_zone_template_id));
        }
      }
    };

    fetchCoachData();
  }, [athlete.id, coachId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage("");

    const parsedVma = parseFloat(customVma);
    const parsedFcMin = parseFloat(customFcMin);
    const parsedFcMax = parseFloat(customFcMax);

    const payload = {
      coach_id: coachId,
      athlete_id: athlete.id,
      custom_vma: !isNaN(parsedVma) ? parsedVma : null,
      custom_fc_min: !isNaN(parsedFcMin) ? parsedFcMin : null,
      custom_fc_max: !isNaN(parsedFcMax) ? parsedFcMax : null,
      vma_zone_template_id: selectedVmaTemplateId || null,
      hr_zone_template_id: selectedHrTemplateId || null,
    };

    const { error } = await supabase
      .from("coach_athlete_settings")
      .upsert(payload, { onConflict: "coach_id,athlete_id" });

    setSaving(false);
    if (error) {
      console.error("Erreur sauvegarde coach_athlete_settings :", error);
      setSaveMessage(`Erreur : ${error.message}`);
    } else {
      setSaveMessage("Paramètres enregistrés avec succès !");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const records = athlete.records || {};
  const athletePerf = getBestAthletePerformance(records);
  const runnerProfile = calculateRunnerProfile(records);

  const bestUtmbIndex = races.reduce((max, race) => {
    const utmb =
      typeof race.utmbIndex === "number"
        ? race.utmbIndex
        : parseFloat(String(race.utmbIndex || 0));

    if (race.category === "trail" && !isNaN(utmb) && utmb > max) {
      return utmb;
    }
    return max;
  }, 0);

  const activeVmaTemplate = vmaTemplates.find((t) => String(t.id) === String(selectedVmaTemplateId));
  const activeHrTemplate = hrTemplates.find((t) => String(t.id) === String(selectedHrTemplateId));

  const numericVma = parseFloat(customVma);
  const validVma = !isNaN(numericVma) ? numericVma : 0;

  const numericFcMin = parseFloat(customFcMin);
  const validFcMin = !isNaN(numericFcMin) ? numericFcMin : 0;

  const numericFcMax = parseFloat(customFcMax);
  const validFcMax = !isNaN(numericFcMax) ? numericFcMax : 0;

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-12">
      {/* En-tête / Retour */}
      <div className="flex items-center justify-between bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase text-stone-400 hover:text-stone-100 transition flex items-center gap-1.5 cursor-pointer bg-stone-950 px-3 py-2 rounded-xl border border-stone-800"
        >
          ← Retour à la liste
        </button>
        <h2 className="text-sm font-black text-stone-100 uppercase tracking-wider">
          Fiche Coach : <span className="text-[#CF9A61]">{athleteName}</span>
        </h2>
      </div>

      {saveMessage && (
        <div className={`border text-xs font-bold p-3 rounded-2xl text-center ${
          saveMessage.startsWith("Erreur") 
            ? "bg-red-500/10 border-red-500/30 text-red-400" 
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        }`}>
          {saveMessage}
        </div>
      )}

      {/* CARTE RÉSUMÉ HAUT DE PAGE */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-stone-800 border-2 border-[#CF9A61]/60 rounded-full flex items-center justify-center text-xl font-black text-stone-200 overflow-hidden shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={athleteName} className="w-full h-full object-cover" />
              ) : (
                <span>{athleteName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div>
              <h3 className="text-xl font-black uppercase text-stone-100">
                {athleteName}
              </h3>
              <p className="text-xs text-[#CF9A61] font-bold tracking-wide mt-0.5">
                Athlète Suivi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-stone-950/80 px-4 py-2.5 rounded-2xl border border-stone-800/80 text-xs">
            <div className="text-center sm:text-left">
              <span className="text-[9px] text-[#CF9A61] uppercase block font-bold">
                Taille
              </span>
              <span className="font-extrabold text-stone-100">
                {height ? `${height} cm` : "-"}
              </span>
            </div>
            <div className="h-6 w-px bg-stone-800" />
            <div className="text-center sm:text-left">
              <span className="text-[9px] text-[#CF9A61] uppercase block font-bold">
                Poids
              </span>
              <span className="font-extrabold text-stone-100">
                {weight ? `${weight} kg` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* DOUBLE CARTE : ROUTE & TRAIL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="bg-gradient-to-br from-[#B34D4D]/20 via-stone-950 to-stone-950 p-4 rounded-2xl border border-[#B34D4D]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#B34D4D] tracking-wider">
                Performance Route
              </span>
              <span className="text-[8px] font-extrabold uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                VDOT : {athletePerf.bestVDOT || "-"}
              </span>
            </div>

            {athletePerf.bestRunningScore > 0 ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-stone-100">
                    {athletePerf.bestRunningScore}
                  </span>
                  <span className="text-xs font-bold text-[#B34D4D]">/ 1000</span>
                </div>
                <p className="text-[9.5px] text-stone-400 mt-0.5">
                  Réf : <strong className="text-stone-200">{athletePerf.referenceDistance}</strong>
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-stone-500 italic py-1">
                Aucun chrono route enregistré.
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#4DB380]/20 via-stone-950 to-stone-950 p-4 rounded-2xl border border-[#4DB380]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#4DB380] tracking-wider">
                Performance Trail
              </span>
              <span className="text-[8px] font-extrabold uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                UTMB Index
              </span>
            </div>

            {bestUtmbIndex > 0 ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-stone-100">
                    {bestUtmbIndex}
                  </span>
                  <span className="text-xs font-bold text-[#4DB380]">pts</span>
                </div>
                <p className="text-[9.5px] text-stone-400 mt-0.5">
                  Meilleur score attribué
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-stone-500 italic py-1">
                Aucun UTMB Index renseigné.
              </p>
            )}
          </div>
        </div>

        {/* PROFIL COUREUR */}
        {runnerProfile ? (
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800/80 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#CF9A61]">
                Profil de Coureur :{" "}
                <strong className="text-stone-100">
                  {runnerProfile.categoryLabel}
                </strong>
              </span>
              <span className="text-[9px] font-bold text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                Δ VDOT (Court-Long) : {runnerProfile.vdotDiff > 0 ? "+" : ""}
                {runnerProfile.vdotDiff}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-1">
              <span className="text-emerald-400">
                Endurance : {runnerProfile.endurancePercent}%
              </span>
              <span className="text-red-500">
                Vitesse : {runnerProfile.vitessePercent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="relative w-full h-3 bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 rounded-full p-0.5 shadow-inner">
                <div
                  style={{ left: `calc(${runnerProfile.vitessePercent}% - 6px)` }}
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-stone-950 rounded-full shadow-lg transition-all"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* BLOC DE CONFIGURATION DU COACH */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#CF9A61] block">
              Paramétrage Personnalisé
            </span>
            <h3 className="text-sm font-black uppercase text-stone-100">
              VMA, Fréquence Cardiaque & Modèles (Coach)
            </h3>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        {/* SECTION VMA & MODÈLE D'ALLURE */}
        <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                VMA Référence Coach (km/h)
              </label>
              <input
                type="number"
                step="0.1"
                value={customVma}
                onChange={(e) => setCustomVma(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-black text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Modèle d'allure associé
              </label>
              <select
                value={selectedVmaTemplateId}
                onChange={(e) => setSelectedVmaTemplateId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
              >
                <option value="">-- Aucun modèle d'allure --</option>
                {vmaTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeVmaTemplate && (
            <div className="pt-3 border-t border-stone-800/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-wider block">
                Seuils calculés ({activeVmaTemplate.name})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeVmaTemplate.zones?.map((zone, idx) => {
                  const { pMin, pMax } = extractZoneVmaPercentages(zone);

                  const sMinKmH = (validVma * pMin) / 100;
                  const sMaxKmH = (validVma * pMax) / 100;

                  // L'allure la plus rapide correspond à la vitesse maximale de la zone
                  const paceMaxStr = speedToPace(sMaxKmH);
                  const paceMinStr = speedToPace(sMinKmH);

                  return (
                    <div key={idx} style={{ borderColor: zone.color || "#CF9A61" }} className="p-2.5 rounded-xl border bg-stone-900 space-y-1">
                      <div className="flex justify-between items-center text-xs font-black text-stone-100">
                        <span>{zone.name || zone.label || `Zone ${idx + 1}`}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: zone.color || "#CF9A61" }}>
                          {pMin}%-{pMax}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-stone-300">
                        <span>{sMinKmH.toFixed(1)} - {sMaxKmH.toFixed(1)} km/h</span>
                        <span className="text-[#CF9A61] font-mono">{paceMaxStr} - {paceMinStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION FRÉQUENCE CARDIAQUE & MODÈLE FC */}
        <div className="space-y-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                FC Min / Repos (bpm)
              </label>
              <input
                type="number"
                value={customFcMin}
                onChange={(e) => setCustomFcMin(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-black text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                FC Max (bpm)
              </label>
              <input
                type="number"
                value={customFcMax}
                onChange={(e) => setCustomFcMax(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-black text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Modèle de Zones FC associé
              </label>
              <select
                value={selectedHrTemplateId}
                onChange={(e) => setSelectedHrTemplateId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-[#CF9A61] cursor-pointer"
              >
                <option value="">-- Aucun modèle FC --</option>
                {hrTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeHrTemplate && (
            <div className="pt-3 border-t border-stone-800/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-wider block">
                Zones FC calculées ({activeHrTemplate.name}) - Formule Karvonen (FCR)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeHrTemplate.zones?.map((zone, idx) => {
                  const { pMin, pMax } = extractZoneHrPercentages(zone);

                  const fcReserve = validFcMax - validFcMin;
                  const fcMinCalc = Math.round(validFcMin + fcReserve * (pMin / 100));
                  const fcMaxCalc = Math.round(validFcMin + fcReserve * (pMax / 100));

                  return (
                    <div key={idx} style={{ borderColor: zone.color || "#CF9A61" }} className="p-2.5 rounded-xl border bg-stone-900 space-y-0.5">
                      <div className="flex justify-between items-center text-xs font-black text-stone-100">
                        <span>{zone.name || zone.label || `Zone ${idx + 1}`}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: zone.color || "#CF9A61" }}>
                          {pMin}%-{pMax}%
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-300">{fcMinCalc} à {fcMaxCalc} bpm</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};