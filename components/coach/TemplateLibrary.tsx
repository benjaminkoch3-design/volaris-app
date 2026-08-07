// src/components/coach/TemplateLibrary.tsx

import React from "react";

interface TemplateLibraryProps {
  onDuplicateTemplate?: (templateName: string) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onDuplicateTemplate,
}) => {
  const templates = [
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

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* HEADER DE LA BIBLIOTHÈQUE EN JAUNE OLIVE (#CDCF61) */}
        <div className="flex justify-between items-center border-b border-stone-800/80 pb-3">
          <div>
            <span className="text-[10px] font-extrabold text-[#CDCF61] uppercase tracking-widest block">
              📚 Modèles d'Entraînement
            </span>
            <h2 className="text-base font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Bibliothèque du Coach
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {templates.map((tpl, i) => (
            <div
              key={i}
              className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2"
            >
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-stone-100 uppercase">
                  {tpl.name}
                </h4>
                {/* BADGE DURÉE EN BLEU MÉTAL (#4D80B3) */}
                <span className="text-[9.5px] font-black text-[#4D80B3] bg-[#4D80B3]/10 px-2 py-0.5 rounded border border-[#4D80B3]/30">
                  {tpl.weeks} Semaines
                </span>
              </div>
              <p className="text-[10px] text-stone-400">{tpl.target}</p>
              
              {/* BOUTON D'ACTION DUPLIQUER EN VERT ÉMERAUDE (#4DB380) */}
              <button
                type="button"
                onClick={() => handleDuplicate(tpl.name)}
                className="w-full py-2 bg-stone-900 hover:bg-[#4DB380]/10 hover:border-[#4DB380]/40 border border-stone-800 text-[#4DB380] hover:text-[#4DB380] font-bold text-[10px] uppercase rounded-xl transition cursor-pointer"
              >
                Dupliquer vers un athlète
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};