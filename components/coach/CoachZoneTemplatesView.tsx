// src/components/coach/CoachZoneTemplatesView.tsx

import React, { useState } from "react";

export interface ZoneItem {
  id: string;
  name: string;
  minVmaPercent: number | string;
  maxVmaPercent: number | string;
  color: string;
}

export interface ZoneTemplate {
  id: string;
  name: string;
  description?: string;
  zones: {
    id: string;
    name: string;
    minVmaPercent: number;
    maxVmaPercent: number;
    color: string;
  }[];
}

interface CoachZoneTemplatesViewProps {
  templates: ZoneTemplate[];
  onSaveTemplate: (template: ZoneTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onBack: () => void;
}

const DEFAULT_ZONE_COLORS = [
  "#10B981", // Zone 1 - Vert
  "#3B82F6", // Zone 2 - Bleu
  "#F59E0B", // Zone 3 - Jaune/Orange
  "#F97316", // Zone 4 - Orange foncé
  "#EF4444", // Zone 5 - Rouge
  "#A855F7", // Zone 6 - Violet
  "#6366F1", // Zone 7 - Indigo
];

export const CoachZoneTemplatesView: React.FC<CoachZoneTemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDesc, setTemplateDesc] = useState<string>("");
  const [zones, setZones] = useState<ZoneItem[]>([]);

  // Ouvrir le formulaire pour créer un nouveau modèle
  const handleStartCreate = () => {
    setCurrentId(`ztemp_${Date.now()}`);
    setTemplateName("");
    setTemplateDesc("");
    setZones([
      { id: "z_1", name: "Z1 - Récupération", minVmaPercent: 50, maxVmaPercent: 70, color: "#10B981" },
      { id: "z_2", name: "Z2 - Endurance Fondamentale", minVmaPercent: 70, maxVmaPercent: 80, color: "#3B82F6" },
      { id: "z_3", name: "Z3 - Seuil / Tempo", minVmaPercent: 80, maxVmaPercent: 90, color: "#F59E0B" },
      { id: "z_4", name: "Z4 - VMA Courte / Seuil Anaérobie", minVmaPercent: 90, maxVmaPercent: 100, color: "#F97316" },
      { id: "z_5", name: "Z5 - Surcharge / Max", minVmaPercent: 100, maxVmaPercent: 120, color: "#EF4444" },
    ]);
    setIsEditing(true);
  };

  // Ouvrir pour éditer un modèle existant
  const handleStartEdit = (template: ZoneTemplate) => {
    setCurrentId(template.id);
    setTemplateName(template.name);
    setTemplateDesc(template.description || "");
    setZones(
      template.zones.map((z) => ({
        ...z,
        minVmaPercent: z.minVmaPercent,
        maxVmaPercent: z.maxVmaPercent,
      }))
    );
    setIsEditing(true);
  };

  // Ajouter une zone dynamiquement
  const handleAddZone = () => {
    const nextIndex = zones.length + 1;
    const lastZone = zones[zones.length - 1];
    const lastMax = lastZone ? parseFloat(String(lastZone.maxVmaPercent)) || 100 : 100;
    const newColor = DEFAULT_ZONE_COLORS[zones.length % DEFAULT_ZONE_COLORS.length];

    const newZone: ZoneItem = {
      id: `z_${Date.now()}`,
      name: `Z${nextIndex} - Nouvelle zone`,
      minVmaPercent: lastMax,
      maxVmaPercent: lastMax + 10,
      color: newColor,
    };
    setZones([...zones, newZone]);
  };

  // Saisie fluide : on conserve la valeur texte brute pour autoriser la suppression totale
  const handleUpdateZone = (id: string, field: keyof ZoneItem, value: any) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [field]: value } : z))
    );
  };

  // Supprimer une zone
  const handleDeleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  // Enregistrement avec conversion propre en nombre
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert("Veuillez donner un nom à votre modèle de zones.");
      return;
    }
    if (zones.length === 0) {
      alert("Votre modèle doit contenir au moins une zone d'allure.");
      return;
    }

    const cleanedZones = zones.map((z) => ({
      id: z.id,
      name: z.name,
      minVmaPercent: parseFloat(String(z.minVmaPercent)) || 0,
      maxVmaPercent: parseFloat(String(z.maxVmaPercent)) || 0,
      color: z.color,
    }));

    const payload: ZoneTemplate = {
      id: currentId || `ztemp_${Date.now()}`,
      name: templateName.trim(),
      description: templateDesc.trim(),
      zones: cleanedZones,
    };

    onSaveTemplate(payload);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans w-full">
      {/* HEADER DE LA VUE */}
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
            <span>Bibliothèque</span>
          </button>
          <div>
            <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-widest block">
              Espace Coach • Configuration
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-stone-100 tracking-tight mt-0.5">
              Modèles de Zones d'Allures
            </h2>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Créer un modèle de zones</span>
            <span className="text-sm">＋</span>
          </button>
        )}
      </div>

      {/* FORMULAIRE DE CRÉATION / ÉDITION */}
      {isEditing ? (
        <form onSubmit={handleSubmitForm} className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-stone-800 pb-4">
            <h3 className="text-base font-black uppercase text-stone-100">
              {currentId ? "Modifier le modèle de zones" : "Nouveau modèle de zones (% VMA)"}
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold uppercase cursor-pointer"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1.5">
                Nom du modèle :
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Grille Standard 5 Zones, Profil U18..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1.5">
                Description (optionnelle) :
              </label>
              <input
                type="text"
                placeholder="Ex : Basé sur la méthode Daniel / Seiler..."
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>
          </div>

          {/* LISTE DES ZONES DYNAMIQUES */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-[#CF9A61]">
                Découpage des zones ({zones.length}) :
              </span>
              <button
                type="button"
                onClick={handleAddZone}
                className="text-[10px] font-black uppercase text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                ＋ Ajouter une zone
              </button>
            </div>

            <div className="space-y-2.5">
              {zones.map((zone, idx) => (
                <div key={zone.id} className="bg-stone-950 border border-stone-800/80 p-3.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-3 shadow-inner">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                      type="color"
                      value={zone.color}
                      onChange={(e) => handleUpdateZone(zone.id, "color", e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`Zone ${idx + 1}`}
                      value={zone.name}
                      onChange={(e) => handleUpdateZone(zone.id, "name", e.target.value)}
                      className="flex-1 md:w-56 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-bold focus:outline-none focus:border-[#CF9A61]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400 font-bold">Min :</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={zone.minVmaPercent}
                        onChange={(e) => handleUpdateZone(zone.id, "minVmaPercent", e.target.value)}
                        className="w-20 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 font-mono text-center focus:outline-none focus:border-[#CF9A61]"
                      />
                      <span className="text-xs text-stone-500">% VMA</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400 font-bold">Max :</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={zone.maxVmaPercent}
                        onChange={(e) => handleUpdateZone(zone.id, "maxVmaPercent", e.target.value)}
                        className="w-20 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 font-mono text-center focus:outline-none focus:border-[#CF9A61]"
                      />
                      <span className="text-xs text-stone-500">% VMA</span>
                    </div>

                    <button
                      type="button"
                      disabled={zones.length <= 1}
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-stone-500 hover:text-red-400 disabled:opacity-20 p-2 transition cursor-pointer ml-auto md:ml-0"
                      title="Supprimer cette zone"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 bg-stone-950 text-stone-300 border border-stone-800 rounded-xl text-xs font-bold uppercase hover:bg-stone-850 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#CF9A61] text-stone-950 rounded-xl text-xs font-black uppercase hover:bg-[#b88652] transition cursor-pointer shadow-md"
            >
              Enregistrer le modèle
            </button>
          </div>
        </form>
      ) : (
        /* LISTE DES MODÈLES EXISTANTS AVEC APERÇU NORMÉ & CLAIR */
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
                ⚡
              </div>
              <h3 className="text-sm font-black uppercase text-stone-100">Aucun modèle de zones créé</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Créez votre premier modèle pour définir vos propres pourcentages de VMA et structurer vos séances avec précision.
              </p>
              <button
                type="button"
                onClick={handleStartCreate}
                className="text-xs font-black text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] px-4 py-2 rounded-xl uppercase transition cursor-pointer shadow-md inline-block mt-2"
              >
                ＋ Créer mon premier modèle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-5 hover:border-stone-700 transition">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9.5px] font-black text-[#CF9A61] uppercase tracking-widest">
                          Modèle personnalisé ({tmpl.zones.length} zones)
                        </span>
                        <h3 className="text-base font-black uppercase text-stone-100 tracking-tight mt-0.5">
                          {tmpl.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tmpl)}
                          className="text-[10px] font-extrabold text-[#CF9A61] bg-[#CF9A61]/10 hover:bg-[#CF9A61]/20 border border-[#CF9A61]/30 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer le modèle "${tmpl.name}" ?`)) {
                              onDeleteTemplate(tmpl.id);
                            }
                          }}
                          className="text-stone-500 hover:text-red-400 text-xs px-2 py-1 transition cursor-pointer"
                          title="Supprimer le modèle"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {tmpl.description && (
                      <p className="text-xs text-stone-400">{tmpl.description}</p>
                    )}
                  </div>

                  {/* VISUALISATION DES ZONES AVEC BARRE CONTINU ET DÉTAILS NETS */}
                  <div className="space-y-3 pt-3 border-t border-stone-800/80">
                    <div className="w-full h-3 rounded-full bg-stone-950 p-0.5 flex gap-1 overflow-hidden border border-stone-800 shadow-inner">
                      {tmpl.zones.map((z, i) => {
                        const min = parseFloat(String(z.minVmaPercent)) || 0;
                        const max = parseFloat(String(z.maxVmaPercent)) || 0;
                        const flexVal = Math.max(1, max - min);
                        return (
                          <div
                            key={z.id || i}
                            className="h-full rounded-xs transition-all hover:brightness-125"
                            style={{
                              flex: flexVal,
                              backgroundColor: z.color,
                            }}
                            title={`${z.name}: ${min}% - ${max}% VMA`}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                      {tmpl.zones.map((z) => {
                        const min = parseFloat(String(z.minVmaPercent)) || 0;
                        const max = parseFloat(String(z.maxVmaPercent)) || 0;
                        return (
                          <div
                            key={z.id}
                            className="bg-stone-950 border border-stone-800/70 px-3 py-2 rounded-2xl flex items-center justify-between text-xs shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                                style={{ backgroundColor: z.color }}
                              />
                              <span className="font-bold text-stone-200 truncate">{z.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-xl">
                              <span className="text-[#CF9A61] font-bold">{min}%</span>
                              <span className="text-stone-500">➔</span>
                              <span className="text-[#CF9A61] font-bold">{max}%</span>
                              <span className="text-[10px] text-stone-400 ml-0.5">VMA</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};