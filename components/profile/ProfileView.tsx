// src/components/profile/ProfileView.tsx

import React, { useState, useEffect } from "react";
import { Race, Plan, Shoe } from "../../types";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";
import {
  formatPaceFromSpeed,
  calculateThresholds,
  safeFormatDateFr,
} from "../../utils/calculations";
import {
  getBestAthletePerformance,
  RECORD_DISTANCES_METERS,
  getPerformanceScoreForRecord,
  parseDistanceTextToMeters,
} from "../../utils/vdot";
import {
  calculateRunnerProfile,
  calculateRecordVmaPercentage,
} from "../../utils/profile";

interface ProfileViewProps {
  athleteName: string;
  setAthleteName: (val: string) => void;
  avatarUrl?: string; // 👈 Photo de profil
  onUpdateAvatar?: (url: string) => void; // 👈 Handler de mise à jour photo
  height: string;
  setHeight: (val: string) => void;
  weight: string;
  setWeight: (val: string) => void;
  vma: string;
  setVma: (val: string) => void;
  unknownVma: boolean;
  setUnknownVma: (val: boolean) => void;
  fcRest: string;
  setFcRest: (val: string) => void;
  fcMax: string;
  setFcMax: (val: string) => void;
  records: Record<string, string>;
  setRecords: React.Dispatch<React.SetStateAction<any>>;
  onSaveFullProfile?: (data: {
    name: string;
    height: string;
    weight: string;
    vma: string;
    unknownVma: boolean;
    fcRest: string;
    fcMax: string;
    records: Record<string, string>;
  }) => void;
  races: Race[];
  newRace: {
    name: string;
    distance: string;
    time: string;
    category?: "route" | "piste" | "trail" | "nature";
    elevationGain?: string;
    utmbIndex?: string;
  };
  setNewRace: React.Dispatch<
    React.SetStateAction<{
      name: string;
      distance: string;
      time: string;
      category?: "route" | "piste" | "trail" | "nature";
      elevationGain?: string;
      utmbIndex?: string;
    }>
  >;
  onAddRace: (e: React.FormEvent) => void;
  onDeleteRace: (id: string) => void;
  connectedDevices: Record<string, boolean>;
  toggleDeviceConnection: (key: string) => void;
  archivedPlans: Plan[];
  shoes: Shoe[];
  onAddShoe: (shoe: Shoe) => void;
  onDeleteShoe: (id: string) => void;
  onToggleActiveShoe: (id: string) => void;
  onOpenAthleteLibrary?: () => void;
  isReadOnly?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  athleteName,
  setAthleteName,
  avatarUrl,
  onUpdateAvatar,
  height,
  setHeight,
  weight,
  setWeight,
  vma,
  setVma,
  unknownVma,
  setUnknownVma,
  fcRest,
  setFcRest,
  fcMax,
  setFcMax,
  records,
  setRecords,
  onSaveFullProfile,
  races,
  newRace,
  setNewRace,
  onAddRace,
  onDeleteRace,
  connectedDevices,
  toggleDeviceConnection,
  archivedPlans,
  shoes,
  onAddShoe,
  onDeleteShoe,
  onToggleActiveShoe,
  onOpenAthleteLibrary,
  isReadOnly = false,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);
  const [showAddShoeForm, setShowAddShoeForm] = useState(false);
  const [showShoeCloset, setShowShoeCloset] = useState(false);

  // Formulaire d'édition
  const [editName, setEditName] = useState(athleteName);
  const [editHeight, setEditHeight] = useState(height);
  const [editWeight, setEditWeight] = useState(weight);
  const [editVma, setEditVma] = useState(vma);
  const [editUnknownVma, setEditUnknownVma] = useState(unknownVma);
  const [editFcRest, setEditFcRest] = useState(fcRest);
  const [editFcMax, setEditFcMax] = useState(fcMax);
  const [editRecords, setEditRecords] = useState({ ...records });

  // 1. GARMIN
  const [showGarminModal, setShowGarminModal] = useState(false);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [isGarminLinked, setIsGarminLinked] = useState(false);
  const [garminLoading, setGarminLoading] = useState(false);
  const [garminStatusMsg, setGarminStatusMsg] = useState<string | null>(null);

  // 2. COROS
  const [showCorosModal, setShowCorosModal] = useState(false);
  const [corosEmail, setCorosEmail] = useState("");
  const [corosPassword, setCorosPassword] = useState("");
  const [isCorosLinked, setIsCorosLinked] = useState(false);
  const [corosLoading, setCorosLoading] = useState(false);
  const [corosStatusMsg, setCorosStatusMsg] = useState<string | null>(null);

  // 3. STRAVA
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [stravaEmail, setStravaEmail] = useState("");
  const [isStravaLinked, setIsStravaLinked] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaStatusMsg, setStravaStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Garmin
    const savedGarminEmail = localStorage.getItem("volaris_garmin_email");
    const savedGarminPwd = localStorage.getItem("volaris_garmin_pwd");
    if (savedGarminEmail && savedGarminPwd) {
      setGarminEmail(savedGarminEmail);
      setIsGarminLinked(true);
    }

    // COROS
    const savedCorosEmail = localStorage.getItem("volaris_coros_email");
    const savedCorosPwd = localStorage.getItem("volaris_coros_pwd");
    if (savedCorosEmail && savedCorosPwd) {
      setCorosEmail(savedCorosEmail);
      setIsCorosLinked(true);
    }

    // Strava
    const savedStravaEmail = localStorage.getItem("volaris_strava_email");
    const savedStrava = localStorage.getItem("volaris_strava_connected") === "true";
    if (savedStrava) {
      setIsStravaLinked(true);
      if (savedStravaEmail) setStravaEmail(savedStravaEmail);
    }
  }, []);

  const handleGarminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGarminLoading(true);
    setGarminStatusMsg(null);

    try {
      const res = await fetch("/api/sync-garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: garminEmail,
          password: garminPassword,
          testOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants Garmin invalides.");

      localStorage.setItem("volaris_garmin_email", garminEmail);
      localStorage.setItem("volaris_garmin_pwd", garminPassword);
      setIsGarminLinked(true);
      if (!connectedDevices.garmin) toggleDeviceConnection("garmin");

      setGarminStatusMsg("✅ Compte Garmin lié avec succès !");
      setTimeout(() => {
        setShowGarminModal(false);
        setGarminStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      setGarminStatusMsg(`❌ ${err.message}`);
    } finally {
      setGarminLoading(false);
    }
  };

  const handleGarminDisconnect = () => {
    localStorage.removeItem("volaris_garmin_email");
    localStorage.removeItem("volaris_garmin_pwd");
    setGarminEmail("");
    setGarminPassword("");
    setIsGarminLinked(false);
    if (connectedDevices.garmin) toggleDeviceConnection("garmin");
  };

  const handleCorosLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorosLoading(true);
    setCorosStatusMsg(null);

    try {
      const res = await fetch("/api/sync-coros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: corosEmail,
          password: corosPassword,
          testOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants COROS invalides.");

      localStorage.setItem("volaris_coros_email", corosEmail);
      localStorage.setItem("volaris_coros_pwd", corosPassword);
      setIsCorosLinked(true);
      if (!connectedDevices.coros) toggleDeviceConnection("coros");

      setCorosStatusMsg("✅ Compte COROS lié avec succès !");
      setTimeout(() => {
        setShowCorosModal(false);
        setCorosStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      setCorosStatusMsg(`❌ ${err.message}`);
    } finally {
      setCorosLoading(false);
    }
  };

  const handleCorosDisconnect = () => {
    localStorage.removeItem("volaris_coros_email");
    localStorage.removeItem("volaris_coros_pwd");
    setCorosEmail("");
    setCorosPassword("");
    setIsCorosLinked(false);
    if (connectedDevices.coros) toggleDeviceConnection("coros");
  };

  const handleStravaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStravaLoading(true);
    setStravaStatusMsg(null);

    try {
      localStorage.setItem("volaris_strava_email", stravaEmail);
      localStorage.setItem("volaris_strava_connected", "true");
      setIsStravaLinked(true);
      if (!connectedDevices.strava) toggleDeviceConnection("strava");

      setStravaStatusMsg("✅ Compte Strava synchronisé !");
      setTimeout(() => {
        setShowStravaModal(false);
        setStravaStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      setStravaStatusMsg(`❌ ${err.message}`);
    } finally {
      setStravaLoading(false);
    }
  };

  const handleStravaDisconnect = () => {
    localStorage.removeItem("volaris_strava_email");
    localStorage.setItem("volaris_strava_connected", "false");
    setStravaEmail("");
    setIsStravaLinked(false);
    if (connectedDevices.strava) toggleDeviceConnection("strava");
  };

  const handleOpenEdit = () => {
    setEditName(athleteName);
    setEditHeight(height);
    setEditWeight(weight);
    setEditVma(vma);
    setEditUnknownVma(unknownVma);
    setEditFcRest(fcRest);
    setEditFcMax(fcMax);
    setEditRecords({ ...records });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (onSaveFullProfile) {
      onSaveFullProfile({
        name: editName,
        height: editHeight,
        weight: editWeight,
        vma: editVma,
        unknownVma: editUnknownVma,
        fcRest: editFcRest,
        fcMax: editFcMax,
        records: editRecords,
      });
    } else {
      setAthleteName(editName);
      setHeight(editHeight);
      setWeight(editWeight);
      setVma(editVma);
      setUnknownVma(editUnknownVma);
      setFcRest(editFcRest);
      setFcMax(editFcMax);
      setRecords(editRecords);
    }

    setIsEditingProfile(false);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateAvatar) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [selectedArchivedPlan, setSelectedArchivedPlan] = useState<Plan | null>(null);

  // ACCORDÉONS
  const [openVmaSection, setOpenVmaSection] = useState(false);
  const [openCardioSection, setOpenCardioSection] = useState(false);
  const [openRecords, setOpenRecords] = useState(false);
  const [openPalmares, setOpenPalmares] = useState(false);
  const [openArchivedPlans, setOpenArchivedPlans] = useState(false);
  const [openShoesSection, setOpenShoesSection] = useState(false);
  const [openDevicesSection, setOpenDevicesSection] = useState(true);

  // Formulaire chaussure
  const [newShoe, setNewShoe] = useState({
    name: "",
    brand: "",
    initialKm: "",
    maxKm: "800",
  });

  const athletePerf = getBestAthletePerformance(records);
  const runnerProfile = calculateRunnerProfile(records);
  const vmaNum = parseFloat(vma) || 0;

  const activeShoes = shoes.filter((s) => s.isActive);
  const closetShoes = shoes.filter((s) => !s.isActive);

  const bestUtmbIndex = races.reduce((max, race) => {
    const utmb =
      typeof race.utmbIndex === "number"
        ? race.utmbIndex
        : parseFloat(String(race.utmbIndex || 0));

    if (race.category === "trail" && !isNaN(utmb) && utmb > max) {
      return utmb;
    }
    return max;
  }, 0);

  const recordVmaPcts: { key: string; label: string; pct: number }[] = [];
  if (vmaNum > 0) {
    Object.entries(RECORD_DISTANCES_METERS).forEach(([key, info]) => {
      const timeStr = records[key];
      if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
        const pct = calculateRecordVmaPercentage(key, timeStr, vmaNum);
        if (pct !== null) {
          recordVmaPcts.push({ key, label: info.label, pct });
        }
      }
    });
  }

  const handleAddShoeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!newShoe.name || !newShoe.brand) return;

    const shoeToAdd: Shoe = {
      id: Date.now().toString(),
      name: newShoe.name,
      brand: newShoe.brand,
      currentKm: parseFloat(newShoe.initialKm) || 0,
      maxKm: parseFloat(newShoe.maxKm) || 800,
      isActive: true,
    };

    onAddShoe(shoeToAdd);
    setNewShoe({ name: "", brand: "", initialKm: "", maxKm: "800" });
    setShowAddShoeForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto font-sans">
      {/* 1. MODALE GARMIN CONNECT */}
      {showGarminModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <GarminLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">
                  Lier mon compte Garmin
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGarminModal(false);
                  setGarminStatusMsg(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Connectez votre compte Garmin Connect pour envoyer vos séances directement sur votre montre et importer vos sorties.
            </p>

            <form onSubmit={handleGarminLogin} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email Garmin Connect
                </label>
                <input
                  type="email"
                  required
                  value={garminEmail}
                  onChange={(e) => setGarminEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#007CC3]"
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
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#007CC3]"
                />
              </div>

              {garminStatusMsg && (
                <div className="text-[10px] text-center font-bold text-[#007CC3] py-1">
                  {garminStatusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={garminLoading}
                className="w-full py-3 bg-[#007CC3] hover:bg-[#006bb3] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <GarminLogo className="w-4 h-4" />
                <span>{garminLoading ? "Vérification..." : "Valider la connexion"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODALE COROS APP */}
      {showCorosModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CorosLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">
                  Lier mon compte COROS
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCorosModal(false);
                  setCorosStatusMsg(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Connectez votre compte COROS pour synchroniser automatiquement vos programmes et vos séances structurées.
            </p>

            <form onSubmit={handleCorosLogin} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email COROS
                </label>
                <input
                  type="email"
                  required
                  value={corosEmail}
                  onChange={(e) => setCorosEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#F8283B]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Mot de passe COROS
                </label>
                <input
                  type="password"
                  required
                  value={corosPassword}
                  onChange={(e) => setCorosPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#F8283B]"
                />
              </div>

              {corosStatusMsg && (
                <div className="text-[10px] text-center font-bold text-[#F8283B] py-1">
                  {corosStatusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={corosLoading}
                className="w-full py-3 bg-[#F8283B] hover:bg-[#d61e30] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <CorosLogo className="w-4 h-4" />
                <span>{corosLoading ? "Vérification..." : "Valider la connexion"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODALE STRAVA */}
      {showStravaModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <StravaLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">
                  Lier mon compte Strava
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStravaModal(false);
                  setStravaStatusMsg(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Connectez votre compte Strava pour synchroniser votre historique d'activités, distances réelles et traces GPS.
            </p>

            <form onSubmit={handleStravaLogin} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">
                  Email ou Identifiant Strava
                </label>
                <input
                  type="text"
                  required
                  value={stravaEmail}
                  onChange={(e) => setStravaEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#FC5200]"
                />
              </div>

              {stravaStatusMsg && (
                <div className="text-[10px] text-center font-bold text-[#FC5200] py-1">
                  {stravaStatusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={stravaLoading}
                className="w-full py-3 bg-[#FC5200] hover:bg-[#e04900] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <StravaLogo className="w-4 h-4" />
                <span>{stravaLoading ? "Synchronisation..." : "Valider la liaison Strava"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PLAN ARCHIVÉ */}
      {selectedArchivedPlan && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#CF9A61] uppercase tracking-wider block">
                  Plan d'entraînement Archivé
                </span>
                <h2 className="text-base font-black uppercase text-stone-100">
                  {selectedArchivedPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchivedPlan(null)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">
                  Distance Cible
                </span>
                <span className="font-extrabold text-[#CF9A61]">
                  {selectedArchivedPlan.targetDistance}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-stone-500 uppercase font-bold block">
                  Durée
                </span>
                <span className="font-extrabold text-stone-200">
                  {selectedArchivedPlan.durationWeeks} semaines
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-stone-800/60">
                <span className="text-[9px] text-stone-500 uppercase font-bold block">
                  Période
                </span>
                <span className="font-medium text-stone-300">
                  Du {safeFormatDateFr(selectedArchivedPlan.startDate)} au{" "}
                  {safeFormatDateFr(selectedArchivedPlan.eventDate)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-300 tracking-wider block">
                Contenu du Programme ({selectedArchivedPlan.workouts?.length || 0} séance(s))
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {selectedArchivedPlan.workouts?.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    className="bg-stone-950 p-3 rounded-xl border border-stone-800/80 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-stone-200">
                        S{w.weekNumber} • {w.dayName} : {w.title}
                      </div>
                      {w.description && (
                        <div className="text-[10px] text-stone-400 line-clamp-1">
                          {w.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {w.km && (
                        <span className="text-[10px] font-extrabold text-[#CDCF61] block">
                          {w.km} km
                        </span>
                      )}
                      {w.rpe && (
                        <span className="text-[9px] font-bold text-[#CF9A61]">
                          RPE {w.rpe}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedArchivedPlan(null)}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* CARTE RÉSUMÉ HAUT DE PAGE AVEC PHOTO DE PROFIL */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* PHOTO DE PROFIL AVEC UPLOAD */}
            <div className="relative group">
              <div className="w-16 h-16 bg-stone-800 border-2 border-[#CF9A61]/60 rounded-full flex items-center justify-center text-xl font-black text-stone-200 overflow-hidden shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={athleteName} className="w-full h-full object-cover" />
                ) : (
                  <span>{athleteName ? athleteName.substring(0, 2).toUpperCase() : "A"}</span>
                )}
              </div>

              {!isReadOnly && (
                <label
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-[8.5px] font-bold text-stone-200 uppercase"
                  title="Changer la photo de profil"
                >
                  <span>📷 Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </label>
              )}
            </div>

            <div>
              <h3 className="text-xl font-black uppercase text-stone-100">
                {athleteName || "Athlète"}
              </h3>
              <p className="text-xs text-[#CF9A61] font-bold tracking-wide mt-0.5">
                Volaris
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-stone-950/80 px-4 py-2.5 rounded-2xl border border-stone-800/80 text-xs">
            <div className="text-center sm:text-left">
              <span className="text-[9px] text-[#CF9A61] uppercase block font-bold">
                Taille
              </span>
              <span className="font-extrabold text-stone-100">
                {height ? `${height} cm` : "-"}
              </span>
            </div>
            <div className="h-6 w-px bg-stone-800" />
            <div className="text-center sm:text-left">
              <span className="text-[9px] text-[#CF9A61] uppercase block font-bold">
                Poids
              </span>
              <span className="font-extrabold text-stone-100">
                {weight ? `${weight} kg` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* DOUBLE CARTE : ROUTE & TRAIL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="bg-gradient-to-br from-[#B34D4D]/20 via-stone-950 to-stone-950 p-4 rounded-2xl border border-[#B34D4D]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#B34D4D] tracking-wider">
                Performance Route
              </span>
              <span className="text-[8px] font-extrabold uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                VDOT : {athletePerf.bestVDOT || "-"}
              </span>
            </div>

            {athletePerf.bestRunningScore > 0 ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-stone-100">
                    {athletePerf.bestRunningScore}
                  </span>
                  <span className="text-xs font-bold text-[#B34D4D]">/ 1000</span>
                </div>
                <p className="text-[9.5px] text-stone-400 mt-0.5">
                  Réf : <strong className="text-stone-200">{athletePerf.referenceDistance}</strong>
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-stone-500 italic py-1">
                Aucun chrono route enregistré.
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#4DB380]/20 via-stone-950 to-stone-950 p-4 rounded-2xl border border-[#4DB380]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#4DB380] tracking-wider">
                Performance Trail
              </span>
              <span className="text-[8px] font-extrabold uppercase text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                UTMB Index
              </span>
            </div>

            {bestUtmbIndex > 0 ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-stone-100">
                    {bestUtmbIndex}
                  </span>
                  <span className="text-xs font-bold text-[#4DB380]">pts</span>
                </div>
                <p className="text-[9.5px] text-stone-400 mt-0.5">
                  Meilleur score attribué
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-stone-500 italic py-1">
                Renseignez un UTMB Index dans vos courses de Trail.
              </p>
            )}
          </div>
        </div>

        {/* PROFIL COUREUR */}
        {runnerProfile ? (
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800/80 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#CF9A61]">
                Profil de Coureur :{" "}
                <strong className="text-stone-100">
                  {runnerProfile.categoryLabel}
                </strong>
              </span>
              <span className="text-[9px] font-bold text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                Δ VDOT (Court-Long) : {runnerProfile.vdotDiff > 0 ? "+" : ""}
                {runnerProfile.vdotDiff}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-1">
              <span className="text-emerald-400">
                Endurance : {runnerProfile.endurancePercent}%
              </span>
              <span className="text-red-500">
                Vitesse : {runnerProfile.vitessePercent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="relative w-full h-3 bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 rounded-full p-0.5 shadow-inner">
                <div
                  style={{ left: `calc(${runnerProfile.endurancePercent}% - 6px)` }}
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-stone-950 rounded-full shadow-lg transition-all"
                  title={`Position : ${runnerProfile.endurancePercent}% Endurance`}
                />
              </div>
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest pt-0.5">
                <span className="text-emerald-400">Endurance Longue</span>
                <span className="text-amber-400">Modéré</span>
                <span className="text-red-500">Vitesse & VMA</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!isEditingProfile || isReadOnly ? (
        <div className="space-y-6">
          {onOpenAthleteLibrary && (
            <button
              type="button"
              onClick={onOpenAthleteLibrary}
              className="w-full bg-stone-900 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg">
                  📚
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                    Ma Bibliothèque de Séances
                  </h4>
                  <p className="text-[10.5px] text-stone-400">
                    Gérer mes modèles de séances d'entraînement
                  </p>
                </div>
              </div>
              <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm transition">➔</span>
            </button>
          )}

          {/* 1. ACCORDÉON VMA */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenVmaSection(!openVmaSection)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                ⚡ VMA, Allures & Seuils
              </span>
              <span className="text-stone-400 text-xs">
                {openVmaSection ? "▲" : "▼"}
              </span>
            </button>

            {openVmaSection && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-5">
                {(() => {
                  const thresh = calculateThresholds(
                    vma,
                    records.r10k || "",
                    records.rSemi || ""
                  );

                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-[#CF9A61] tracking-wider">
                          Estimation des Seuils
                        </span>
                        {thresh && thresh.isFallback && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border text-[#CF9A61] bg-[#CF9A61]/10 border-[#CF9A61]/30">
                            Estimé via VMA
                          </span>
                        )}
                      </div>

                      {thresh ? (
                        <div className="space-y-2">
                          <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800/80 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-[#B34D4D]">
                                Seuil Anaérobie
                              </span>
                              <span className="text-[10px] font-extrabold bg-[#B34D4D]/20 text-[#B34D4D] px-2 py-0.5 rounded border border-[#B34D4D]/30">
                                {thresh.lt2Pct} % VMA
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-1">
                              <span className="text-stone-100 font-bold">
                                {thresh.lt2Speed} km/h
                              </span>
                              <span className="text-stone-100 font-extrabold">
                                {thresh.lt2Pace} min/km
                              </span>
                            </div>
                          </div>

                          <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800/80 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-[#4DB380]">
                                Seuil Aérobie
                              </span>
                              <span className="text-[10px] font-extrabold bg-[#4DB380]/20 text-[#4DB380] px-2 py-0.5 rounded border border-[#4DB380]/30">
                                {thresh.lt1Pct} % VMA
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-1">
                              <span className="text-stone-100 font-bold">
                                {thresh.lt1Speed} km/h
                              </span>
                              <span className="text-stone-100 font-extrabold">
                                {thresh.lt1Pace} min/km
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="pt-3 border-t border-stone-800/80 space-y-4">
                  <div className="flex justify-between items-center py-1.5 border-b border-stone-800/60 text-xs">
                    <span className="text-stone-400 font-medium">VMA Renseignée</span>
                    <span className="font-bold text-stone-100 text-xs">
                      {unknownVma
                        ? "Non définie"
                        : vma && parseFloat(vma) > 0
                        ? `${vma} km/h • ${formatPaceFromSpeed(
                            parseFloat(vma)
                          )} min/km`
                        : "-"}
                    </span>
                  </div>

                  {vma && !unknownVma && parseFloat(vma) > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-[#CF9A61] tracking-wider">
                          Pourcentages de VMA & Records associés
                        </span>
                      </div>

                      <div className="flex overflow-x-auto gap-2.5 pb-2 custom-scrollbar">
                        {[60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120].map(
                          (pct) => {
                            const speed = (parseFloat(vma) * pct) / 100;
                            const pace = formatPaceFromSpeed(speed);

                            const matchingRecords = recordVmaPcts.filter(
                              (r) => Math.abs(r.pct - pct) < 2.5
                            );

                            return (
                              <div
                                key={pct}
                                className={`p-2.5 rounded-2xl border flex-shrink-0 text-center min-w-[90px] space-y-1 transition ${
                                  matchingRecords.length > 0
                                    ? "bg-[#CF9A61]/10 border-[#CF9A61]/60 shadow-lg"
                                    : "bg-stone-950 border-stone-800"
                                }`}
                              >
                                <div className="text-[10px] font-black text-[#CF9A61]">
                                  {pct}% VMA
                                </div>
                                <div className="text-xs font-bold text-stone-100">
                                  {pace}{" "}
                                  <span className="text-[8px] font-normal text-stone-400">
                                    min/km
                                  </span>
                                </div>

                                {matchingRecords.length > 0 && (
                                  <div className="pt-1 border-t border-[#CF9A61]/30 space-y-1">
                                    {matchingRecords.map((rec) => (
                                      <div
                                        key={rec.key}
                                        className="bg-[#CF9A61] text-stone-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-sm"
                                        title={`Record : ${rec.label} (${rec.pct}%)`}
                                      >
                                        {rec.label}
                                        <div className="text-[7.5px] font-extrabold opacity-90">
                                          {rec.pct}%
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. ACCORDÉON CARDIO */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenCardioSection(!openCardioSection)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                ❤️ Fréquence Cardiaque & Zones FC
              </span>
              <span className="text-stone-400 text-xs">
                {openCardioSection ? "▲" : "▼"}
              </span>
            </button>

            {openCardioSection && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-stone-800/60 text-xs">
                    <span className="text-stone-400">FC Repos</span>
                    <span className="font-bold text-stone-100">
                      {fcRest ? `${fcRest} bpm` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 text-xs">
                    <span className="text-stone-400">FC Max</span>
                    <span className="font-bold text-stone-100">
                      {fcMax ? `${fcMax} bpm` : "-"}
                    </span>
                  </div>
                </div>

                {(() => {
                  const restNum = parseInt(fcRest, 10);
                  const maxNum = parseInt(fcMax, 10);
                  if (!restNum || !maxNum || maxNum <= restNum) {
                    return (
                      <div className="text-[10px] text-stone-400 italic bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                        Veuillez renseigner votre FC de repos et votre FC max pour calculer les zones de FC.
                      </div>
                    );
                  }

                  const rfc = maxNum - restNum;
                  const zones = [
                    {
                      zone: "Z1",
                      pct: "50–60 %",
                      min: Math.round(restNum + 0.5 * rfc),
                      max: Math.round(restNum + 0.6 * rfc),
                      intensity: "Très facile",
                      usage: "Échauffement, récupération",
                      badge: "bg-[#007CC3]/20 text-[#007CC3] border-[#007CC3]/40",
                    },
                    {
                      zone: "Z2",
                      pct: "60–70 %",
                      min: Math.round(restNum + 0.6 * rfc),
                      max: Math.round(restNum + 0.7 * rfc),
                      intensity: "Facile",
                      usage: "Endurance fondamentale",
                      badge: "bg-[#4DB380]/20 text-[#4DB380] border-[#4DB380]/40",
                    },
                    {
                      zone: "Z3",
                      pct: "70–80 %",
                      min: Math.round(restNum + 0.7 * rfc),
                      max: Math.round(restNum + 0.8 * rfc),
                      intensity: "Modérée",
                      usage: "Endurance active, allure marathon",
                      badge: "bg-[#CDCF61]/20 text-[#CDCF61] border-[#CDCF61]/40",
                    },
                    {
                      zone: "Z4",
                      pct: "80–90 %",
                      min: Math.round(restNum + 0.8 * rfc),
                      max: Math.round(restNum + 0.9 * rfc),
                      intensity: "Soutenue",
                      usage: "Seuil, allure 10 km",
                      badge: "bg-[#CF9A61]/20 text-[#CF9A61] border-[#CF9A61]/40",
                    },
                    {
                      zone: "Z5",
                      pct: "90–100 %",
                      min: Math.round(restNum + 0.9 * rfc),
                      max: Math.round(restNum + 1.0 * rfc),
                      intensity: "Très intense",
                      usage: "VO₂max, intervalles courts",
                      badge: "bg-[#F8283B]/20 text-[#F8283B] border-[#F8283B]/40",
                    },
                  ];

                  return (
                    <div className="pt-2 border-t border-stone-800/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-[#CF9A61] tracking-wider">
                          Tableau des Zones FC (Karvonen)
                        </span>
                        <span className="text-[9px] font-bold text-stone-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                          RFC = {rfc} bpm
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-stone-800">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 uppercase font-bold text-[9px] tracking-wider">
                              <th className="py-2.5 px-2.5">Zone (% RFC)</th>
                              <th className="py-2.5 px-2.5">FC Cible</th>
                              <th className="py-2.5 px-2.5">Intensité</th>
                              <th className="py-2.5 px-2.5">Utilisation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/60 bg-stone-950/60">
                            {zones.map((z) => (
                              <tr key={z.zone} className="hover:bg-stone-900/40 transition">
                                <td className="py-2 px-2.5 font-black whitespace-nowrap">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] border font-extrabold ${z.badge}`}>
                                    {z.zone} ({z.pct})
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 font-bold text-stone-100 whitespace-nowrap">
                                  {z.min} - {z.max}{" "}
                                  <span className="text-[8px] text-[#CF9A61]/90 font-bold">bpm</span>
                                </td>
                                <td className="py-2 px-2.5 font-semibold text-stone-300 whitespace-nowrap">
                                  {z.intensity}
                                </td>
                                <td className="py-2 px-2.5 text-stone-400 text-[9.5px]">
                                  {z.usage}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 3. ACCORDÉON RECORDS */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenRecords(!openRecords)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                🏆 Records Personnels ({Object.keys(records).length})
              </span>
              <span className="text-stone-400 text-xs">
                {openRecords ? "▲" : "▼"}
              </span>
            </button>

            {openRecords && (
              <div className="p-5 pt-2 border-t border-stone-800/60 space-y-3">
                <p className="text-[10px] text-stone-400 italic">
                  Chaque record inclut le VDOT (Jack Daniels), le Running Score et le % de VMA maintenu.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {Object.entries(RECORD_DISTANCES_METERS).map(([key, info]) => {
                    const timeStr = records[key] || "";
                    const score = getPerformanceScoreForRecord(key, timeStr);
                    const vmaPct = calculateRecordVmaPercentage(key, timeStr, vmaNum);

                    return (
                      <div
                        key={key}
                        className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2"
                      >
                        <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
                          <span className="text-xs font-black text-[#CF9A61] uppercase">
                            {info.label}
                          </span>
                          <span className="text-xs font-black text-stone-100">
                            {timeStr || "-"}
                          </span>
                        </div>

                        {score ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-stone-400">
                                VDOT: <strong className="text-stone-200">{score.vdot}</strong>
                              </span>
                              <span className="font-extrabold text-[#B34D4D] bg-[#B34D4D]/10 px-2 py-0.5 rounded border border-[#B34D4D]/30">
                                Score: {score.runningScore}
                              </span>
                            </div>

                            {vmaPct !== null ? (
                              <div className="flex items-center justify-between text-[9.5px] pt-1 border-t border-stone-800/40">
                                <span className="text-stone-400 font-medium">Maintien VMA :</span>
                                <span className="font-black text-stone-100">{vmaPct}% VMA</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[9px] text-stone-500 italic block">
                            Aucun chrono valide
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. ACCORDÉON PALMARÈS DE COURSES */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenPalmares(!openPalmares)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                🥇 Mon Palmarès de Course ({races.length})
              </span>
              <span className="text-stone-400 text-xs">
                {openPalmares ? "▲" : "▼"}
              </span>
            </button>

            {openPalmares && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-4">
                <div className="space-y-2.5">
                  {races.length === 0 ? (
                    <p className="text-[11px] text-stone-500 text-center py-2 italic">
                      Aucune course enregistrée.
                    </p>
                  ) : (
                    races.map((race) => {
                      const cat = race.category || "route";
                      const isRoadOrTrack = cat === "route" || cat === "piste";

                      const distMeters = parseDistanceTextToMeters(race.distance);
                      const score =
                        isRoadOrTrack && distMeters > 0
                          ? getPerformanceScoreForRecord(distMeters, race.time)
                          : null;
                      const vmaPct =
                        isRoadOrTrack && distMeters > 0 && vmaNum > 0
                          ? calculateRecordVmaPercentage(distMeters, race.time, vmaNum)
                          : null;

                      const categoryConfig = {
                        route: { label: "Route", badge: "bg-[#B34D4D]/20 text-[#B34D4D] border-[#B34D4D]/40" },
                        piste: { label: "Piste", badge: "bg-[#B34D4D]/20 text-[#B34D4D] border-[#B34D4D]/40" },
                        trail: { label: "Trail", badge: "bg-[#4DB380]/20 text-[#4DB380] border-[#4DB380]/40" },
                        nature: { label: "Course Nature", badge: "bg-[#4DB380]/20 text-[#4DB380] border-[#4DB380]/40" },
                      }[cat] || { label: "Route", badge: "bg-[#B34D4D]/20 text-[#B34D4D] border-[#B34D4D]/40" };

                      return (
                        <div
                          key={race.id}
                          className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-stone-100 text-xs uppercase">
                                  {race.name}
                                </h4>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${categoryConfig.badge}`}>
                                  {categoryConfig.label}
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-400 mt-0.5">
                                {race.distance}
                                {race.elevationGain ? ` • ${race.elevationGain}m D+` : ""}
                                {" "}• Chrono :{" "}
                                <span className="text-[#CF9A61] font-bold">
                                  {race.time}
                                </span>
                              </div>
                            </div>

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => onDeleteRace(race.id)}
                                className="text-stone-500 hover:text-[#B34D4D] text-xs px-1 transition cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {isRoadOrTrack && score ? (
                            <div className="flex items-center justify-between text-[9.5px] bg-stone-900/80 p-2 rounded-xl border border-stone-800/80 flex-wrap gap-2 pt-1.5">
                              <span className="text-stone-300 font-semibold">
                                VDOT : <strong className="text-stone-100">{score.vdot}</strong>
                              </span>
                              <span className="text-stone-300 font-semibold">
                                Score : <strong className="text-[#B34D4D]">{score.runningScore}</strong>
                              </span>
                              {vmaPct !== null && (
                                <span className="text-stone-300 font-semibold">
                                  % VMA : <strong className="text-stone-100">{vmaPct}%</strong>
                                </span>
                              )}
                            </div>
                          ) : null}

                          {cat === "trail" && race.utmbIndex ? (
                            <div className="flex items-center justify-between text-[9.5px] bg-stone-900/80 p-2 rounded-xl border border-stone-800/80">
                              <span className="text-stone-300 font-semibold">
                                UTMB Index attribué :
                              </span>
                              <span className="font-black text-[#4DB380] bg-[#4DB380]/10 px-2 py-0.5 rounded border border-[#4DB380]/30">
                                {race.utmbIndex} pts
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FORMULAIRE AJOUT COURSE */}
                {!isReadOnly && (
                  <div className="pt-2 border-t border-stone-800/60 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRaceForm(!showAddRaceForm)}
                      className="w-full py-2.5 px-3.5 bg-stone-950 hover:bg-stone-900 border border-stone-800 rounded-xl text-[#CF9A61] font-bold text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        ➕ Ajouter une nouvelle course
                      </span>
                      <span className="text-stone-400 text-xs">
                        {showAddRaceForm ? "▲" : "▼"}
                      </span>
                    </button>

                    {showAddRaceForm && (
                      <form
                        onSubmit={(e) => {
                          onAddRace(e);
                          setShowAddRaceForm(false);
                        }}
                        className="bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800 space-y-2.5 mt-2"
                      >
                        <div className="space-y-2">
                          <input
                            type="text"
                            required
                            placeholder="Nom de la course (Ex: Semi de Paris, UTMB)"
                            value={newRace.name}
                            onChange={(e) =>
                              setNewRace({ ...newRace, name: e.target.value })
                            }
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61]"
                          />

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-stone-400 mb-1">
                              Nature de la course
                            </label>
                            <select
                              value={newRace.category || "route"}
                              onChange={(e) =>
                                setNewRace({
                                  ...newRace,
                                  category: e.target.value as any,
                                })
                              }
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61] cursor-pointer font-bold"
                            >
                              <option value="route">Route</option>
                              <option value="piste">Piste</option>
                              <option value="trail">Trail</option>
                              <option value="nature">Course Nature</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Distance (Ex: 21.1 km, 10 km)"
                              value={newRace.distance}
                              onChange={(e) =>
                                setNewRace({
                                  ...newRace,
                                  distance: e.target.value,
                                })
                              }
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61]"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Chrono (Ex: 1:32:00)"
                              value={newRace.time}
                              onChange={(e) =>
                                setNewRace({ ...newRace, time: e.target.value })
                              }
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61]"
                            />
                          </div>

                          {(newRace.category === "trail" ||
                            newRace.category === "nature") && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                                  Dénivelé (m D+)
                                </label>
                                <input
                                  type="number"
                                  placeholder="Ex: 1200"
                                  value={newRace.elevationGain || ""}
                                  onChange={(e) =>
                                    setNewRace({
                                      ...newRace,
                                      elevationGain: e.target.value,
                                    })
                                  }
                                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61]"
                                />
                              </div>

                              {newRace.category === "trail" && (
                                <div>
                                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                                    UTMB Index
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="Ex: 580"
                                    value={newRace.utmbIndex || ""}
                                    onChange={(e) =>
                                      setNewRace({
                                        ...newRace,
                                        utmbIndex: e.target.value,
                                      })
                                    }
                                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#CF9A61]"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold rounded-xl text-xs transition uppercase tracking-wider cursor-pointer"
                        >
                          Enregistrer la course
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. ACCORDÉON PLANS ARCHIVÉS */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenArchivedPlans(!openArchivedPlans)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                📁 Plans d'entraînement archivés ({archivedPlans.length})
              </span>
              <span className="text-stone-400 text-xs">
                {openArchivedPlans ? "▲" : "▼"}
              </span>
            </button>

            {openArchivedPlans && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-3">
                {archivedPlans.length === 0 ? (
                  <p className="text-xs text-stone-500 italic text-center py-2">
                    Aucun plan archivé pour le moment.
                  </p>
                ) : (
                  archivedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedArchivedPlan(plan)}
                      className="p-3.5 bg-stone-950 hover:bg-stone-900/80 rounded-2xl border border-stone-800 space-y-1 cursor-pointer transition shadow-md group"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-stone-100 uppercase group-hover:text-[#CF9A61]">
                          {plan.name}
                        </h4>
                        <span className="text-[9px] font-bold bg-[#CF9A61]/20 text-[#CF9A61] border border-[#CF9A61]/30 px-2 py-0.5 rounded">
                          {plan.targetDistance} ➔
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400">
                        Période : Du {safeFormatDateFr(plan.startDate)} au{" "}
                        {safeFormatDateFr(plan.eventDate)} ({plan.durationWeeks}{" "}
                        sem.)
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 6. ACCORDÉON CHAUSSURES */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenShoesSection(!openShoesSection)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                👟 Mes Chaussures ({activeShoes.length} active{activeShoes.length > 1 ? "s" : ""})
              </span>
              <span className="text-stone-400 text-xs">
                {openShoesSection ? "▲" : "▼"}
              </span>
            </button>

            {openShoesSection && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-4">
                <div className="space-y-3">
                  {activeShoes.length === 0 ? (
                    <p className="text-xs text-stone-500 italic text-center py-2">
                      Aucune paire active enregistrée.
                    </p>
                  ) : (
                    activeShoes.map((shoe) => {
                      const pctUsed = Math.min(
                        100,
                        Math.round((shoe.currentKm / shoe.maxKm) * 100)
                      );
                      const isAlert = pctUsed >= 80;

                      return (
                        <div
                          key={shoe.id}
                          className="p-4 rounded-2xl border space-y-2.5 bg-stone-950 border-[#4DB380]/40 shadow-lg transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-stone-100 uppercase">
                                  {shoe.brand} {shoe.name}
                                </h4>
                                <span className="text-[8px] font-black uppercase bg-[#4DB380]/20 text-[#4DB380] border border-[#4DB380]/40 px-2 py-0.5 rounded-full">
                                  Paire Active
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-400 font-semibold">
                                {shoe.currentKm.toFixed(1)} km parcourus sur{" "}
                                {shoe.maxKm} km max
                              </span>
                            </div>

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => onToggleActiveShoe(shoe.id)}
                                className="text-[10px] font-bold text-stone-400 hover:text-amber-400 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-xl transition cursor-pointer"
                                title="Mettre cette paire au placard"
                              >
                                Mettre au placard
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                              <div
                                style={{ width: `${pctUsed}%` }}
                                className={`h-full rounded-full transition-all ${
                                  isAlert ? "bg-[#B34D4D]" : "bg-[#4DB380]"
                                }`}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-bold text-stone-500">
                              <span>0 km</span>
                              <span
                                className={
                                  isAlert ? "text-[#B34D4D] font-black" : "text-[#4DB380]"
                                }
                              >
                                Usure : {pctUsed}%
                              </span>
                              <span>{shoe.maxKm} km</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {closetShoes.length > 0 && (
                  <div className="pt-2 border-t border-stone-800/60">
                    <button
                      type="button"
                      onClick={() => setShowShoeCloset(!showShoeCloset)}
                      className="w-full py-2 px-3 bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between"
                    >
                      <span>
                        Accéder au placard ({closetShoes.length} paire
                        {closetShoes.length > 1 ? "s" : ""})
                      </span>
                      <span>{showShoeCloset ? "▲" : "▼"}</span>
                    </button>

                    {showShoeCloset && (
                      <div className="space-y-2 mt-3 pl-2 border-l-2 border-stone-800">
                        {closetShoes.map((shoe) => (
                          <div
                            key={shoe.id}
                            className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-stone-300">
                                {shoe.brand} {shoe.name}
                              </div>
                              <div className="text-[10px] text-stone-500">
                                {shoe.currentKm.toFixed(0)} / {shoe.maxKm} km
                              </div>
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleActiveShoe(shoe.id)}
                                  className="text-[10px] font-bold text-[#4DB380] hover:underline bg-[#4DB380]/10 border border-[#4DB380]/30 px-2 py-1 rounded-lg transition cursor-pointer"
                                >
                                  Réactiver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteShoe(shoe.id)}
                                  className="text-stone-500 hover:text-red-400 text-xs px-1 font-bold transition cursor-pointer"
                                  title="Supprimer définitivement"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!isReadOnly && (
                  <div className="pt-2 border-t border-stone-800/60 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowAddShoeForm(!showAddShoeForm)}
                      className="w-full py-2.5 px-3.5 bg-stone-950 hover:bg-stone-900 border border-stone-800 rounded-xl text-[#4DB380] font-bold text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        ➕ Ajouter une paire de chaussures
                      </span>
                      <span className="text-stone-400 text-xs">
                        {showAddShoeForm ? "▲" : "▼"}
                      </span>
                    </button>

                    {showAddShoeForm && (
                      <form
                        onSubmit={handleAddShoeSubmit}
                        className="bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800 space-y-2.5 mt-2"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Marque (ex: Hoka, Salomon)"
                            value={newShoe.brand}
                            onChange={(e) =>
                              setNewShoe({ ...newShoe, brand: e.target.value })
                            }
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#4DB380]"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Modèle (ex: Speedcross 6)"
                            value={newShoe.name}
                            onChange={(e) =>
                              setNewShoe({ ...newShoe, name: e.target.value })
                            }
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#4DB380]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Km de départ (ex: 0)"
                            value={newShoe.initialKm}
                            onChange={(e) =>
                              setNewShoe({
                                ...newShoe,
                                initialKm: e.target.value,
                              })
                            }
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#4DB380]"
                          />
                          <input
                            type="number"
                            placeholder="Km Max conseillé (ex: 800)"
                            value={newShoe.maxKm}
                            onChange={(e) =>
                              setNewShoe({ ...newShoe, maxKm: e.target.value })
                            }
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-[#4DB380]"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-[#4DB380] hover:bg-[#3ea06f] text-stone-950 font-bold rounded-xl text-xs transition uppercase tracking-wider cursor-pointer"
                        >
                          Enregistrer la paire
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. ACCORDÉON APPAREILS & COMPTES CONNECTÉS (GARMIN / COROS / STRAVA) */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl overflow-hidden shadow-md transition-all">
            <button
              type="button"
              onClick={() => setOpenDevicesSection(!openDevicesSection)}
              className="w-full p-5 text-left font-bold text-xs uppercase tracking-wider text-stone-100 flex justify-between items-center bg-stone-900/80 hover:bg-stone-850 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                ⌚ Appareils & Montres Connectées
              </span>
              <span className="text-stone-400 text-xs">
                {openDevicesSection ? "▲" : "▼"}
              </span>
            </button>

            {openDevicesSection && (
              <div className="p-5 pt-3 border-t border-stone-800/60 space-y-3">
                {/* 1. GARMIN CONNECT */}
                <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#007CC3]/10 border border-[#007CC3]/30 flex items-center justify-center shadow-md shrink-0">
                      <GarminLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-100">
                        Garmin Connect
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">
                        {isGarminLinked && garminEmail
                          ? garminEmail
                          : "Forerunner, Fenix, Enduro"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      if (isGarminLinked) {
                        handleGarminDisconnect();
                      } else {
                        setShowGarminModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition border shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      isGarminLinked
                        ? "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                        : "bg-[#007CC3] hover:bg-[#006bb3] border-[#007CC3] text-white"
                    }`}
                  >
                    {isGarminLinked ? "Déconnecter" : "Connecter"}
                  </button>
                </div>

                {/* 2. COROS APP */}
                <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F8283B]/10 border border-[#F8283B]/30 flex items-center justify-center shadow-md shrink-0">
                      <CorosLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-100">
                        COROS Training Hub
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">
                        {isCorosLinked && corosEmail
                          ? corosEmail
                          : "Pace, Apex, Vertix"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      if (isCorosLinked) {
                        handleCorosDisconnect();
                      } else {
                        setShowCorosModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition border shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      isCorosLinked
                        ? "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                        : "bg-[#F8283B] hover:bg-[#d61e30] border-[#F8283B] text-white"
                    }`}
                  >
                    {isCorosLinked ? "Déconnecter" : "Connecter"}
                  </button>
                </div>

                {/* 3. STRAVA */}
                <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FC5200]/10 border border-[#FC5200]/30 flex items-center justify-center shadow-md shrink-0">
                      <StravaLogo className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-100">
                        Strava Sync
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium">
                        {isStravaLinked
                          ? stravaEmail || "Synchronisation active"
                          : "Historique et traces GPS"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      if (isStravaLinked) {
                        handleStravaDisconnect();
                      } else {
                        setShowStravaModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition border shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      isStravaLinked
                        ? "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                        : "bg-[#FC5200] hover:bg-[#e04900] border-[#FC5200] text-white"
                    }`}
                  >
                    {isStravaLinked ? "Déconnecter" : "Connecter"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="w-full py-3.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-lg mt-2"
            >
              Modifier mon profil
            </button>
          )}
        </div>
      ) : (
        /* FORMULAIRE D'ÉDITION DU PROFIL */
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-3 bg-stone-900/80 p-4 rounded-2xl border border-stone-800">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#CF9A61]">
              Identité & Gabarit
            </h3>
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Prénom
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  placeholder="178"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-stone-900/80 p-4 rounded-2xl border border-stone-800">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#CF9A61] flex items-center gap-1.5">
              VMA & Fréquence Cardiaque
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-bold text-stone-400">
                  VMA Estimée (km/h)
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUnknownVma}
                    onChange={(e) => {
                      setEditUnknownVma(e.target.checked);
                      if (e.target.checked) setEditVma("");
                    }}
                    className="accent-[#CF9A61] rounded cursor-pointer"
                  />
                  <span>Je ne la connais pas</span>
                </label>
              </div>
              {!editUnknownVma ? (
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 14.5"
                  value={editVma}
                  onChange={(e) => setEditVma(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              ) : (
                <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3 text-[10px] text-stone-400 italic">
                  VMA non renseignée.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  FC Repos (bpm)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 55"
                  value={editFcRest}
                  onChange={(e) => setEditFcRest(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                  FC Max (bpm)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 185"
                  value={editFcMax}
                  onChange={(e) => setEditFcMax(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-stone-900/80 p-4 rounded-2xl border border-stone-800">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#CF9A61]">
              Éditer mes Records Personnels
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(RECORD_DISTANCES_METERS).map(([key, info]) => (
                <div key={key}>
                  <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">
                    {info.label}
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 16:50 ou 1:25:00"
                    value={editRecords[key] || ""}
                    onChange={(e) =>
                      setEditRecords({ ...editRecords, [key]: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#CF9A61] text-stone-950 rounded-xl text-xs font-bold uppercase cursor-pointer shadow-lg"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  );
};