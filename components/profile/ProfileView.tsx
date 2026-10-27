// src/components/profile/ProfileView.tsx

import React, { useState } from "react";
import { Race, Plan, Shoe } from "../../types";
import { getBestAthletePerformance } from "../../utils/vdot";
import { calculateRunnerProfile } from "../../utils/profile";

interface ProfileViewProps {
  athleteName: string;
  setAthleteName: (val: string) => void;
  avatarUrl?: string;
  onUpdateAvatar?: (url: string) => void;
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
  setRecords?: React.Dispatch<React.SetStateAction<any>>;
  onSaveFullProfile?: (data: {
    name: string;
    height: string;
    weight: string;
    vma: string;
    unknownVma: boolean;
    fcRest: string;
    fcMax: string;
    records?: Record<string, string>;
  }) => void;
  races: Race[];
  newRace?: any;
  setNewRace?: any;
  onAddRace?: any;
  onUpdateRace?: any;
  onDeleteRace?: any;
  connectedDevices: Record<string, boolean>;
  toggleDeviceConnection: (key: string) => void;
  archivedPlans: Plan[];
  shoes: Shoe[];
  onAddShoe?: (shoe: Shoe) => void;
  onDeleteShoe?: (id: string) => void;
  onToggleActiveShoe?: (id: string) => void;
  onOpenAthleteLibrary?: () => void;
  onOpenPhysiologyPage?: () => void;
  onOpenPersonalBestsPage?: () => void;
  onOpenRecordsPage?: () => void;
  onOpenShoesPage?: () => void;
  onOpenArchivedPlansPage?: () => void;
  onOpenConnectedDevicesPage?: () => void;
  onOpenCalculators?: () => void;
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
  onSaveFullProfile,
  races,
  archivedPlans,
  shoes,
  onOpenAthleteLibrary,
  onOpenPhysiologyPage,
  onOpenPersonalBestsPage,
  onOpenRecordsPage,
  onOpenShoesPage,
  onOpenArchivedPlansPage,
  onOpenConnectedDevicesPage,
  onOpenCalculators,
  isReadOnly = false,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Formulaire d'édition profil
  const [editName, setEditName] = useState(athleteName);
  const [editHeight, setEditHeight] = useState(height);
  const [editWeight, setEditWeight] = useState(weight);
  const [editVma, setEditVma] = useState(vma);
  const [editUnknownVma, setEditUnknownVma] = useState(unknownVma);
  const [editFcRest, setEditFcRest] = useState(fcRest);
  const [editFcMax, setEditFcMax] = useState(fcMax);

  React.useEffect(() => {
    setEditName(athleteName);
    setEditHeight(height);
    setEditWeight(weight);
    setEditVma(vma);
    setEditUnknownVma(unknownVma);
    setEditFcRest(fcRest);
    setEditFcMax(fcMax);
  }, [athleteName, height, weight, vma, unknownVma, fcRest, fcMax]);

  // Modale de recadrage d'avatar
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleOpenEdit = () => {
    setEditName(athleteName);
    setEditHeight(height);
    setEditWeight(weight);
    setEditVma(vma);
    setEditUnknownVma(unknownVma);
    setEditFcRest(fcRest);
    setEditFcMax(fcMax);
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
        records,
      });
    } else {
      setAthleteName(editName);
      setHeight(editHeight);
      setWeight(editWeight);
      setVma(editVma);
      setUnknownVma(editUnknownVma);
      setFcRest(editFcRest);
      setFcMax(editFcMax);
    }

    setIsEditingProfile(false);
  };

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleApplyCroppedAvatar = () => {
    if (!cropImageSrc || !onUpdateAvatar) return;

    const img = new Image();
    img.onload = () => {
      const outputSize = 250;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = Math.max(outputSize / img.width, outputSize / img.height) * zoom;
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = (outputSize - drawWidth) / 2 + pan.x;
      const drawY = (outputSize - drawHeight) / 2 + pan.y;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      const finalBase64 = canvas.toDataURL("image/jpeg", 0.8);
      onUpdateAvatar(finalBase64);
      setCropModalOpen(false);
      setCropImageSrc(null);
    };
    img.src = cropImageSrc;
  };

  const athletePerf = getBestAthletePerformance(records);
  const runnerProfile = calculateRunnerProfile(records);

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

  return (
    <div className="space-y-6 animate-fadeIn w-full font-sans">
      {/* MODALE RECENTRAGE PHOTO */}
      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-70 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#CF9A61] block">
                  Ajustement
                </span>
                <h4 className="text-xs font-black uppercase text-stone-100">
                  Recentrer ma photo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-2">
              <div
                className="w-48 h-48 rounded-full border-4 border-[#CF9A61] overflow-hidden relative cursor-grab active:cursor-grabbing shadow-2xl bg-stone-950 select-none"
                onMouseDown={(e) => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  setIsDragging(true);
                  setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
                }}
                onTouchMove={(e) => {
                  if (!isDragging) return;
                  const touch = e.touches[0];
                  setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
                }}
                onTouchEnd={() => setIsDragging(false)}
              >
                <img
                  src={cropImageSrc}
                  alt="Aperçu recadrage"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                  className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                />
              </div>
              <p className="text-[10px] text-stone-400 font-bold">
                Glissez pour recentrer l'image
              </p>
            </div>

            <div className="space-y-1.5 bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <div className="flex justify-between text-[9px] font-bold uppercase text-stone-400">
                <span>Zoom</span>
                <span className="text-[#CF9A61] font-mono">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#CF9A61] cursor-pointer"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApplyCroppedAvatar}
                className="flex-1 py-2.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-black text-xs uppercase rounded-xl shadow-lg transition cursor-pointer"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARTE RÉSUMÉ HAUT DE PAGE */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 bg-stone-800 border-2 border-[#CF9A61]/60 rounded-full flex items-center justify-center text-xl font-black text-stone-200 overflow-hidden shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={athleteName} className="w-full h-full object-cover" />
                ) : (
                  <span>{athleteName ? athleteName.substring(0, 2).toUpperCase() : "A"}</span>
                )}
              </div>

              {!isReadOnly && (
                <div className="absolute inset-0 bg-black/75 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition gap-1">
                  <label
                    className="cursor-pointer text-[8px] font-black text-[#CF9A61] uppercase hover:underline"
                    title="Changer et recentrer la photo"
                  >
                    <span>📷 Changer</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileSelected}
                    />
                  </label>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Supprimer votre photo de profil ?")) {
                          onUpdateAvatar?.("");
                        }
                      }}
                      className="text-[8px] font-black text-rose-400 uppercase hover:underline cursor-pointer"
                      title="Supprimer la photo"
                    >
                      🗑️ Retirer
                    </button>
                  )}
                </div>
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
                  style={{ left: `calc(${runnerProfile.vitessePercent}% - 6px)` }}
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
        <div className="space-y-4 w-full">
          {/* GRILLE 2 COLONNES SUR ORDINATEUR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 1. VMA, ALLURES, SEUILS & ZONES FC */}
            {onOpenPhysiologyPage && (
              <button
                type="button"
                onClick={onOpenPhysiologyPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                        VMA, Allures, Seuils & Zones FC
                      </h4>
                      {vma && parseFloat(vma) > 0 && !unknownVma && (
                        <span className="text-[10px] font-mono font-bold bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800 text-[#CF9A61]">
                          {vma} km/h
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Seuils LT1/LT2, échelle des % VMA et zones Karvonen
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 2. RECORDS PERSONNELS & ÉVOLUTION */}
            {onOpenPersonalBestsPage && (
              <button
                type="button"
                onClick={onOpenPersonalBestsPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg shrink-0">
                    📈
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                      Records Personnels & Évolution
                    </h4>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Course d'origine, meilleure course par an et progression
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 3. PALMARÈS & COURSES OFFICIELLES */}
            {onOpenRecordsPage && (
              <button
                type="button"
                onClick={onOpenRecordsPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg shrink-0">
                    🥇
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                        Mon Palmarès & Courses
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800 text-[#CF9A61]">
                        {races.length}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Classement par distance, chronologie et podiums
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 4. MES CHAUSSURES DE COURSE */}
            {onOpenShoesPage && (
              <button
                type="button"
                onClick={onOpenShoesPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#4DB380]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4DB380]/10 border border-[#4DB380]/30 flex items-center justify-center text-[#4DB380] text-lg shrink-0">
                    👟
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#4DB380] transition">
                        Mes Chaussures de Course
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800 text-[#4DB380]">
                        {shoes.filter((s) => s.isActive).length} active{shoes.filter((s) => s.isActive).length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Suivi kilométrique dynamique, alertes et placard
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#4DB380] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 5. BIBLIOTHÈQUE DE SÉANCES */}
            {onOpenAthleteLibrary && (
              <button
                type="button"
                onClick={onOpenAthleteLibrary}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg shrink-0">
                    📚
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                      Modèles d'entraînement
                    </h4>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Gérer mes modèles de séances d'entraînement
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 6. CALCULATEURS D'ALLURES & VDOT */}
            {onOpenCalculators && (
              <button
                type="button"
                onClick={onOpenCalculators}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-sm font-black shrink-0 font-mono">
                    fx
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                      Calculateurs & Allures
                    </h4>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      VMA, modélisation VDOT & seuils, conversions d'allures
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 7. PLANS D'ENTRAÎNEMENT ARCHIVÉS */}
            {onOpenArchivedPlansPage && (
              <button
                type="button"
                onClick={onOpenArchivedPlansPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#CF9A61]/10 border border-[#CF9A61]/30 flex items-center justify-center text-[#CF9A61] text-lg shrink-0">
                    📁
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#CF9A61] transition">
                        Plans Archivés
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800 text-[#CF9A61]">
                        {archivedPlans.length}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Historique de vos anciens programmes d'entraînement
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#CF9A61] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
            )}

            {/* 8. APPAREILS & MONTRES CONNECTÉES */}
            {onOpenConnectedDevicesPage && (
              <button
                type="button"
                onClick={onOpenConnectedDevicesPage}
                className="w-full bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 hover:border-[#CF9A61]/50 p-4 rounded-3xl flex items-center justify-between shadow-xl transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#007CC3]/10 border border-[#007CC3]/30 flex items-center justify-center text-[#007CC3] text-lg shrink-0">
                    ⌚
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-stone-100 group-hover:text-[#007CC3] transition">
                      Appareils & Montres Connectées
                    </h4>
                    <p className="text-[10.5px] text-stone-400 mt-0.5">
                      Garmin Connect, COROS Training Hub et Strava Sync
                    </p>
                  </div>
                </div>
                <span className="text-stone-500 group-hover:text-[#007CC3] text-sm font-black transition shrink-0 ml-2">➔</span>
              </button>
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
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Prénom</label>
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
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Taille (cm)</label>
                <input
                  type="number"
                  placeholder="178"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Poids (kg)</label>
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
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#CF9A61]">
              VMA & Fréquence Cardiaque
            </h3>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-bold text-stone-400">VMA Estimée (km/h)</label>
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
                  placeholder="Ex : 14.5"
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
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">FC Repos (bpm)</label>
                <input
                  type="number"
                  placeholder="Ex : 55"
                  value={editFcRest}
                  onChange={(e) => setEditFcRest(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">FC Max (bpm)</label>
                <input
                  type="number"
                  placeholder="Ex : 185"
                  value={editFcMax}
                  onChange={(e) => setEditFcMax(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-[#CF9A61] transition"
                />
              </div>
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