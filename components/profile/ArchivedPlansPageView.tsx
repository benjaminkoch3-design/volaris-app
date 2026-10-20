// src/components/profile/ArchivedPlansPageView.tsx
import React, { useState } from "react";
import { Plan, Workout } from "../../types";
import { safeFormatDateFr } from "../../utils/calculations";
import { ActivePlanView } from "../plan/ActivePlanView";

interface ArchivedPlansPageViewProps {
  archivedPlans: Plan[];
  onBack: () => void;
  onActivatePlan?: (plan: Plan) => void;
  onDeletePlan?: (planId: string) => void;
  onSelectWorkoutDetail?: (workout: Workout) => void;
}

export const ArchivedPlansPageView: React.FC<ArchivedPlansPageViewProps> = ({
  archivedPlans,
  onBack,
  onActivatePlan,
  onDeletePlan,
  onSelectWorkoutDetail,
}) => {
  const [inspectedPlan, setInspectedPlan] = useState<Plan | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 1: true });

  const toggleWeekAccordion = (wNum: number) => {
    setOpenWeeks((prev) => ({ ...prev, [wNum]: !prev[wNum] }));
  };

  // Tri strict : semaine croissante, puis jour de la semaine croissant (Lundi -> Dimanche)
  const sortPlanWorkouts = (plan: Plan): Plan => ({
    ...plan,
    workouts: [...(plan.workouts || [])].sort((a, b) => {
      const wA = Number(a.weekNumber ?? (a as any).week_number ?? 1);
      const wB = Number(b.weekNumber ?? (b as any).week_number ?? 1);
      if (wA !== wB) return wA - wB;

      const dA = Number(a.dayIndex ?? (a as any).day_index ?? 0);
      const dB = Number(b.dayIndex ?? (b as any).day_index ?? 0);
      return dA - dB;
    }),
  });

  // --- VUE DÉTAILLÉE : MÊME PAGE ET DISPOSITION QUE LE PLAN HABITUEL ---
  if (inspectedPlan) {
    const sortedPlan = sortPlanWorkouts(inspectedPlan);

    return (
      <div className="space-y-6 w-full font-sans animate-fadeIn pb-12">
        {/* BARRE DE CONTRÔLE SUPÉRIEURE DU PLAN CONSULTÉ */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 md:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInspectedPlan(null)}
              className="text-stone-300 hover:text-white text-xs font-bold bg-stone-950 hover:bg-stone-850 px-3.5 py-2 rounded-xl border border-stone-800 transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Retour aux archives</span>
            </button>

            <div>
              <span className="text-[9.5px] font-black uppercase text-[#CF9A61] tracking-widest block">
                Plan Archivé • Consultation
              </span>
              <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-stone-100">
                {sortedPlan.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onDeletePlan && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Êtes-vous sûr de vouloir supprimer définitivement le plan "${sortedPlan.name}" ? Cette action est irréversible.`
                    )
                  ) {
                    onDeletePlan(sortedPlan.id);
                    setInspectedPlan(null);
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition cursor-pointer"
              >
                🗑️ Supprimer
              </button>
            )}

            {onActivatePlan && (
              <button
                type="button"
                onClick={() => {
                  onActivatePlan(sortedPlan);
                  setInspectedPlan(null);
                  onBack();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-stone-950 bg-[#CF9A61] hover:bg-[#b88652] transition cursor-pointer shadow-md"
              >
                ⚡ Activer ce plan
              </button>
            )}
          </div>
        </div>

        {/* AFFICHAGE IDENTIQUE À LA VUE HABITUELLE DU PLAN */}
        <ActivePlanView
          activePlan={sortedPlan}
          completedWorkouts={{}}
          openWeeks={openWeeks}
          toggleWeekAccordion={toggleWeekAccordion}
          onEditActivePlan={() => {}}
          onChangePlanRequest={() => {}}
          onSelectWorkoutDetail={onSelectWorkoutDetail || (() => {})}
          onToggleWorkout={() => {}}
          onNavigateToVolumeChart={() => {}}
          onMoveWorkoutToDay={async () => {}}
          isReadOnly={true}
        />
      </div>
    );
  }

  // --- VUE LISTE DES PLANS ARCHIVÉS ---
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
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

      {/* LISTE DES CARTES DE PLANS */}
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
              onClick={() => setInspectedPlan(plan)}
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
                <span className="text-[#CF9A61] font-bold group-hover:translate-x-0.5 transition">
                  Visualiser le plan ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};