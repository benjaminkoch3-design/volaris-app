// components/coach/CoachHrZoneTemplatesView.tsx
'use client';

import React, { useState } from "react";

export interface HrZone {
  zoneNumber: number;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
}

export interface HrZoneTemplate {
  id: string;
  name: string;
  description?: string;
  zones: HrZone[];
}

interface Props {
  templates: HrZoneTemplate[];
  onSaveTemplate: (template: HrZoneTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onBack: () => void;
  sampleFcRest?: number;
  sampleFcMax?: number;
}

export function CoachHrZoneTemplatesView({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onBack,
  sampleFcRest = 55,
  sampleFcMax = 185,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const [zones, setZones] = useState<HrZone[]>([
    { zoneNumber: 1, name: "Récupération active", minPercent: 50, maxPercent: 60, color: "#3b82f6" },
    { zoneNumber: 2, name: "Endurance fondamentale", minPercent: 60, maxPercent: 70, color: "#10b981" },
    { zoneNumber: 3, name: "Aérobie / Tempo", minPercent: 70, maxPercent: 80, color: "#f59e0b" },
    { zoneNumber: 4, name: "Seuil anaérobie", minPercent: 80, maxPercent: 90, color: "#ef4444" },
    { zoneNumber: 5, name: "Capacité / Max", minPercent: 90, maxPercent: 100, color: "#8b5cf6" },
  ]);

  const handleEdit = (tpl: HrZoneTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setDescription(tpl.description || "");
    setZones(tpl.zones);
  };

  const handleNew = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setZones([
      { zoneNumber: 1, name: "Récupération active", minPercent: 50, maxPercent: 60, color: "#3b82f6" },
      { zoneNumber: 2, name: "Endurance fondamentale", minPercent: 60, maxPercent: 70, color: "#10b981" },
      { zoneNumber: 3, name: "Aérobie / Tempo", minPercent: 70, maxPercent: 80, color: "#f59e0b" },
      { zoneNumber: 4, name: "Seuil anaérobie", minPercent: 80, maxPercent: 90, color: "#ef4444" },
      { zoneNumber: 5, name: "Capacité / Max", minPercent: 90, maxPercent: 100, color: "#8b5cf6" },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const newTemplate: HrZoneTemplate = {
      id: editingId || `hr_tpl_${Date.now()}`,
      name,
      description,
      zones,
    };
    onSaveTemplate(newTemplate);
    handleNew();
  };

  return (
    <div className="space-y-6 animate-fadeIn text-stone-100">
      {/* En-tête */}
      <div className="flex items-center justify-between bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-base font-black uppercase text-[#CF9A61]">Modèles de Fréquence Cardiaque (% FCR - Karvonen)</h2>
          <p className="text-xs text-stone-400 mt-0.5">Gérez vos modèles d'intensités basés sur la Fréquence Cardiaque de Réserve.</p>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-black uppercase bg-stone-950 text-stone-300 px-3 py-2 rounded-xl border border-stone-800 hover:border-stone-700 transition cursor-pointer"
        >
          ← Retour
        </button>
      </div>

      {/* Formulaire de création / édition */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#CF9A61]">
          {editingId ? "Modifier le modèle FCR" : "Créer un nouveau modèle FCR"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Nom du modèle</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Zones FCR Standard"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Description (optionnelle)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Formule de Karvonen classique"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
            />
          </div>
        </div>

        {/* Encadré d'aperçu de la formule de Karvonen */}
        <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] text-stone-400">
          <span className="font-bold text-stone-200">Aperçu Karvonen (Formule) :</span> Basé sur une FC<sub>rest</sub> de {sampleFcRest} bpm et une FC<sub>max</sub> de {sampleFcMax} bpm (FCR = {sampleFcMax - sampleFcRest} bpm).
        </div>

        {/* Liste des zones et pourcentages */}
        <div className="space-y-2 pt-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Découpage des zones (% de FCR)</label>
          {zones.map((zone, idx) => {
            // Application de la formule de Karvonen pour l'aperçu en bpm
            const fcr = sampleFcMax - sampleFcRest;
            const minBpm = Math.round((fcr * (zone.minPercent / 100)) + sampleFcRest);
            const maxBpm = Math.round((fcr * (zone.maxPercent / 100)) + sampleFcRest);

            return (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-stone-950 shrink-0" style={{ backgroundColor: zone.color }}>
                    {zone.zoneNumber}
                  </span>
                  <input
                    type="text"
                    value={zone.name}
                    onChange={(e) => {
                      const updated = [...zones];
                      updated[idx].name = e.target.value;
                      setZones(updated);
                    }}
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-100"
                  />
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="number"
                      value={zone.minPercent}
                      onChange={(e) => {
                        const updated = [...zones];
                        updated[idx].minPercent = Number(e.target.value);
                        setZones(updated);
                      }}
                      className="w-14 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-center font-mono text-xs"
                    />
                    <span className="text-stone-500">%</span>
                    <span className="text-stone-500">-</span>
                    <input
                      type="number"
                      value={zone.maxPercent}
                      onChange={(e) => {
                        const updated = [...zones];
                        updated[idx].maxPercent = Number(e.target.value);
                        setZones(updated);
                      }}
                      className="w-14 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-center font-mono text-xs"
                    />
                    <span className="text-stone-500">%</span>
                  </div>
                  
                  {/* Résultat Karvonen en direct */}
                  <span className="text-[11px] font-mono text-[#CF9A61] bg-stone-900 px-2 py-1 rounded-lg border border-stone-800 shrink-0">
                    ≈ {minBpm} - {maxBpm} bpm
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          {editingId && (
            <button
              onClick={handleNew}
              className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
          >
            {editingId ? "Mettre à jour le modèle" : "Enregistrer le modèle FCR"}
          </button>
        </div>
      </div>

      {/* Liste des modèles enregistrés */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400">Modèles FCR enregistrés</h3>
        {templates.length === 0 ? (
          <p className="text-xs text-stone-500 italic bg-stone-900/40 p-4 rounded-2xl border border-stone-800/50 text-center">Aucun modèle de fréquence cardiaque de réserve créé pour le moment.</p>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.id} className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-black text-stone-100">{tpl.name}</h4>
                {tpl.description && <p className="text-xs text-stone-400">{tpl.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {tpl.zones.map((z, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }}></span>
                      Z{z.zoneNumber}: {z.minPercent}-{z.maxPercent}%
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="text-xs text-stone-300 hover:text-stone-100 bg-stone-950 p-2.5 rounded-xl border border-stone-800 transition cursor-pointer"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDeleteTemplate(tpl.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-stone-950 p-2.5 rounded-xl border border-stone-800 transition cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}