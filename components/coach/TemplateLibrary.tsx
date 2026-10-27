// src/components/coach/TemplateLibrary.tsx

import React, { useState } from "react";
import { ZoneTemplate } from "../../types";

interface TemplateLibraryProps {
  onDuplicateTemplate?: (templateName: string) => void;
  coachVmaTemplates?: ZoneTemplate[];
  coachHrTemplates?: ZoneTemplate[];
  onToggleDefaultTemplate?: (templateId: string, type: "vma" | "hr") => void;
  onAddTemplate?: (template: ZoneTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onDuplicateTemplate,
  coachVmaTemplates = [],
  coachHrTemplates = [],
  onToggleDefaultTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<"plans" | "zones">("zones");
  const [zoneSubTab, setZoneSubTab] = useState<"vma" | "hr">("vma");

  const plans = [
    {
      name: "Plan 10km Sub 40 min",
      weeks: 8,
      target: "Athlètes VMA > 16.5 km/h",
    },
    {
      name: "Préparation Semi-Marathon Progressif",
      weeks: 10,
      target: "Niveau Intermédiaire (3 à 4 séances/semaine)",
    },
    {
      name: "Cycle Spécifique Seuil / VO2max",
      weeks: 4,
      target: "Développement Métabolique & Puissance Aérobie",
    },
  ];

  const handleDuplicate = (name: string) => {
    if (onDuplicateTemplate) {
      onDuplicateTemplate(name);
    } else {
      alert(`Le modèle "${name}" est prêt à être dupliqué et assigné.`);
    }
  };

  const currentTemplates = zoneSubTab === "vma" ? coachVmaTemplates : coachHrTemplates;

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4">
        
        {/* HEADER DE LA BIBLIOTHÈQUE */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-800/80 pb-3 gap-3">
          <div>
            <span className="text-[10px] font-extrabold text-[#CDCF61] uppercase tracking-widest block">
              📚 Bibliothèque du Coach
            </span>
            <h2 className="text-base font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Modèles & Références d'Entraînement
            </h2>
          </div>

          {/* ONGLETS PRINCIPAUX */}
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab("zones")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                activeTab === "zones"
                  ? "bg-[#CDCF61] text-stone-950 shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Grilles & Zones (VMA / FC) ⭐
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("plans")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                activeTab === "plans"
                  ? "bg-[#CDCF61] text-stone-950 shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Plans d'entraînement
            </button>
          </div>
        </div>

        {/* CONTENU : GRILLES DE ZONES VMA / FC */}
        {activeTab === "zones" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setZoneSubTab("vma")}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border ${
                    zoneSubTab === "vma"
                      ? "bg-[#CF9A61]/20 border-[#CF9A61]/50 text-[#CF9A61]"
                      : "bg-stone-950 border-stone-800 text-stone-400"
                  }`}
                >
                  Modèles VMA ({coachVmaTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setZoneSubTab("hr")}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border ${
                    zoneSubTab === "hr"
                      ? "bg-[#4D80B3]/20 border-[#4D80B3]/50 text-[#4D80B3]"
                      : "bg-stone-950 border-stone-800 text-stone-400"
                  }`}
                >
                  Modèles Fréquence Cardiaque ({coachHrTemplates.length})
                </button>
              </div>

              <span className="text-[9px] text-stone-500 italic">
                Définissez un favori (⭐) pour l'utiliser par défaut dans vos séances.
              </span>
            </div>

            <div className="space-y-3">
              {currentTemplates.length === 0 ? (
                <div className="p-6 bg-stone-950 rounded-2xl border border-stone-800 text-center space-y-2">
                  <p className="text-xs text-stone-400 font-bold">
                    Aucun modèle de {zoneSubTab === "vma" ? "VMA" : "Fréquence Cardiaque"} enregistré.
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Rendez-vous dans votre profil pour créer et configurer vos grilles de référence.
                  </p>
                </div>
              ) : (
                currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 bg-stone-950 rounded-2xl border transition space-y-3 ${
                      template.isDefault
                        ? "border-[#CDCF61]/60 shadow-lg shadow-[#CDCF61]/5"
                        : "border-stone-800"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase text-stone-100">
                          {template.name}
                        </h4>
                        {template.isDefault && (
                          <span className="text-[9px] font-extrabold bg-[#CDCF61]/20 text-[#CDCF61] px-2 py-0.5 rounded-full border border-[#CDCF61]/40">
                            ⭐ Modèle par défaut
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleDefaultTemplate) {
                            onToggleDefaultTemplate(template.id, template.type);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer border ${
                          template.isDefault
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
                        }`}
                        title={template.isDefault ? "Modèle par défaut actif" : "Définir comme modèle par défaut"}
                      >
                        <span>{template.isDefault ? "⭐ Favori" : "☆ Définir favori"}</span>
                      </button>
                    </div>

                    {/* LISTE DES ZONES DU MODÈLE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {template.zones?.map((zone, idx) => (
                        <div
                          key={zone.id || idx}
                          className="bg-stone-900/60 border border-stone-800/80 p-2 rounded-xl flex justify-between items-center text-xs"
                        >
                          <span className="font-bold text-stone-300 text-[11px]">
                            {zone.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#CDCF61] font-semibold">
                            {zone.paceMin && zone.paceMax
                              ? `${zone.paceMin} - ${zone.paceMax}`
                              : zone.minBpm && zone.maxBpm
                              ? `${zone.minBpm} - ${zone.maxBpm} bpm`
                              : zone.minPercent && zone.maxPercent
                              ? `${zone.minPercent}% - ${zone.maxPercent}%`
                              : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTENU : PLANS D'ENTRAÎNEMENT */}
        {activeTab === "plans" && (
          <div className="space-y-3">
            {plans.map((tpl, i) => (
              <div
                key={i}
                className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-stone-100 uppercase">
                    {tpl.name}
                  </h4>
                  <span className="text-[9.5px] font-black text-[#4D80B3] bg-[#4D80B3]/10 px-2 py-0.5 rounded border border-[#4D80B3]/30">
                    {tpl.weeks} Semaines
                  </span>
                </div>
                <p className="text-[10px] text-stone-400">{tpl.target}</p>
                
                <button
                  type="button"
                  onClick={() => handleDuplicate(tpl.name)}
                  className="w-full py-2 bg-stone-900 hover:bg-[#4DB380]/10 hover:border-[#4DB380]/40 border border-stone-800 text-[#4DB380] font-bold text-[10px] uppercase rounded-xl transition cursor-pointer"
                >
                  Dupliquer vers un athlète
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};