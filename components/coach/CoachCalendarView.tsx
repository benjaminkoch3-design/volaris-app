// src/components/coach/CoachCalendarView.tsx

import React, { useState, useEffect } from "react";
import { AthleteProfile, Plan, Workout, WorkoutType } from "../../types";
import { getWorkoutTypeConfig } from "../../utils/calculations";
import { supabase } from "../../lib/supabaseClient";

interface CoachCalendarViewProps {
  managedAthletes: AthleteProfile[];
  allPlans: Plan[];
  allWorkouts: Workout[];
  onSelectWorkoutDetail?: (workout: Workout, plan?: Plan) => void;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_SHORT_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const WORKOUT_COLORS: Record<
  Exclude<WorkoutType, "repos">,
  { bg: string }
> = {
  recup: { bg: "#0284c7" },
  footing: { bg: "#059669" },
  footing_actif: { bg: "#047857" },
  cotes: { bg: "#92400e" },
  vma: { bg: "#dc2626" },
  seuil: { bg: "#ea580c" },
  specifique: { bg: "#9333ea" },
  sortie_longue: { bg: "#db2777" },
  activation: { bg: "#1d4ed8" },
  course: { bg: "#d97706" },
};

export const CoachCalendarView: React.FC<CoachCalendarViewProps> = ({
  managedAthletes,
  allPlans,
  allWorkouts,
  onSelectWorkoutDetail,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("all");
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);

  // Notes du coach par athlète et date : Record<"athleteId_dateStr", { text: string, visibleToAthlete: boolean }>
  const [coachNotes, setCoachNotes] = useState<Record<string, { text: string; visibleToAthlete: boolean }>>({});
  const [currentNoteText, setCurrentNoteText] = useState("");
  const [currentNoteVisible, setCurrentNoteVisible] = useState(false);

  // Suivi des séances vues par le coach : Record<workoutId, boolean>
  const [coachCheckedWorkouts, setCoachCheckedWorkouts] = useState<Record<string, boolean>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleCurrentMonth = () => setCurrentDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Chargement des notes et des validations coach au démarrage
  useEffect(() => {
    const fetchCoachNotesAndChecks = async () => {
      // 1. Récupération des notes
      let query = supabase.from("coach_day_notes").select("*");
      if (selectedAthleteId !== "all") {
        query = query.eq("athlete_id", selectedAthleteId);
      }
      const { data: notesData } = await query;

      if (notesData) {
        const notesMap: Record<string, { text: string; visibleToAthlete: boolean }> = {};
        notesData.forEach((row: any) => {
          notesMap[`${row.athlete_id}_${row.date}`] = {
            text: row.note_text,
            visibleToAthlete: row.visible_to_athlete,
          };
        });
        setCoachNotes(notesMap);
      }

      // 2. Initialisation des checks coach d'après les workouts reçus
      const checksMap: Record<string, boolean> = {};
      allWorkouts.forEach((w: any) => {
        if (w.coach_checked || w.coachChecked) {
          checksMap[w.id] = true;
        }
      });
      setCoachCheckedWorkouts(checksMap);
    };

    fetchCoachNotesAndChecks();
  }, [selectedAthleteId, allWorkouts]);

  const isWorkoutDebriefed = (w: any): boolean => {
    const hasExplicitFlag = w.completed === true || w.isCompleted === true;
    const hasRealRpe = w.completedRpe !== undefined && w.completedRpe !== null && Number(w.completedRpe) > 0;
    const hasRealComment = typeof w.athleteComment === "string" && w.athleteComment.trim().length > 0;
    const hasRealCompletedKm = w.completedKm !== undefined && w.completedKm !== null && Number(w.completedKm) > 0 && w.isKmValidated === true;

    return hasExplicitFlag || hasRealRpe || hasRealComment || hasRealCompletedKm;
  };

  // Regroupement des séances par date
  const sessionsByDate: Record<string, { athlete: AthleteProfile; workout: Workout; plan: Plan }[]> = {};

  allPlans.forEach((item) => {
    const plan = item as any;
    const isPlanActive = plan.isActive !== undefined ? plan.isActive : plan.is_active !== false;
    const isPlanArchived = plan.isArchived !== undefined ? plan.isArchived : plan.is_archived === true;

    if (!isPlanActive || isPlanArchived) return;

    const planUserId = plan.userId || plan.user_id;
    if (selectedAthleteId !== "all" && planUserId !== selectedAthleteId) return;

    const athlete = managedAthletes.find((a) => a.id === planUserId);
    if (!athlete || (!plan.startDate && !plan.start_date)) return;

    const planStartDateStr: string = plan.startDate || plan.start_date;
    const planId = plan.id;

    const planWorkouts = allWorkouts.filter((wItem) => {
      const w = wItem as any;
      return w.planId === planId || w.plan_id === planId;
    });

    planWorkouts.forEach((wItem) => {
      const w = wItem as any;
      if (w.isRest || w.is_rest || w.type === "repos") return;

      const [sY, sM, sD] = planStartDateStr.split("-").map(Number);
      const workoutDateObj = new Date(sY, sM - 1, sD);
      const weekNum = w.weekNumber !== undefined ? w.weekNumber : (w.week_number || 1);
      const dayIdx = w.dayIndex !== undefined ? w.dayIndex : (w.day_index || 0);

      workoutDateObj.setDate(workoutDateObj.getDate() + ((weekNum - 1) * 7 + dayIdx));

      const y = workoutDateObj.getFullYear();
      const m = String(workoutDateObj.getMonth() + 1).padStart(2, "0");
      const d = String(workoutDateObj.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      if (!sessionsByDate[key]) sessionsByDate[key] = [];
      sessionsByDate[key].push({ athlete, workout: wItem, plan: item });
    });
  });

  const modalSessions = selectedDateModal ? sessionsByDate[selectedDateModal] || [] : [];

  const handleSaveNote = async () => {
    if (!selectedDateModal || selectedAthleteId === "all") return;

    const payloadKey = `${selectedAthleteId}_${selectedDateModal}`;
    const updatedNote = { text: currentNoteText, visibleToAthlete: currentNoteVisible };

    setCoachNotes((prev) => ({ ...prev, [payloadKey]: updatedNote }));

    await supabase.from("coach_day_notes").upsert({
      athlete_id: selectedAthleteId,
      date: selectedDateModal,
      note_text: currentNoteText,
      visible_to_athlete: currentNoteVisible,
    }, { onConflict: "athlete_id,date" });
  };

  const handleToggleCoachCheck = async (workoutId: string) => {
    const nextState = !coachCheckedWorkouts[workoutId];
    setCoachCheckedWorkouts((prev) => ({ ...prev, [workoutId]: nextState }));

    await supabase.from("workouts").update({ coach_checked: nextState }).eq("id", workoutId);
  };

  // Helper pour savoir si un jour donné contient des notes visibles
  const hasNoteForDate = (dateStr: string) => {
    if (selectedAthleteId !== "all") {
      return Boolean(coachNotes[`${selectedAthleteId}_${dateStr}`]?.text);
    }
    return managedAthletes.some((a) => Boolean(coachNotes[`${a.id}_${dateStr}`]?.text));
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans w-full relative">
      {/* BANDEAU NAVIGATION & FILTRE ATHLÈTE */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm dark:shadow-lg transition-colors">
        <div>
          <span className="text-[10px] font-black text-[#CDCF61] uppercase tracking-widest block">
            Agenda d'Entraînement
          </span>
          <h2 className="text-base font-black uppercase text-[#1c1917] dark:text-[#f5f5f4] mt-0.5">
            {MONTHS_FR[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Athlète :</span>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-stone-900 dark:text-stone-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                Tous les athlètes ({managedAthletes.length})
              </option>
              {managedAthletes.map((a) => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="text-[10px] font-bold text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl border border-stone-300 dark:border-stone-800 transition cursor-pointer"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl border border-stone-300 dark:border-stone-800 transition cursor-pointer"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* GRILLE MENSUELLE */}
      <div className="bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-3xl p-3.5 shadow-sm dark:shadow-xl space-y-2 transition-colors">
        <div className="grid grid-cols-7 gap-1 text-center pb-2 border-b border-stone-200 dark:border-stone-800/80">
          {DAYS_SHORT_FR.map((d) => (
            <span key={d} className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty_${i}`} className="min-h-[95px] bg-stone-50/50 dark:bg-stone-950/20 rounded-2xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const daySessions = sessionsByDate[dateStr] || [];
            const hasNote = hasNoteForDate(dateStr);

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setSelectedDateModal(dateStr);
                  if (selectedAthleteId !== "all") {
                    const existingNote = coachNotes[`${selectedAthleteId}_${dateStr}`];
                    setCurrentNoteText(existingNote?.text || "");
                    setCurrentNoteVisible(existingNote?.visibleToAthlete || false);
                  }
                }}
                className={`min-h-[95px] p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-start group relative ${
                  isToday
                    ? "bg-[#CDCF61]/15 border-[#CDCF61]/70 shadow-md"
                    : daySessions.length > 0 || hasNote
                    ? "bg-stone-50/80 dark:bg-stone-950/90 border-stone-200 dark:border-stone-800 hover:border-[#CDCF61]/60 hover:bg-stone-100 dark:hover:bg-stone-950"
                    : "bg-stone-50/40 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/50 hover:border-stone-300 dark:hover:border-stone-700"
                }`}
              >
                {/* EN-TÊTE DU JOUR AVEC BADGE NOTE */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center ${
                      isToday
                        ? "bg-[#CDCF61] text-stone-950 font-extrabold"
                        : "text-[#1c1917] dark:text-[#f5f5f4]"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* 📝 BADGE VISIBLE SUR L'AGENDA SI UNE NOTE EXISTE */}
                  {hasNote && (
                    <span
                      className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-black"
                      title="Note coach enregistrée pour cette journée"
                    >
                      📝
                    </span>
                  )}
                </div>

                {/* SÉANCES DU JOUR */}
                <div className="space-y-1 w-full overflow-y-auto max-h-[110px] pr-0.5 custom-scrollbar">
                  {daySessions.map((s, idx) => {
                    const w = s.workout as any;
                    const isDone = isWorkoutDebriefed(w);
                    const isCoachChecked = Boolean(coachCheckedWorkouts[w.id] || w.coach_checked);

                    const typeKey = (w.type || "footing") as Exclude<WorkoutType, "repos">;
                    const colorScheme = WORKOUT_COLORS[typeKey] || { bg: "#059669" };
                    const workoutTitle = w.title || w.type || "Séance";
                    const initialLetter = (s.athlete.name || "A").trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={idx}
                        style={{ backgroundColor: colorScheme.bg, borderColor: `${colorScheme.bg}dd` }}
                        className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md border flex items-center justify-between gap-1 transition-all shadow-xs w-full text-white"
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black shrink-0 bg-black/30 text-white">
                            {initialLetter}
                          </span>
                          <span className="truncate tracking-tight font-extrabold text-white">
                            {workoutTitle}
                          </span>
                        </div>

                        {/* INDICATEURS VISUELS SUR LES VIGNETTES */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* 👁️ CHECK COACH */}
                          {isCoachChecked && (
                            <span
                              className="text-[8px] font-black text-amber-950 bg-amber-300 px-0.5 rounded leading-none py-0.5 shadow-xs"
                              title="Vu par le coach"
                            >
                              👁️
                            </span>
                          )}

                          {/* ✓ ATHLÈTE DEBRIEF / ✕ NON DEBRIEF */}
                          {isDone ? (
                            <span
                              className="text-[8.5px] font-black text-emerald-950 bg-white px-1 rounded leading-none py-0.5 shadow-xs"
                              title="Débriefée par l'athlète"
                            >
                              ✓
                            </span>
                          ) : isPast ? (
                            <span
                              className="text-[8.5px] font-black text-red-600 bg-white border border-red-200 px-1 rounded leading-none py-0.5 shadow-xs"
                              title="Non débriefée"
                            >
                              ✕
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📄 MODALE DÉTAILLÉE DU JOUR SELECTIONNÉ */}
      {selectedDateModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-2xl w-full space-y-5 shadow-2xl my-auto animate-fadeIn">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#CDCF61] tracking-wider block">
                  Détail de la journée
                </span>
                <h3 className="text-base font-black uppercase text-stone-100">
                  {selectedDateModal.split("-").reverse().join("/")}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateModal(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800"
              >
                ✕ Fermer
              </button>
            </div>

            {/* SECTION SAISIE NOTE COACH */}
            {selectedAthleteId !== "all" ? (
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-stone-200 flex items-center gap-1.5">
                    <span>📝</span> Note du Coach pour ce jour
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-400">
                    <input
                      type="checkbox"
                      checked={currentNoteVisible}
                      onChange={(e) => setCurrentNoteVisible(e.target.checked)}
                      className="rounded accent-[#CDCF61] w-4 h-4 cursor-pointer"
                    />
                    Visible par l'athlète
                  </label>
                </div>

                <textarea
                  value={currentNoteText}
                  onChange={(e) => setCurrentNoteText(e.target.value)}
                  placeholder="Écrire une consigne ou une remarque sur cette journée..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CDCF61] resize-none h-20"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="bg-[#CDCF61] hover:bg-[#b8bb52] text-stone-950 text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer shadow-md"
                  >
                    Enregistrer la note
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-3 text-center text-xs text-stone-400 italic">
                Sélectionne un athlète dans le filtre en haut pour rédiger une note spécifique.
              </div>
            )}

            {/* LISTE DES SÉANCES DU JOUR */}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
                Séances au programme ({modalSessions.length})
              </h4>

              {modalSessions.length === 0 ? (
                <p className="text-xs text-stone-500 italic text-center py-4">
                  Aucune séance programmée pour ce jour.
                </p>
              ) : (
                modalSessions.map((s, idx) => {
                  const w = s.workout as any;
                  const typeConfig = getWorkoutTypeConfig(w.type);
                  const isDone = isWorkoutDebriefed(w);
                  const isCoachChecked = Boolean(coachCheckedWorkouts[w.id] || w.coach_checked);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl space-y-2 hover:border-stone-700 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#CDCF61]/20 text-[#CDCF61] text-xs font-black flex items-center justify-center border border-[#CDCF61]/40">
                            {s.athlete.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-xs font-black text-stone-100">
                            {s.athlete.name}
                          </span>
                        </div>

                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${typeConfig.badgeClass}`}>
                          {typeConfig.label}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-stone-900">
                        <h5 className="text-xs font-bold text-stone-200">
                          {w.title || "Séance"}
                        </h5>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* CHECKBOX "VU PAR LE COACH" */}
                          <label
                            className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl border cursor-pointer transition ${
                              isCoachChecked
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isCoachChecked}
                              onChange={() => handleToggleCoachCheck(w.id)}
                              className="accent-amber-500 rounded cursor-pointer w-3.5 h-3.5"
                            />
                            <span>{isCoachChecked ? "Vu Coach 👁️" : "Marquer comme vu"}</span>
                          </label>

                          {isDone ? (
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              Débriefée ✓
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-stone-500 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                              Non débriefée
                            </span>
                          )}

                          {onSelectWorkoutDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectWorkoutDetail(w, s.plan);
                                setSelectedDateModal(null);
                              }}
                              className="text-[9.5px] font-extrabold text-[#CDCF61] bg-[#CDCF61]/10 hover:bg-[#CDCF61]/20 border border-[#CDCF61]/30 px-2 py-0.5 rounded-lg transition cursor-pointer"
                            >
                              Détails ➔
                            </button>
                          )}
                        </div>
                      </div>

                      {w.description && (
                        <p className="text-[10.5px] text-stone-400 line-clamp-2">
                          {w.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};