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
  zones: HrZone[];
}

interface CoachHrZoneTemplatesViewProps {
  templates: HrZoneTemplate[];
  onSaveTemplate: (template: HrZoneTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
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
  onBack,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<HrZoneTemplate | null>(null);

  const handleStartCreate = () => {
    setEditingTemplate({
      id: `hr_tpl_${Date.now()}`,
      name: '',
      description: '',
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name.trim()) {
      alert("Veuillez donner un nom à votre modèle.");
      return;
    }
    onSaveTemplate(editingTemplate);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex items-center justify-between bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <button
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
            <h4 className="text-xs font-black uppercase text-stone-300">Configuration des zones (% FCR)</h4>
            <div className="space-y-2">
              {editingTemplate.zones.map((zone, idx) => (
                <div key={zone.id || idx} className="bg-stone-950 border border-stone-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
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
        /* Liste des modèles existants */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-3">
              <p className="text-xs text-stone-400">Aucun modèle de fréquence cardiaque créé pour le moment.</p>
              <button
                onClick={handleStartCreate}
                className="text-xs font-black uppercase text-stone-950 bg-[#CF9A61] px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Créer mon premier modèle
              </button>
            </div>
          ) : (
            templates.map((tpl) => (
              <div key={tpl.id} className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-md flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-black uppercase text-stone-100">{tpl.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(tpl)}
                        className="p-1.5 text-stone-400 hover:text-stone-100 bg-stone-950 border border-stone-800 rounded-lg text-xs cursor-pointer"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer le modèle "${tpl.name}" ?`)) {
                            onDeleteTemplate(tpl.id);
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-stone-950 border border-stone-800 rounded-lg text-xs cursor-pointer"
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
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
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