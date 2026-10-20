// src/components/profile/ArchivedPlansPageView.tsx
import React, { useState } from "react";
import { Plan } from "../../types";
import { safeFormatDateFr } from "../../utils/calculations";

interface ArchivedPlansPageViewProps {
  archivedPlans: Plan[];
  onBack: () => void;
  onActivatePlan?: (plan: Plan) => void;
  onDeletePlan?: (planId: string) => void;
}

export const ArchivedPlansPageView: React.FC<ArchivedPlansPageViewProps> = ({
  archivedPlans,
  onBack,
  onActivatePlan,
  onDeletePlan,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handleActivate = (plan: Plan) => {
    if (onActivatePlan) {
      onActivatePlan(plan);
      setSelectedPlan(null);
      onBack();
    }
  };

  const handleDelete = (planId: string, planName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le plan "${planName}" ? Cette action est irréversible.`)) {
      if (onDeletePlan) {
        onDeletePlan(planId);
      }
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
      {/* HEADER */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl flex items-center justify-between gap-4">
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
            <span className="text-[10px] font-black uppercase text-[#CF9A61] tracking-widest block">
              Historique
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Plans d'entraînement archivés ({archivedPlans.length})
            </h2>
          </div>
        </div>
      </div>

      {/* LISTE DES PLANS */}
      {archivedPlans.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-xl">
            📁
          </div>
          <p className="text-xs text-stone-400">
            Aucun programme d'entraînement archivé pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className="p-5 bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-[#CF9A61]/50 rounded-3xl space-y-3 cursor-pointer transition shadow-lg group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-sm font-black text-stone-100 uppercase group-hover:text-[#CF9A61] transition">
                    {plan.name}
                  </h4>
                  <span className="text-[9.5px] font-bold bg-[#CF9A61]/20 text-[#CF9A61] border border-[#CF9A61]/30 px-2 py-0.5 rounded-lg shrink-0">
                    {plan.targetDistance}
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-mono">
                  Du {safeFormatDateFr(plan.startDate)} au {safeFormatDateFr(plan.eventDate)} ({plan.durationWeeks} sem.)
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px] text-stone-500">
                <span>{plan.workouts?.length || 0} séance(s)</span>
                <span className="text-[#CF9A61] font-bold group-hover:translate-x-0.5 transition">Consulter / Gérer ➔</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE DÉTAIL, RÉACTIVATION & SUPPRESSION */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                  Plan d'entraînement Archivé
                </span>
                <h2 className="text-base font-black uppercase text-stone-100">
                  {selectedPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Distance Cible</span>
                <span className="font-extrabold text-[#CF9A61]">{selectedPlan.targetDistance}</span>
              </div>
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Durée</span>
                <span className="font-extrabold text-stone-200">{selectedPlan.durationWeeks} semaines</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-stone-800/60">
                <span className="text-[9px] text-stone-500 uppercase font-bold block">Période</span>
                <span className="font-medium text-stone-300">
                  Du {safeFormatDateFr(selectedPlan.startDate)} au {safeFormatDateFr(selectedPlan.eventDate)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-300 tracking-wider block">
                Contenu du Programme ({selectedPlan.workouts?.length || 0} séance(s))
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {selectedPlan.workouts?.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    className="bg-stone-950 p-3 rounded-xl border border-stone-800/80 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-stone-200">
                        S{w.weekNumber} • {w.dayName} : {w.title}
                      </div>
                      {w.description && (
                        <div className="text-[10px] text-stone-400 line-clamp-1">{w.description}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {w.km && <span className="text-[10px] font-extrabold text-[#CDCF61] block">{w.km} km</span>}
                      {w.rpe && <span className="text-[9px] font-bold text-[#CF9A61]">RPE {w.rpe}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS : FERMER, RÉACTIVER & SUPPRIMER */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
                {onActivatePlan && (
                  <button
                    type="button"
                    onClick={() => handleActivate(selectedPlan)}
                    className="flex-1 py-3 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-lg"
                  >
                    ⚡ Activer
                  </button>
                )}
              </div>

              {onDeletePlan && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedPlan.id, selectedPlan.name)}
                  className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 hover:border-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🗑️ Supprimer définitivement ce plan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};