// src/components/profile/ShoesPageView.tsx

import React, { useState } from "react";
import { Shoe } from "../../types";

interface ShoesPageViewProps {
  shoes: Shoe[];
  onBack: () => void;
  onAddShoe: (shoe: Shoe) => void;
  onDeleteShoe: (id: string) => void;
  onToggleActiveShoe: (id: string) => void;
  isReadOnly?: boolean;
}

// Fonction calculant la couleur du texte selon le pourcentage d'usure (Vert -> Jaune -> Rouge)
const getWearColor = (pct: number): string => {
  if (pct < 50) return "#10B981"; // Vert
  if (pct < 75) return "#F59E0B"; // Jaune / Ambre
  if (pct < 90) return "#F97316"; // Orange
  return "#EF4444"; // Rouge
};

export const ShoesPageView: React.FC<ShoesPageViewProps> = ({
  shoes,
  onBack,
  onAddShoe,
  onDeleteShoe,
  onToggleActiveShoe,
  isReadOnly = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCloset, setShowCloset] = useState(false);

  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [initialKm, setInitialKm] = useState("");
  const [maxKm, setMaxKm] = useState("800");

  const activeShoes = shoes.filter((s) => s.isActive);
  const closetShoes = shoes.filter((s) => !s.isActive);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !name.trim() || !brand.trim()) return;

    const shoeToAdd: Shoe = {
      id: Date.now().toString(),
      name: name.trim(),
      brand: brand.trim(),
      currentKm: parseFloat(initialKm) || 0,
      maxKm: parseFloat(maxKm) || 800,
      isActive: true,
    };

    onAddShoe(shoeToAdd);
    setBrand("");
    setName("");
    setInitialKm("");
    setMaxKm("800");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
      {/* HEADER DE NAVIGATION */}
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
            <span>Retour Profil</span>
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-[#4DB380] tracking-widest block">
              Équipement & Matériel
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Mes Chaussures de Course
            </h2>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-[#4DB380] hover:bg-[#3ea06f] text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>{showAddForm ? "Fermer" : "Ajouter une paire"}</span>
            <span className="text-sm">{showAddForm ? "✕" : "＋"}</span>
          </button>
        )}
      </div>

      {/* FORMULAIRE D'AJOUT DE PAIRE */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-stone-900 border border-[#4DB380]/40 rounded-3xl p-5 space-y-4 shadow-xl animate-fadeIn">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#4DB380]">
              Nouvelle Paire de Chaussures
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Marque *
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Hoka, Nike, Asics, Brooks..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#4DB380]"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Modèle *
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Clifton 9, Pegasus 40, Speedcross..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#4DB380]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Kilomètres initiaux déjà parcourus
              </label>
              <input
                type="number"
                placeholder="0"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#4DB380]"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                Kilomètres maximum conseillés
              </label>
              <input
                type="number"
                placeholder="800"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-[#4DB380]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-stone-800 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#4DB380] hover:bg-[#3ea06f] text-stone-950 font-black text-xs uppercase rounded-xl shadow-md transition cursor-pointer"
            >
              Enregistrer la paire
            </button>
          </div>
        </form>
      )}

      {/* SECTION : PAIRES ACTIVES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4DB380]" />
          <h3 className="text-sm font-black uppercase text-stone-200 tracking-wider">
            Paires Actives ({activeShoes.length})
          </h3>
        </div>

        {activeShoes.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 bg-[#4DB380]/10 border border-[#4DB380]/30 rounded-2xl flex items-center justify-center mx-auto text-[#4DB380] text-xl">
              👟
            </div>
            <p className="text-xs text-stone-400">
              Aucune paire de chaussures active. Ajoutez votre première paire pour suivre son usure.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeShoes.map((shoe) => {
              const pctUsed = Math.min(
                100,
                Math.round((shoe.currentKm / (shoe.maxKm || 800)) * 100)
              );
              const colorText = getWearColor(pctUsed);

              return (
                <div
                  key={shoe.id}
                  className="p-5 rounded-3xl border border-stone-800 bg-stone-900/80 shadow-lg space-y-4 hover:border-stone-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-stone-100 uppercase tracking-tight">
                            {shoe.brand} {shoe.name}
                          </h4>
                          <span className="text-[8.5px] font-black uppercase bg-[#4DB380]/15 text-[#4DB380] border border-[#4DB380]/40 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <span className="text-xs text-stone-400 font-mono mt-1 block">
                          <strong className="text-stone-200">{shoe.currentKm.toFixed(1)} km</strong> parcourus sur {shoe.maxKm} km
                        </span>
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onToggleActiveShoe(shoe.id)}
                          className="text-[10px] font-bold text-stone-400 hover:text-amber-400 bg-stone-950 border border-stone-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                          title="Ranger dans le placard"
                        >
                          Ranger au placard
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BARRE D'USURE AVEC DÉGRADÉ VERT -> JAUNE -> ROUGE */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5">
                      <div
                        style={{ width: `${pctUsed}%` }}
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-stone-500">0 km</span>
                      <span className="font-extrabold" style={{ color: colorText }}>
                        Usure : {pctUsed} %
                      </span>
                      <span className="text-stone-500">{shoe.maxKm} km</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION : LE PLACARD (PAIRES ARCHIVÉES) */}
      {closetShoes.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-600" />
              <h3 className="text-sm font-black uppercase text-stone-300 tracking-wider">
                Le Placard ({closetShoes.length} paire{closetShoes.length > 1 ? "s" : ""})
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowCloset(!showCloset)}
              className="text-xs text-stone-400 hover:text-stone-200 font-bold bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              {showCloset ? "Masquer ▲" : "Afficher ▼"}
            </button>
          </div>

          {showCloset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-fadeIn">
              {closetShoes.map((shoe) => {
                const pctUsed = Math.min(
                  100,
                  Math.round((shoe.currentKm / (shoe.maxKm || 800)) * 100)
                );

                return (
                  <div
                    key={shoe.id}
                    className="p-4 rounded-3xl border border-stone-800/80 bg-stone-950/60 shadow-md flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-300 text-sm">
                        {shoe.brand} {shoe.name}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                        {shoe.currentKm.toFixed(0)} / {shoe.maxKm} km ({pctUsed} % usée)
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleActiveShoe(shoe.id)}
                          className="text-[10px] font-bold text-[#4DB380] hover:underline bg-[#4DB380]/10 border border-[#4DB380]/30 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          Réactiver
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer définitivement la paire "${shoe.brand} ${shoe.name}" ?`)) {
                              onDeleteShoe(shoe.id);
                            }
                          }}
                          className="text-stone-500 hover:text-red-400 text-xs px-2 py-1 transition cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};