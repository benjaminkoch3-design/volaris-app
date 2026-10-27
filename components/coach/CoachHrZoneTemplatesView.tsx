// components/coach/CoachHrZoneTemplatesView.tsx
'use client';

import React, { useState } from "react";

export interface HrZone {
  id: string;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
}

export interface HrZoneTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean; // ⭐ Modèle défini comme favori par le coach
  zones: HrZone[];
}

interface CoachHrZoneTemplatesViewProps {
  templates: HrZoneTemplate[];
  onSaveTemplate: (template: HrZoneTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onToggleDefaultTemplate?: (templateId: string) => void;
  onBack: () => void;
}

const DEFAULT_HR_ZONES: HrZone[] = [
  { id: 'z1', name: 'Z1 - Récupération active', minPercent: 50, maxPercent: 65, color: '#38bdf8' },
  { id: 'z2', name: 'Z2 - Endurance fondamentale', minPercent: 65, maxPercent: 75, color: '#4ade80' },
  { id: 'z3', name: 'Z3 - Tempo / Seuil doux', minPercent: 75, maxPercent: 85, color: '#facc15' },
  { id: 'z4', name: 'Z4 - Seuil anaérobie', minPercent: 85, maxPercent: 92, color: '#fb923c' },
  { id: 'z5', name: 'Z5 - VMA / Max', minPercent: 92, maxPercent: 100, color: '#f87171' },
];

export const CoachHrZoneTemplatesView: React.FC<CoachHrZoneTemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onToggleDefaultTemplate,
  onBack,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<HrZoneTemplate | null>(null);

  const handleStartCreate = () => {
    setEditingTemplate({
      id: `hr_tpl_${Date.now()}`,
      name: '',
      description: '',
      isDefault: templates.length === 0, // Par défaut le premier est favori si aucun n'existe
      zones: JSON.parse(JSON.stringify(DEFAULT_HR_ZONES)),
    });
  };

  const handleStartEdit = (template: HrZoneTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
  };

  const handleZoneChange = (index: number, field: keyof HrZone, value: any) => {
    if (!editingTemplate) return;
    const updatedZones = [...editingTemplate.zones];
    updatedZones[index] = { ...updatedZones[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, zones: updatedZones });
  };

  const handleAddZone = () => {
    if (!editingTemplate) return;
    const newZone: HrZone = {
      id: `z_${Date.now()}`,
      name: `Z${editingTemplate.zones.length + 1} - Nouvelle zone`,
      minPercent: 0,
      maxPercent: 100,
      color: '#CF9A61',
    };
    setEditingTemplate({ ...editingTemplate, zones: [...editingTemplate.zones, newZone] });
  };

  const handleDeleteZone = (index: number) => {
    if (!editingTemplate) return;
    const updatedZones = editingTemplate.zones.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, zones: updatedZones });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name.trim()) {
      alert("Veuillez donner un nom à votre modèle.");
      return;
    }

    // Conserver l'état isDefault existant si on modifie un modèle
    const existingTemplate = templates.find((t) => t.id === editingTemplate.id);
    const payload: HrZoneTemplate = {
      ...editingTemplate,
      isDefault: existingTemplate ? Boolean(existingTemplate.isDefault) : templates.length === 0,
    };

    onSaveTemplate(payload);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* En-tête plein écran */}
      <div className="flex items-center justify-between bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-stone-400 hover:text-stone-100 bg-stone-950 px-3 py-2 rounded-xl border border-stone-800 transition cursor-pointer"
          >
            ← Retour
          </button>
          <div>
            <h2 className="text-base font-black uppercase text-stone-100 tracking-wider">
              Modèles de Fréquence Cardiaque (% FCR)
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Gérez vos grilles de zones cardiaques personnalisées pour vos athlètes.
            </p>
          </div>
        </div>

        {!editingTemplate && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="text-xs font-black uppercase text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center gap-2"
          >
            <span>➕ Créer un modèle</span>
          </button>
        )}
      </div>

      {/* Formulaire d'édition / création */}
      {editingTemplate ? (
        <form onSubmit={handleSave} className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex justify-between items-center border-b border-stone-800 pb-4">
            <h3 className="text-sm font-black uppercase text-[#CF9A61]">
              {templates.some((t) => t.id === editingTemplate.id) ? "Modifier le modèle" : "Nouveau modèle de FC"}
            </h3>
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              ✕ Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Nom du modèle *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Grille Standard FCR, Modèle Côte..."
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Description (optionnelle)
              </label>
              <input
                type="text"
                placeholder="Ex: Basé sur la réserve de fréquence cardiaque"
                value={editingTemplate.description || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase text-stone-300">Configuration des zones (% FCR)</h4>
              <button
                type="button"
                onClick={handleAddZone}
                className="text-[10px] font-bold uppercase text-[#CF9A61] bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl hover:border-stone-700 transition cursor-pointer"
              >
                + Ajouter une zone
              </button>
            </div>

            <div className="space-y-2">
              {editingTemplate.zones.map((zone, idx) => (
                <div key={zone.id || idx} className="bg-stone-950 border border-stone-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                  {/* Sélecteur de couleur */}
                  <input
                    type="color"
                    value={zone.color || '#CF9A61'}
                    onChange={(e) => handleZoneChange(idx, "color", e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer shrink-0"
                    title="Choisir la couleur de la zone"
                  />
                  <input
                    type="text"
                    value={zone.name}
                    onChange={(e) => handleZoneChange(idx, "name", e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={zone.minPercent}
                        onChange={(e) => handleZoneChange(idx, "minPercent", Number(e.target.value))}
                        className="w-12 bg-transparent text-center text-xs font-bold text-stone-100 focus:outline-none"
                      />
                      <span className="text-xs text-stone-400">% -</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={zone.maxPercent}
                        onChange={(e) => handleZoneChange(idx, "maxPercent", Number(e.target.value))}
                        className="w-12 bg-transparent text-center text-xs font-bold text-stone-100 focus:outline-none"
                      />
                      <span className="text-xs text-stone-400">%</span>
                    </div>

                    {editingTemplate.zones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(idx)}
                        className="p-2 text-red-400 hover:text-red-300 bg-stone-900 border border-stone-800 rounded-xl text-xs cursor-pointer"
                        title="Supprimer cette zone"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-400 bg-stone-950 border border-stone-800 hover:text-stone-200 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] cursor-pointer shadow-md"
            >
              Enregistrer le modèle
            </button>
          </div>
        </form>
      ) : (
        /* Liste des modèles existants avec bouton Favori (⭐) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-3">
              <p className="text-xs text-stone-400">Aucun modèle de fréquence cardiaque créé pour le moment.</p>
              <button
                type="button"
                onClick={handleStartCreate}
                className="text-xs font-black uppercase text-stone-950 bg-[#CF9A61] px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Créer mon premier modèle
              </button>
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`bg-stone-900 border rounded-3xl p-5 space-y-4 shadow-md flex flex-col justify-between transition ${
                  tpl.isDefault ? "border-[#CF9A61] shadow-[#CF9A61]/10" : "border-stone-800 hover:border-stone-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-black text-[#CF9A61] uppercase tracking-widest">
                          Modèle FC ({tpl.zones.length} zones)
                        </span>
                        {tpl.isDefault && (
                          <span className="text-[9px] font-extrabold bg-[#CF9A61]/20 text-[#CF9A61] px-2 py-0.5 rounded-full border border-[#CF9A61]/40">
                            ⭐ Par défaut
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black uppercase text-stone-100 mt-0.5">{tpl.name}</h3>
                    </div>

                    {/* ACTIONS : FAVORI ⭐, MODIFIER, SUPPRIMER */}
                    <div className="flex items-center gap-1.5">
                      {onToggleDefaultTemplate && (
                        <button
                          type="button"
                          onClick={() => onToggleDefaultTemplate(tpl.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer border flex items-center gap-1 ${
                            tpl.isDefault
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                              : "bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200"
                          }`}
                          title={tpl.isDefault ? "Modèle par défaut actif" : "Définir comme modèle par défaut"}
                        >
                          <span>{tpl.isDefault ? "⭐ Favori" : "☆ Favori"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(tpl)}
                        className="px-3 py-1.5 text-stone-300 hover:text-stone-100 bg-stone-950 border border-stone-800 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1"
                        title="Modifier"
                      >
                        ✏️ Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer le modèle "${tpl.name}" ?`)) {
                            onDeleteTemplate(tpl.id);
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-stone-950 border border-stone-800 rounded-xl text-xs cursor-pointer"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {tpl.description && <p className="text-xs text-stone-400">{tpl.description}</p>}
                </div>

                <div className="space-y-1.5 bg-stone-950 p-3 rounded-2xl border border-stone-800/60">
                  {tpl.zones.map((z) => (
                    <div key={z.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color || '#CF9A61' }} />
                        <span className="text-stone-300 font-medium truncate max-w-[180px]">{z.name}</span>
                      </div>
                      <span className="font-mono font-bold text-stone-100">{z.minPercent}% - {z.maxPercent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};