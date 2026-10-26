// components/coach/CoachAthleteProfileView.tsx
'use client';

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AthleteProfile } from "../../types";

interface CoachAthleteProfileViewProps {
  athlete: AthleteProfile & { [key: string]: any };
  coachId: string;
  onBack: () => void;
}

export const CoachAthleteProfileView: React.FC<CoachAthleteProfileViewProps> = ({
  athlete,
  coachId,
  onBack,
}) => {
  // Fonction utilitaire pour nettoyer les chaînes avec unités (ex: "180 bpm" -> "180", "15.5 km/h" -> "15.5")
  const cleanVal = (val: any) => {
    if (!val) return "";
    return String(val).replace(/[^0-9.,]/g, "").replace(",", ".");
  };

  // Correction 1 & 3 & 4 : Initialisation propre des états avec nettoyage des unités
  const [name, setName] = useState(athlete.name || athlete.full_name || "");
  const [vma, setVma] = useState(cleanVal(athlete.vma));
  const [fcMax, setFcMax] = useState(cleanVal(athlete.fcMax || athlete.fc_max));
  const [fcRest, setFcRest] = useState(cleanVal(athlete.fcRest || athlete.fc_rest));
  const [height, setHeight] = useState(cleanVal(athlete.height));
  const [weight, setWeight] = useState(cleanVal(athlete.weight));
  const [saving, setSaving] = useState(false);

  // Correction 5 : Sauvegarde fiable vers Supabase avec les bonnes colonnes
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        full_name: name,
        vma: vma ? parseFloat(vma) : null,
        fc_max: fcMax ? parseFloat(fcMax) : null,
        fc_rest: fcRest ? parseFloat(fcRest) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", athlete.id);

      if (error) {
        throw error;
      }

      alert("Profil de l'athlète mis à jour avec succès !");
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour :", err.message);
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête / Retour */}
      <div className="flex items-center justify-between bg-stone-900 p-4 rounded-2xl border border-stone-800 shadow-md">
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase text-stone-400 hover:text-stone-100 transition flex items-center gap-1.5 cursor-pointer"
        >
          ← Retour à la liste
        </button>
        <h2 className="text-sm font-black text-stone-100 uppercase tracking-wider">
          Fiche Athlète : <span className="text-[#CF9A61]">{name || "Athlète"}</span>
        </h2>
      </div>

      {/* Formulaire de modification des données physiologiques */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Nom de l'athlète
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          {/* VMA */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              VMA (km/h)
            </label>
            <input
              type="number"
              step="0.1"
              value={vma}
              onChange={(e) => setVma(e.target.value)}
              placeholder="ex: 15.5"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          {/* Correction 2 : FC Max */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Fréquence Cardiaque Maximale (bpm)
            </label>
            <input
              type="number"
              value={fcMax}
              onChange={(e) => setFcMax(e.target.value)}
              placeholder="ex: 190"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          {/* Correction 3 : FC Repos / Min */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Fréquence Cardiaque de Repos / Min (bpm)
            </label>
            <input
              type="number"
              value={fcRest}
              onChange={(e) => setFcRest(e.target.value)}
              placeholder="ex: 50"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          {/* Taille */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Taille (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="ex: 175"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>

          {/* Poids */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Poids (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="ex: 70"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
};