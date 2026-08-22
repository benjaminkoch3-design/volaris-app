// app/components/workout/WorkoutDetail.tsx

import React, { useState, useEffect } from "react";
import { Workout, Plan, WorkoutStep } from "../../types";
import { WORKOUT_TYPES_CONFIG } from "../../constants";
import {
  calculateStepMetrics,
  getStepTypeLabel,
  generatePaceProfile,
} from "../../utils/calculations";

interface WorkoutDetailProps {
  workout: Workout;
  plan?: Plan;
  completedWorkouts?: Record<string, boolean>;
  onClose: () => void;
  onToggleWorkout?: (id: string) => void;
}

const getRpeColor = (rpe: number): { text: string; bg: string; border: string } => {
  if (rpe <= 3) {
    return { text: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (rpe <= 5) {
    return { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" };
  }
  if (rpe <= 7) {
    return { text: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.3)" };
  }
  return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" };
};

export const PaceProfileChart: React.FC<{ steps?: WorkoutStep[] }> = ({ steps }) => {
  const profile = generatePaceProfile(steps);

  if (!profile || profile.length === 0) return null;

  const totalTimeSec = profile.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalTimeSec === 0) return null;

  const minPace = Math.min(...profile.map((p) => p.paceSecPerKm));
  const maxPace = Math.max(...profile.map((p) => p.paceSecPerKm));
  const paceRange = maxPace - minPace || 60;

  const formatPaceFromSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getColor = (type: string) => {
    switch (type) {
      case "echauffement":
        return "#CF6361";
      case "corps":
        return "#CF9A61";
      case "recup":
        return "#CDCF61";
      case "retour_calme":
        return "#3b82f6";
      default:
        return "#10b981";
    }
  };

  return (
    <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2 font-sans">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
          Profil d'allure de la séance
        </span>
        <span className="text-[9px] font-semibold text-stone-400">
          Total : {Math.round(totalTimeSec / 60)} min
        </span>
      </div>

      <div className="flex gap-2 items-stretch">
        <div className="flex flex-col justify-between text-[8px] font-extrabold text-stone-400 py-1 select-none pr-1 border-r border-stone-800/80">
          <span>{formatPaceFromSec(minPace)}</span>
          <span>{formatPaceFromSec(minPace + paceRange / 2)}</span>
          <span>{formatPaceFromSec(maxPace)}</span>
        </div>

        <div className="flex-1 space-y-1">
          <div className="h-24 w-full bg-stone-900/60 rounded-xl p-2 flex items-end gap-1.5 relative overflow-hidden border border-stone-800/60">
            {profile.map((point, i) => {
              const widthPct = (point.durationSec / totalTimeSec) * 100;
              const normalizedHeight =
                paceRange === 0
                  ? 60
                  : 25 + ((maxPace - point.paceSecPerKm) / paceRange) * 65;

              return (
                <div
                  key={i}
                  style={{
                    width: `${Math.max(widthPct, 4)}%`,
                    height: `${normalizedHeight}%`,
                    backgroundColor: getColor(point.type),
                  }}
                  className="rounded-t-sm transition-all relative group cursor-pointer hover:brightness-125 flex flex-col justify-end items-center"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-stone-900 border border-stone-700 text-stone-100 text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      <div>{point.label}</div>
                      <div className="text-[#CF9A61]">{point.paceFormatted}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5 px-2">
            {profile.map((point, i) => {
              const widthPct = (point.durationSec / totalTimeSec) * 100;
              return (
                <div
                  key={i}
                  style={{ width: `${Math.max(widthPct, 4)}%` }}
                  className="text-center overflow-hidden"
                >
                  <span className="block text-[8px] font-bold text-[#CDCF61] truncate">
                    {point.paceFormatted}
                  </span>
                  <span className="block text-[7px] font-semibold text-stone-500 truncate">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-semibold text-stone-400 pt-1 border-t border-stone-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF6361] inline-block"></span> Échauff.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CF9A61] inline-block"></span> Course
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#CDCF61] inline-block"></span> Récup.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block"></span> Retour au calme
          </span>
        </div>
      </div>
    </div>
  );
};

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workout,
  onClose,
}) => {
  const typeConfig =
    WORKOUT_TYPES_CONFIG[workout.type] || WORKOUT_TYPES_CONFIG.footing;
  const metrics = calculateStepMetrics(workout.steps);
  const targetRpe = workout.rpe ? Math.min(10, Math.max(1, parseInt(workout.rpe, 10) || 5)) : 5;
  const estimatedLoad = Math.round((metrics.totalMinutes || 0) * targetRpe);
  const rpeTheme = getRpeColor(targetRpe);

  const [hasGarmin, setHasGarmin] = useState(false);
  const [hasCoros, setHasCoros] = useState(false);
  const [showGarminModal, setShowGarminModal] = useState(false);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    const gEmail = localStorage.getItem("volaris_garmin_email");
    const gPwd = localStorage.getItem("volaris_garmin_pwd");
    const cEmail = localStorage.getItem("volaris_coros_email");
    const cPwd = localStorage.getItem("volaris_coros_pwd");

    if (gEmail && gPwd) {
      setHasGarmin(true);
      setGarminEmail(gEmail);
      setGarminPassword(gPwd);
    } else {
      setHasGarmin(false);
    }

    if (cEmail && cPwd) {
      setHasCoros(true);
    } else {
      setHasCoros(false);
    }
  }, []);

  const performGarminSync = async (emailToUse: string, pwdToUse: string) => {
    setLoading(true);
    setSyncStatus(null);

    try {
      localStorage.setItem("volaris_garmin_email", emailToUse);
      localStorage.setItem("volaris_garmin_pwd", pwdToUse);

      const res = await fetch("/api/sync-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: pwdToUse,
          workout,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de synchronisation Garmin");
      }

      setSyncStatus("✅ Séance envoyée sur Garmin Connect !");
      setTimeout(() => {
        setShowGarminModal(false);
        setSyncStatus(null);
      }, 2500);
    } catch (err: any) {
      setSyncStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectOrModalSync = () => {
    const savedEmail = localStorage.getItem("volaris_garmin_email");
    const savedPwd = localStorage.getItem("volaris_garmin_pwd");

    if (savedEmail && savedPwd) {
      performGarminSync(savedEmail, savedPwd);
    } else {
      setShowGarminModal(true);
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performGarminSync(garminEmail, garminPassword);
  };

  const handleCorosSync = async () => {
    const email = localStorage.getItem("volaris_coros_email");
    const pwd = localStorage.getItem("volaris_coros_pwd");

    if (!email || !pwd) {
      return;
    }

    setLoading(true);
    setSyncStatus(null);

    try {
      const res = await fetch("/api/sync-coros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd, workout }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de synchronisation COROS");
      }
      setSyncStatus("✅ Séance synchronisée sur COROS !");
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (err: any) {
      setSyncStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Rendu de l'allure au format : Allure Lente - Allure Rapide (sans "min/km")
  const renderPaceBadge = (step: WorkoutStep) => {
    const slowPace = step.paceMax;
    const fastPace = step.paceMin;

    if (slowPace && fastPace) {
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Allure Cible
          </span>
          <span className="font-black text-[#CF9A61] font-mono text-[11px]">
            {slowPace} - {fastPace}
          </span>
        </div>
      );
    }

    if (slowPace || fastPace || step.targetPace) {
      const paceText = step.targetPace || slowPace || fastPace;
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Allure Cible
          </span>
          <span className="font-black text-[#CF9A61] font-mono text-[11px]">
            {paceText}
          </span>
        </div>
      );
    }

    if (step.goalValue) {
      return (
        <div className="text-right">
          <span className="text-[9px] text-stone-500 uppercase block font-bold">
            Cible
          </span>
          <span className="font-black text-[#CF9A61]">{step.goalValue}</span>
        </div>
      );
    }

    return null;
  };

  const renderStepTree = (steps: WorkoutStep[], parentIndex = "") => {
    return (
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const stepNum = parentIndex ? `${parentIndex}.${idx + 1}` : `${idx + 1}`;

          if (step.type === "repeat") {
            return (
              <div
                key={step.id || idx}
                className="bg-stone-900/80 border border-[#CF9A61]/30 rounded-2xl p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider">
                    🔁 Répétition • {step.reps || 1}x
                  </span>
                  <span className="text-[9px] text-stone-500 font-mono">
                    Bloc #{stepNum}
                  </span>
                </div>

                {step.nestedSteps && step.nestedSteps.length > 0 && (
                  <div className="pl-3 border-l-2 border-[#CF9A61]/40 space-y-2 pt-1">
                    {renderStepTree(step.nestedSteps, stepNum)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={step.id || idx}
              className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800 shrink-0">
                  {getStepTypeLabel(step.type)}
                </span>
                <span className="font-semibold text-stone-200">
                  {step.durationOrDist || "-"}
                </span>
              </div>

              {renderPaceBadge(step)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                Semaine {workout.weekNumber} • {workout.dayName}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}
              >
                {typeConfig.label}
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-stone-100">
              {workout.title || "Séance d'entraînement"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xs font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* MÉTRIQUES CIBLES */}
        <div className="grid grid-cols-4 gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center items-center">
          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">
              Distance
            </span>
            <span className="text-sm font-black text-[#CF9A61]">
              {workout.km || metrics.totalKm} km
            </span>
          </div>

          <div>
            <span className="block text-[8px] font-bold text-stone-400 uppercase">
              Durée
            </span>
            <span className="text-sm font-black text-[#CF9A61]">
              {metrics.totalMinutes} min
            </span>
          </div>

          <div
            style={{
              backgroundColor: rpeTheme.bg,
              borderColor: rpeTheme.border,
            }}
            className="border rounded-xl py-1 px-1 transition-all"
          >
            <span
              style={{ color: rpeTheme.text }}
              className="block text-[8px] font-bold uppercase opacity-90"
            >
              RPE Cible
            </span>
            <span
              style={{ color: rpeTheme.text }}
              className="text-sm font-black"
            >
              {workout.rpe ? `${workout.rpe}/10` : "5/10"}
            </span>
          </div>

          <div
            style={{
              backgroundColor: rpeTheme.bg,
              borderColor: rpeTheme.border,
            }}
            className="border rounded-xl py-1 px-1 transition-all"
          >
            <span
              style={{ color: rpeTheme.text }}
              className="block text-[8px] font-bold uppercase opacity-90"
            >
              Charge
            </span>
            <span
              style={{ color: rpeTheme.text }}
              className="text-sm font-black"
            >
              {estimatedLoad}
            </span>
          </div>
        </div>

        {/* SECTION SYNCHRONISATION */}
        <div className="space-y-1.5">
          {!hasGarmin && !hasCoros ? (
            <div className="bg-stone-950/80 border border-stone-800/90 rounded-2xl p-3.5 flex items-start gap-3 shadow-inner">
              <div className="w-8 h-8 rounded-xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] shrink-0 text-sm">
                ⌚
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-stone-200">
                  Synchronisation avec votre montre
                </h4>
                <p className="text-[10.5px] text-stone-400 leading-relaxed">
                  Pour synchroniser cette séance sur votre montre, rendez-vous dans l'onglet{" "}
                  <strong className="text-[#CF9A61]">Profil</strong> afin de connecter votre compte{" "}
                  <span className="text-[#4D80B3] font-semibold">Garmin Connect</span> ou{" "}
                  <span className="text-[#B34D4D] font-semibold">COROS</span>.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-2 ${
                hasGarmin && hasCoros ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {hasGarmin && (
                <button
                  type="button"
                  onClick={handleDirectOrModalSync}
                  disabled={loading}
                  style={{ backgroundColor: "#4D80B3" }}
                  className="py-3 hover:opacity-90 disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span>⌚ Synchroniser Garmin</span>
                </button>
              )}

              {hasCoros && (
                <button
                  type="button"
                  onClick={handleCorosSync}
                  disabled={loading}
                  style={{ backgroundColor: "#B34D4D" }}
                  className="py-3 hover:opacity-90 disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span>⌚ Synchroniser COROS</span>
                </button>
              )}
            </div>
          )}

          {syncStatus && (
            <p className="text-[11px] text-center font-bold text-[#CF9A61] animate-fadeIn">
              {syncStatus}
            </p>
          )}
        </div>

        {/* PROFIL D'ALLURE CHRONOLOGIQUE */}
        <PaceProfileChart steps={workout.steps} />

        {/* DESCRIPTION */}
        {workout.description && (
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800 space-y-1">
            <span className="text-[9px] font-bold uppercase text-stone-400 block">
              Description de la séance
            </span>
            <p className="text-xs text-stone-300 leading-relaxed">
              {workout.description}
            </p>
          </div>
        )}

        {/* REMARQUE COACH */}
        {workout.remark && (
          <div className="bg-[#CDCF61]/10 border border-[#CDCF61]/30 p-3 rounded-2xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase text-[#CDCF61] block">
              💡 Conseil du Coach
            </span>
            <p className="text-xs text-[#CDCF61]/90">{workout.remark}</p>
          </div>
        )}

        {/* STRUCTURE DES BLOCS */}
        <div className="space-y-2 border-t border-stone-800 pt-3">
          <span className="text-[10px] font-black uppercase text-stone-200 tracking-wider block">
            Structure de la séance ({workout.steps?.length || 0} bloc
            {workout.steps && workout.steps.length > 1 ? "s" : ""})
          </span>

          {!workout.steps || workout.steps.length === 0 ? (
            <p className="text-xs text-stone-500 italic text-center py-2">
              Aucun bloc structuré renseigné.
            </p>
          ) : (
            <div className="max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
              {renderStepTree(workout.steps)}
            </div>
          )}
        </div>

        {/* BOUTON FERMER */}
        <div className="pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* MODAL DE CONNEXION GARMIN */}
      {showGarminModal && (
        <div className="fixed inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-60">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h4 className="text-sm font-black uppercase text-stone-100">
                Connexion Garmin Connect
              </h4>
              <button
                type="button"
                onClick={() => setShowGarminModal(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Renseigne tes identifiants Garmin pour envoyer automatiquement tes
              séances sur ta montre.
            </p>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email Garmin
                </label>
                <input
                  type="email"
                  required
                  value={garminEmail}
                  onChange={(e) => setGarminEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Mot de passe Garmin
                </label>
                <input
                  type="password"
                  required
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#4D80B3]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: "#4D80B3" }}
                className="w-full py-3 hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                {loading ? "Synchronisation..." : "Envoyer sur Garmin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};