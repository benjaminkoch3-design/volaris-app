// src/components/workout/RpeSelector.tsx

import React from "react";

interface RpeSelectorProps {
  value: number | null;
  onChange: (rpe: number) => void;
}

const RPE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "1 - Très très facile", color: "bg-sky-500/20 text-sky-400 border-sky-500/40" },
  2: { label: "2 - Facile / Récupération", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  3: { label: "3 - Modéré", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  4: { label: "4 - Confortable", color: "bg-lime-500/20 text-lime-400 border-lime-500/40" },
  5: { label: "5 - Rythmé", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  6: { label: "6 - Exigeant", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  7: { label: "7 - Difficile (Seuil)", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  8: { label: "8 - Très difficile", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  9: { label: "9 - Extrêmement dur", color: "bg-red-500/20 text-red-400 border-red-500/40" },
  10: { label: "10 - Effort Maximal", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
};

export const RpeSelector: React.FC<RpeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] uppercase font-bold text-stone-400">
          RPE Réel Ressenti <span className="text-amber-400">* (Obligatoire)</span>
        </label>
        {value && (
          <span className="text-xs font-bold text-amber-400">
            {RPE_LABELS[value]?.label}
          </span>
        )}
      </div>

      {/* GRILLE DE BOUTONS 1 À 10 */}
      <div className="grid grid-cols-10 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`py-2 rounded-lg text-xs font-black transition cursor-pointer border ${
                isSelected
                  ? "bg-amber-500 text-stone-950 border-amber-400 shadow-lg scale-105"
                  : "bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-500/50"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};