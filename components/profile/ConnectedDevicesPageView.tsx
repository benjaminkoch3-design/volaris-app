// src/components/profile/ConnectedDevicesPageView.tsx
import React, { useState, useEffect } from "react";
import { GarminLogo, CorosLogo, StravaLogo } from "../common/BrandLogos";

interface ConnectedDevicesPageViewProps {
  connectedDevices: Record<string, boolean>;
  toggleDeviceConnection: (key: string) => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

export const ConnectedDevicesPageView: React.FC<ConnectedDevicesPageViewProps> = ({
  connectedDevices,
  toggleDeviceConnection,
  onBack,
  isReadOnly = false,
}) => {
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
    const savedGarminEmail = localStorage.getItem("volaris_garmin_email");
    const savedGarminPwd = localStorage.getItem("volaris_garmin_pwd");
    if (savedGarminEmail && savedGarminPwd) {
      setGarminEmail(savedGarminEmail);
      setIsGarminLinked(true);
    }

    const savedCorosEmail = localStorage.getItem("volaris_coros_email");
    const savedCorosPwd = localStorage.getItem("volaris_coros_pwd");
    if (savedCorosEmail && savedCorosPwd) {
      setCorosEmail(savedCorosEmail);
      setIsCorosLinked(true);
    }

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
        body: JSON.stringify({ email: garminEmail, password: garminPassword, testOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants Garmin invalides.");
      localStorage.setItem("volaris_garmin_email", garminEmail);
      localStorage.setItem("volaris_garmin_pwd", garminPassword);
      setIsGarminLinked(true);
      if (!connectedDevices.garmin) toggleDeviceConnection("garmin");
      setGarminStatusMsg("✅ Compte Garmin lié avec succès !");
      setTimeout(() => { setShowGarminModal(false); setGarminStatusMsg(null); }, 1500);
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
        body: JSON.stringify({ email: corosEmail, password: corosPassword, testOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants COROS invalides.");
      localStorage.setItem("volaris_coros_email", corosEmail);
      localStorage.setItem("volaris_coros_pwd", corosPassword);
      setIsCorosLinked(true);
      if (!connectedDevices.coros) toggleDeviceConnection("coros");
      setCorosStatusMsg("✅ Compte COROS lié avec succès !");
      setTimeout(() => { setShowCorosModal(false); setCorosStatusMsg(null); }, 1500);
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
      setTimeout(() => { setShowStravaModal(false); setStravaStatusMsg(null); }, 1500);
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
              Synchronisation
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-stone-100 mt-0.5">
              Appareils & Montres Connectées
            </h2>
          </div>
        </div>
      </div>

      {/* CARTES SERVICES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GARMIN */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#007CC3]/10 border border-[#007CC3]/30 flex items-center justify-center shadow-md">
              <GarminLogo className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-stone-100 uppercase">Garmin Connect</h4>
              <p className="text-xs text-stone-400 mt-1">
                {isGarminLinked && garminEmail ? garminEmail : "Forerunner, Fenix, Enduro"}
              </p>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Envoi direct des séances structurées sur votre montre et rapatriement des activités.
            </p>
          </div>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isGarminLinked) handleGarminDisconnect();
              else setShowGarminModal(true);
            }}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase transition border shadow-md disabled:opacity-50 cursor-pointer ${
              isGarminLinked
                ? "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                : "bg-[#007CC3] hover:bg-[#006bb3] border-[#007CC3] text-white"
            }`}
          >
            {isGarminLinked ? "Déconnecter" : "Connecter"}
          </button>
        </div>

        {/* COROS */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8283B]/10 border border-[#F8283B]/30 flex items-center justify-center shadow-md">
              <CorosLogo className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-stone-100 uppercase">COROS Training Hub</h4>
              <p className="text-xs text-stone-400 mt-1">
                {isCorosLinked && corosEmail ? corosEmail : "Pace, Apex, Vertix"}
              </p>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Synchronisation automatique du calendrier d'entraînement et des paliers de séance.
            </p>
          </div>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isCorosLinked) handleCorosDisconnect();
              else setShowCorosModal(true);
            }}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase transition border shadow-md disabled:opacity-50 cursor-pointer ${
              isCorosLinked
                ? "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                : "bg-[#F8283B] hover:bg-[#d61e30] border-[#F8283B] text-white"
            }`}
          >
            {isCorosLinked ? "Déconnecter" : "Connecter"}
          </button>
        </div>

        {/* STRAVA */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FC5200]/10 border border-[#FC5200]/30 flex items-center justify-center shadow-md">
              <StravaLogo className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-stone-100 uppercase">Strava Sync</h4>
              <p className="text-xs text-stone-400 mt-1">
                {isStravaLinked ? stravaEmail || "Synchronisation active" : "Traces GPS et historique"}
              </p>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Import des kilomètres réels, dénivelés et débriefing automatique des sorties.
            </p>
          </div>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isStravaLinked) handleStravaDisconnect();
              else setShowStravaModal(true);
            }}
            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase transition border shadow-md disabled:opacity-50 cursor-pointer ${
              isStravaLinked
                ? "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                : "bg-[#FC5200] hover:bg-[#e04900] border-[#FC5200] text-white"
            }`}
          >
            {isStravaLinked ? "Déconnecter" : "Connecter"}
          </button>
        </div>
      </div>

      {/* MODALE GARMIN */}
      {showGarminModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <GarminLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">Lier mon compte Garmin</h4>
              </div>
              <button
                type="button"
                onClick={() => { setShowGarminModal(false); setGarminStatusMsg(null); }}
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
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Email Garmin Connect</label>
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
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Mot de passe Garmin</label>
                <input
                  type="password"
                  required
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#007CC3]"
                />
              </div>
              {garminStatusMsg && <div className="text-[10px] text-center font-bold text-[#007CC3] py-1">{garminStatusMsg}</div>}
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

      {/* MODALE COROS */}
      {showCorosModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CorosLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">Lier mon compte COROS</h4>
              </div>
              <button
                type="button"
                onClick={() => { setShowCorosModal(false); setCorosStatusMsg(null); }}
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
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Email COROS</label>
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
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Mot de passe COROS</label>
                <input
                  type="password"
                  required
                  value={corosPassword}
                  onChange={(e) => setCorosPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#F8283B]"
                />
              </div>
              {corosStatusMsg && <div className="text-[10px] text-center font-bold text-[#F8283B] py-1">{corosStatusMsg}</div>}
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

      {/* MODALE STRAVA */}
      {showStravaModal && (
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <StravaLogo className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase text-stone-100">Lier mon compte Strava</h4>
              </div>
              <button
                type="button"
                onClick={() => { setShowStravaModal(false); setStravaStatusMsg(null); }}
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
                <label className="text-[9px] font-bold uppercase text-stone-400 block mb-1">Email ou Identifiant Strava</label>
                <input
                  type="text"
                  required
                  value={stravaEmail}
                  onChange={(e) => setStravaEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#FC5200]"
                />
              </div>
              {stravaStatusMsg && <div className="text-[10px] text-center font-bold text-[#FC5200] py-1">{stravaStatusMsg}</div>}
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
    </div>
  );
};