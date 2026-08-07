// src/app/page.tsx

'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// Types & Constantes
import {
  UserRole,
  WorkoutStep,
  Workout,
  Plan,
  Race,
  CompletedRun,
  AthleteProfile,
  WeekType,
  Shoe,
  ChatMessage,
  LibraryWorkout,
  LibraryCategory,
} from "../types";
import { DAYS_LIST } from "../constants";

// Fonctions utilitaires
import {
  calculateWeeks,
  getExactDayDate,
  getCurrentWeekNumber,
  safeFormatDateFr,
} from "../utils/calculations";

// Composants Communs
import { Header } from "../components/common/Header";
import { BottomNav, ActiveTab } from "../components/common/BottomNav";
import { DeletePlanModal } from "../components/common/DeletePlanModal";

// Auth & Profil
import { LandingScreen } from "../components/auth/LandingScreen";
import { AuthScreen } from "../components/auth/AuthScreen";
import { ProfileWizard } from "../components/profile/ProfileWizard";
import { ProfileView } from "../components/profile/ProfileView";
import { AthleteWorkoutLibraryView } from "../components/profile/AthleteWorkoutLibraryView";

// Home & Workouts
import { AthleteDashboard } from "../components/home/AthleteDashboard";
import { WorkoutEditor } from "../components/workout/WorkoutEditor";
import { WorkoutDetail } from "../components/workout/WorkoutDetail";
import { WorkoutDebriefView } from "../components/workout/WorkoutDebriefView";

// Plan & Volume
import { PlanWizard } from "../components/plan/PlanWizard";
import { ActivePlanView } from "../components/plan/ActivePlanView";

// Stats & Coach
import { AnnualStats } from "../components/stats/AnnualStats";
import { ManagedAthletes } from "../components/coach/ManagedAthletes";
import { WorkoutLibraryView } from "../components/coach/WorkoutLibraryView";

// Messagerie
import { ChatView } from "../components/chat/ChatView";
import { ConnectCoachView } from "../components/chat/ConnectCoachView";

export default function Home() {
  // Session & Supabase Auth
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Navigation & Rôle
  const [screen, setScreen] = useState<
    "landing" | "auth" | "profile_creation" | "app"
  >("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [userRole, setUserRole] = useState<UserRole>("athlete");
  const [activeTab, setActiveTab] = useState<ActiveTab>("accueil");

  // Liaison Coach / Athlète
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null);
  const [assignedCoachName, setAssignedCoachName] = useState<string>("Coach");
  const [coachCode, setCoachCode] = useState<string>("");

  // Écoute de l'état d'authentification Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const roleFromMeta = session.user?.user_metadata?.role as UserRole;
        if (roleFromMeta) {
          setUserRole(roleFromMeta);
          setActiveTab(roleFromMeta === "coach" ? "athletes" : "accueil");
        }
        setScreen("app");
      }
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const roleFromMeta = session.user?.user_metadata?.role as UserRole;
        if (roleFromMeta) {
          setUserRole(roleFromMeta);
          setActiveTab(roleFromMeta === "coach" ? "athletes" : "accueil");
        }
        setScreen("app");
      } else {
        setScreen("landing");
      }
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Affichage de la bibliothèque personnelle pour l'athlète
  const [showAthleteLibrary, setShowAthleteLibrary] = useState(false);

  // Inspection Coach & Liste des vrais athlètes
  const [inspectingAthleteId, setInspectingAthleteId] = useState<string | null>(null);
  const [managedAthletes, setManagedAthletes] = useState<AthleteProfile[]>([]);
  const isCoachInspecting = userRole === "coach" && inspectingAthleteId !== null;

  // Étape de création de profil
  const [profileStep, setProfileStep] = useState<1 | 2 | 3>(1);

  // Modales & Sélection
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [debriefWorkout, setDebriefWorkout] = useState<Workout | null>(null);
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState<Workout | null>(null);
  const [draggedStepPath, setDraggedStepPath] = useState<string[] | null>(null);

  // Utilisateur
  const [athleteName, setAthleteName] = useState("Benjamin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Métriques
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("70");
  const [vma, setVma] = useState("14.5");
  const [unknownVma, setUnknownVma] = useState(false);
  const [fcRest, setFcRest] = useState("55");
  const [fcMax, setFcMax] = useState("185");

  // Records, Palmarès & Chaussures
  const [records, setRecords] = useState<Record<string, string>>({
    r400: "1:05",
    r800: "2:20",
    r1500: "4:50",
    r3000: "10:30",
    r5k: "19:15",
    r10k: "41:30",
    rSemi: "1:32:00",
    rMarathon: "3:25:00",
  });

  const [races, setRaces] = useState<Race[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);

  const [newRace, setNewRace] = useState<{
    name: string;
    distance: string;
    time: string;
    category?: "route" | "piste" | "trail" | "nature";
    elevationGain?: string;
    utmbIndex?: string;
  }>({
    name: "",
    distance: "",
    time: "",
    category: "route",
    elevationGain: "",
    utmbIndex: "",
  });

  // Appareils Connectés
  const [connectedDevices, setConnectedDevices] = useState<Record<string, boolean>>({
    garmin: false,
    coros: false,
    strava: true,
    apple: false,
    polar: false,
  });

  const toggleDeviceConnection = (key: string) => {
    if (isCoachInspecting) return;
    setConnectedDevices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // CATÉGORIES ET BIBLIOTHÈQUE DE SÉANCES
  const [customCategories, setCustomCategories] = useState<LibraryCategory[]>([]);
  const [libraryWorkouts, setLibraryWorkouts] = useState<LibraryWorkout[]>([]);

  // HANDLERS BIBLIOTHÈQUE SYNCHRONISÉS SUR SUPABASE
  const handleAddCategory = async (label: string) => {
    if (!session?.user) return;
    const catId = `cat_${Date.now()}`;
    const newCat = { id: catId, label };
    setCustomCategories((prev) => [...prev, newCat]);

    await supabase.from("library_categories").insert([
      { id: catId, user_id: session.user.id, label }
    ]);
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!session?.user) return;
    setCustomCategories((prev) => prev.filter((c) => c.id !== catId));
    setLibraryWorkouts((prev) => prev.filter((w) => w.categoryId !== catId));

    await supabase.from("library_categories").delete().eq("id", catId);
    await supabase.from("library_workouts").delete().eq("category_id", catId);
  };

  const handleCreateNewTemplate = async (categoryId: string) => {
    if (!session?.user) return;
    const newTemplateId = `lib_${Date.now()}`;
    const selectedCategory = categoryId || customCategories[0]?.id || "default";
    const newTemplate: LibraryWorkout = {
      id: newTemplateId,
      categoryId: selectedCategory,
      title: "Nouvelle Séance Modèle",
      description: "Description de la séance...",
      km: "8",
      rpe: "6",
      steps: [],
      createdAt: new Date().toISOString().split("T")[0],
    };

    setLibraryWorkouts((prev) => [newTemplate, ...prev]);
    setEditingLibraryId(newTemplateId);

    await supabase.from("library_workouts").insert([{
      id: newTemplateId,
      user_id: session.user.id,
      category_id: selectedCategory,
      title: newTemplate.title,
      description: newTemplate.description,
      km: newTemplate.km,
      rpe: newTemplate.rpe,
      steps: newTemplate.steps,
    }]);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!session?.user) return;
    setLibraryWorkouts((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("library_workouts").delete().eq("id", id);
  };

  const handleSaveLibraryWorkoutToSupabase = async (updatedLib: LibraryWorkout) => {
    if (!session?.user) return;
    await supabase.from("library_workouts").upsert({
      id: updatedLib.id,
      user_id: session.user.id,
      category_id: updatedLib.categoryId,
      title: updatedLib.title,
      description: updatedLib.description,
      km: updatedLib.km,
      rpe: updatedLib.rpe,
      steps: updatedLib.steps,
    });
  };

  // Messages de discussion & Handlers synchronisés Supabase
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const selectedAthlete = managedAthletes.find((a) => a.id === inspectingAthleteId);

  const handleSendMessage = async (text: string, targetAthleteId?: string) => {
    if (!session?.user) return;

    const targetId = targetAthleteId || inspectingAthleteId || session.user.id;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = userRole === "coach" ? (session?.user?.user_metadata?.full_name || "Coach") : athleteName;

    const newMsg: ChatMessage = {
      id: msgId,
      senderRole: userRole,
      senderName,
      athleteId: targetId,
      text,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      await supabase.from("messages").insert([
        {
          id: msgId,
          athlete_id: targetId,
          sender_id: session.user.id,
          sender_role: userRole,
          sender_name: senderName,
          text,
          timestamp: timeStr,
        },
      ]);
    } catch (err) {
      console.error("Erreur envoi message Supabase:", err);
    }
  };

  // Historique des sorties (Stats)
  const [completedRuns, setCompletedRuns] = useState<CompletedRun[]>([]);

  // Plans d'entraînement
  const [goal, setGoal] = useState("10 km");
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [archivedPlans, setArchivedPlans] = useState<Plan[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planCreationStep, setPlanCreationStep] = useState<1 | 2>(1);
  const [selectedPlanWeek, setSelectedPlanWeek] = useState<number>(1);
  const [completedWorkouts, setCompletedWorkouts] = useState<Record<string, boolean>>({});

  // CHARGEMENT DE LA LISTE DES ATHLÈTES POUR LE COACH
  useEffect(() => {
    if (!session?.user || userRole !== "coach") return;

    const fetchAthletes = async () => {
      // 1. Récupérer/Générer le Code Coach unique du coach connecté
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("coach_code")
        .eq("id", session.user.id)
        .maybeSingle();

      if (myProfile?.coach_code) {
        setCoachCode(myProfile.coach_code);
      } else {
        const generatedCode = `COACH-${Math.floor(1000 + Math.random() * 9000)}`;
        setCoachCode(generatedCode);
        await supabase.from("profiles").update({ coach_code: generatedCode }).eq("id", session.user.id);
      }

      // 2. Charger les athlètes rattachés à ce coach
      const { data: athletesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("coach_id", session.user.id)
        .eq("role", "athlete");

      if (athletesData) {
        setManagedAthletes(
          athletesData.map((a: any) => ({
            id: a.id,
            name: a.full_name || a.email || "Athlète Sans Nom",
            email: a.email || "",
            vma: a.vma ? `${a.vma} km/h` : "N/A",
            activePlanName: "Plan en cours",
            weeklyVolume: "0 km",
            upcomingRace: "Aucune",
            weeksToRace: 0,
            targetGoal: "En cours de définition",
            hasUnreadMessage: false,
            joinedDate: a.created_at ? a.created_at.split("T")[0] : "",
            height: a.height ? `${a.height} cm` : "N/A",
            weight: a.weight ? `${a.weight} kg` : "N/A",
            fcRest: a.fc_rest ? `${a.fc_rest} bpm` : "N/A",
            fcMax: a.fc_max ? `${a.fc_max} bpm` : "N/A",
            records: a.records || {},
          }))
        );
      }
    };

    fetchAthletes();
  }, [session, userRole]);

  // CHARGEMENT AUTOMATIQUE INTÉGRAL DEPUIS SUPABASE
  useEffect(() => {
    if (!session?.user) return;

    const targetUserId = isCoachInspecting ? inspectingAthleteId : session.user.id;
    if (!targetUserId) return;

    const fetchUserData = async () => {
      // 1. Profil & Vérification du Coach rattaché
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, coach:coach_id(full_name)")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profile) {
        if (!isCoachInspecting) {
          if (profile.full_name) setAthleteName(profile.full_name);
          if (profile.coach_id) {
            setAssignedCoachId(profile.coach_id);
            setAssignedCoachName((profile as any).coach?.full_name || "Votre Entraîneur");
          } else {
            setAssignedCoachId(null);
          }
        }
        if (profile.height) setHeight(profile.height.toString());
        if (profile.weight) setWeight(profile.weight.toString());
        if (profile.vma) setVma(profile.vma.toString());
        if (profile.fc_rest) setFcRest(profile.fc_rest.toString());
        if (profile.fc_max) setFcMax(profile.fc_max.toString());
        if (profile.records && typeof profile.records === 'object') {
          setRecords(profile.records);
        }
      }

      // 2. Sorties effectuées (Stats)
      const { data: runs } = await supabase
        .from("completed_runs")
        .select("*")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false });

      if (runs) {
        setCompletedRuns(runs.map((r: any) => ({
          id: r.id,
          date: r.date,
          km: Number(r.km),
          durationHours: Number(r.duration_hours),
          elevation: Number(r.elevation),
          raceNotes: r.race_notes,
        })));
      }

      // 3. Messages de la discussion
      const { data: msgsData } = await supabase
        .from("messages")
        .select("*")
        .eq("athlete_id", targetUserId)
        .order("created_at", { ascending: true });

      if (msgsData) {
        setMessages(msgsData.map((m: any) => ({
          id: m.id,
          senderRole: m.sender_role,
          senderName: m.sender_name,
          athleteId: m.athlete_id,
          text: m.text,
          timestamp: m.timestamp,
        })));
      }

      // 4. Palmarès des courses
      const { data: racesData } = await supabase
        .from("races")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (racesData) {
        setRaces(racesData.map((r: any) => ({
          id: r.id,
          name: r.name,
          distance: r.distance,
          time: r.time,
          category: r.category,
          elevationGain: r.elevation_gain,
          utmbIndex: r.utmb_index,
        })));
      }

      // 5. Chaussures
      const { data: shoesData } = await supabase
        .from("shoes")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (shoesData) {
        setShoes(shoesData.map((s: any) => ({
          id: s.id,
          brand: s.brand,
          name: s.name,
          currentKm: Number(s.current_km),
          maxKm: Number(s.max_km),
          isActive: s.is_active,
        })));
      }

      // 6. Catégories de la bibliothèque
      const { data: catsData } = await supabase
        .from("library_categories")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (catsData) {
        setCustomCategories(catsData.map((c: any) => ({ id: c.id, label: c.label })));
      }

      // 7. Séances modèles de la bibliothèque
      const { data: libraryData } = await supabase
        .from("library_workouts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (libraryData) {
        setLibraryWorkouts(libraryData.map((l: any) => ({
          id: l.id,
          categoryId: l.category_id,
          title: l.title,
          description: l.description,
          km: l.km,
          rpe: l.rpe,
          steps: l.steps || [],
          createdAt: l.created_at?.split("T")[0] || "",
        })));
      }

      // 8. Plan Actif, Plans Archivés et État des séances
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (plansData && plansData.length > 0) {
        const activePlanDb = plansData.find((p: any) => p.is_active && !p.is_archived);
        const archivedPlansDb = plansData.filter((p: any) => p.is_archived);

        const { data: workoutsData } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", targetUserId);

        const completedMap: Record<string, boolean> = {};

        const formatWorkoutsList = (wData: any[]): Workout[] => {
          return (wData || []).map((w: any) => {
            if (w.completed_rpe !== null || w.completed_km !== null) {
              completedMap[w.id] = true;
            }
            return {
              id: w.id,
              weekNumber: w.week_number,
              dayIndex: w.day_index,
              dayName: w.day_name,
              sessionName: w.session_name,
              isRest: w.is_rest,
              type: w.type,
              title: w.title,
              description: w.description,
              km: w.km,
              rpe: w.rpe,
              remark: w.remark,
              steps: w.steps || [],
              completedRpe: w.completed_rpe,
              athleteComment: w.athlete_comment,
              shoeId: w.shoe_id,
              completedKm: w.completed_km,
              completedTimeMinutes: w.completed_time_minutes,
              completedElevationGain: w.completed_elevation_gain,
            };
          });
        };

        if (activePlanDb) {
          const planWorkouts = formatWorkoutsList(
            (workoutsData || []).filter((w: any) => w.plan_id === activePlanDb.id)
          );

          setActivePlan({
            id: activePlanDb.id,
            name: activePlanDb.name,
            targetDistance: activePlanDb.target_distance,
            targetTime: activePlanDb.target_time,
            raceCategory: activePlanDb.race_category,
            elevationGain: activePlanDb.elevation_gain,
            startDate: activePlanDb.start_date,
            eventDate: activePlanDb.event_date,
            durationWeeks: activePlanDb.duration_weeks,
            weekTypes: activePlanDb.week_types || {},
            workouts: planWorkouts,
          });

          setGoal(activePlanDb.target_distance);
        } else {
          setActivePlan(null);
        }

        if (archivedPlansDb.length > 0) {
          setArchivedPlans(
            archivedPlansDb.map((p: any) => ({
              id: p.id,
              name: p.name,
              targetDistance: p.target_distance,
              targetTime: p.target_time,
              raceCategory: p.race_category,
              elevationGain: p.elevation_gain,
              startDate: p.start_date,
              eventDate: p.event_date,
              durationWeeks: p.duration_weeks,
              weekTypes: p.week_types || {},
              workouts: formatWorkoutsList(
                (workoutsData || []).filter((w: any) => w.plan_id === p.id)
              ),
            }))
          );
        }

        setCompletedWorkouts(completedMap);
      } else {
        setActivePlan(null);
        setArchivedPlans([]);
      }
    };

    fetchUserData();
  }, [session, inspectingAthleteId, isCoachInspecting]);

  // SAUVEGARDE UNIFIÉE DU PROFIL
  const saveProfileToSupabase = async (updatedFields: {
    fullName?: string;
    heightVal?: string;
    weightVal?: string;
    vmaVal?: string;
    fcRestVal?: string;
    fcMaxVal?: string;
    recordsMap?: Record<string, string>;
  }) => {
    if (!session?.user) return;
    const targetUserId = isCoachInspecting ? inspectingAthleteId : session.user.id;
    if (!targetUserId) return;

    try {
      const payload: any = {};

      if (updatedFields.fullName !== undefined) payload.full_name = updatedFields.fullName;
      if (updatedFields.heightVal !== undefined) payload.height = updatedFields.heightVal ? parseFloat(updatedFields.heightVal) : null;
      if (updatedFields.weightVal !== undefined) payload.weight = updatedFields.weightVal ? parseFloat(updatedFields.weightVal) : null;
      if (updatedFields.vmaVal !== undefined) payload.vma = updatedFields.vmaVal ? parseFloat(updatedFields.vmaVal) : null;
      if (updatedFields.fcRestVal !== undefined) payload.fc_rest = updatedFields.fcRestVal ? parseFloat(updatedFields.fcRestVal) : null;
      if (updatedFields.fcMaxVal !== undefined) payload.fc_max = updatedFields.fcMaxVal ? parseFloat(updatedFields.fcMaxVal) : null;
      if (updatedFields.recordsMap !== undefined) payload.records = updatedFields.recordsMap;

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", targetUserId);

      if (updatedFields.fullName !== undefined && !isCoachInspecting) {
        await supabase.auth.updateUser({
          data: { full_name: updatedFields.fullName },
        });
      }

      if (error) {
        console.error("❌ Erreur sauvegarde profil Supabase:", error.message);
        alert(`Erreur de sauvegarde : ${error.message}`);
      } else {
        console.log("✅ Profil et records enregistrés !");
      }
    } catch (err) {
      console.error("Erreur réseau sauvegarde profil:", err);
    }
  };

  // HANDLERS COURSES
  const handleAddRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoachInspecting || !session?.user || !newRace.name || !newRace.time) return;

    const racePayload = {
      user_id: session.user.id,
      name: newRace.name,
      distance: newRace.distance || "10 km",
      time: newRace.time,
      category: newRace.category || "route",
      elevation_gain: newRace.elevationGain ? parseFloat(newRace.elevationGain) : null,
      utmb_index: newRace.utmbIndex ? parseFloat(newRace.utmbIndex) : null,
    };

    const { data, error } = await supabase.from("races").insert([racePayload]).select().single();

    if (!error && data) {
      setRaces([{
        id: data.id,
        name: data.name,
        distance: data.distance,
        time: data.time,
        category: data.category,
        elevationGain: data.elevation_gain,
        utmbIndex: data.utmb_index,
      }, ...races]);
      setNewRace({ name: "", distance: "", time: "", category: "route", elevationGain: "", utmbIndex: "" });
    }
  };

  const handleDeleteRace = async (id: string) => {
    if (isCoachInspecting || !session?.user) return;
    setRaces((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("races").delete().eq("id", id);
  };

  // HANDLERS CHAUSSURES
  const handleAddShoe = async (newShoe: Shoe) => {
    if (isCoachInspecting || !session?.user) return;

    const { data, error } = await supabase.from("shoes").insert([{
      user_id: session.user.id,
      brand: newShoe.brand,
      name: newShoe.name,
      current_km: newShoe.currentKm,
      max_km: newShoe.maxKm,
      is_active: true,
    }]).select().single();

    if (!error && data) {
      setShoes([{
        id: data.id,
        brand: data.brand,
        name: data.name,
        currentKm: Number(data.current_km),
        maxKm: Number(data.max_km),
        isActive: data.is_active,
      }, ...shoes]);
    }
  };

  const handleDeleteShoe = async (id: string) => {
    if (isCoachInspecting || !session?.user) return;
    setShoes((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("shoes").delete().eq("id", id);
  };

  const handleToggleActiveShoe = async (id: string) => {
    if (isCoachInspecting || !session?.user) return;
    const target = shoes.find((s) => s.id === id);
    if (!target) return;

    const nextState = !target.isActive;
    setShoes((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: nextState } : s)));
    await supabase.from("shoes").update({ is_active: nextState }).eq("id", id);
  };

  // HANDLERS AJOUT ET SUPPRESSION DE SORTIE MANUELLE (STATS)
  const handleAddCompletedRun = async (run: CompletedRun) => {
    if (isCoachInspecting || !session?.user) return;

    const runId = run.id || `run_${Date.now()}`;
    const newRunObj = { ...run, id: runId };

    setCompletedRuns((prev) => [newRunObj, ...prev]);
    setShoes((prevShoes) =>
      prevShoes.map((shoe) =>
        shoe.isActive ? { ...shoe, currentKm: shoe.currentKm + run.km } : shoe
      )
    );

    try {
      await supabase.from("completed_runs").insert([
        {
          id: runId,
          user_id: session.user.id,
          date: run.date,
          km: run.km,
          duration_hours: run.durationHours,
          elevation: run.elevation || 0,
          race_notes: run.raceNotes || null,
        },
      ]);
    } catch (err) {
      console.error("Erreur réseau Supabase:", err);
    }
  };

  const handleDeleteCompletedRun = async (runId: string) => {
    if (isCoachInspecting || !session?.user) return;
    setCompletedRuns((prev) => prev.filter((r) => r.id !== runId));
    await supabase.from("completed_runs").delete().eq("id", runId);
  };

  // Accordéons de semaines
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [openCreationWeeks, setOpenCreationWeeks] = useState<Record<number, boolean>>({});

  const toggleWeekAccordion = (wNum: number) => {
    setOpenWeeks((prev) => ({ ...prev, [wNum]: !prev[wNum] }));
  };

  const toggleCreationWeekAccordion = (wNum: number) => {
    setOpenCreationWeeks((prev) => ({ ...prev, [wNum]: !prev[wNum] }));
  };

  // Formulaire & Brouillon de Plan
  const [draftWeekTypes, setDraftWeekTypes] = useState<
    Record<number, { type: WeekType; customLabel?: string }>
  >({});
  const [draftWorkouts, setDraftWorkouts] = useState<Workout[]>([]);

  const [newPlanForm, setNewPlanForm] = useState<{
    name: string;
    raceCategory: "route" | "piste" | "trail" | "nature";
    roadPreset: string;
    trackPreset: string;
    customDistance: string;
    targetTime: string;
    elevationGain: string;
    startDate: string;
    eventDate: string;
  }>({
    name: "",
    raceCategory: "route",
    roadPreset: "10 km",
    trackPreset: "5 000 m",
    customDistance: "",
    targetTime: "",
    elevationGain: "",
    startDate: new Date().toISOString().split("T")[0],
    eventDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  // HANDLERS AUTHENTIFICATION SUPABASE (SÉPARATION ATHLÈTE / COACH VIA +COACH ALIAS)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedEmail = userRole === "coach"
      ? email.replace("@", "+coach@")
      : email;

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: formattedEmail,
          password,
          options: {
            data: {
              full_name: athleteName,
              role: userRole,
            },
          },
        });
        if (error) throw error;

        if (userRole === "coach") {
          setActiveTab("athletes");
          setScreen("app");
        } else {
          setProfileStep(1);
          setScreen("profile_creation");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password,
        });
        if (error) throw error;

        setActiveTab(userRole === "coach" ? "athletes" : "accueil");
        setScreen("app");
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'authentification.");
    }
  };

  const handleSocialAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || "Erreur lors de la connexion Google.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setScreen("landing");
  };

  // HANDLERS ARCHIVAGE & SUPPRESSION PLAN SYNCHRONISÉS SUPABASE
  const handleArchiveActivePlan = async () => {
    const targetUserId = isCoachInspecting ? inspectingAthleteId : session?.user?.id;
    if (activePlan && targetUserId) {
      setArchivedPlans([{ ...activePlan }, ...archivedPlans]);
      setActivePlan(null);

      await supabase.from("plans").update({
        is_active: false,
        is_archived: true,
      }).eq("id", activePlan.id);
    }
    setIsCreatingPlan(true);
    setPlanCreationStep(1);
    setShowDeletePlanModal(false);
  };

  const handleDeleteActivePlan = async () => {
    if (activePlan) {
      await supabase.from("plans").delete().eq("id", activePlan.id);
      setActivePlan(null);
    }
    setIsCreatingPlan(true);
    setPlanCreationStep(1);
    setShowDeletePlanModal(false);
  };

  // HANDLERS CRÉATION / MODIFICATION PLAN
  const handleStartEmptyWorkoutSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const weeks = calculateWeeks(newPlanForm.startDate, newPlanForm.eventDate);

    const initialWeekTypes: Record<number, { type: WeekType; customLabel?: string }> = {};
    for (let w = 1; w <= weeks; w++) {
      if (w === weeks) initialWeekTypes[w] = { type: "affutage" };
      else if (w % 4 === 0) initialWeekTypes[w] = { type: "recup" };
      else if (w % 2 === 0) initialWeekTypes[w] = { type: "specifique" };
      else initialWeekTypes[w] = { type: "charge" };
    }
    setDraftWeekTypes(initialWeekTypes);

    const initialWorkouts: Workout[] = [];
    for (let w = 1; w <= weeks; w++) {
      DAYS_LIST.forEach((dayName, dIdx) => {
        initialWorkouts.push({
          id: `w${w}_d${dIdx}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          weekNumber: w,
          dayIndex: dIdx,
          dayName: dayName,
          sessionName: "",
          isRest: true,
          type: "repos",
          title: "Repos",
          description: "",
          km: "",
          rpe: "1",
          remark: "",
          steps: [],
        });
      });
    }

    setDraftWorkouts(initialWorkouts);
    setOpenCreationWeeks({ 1: true });
    setPlanCreationStep(2);
  };

  const handleEditActivePlan = () => {
    if (!activePlan) return;
    setDraftWorkouts([...activePlan.workouts]);
    setDraftWeekTypes(activePlan.weekTypes ? { ...activePlan.weekTypes } : {});
    setNewPlanForm({
      name: activePlan.name,
      raceCategory: activePlan.raceCategory || "route",
      roadPreset: activePlan.targetDistance,
      trackPreset: "5 000 m",
      customDistance: "",
      targetTime: activePlan.targetTime || "",
      elevationGain: activePlan.elevationGain ? activePlan.elevationGain.toString() : "",
      startDate: activePlan.startDate,
      eventDate: activePlan.eventDate,
    });
    setIsCreatingPlan(true);
    setPlanCreationStep(2);
  };

  const handleUpdateWeekType = (weekNum: number, type: WeekType, customLabel?: string) => {
    setDraftWeekTypes((prev) => ({ ...prev, [weekNum]: { type, customLabel } }));
  };

  const handleAddWorkoutToDay = (weekNumber: number, dayIndex: number) => {
    const dayName = DAYS_LIST[dayIndex];
    const existingForDay = draftWorkouts.filter(
      (w) => w.weekNumber === weekNumber && w.dayIndex === dayIndex
    );
    const sessionNum = existingForDay.length + 1;
    const newId = `w${weekNumber}_d${dayIndex}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const newWorkout: Workout = {
      id: newId,
      weekNumber,
      dayIndex,
      dayName,
      sessionName: `Séance ${sessionNum}`,
      isRest: false,
      type: "footing",
      title: `Nouvelle Séance`,
      description: "45 min d'endurance fondamentale",
      km: "8",
      rpe: "5",
      remark: "",
      steps: [],
    };

    setDraftWorkouts((prev) => [...prev, newWorkout]);
    setEditingWorkoutId(newId);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    setDraftWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  const handleUpdateDraftWorkout = (id: string, field: keyof Workout, value: any) => {
    setDraftWorkouts((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          if (field === "isRest" && value === true) {
            return {
              ...w,
              isRest: true,
              type: "repos",
              title: "Repos",
              description: "",
              km: "0",
              rpe: "1",
              steps: [],
            };
          }
          if (field === "isRest" && value === false) {
            return {
              ...w,
              isRest: false,
              type: "footing",
              title: "Nouvelle Séance",
              description: "45 min d'endurance fondamentale",
              km: "8",
              rpe: "5",
              steps: [],
            };
          }
          return { ...w, [field]: value };
        }
        return w;
      })
    );
  };

  // RECURSIVE STEPS
  const updateNestedStepsRecursive = (
    stepList: WorkoutStep[],
    targetPath: string[],
    action: "add" | "update" | "delete",
    payload?: { field?: keyof WorkoutStep; value?: any; newStep?: WorkoutStep }
  ): WorkoutStep[] => {
    if (targetPath.length === 0) {
      if (action === "add" && payload?.newStep) return [...stepList, payload.newStep];
      return stepList;
    }

    const [currentIndexStr, ...remainingPath] = targetPath;
    const currentIndex = parseInt(currentIndexStr, 10);

    return stepList
      .map((step, idx) => {
        if (idx !== currentIndex) return step;

        if (remainingPath.length === 0) {
          if (action === "delete") return null as any;
          if (action === "update" && payload?.field) {
            return { ...step, [payload.field]: payload.value };
          }
          if (action === "add" && payload?.newStep) {
            return {
              ...step,
              nestedSteps: [...(step.nestedSteps || []), payload.newStep],
            };
          }
        } else if (step.type === "repeat") {
          return {
            ...step,
            nestedSteps: updateNestedStepsRecursive(
              step.nestedSteps || [],
              remainingPath,
              action,
              payload
            ),
          };
        }
        return step;
      })
      .filter(Boolean);
  };

  const handleAddStepToWorkout = (workoutId: string, parentPath: string[] = []) => {
    const newStep: WorkoutStep = {
      id: `step_${Date.now()}_${Math.random()}`,
      type: "corps",
      durationOrDist: "1000m",
      endCondition: "distance",
      goalType: "allure",
      goalValue: "4:30 min/km",
      reps: 5,
      nestedSteps: [],
    };

    if (editingLibraryId) {
      setLibraryWorkouts((prev) =>
        prev.map((lib) => {
          if (lib.id === editingLibraryId) {
            const updatedSteps = updateNestedStepsRecursive(lib.steps, parentPath, "add", { newStep });
            const updatedLib = { ...lib, steps: updatedSteps };
            handleSaveLibraryWorkoutToSupabase(updatedLib);
            return updatedLib;
          }
          return lib;
        })
      );
    } else {
      setDraftWorkouts((prev) =>
        prev.map((w) => {
          if (w.id === workoutId) {
            return {
              ...w,
              steps: updateNestedStepsRecursive(w.steps, parentPath, "add", { newStep }),
            };
          }
          return w;
        })
      );
    }
  };

  const handleUpdateStepInWorkout = (
    workoutId: string,
    stepPath: string[],
    field: keyof WorkoutStep,
    value: any
  ) => {
    if (editingLibraryId) {
      setLibraryWorkouts((prev) =>
        prev.map((lib) => {
          if (lib.id === editingLibraryId) {
            const updatedSteps = updateNestedStepsRecursive(lib.steps, stepPath, "update", { field, value });
            const updatedLib = { ...lib, steps: updatedSteps };
            handleSaveLibraryWorkoutToSupabase(updatedLib);
            return updatedLib;
          }
          return lib;
        })
      );
    } else {
      setDraftWorkouts((prev) =>
        prev.map((w) => {
          if (w.id === workoutId) {
            return {
              ...w,
              steps: updateNestedStepsRecursive(w.steps, stepPath, "update", { field, value }),
            };
          }
          return w;
        })
      );
    }
  };

  const handleDeleteStepInWorkout = (workoutId: string, stepPath: string[]) => {
    if (editingLibraryId) {
      setLibraryWorkouts((prev) =>
        prev.map((lib) => {
          if (lib.id === editingLibraryId) {
            const updatedSteps = updateNestedStepsRecursive(lib.steps, stepPath, "delete");
            const updatedLib = { ...lib, steps: updatedSteps };
            handleSaveLibraryWorkoutToSupabase(updatedLib);
            return updatedLib;
          }
          return lib;
        })
      );
    } else {
      setDraftWorkouts((prev) =>
        prev.map((w) => {
          if (w.id === workoutId) {
            return {
              ...w,
              steps: updateNestedStepsRecursive(w.steps, stepPath, "delete"),
            };
          }
          return w;
        })
      );
    }
  };

  const handleMoveStepInWorkout = (
    workoutId: string,
    stepPath: string[],
    direction: "up" | "down"
  ) => {
    const applyMove = (list: WorkoutStep[]) => {
      const parentPath = stepPath.slice(0, -1);
      const currentIndex = parseInt(stepPath[stepPath.length - 1], 10);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      const reorderList = (steps: WorkoutStep[]): WorkoutStep[] => {
        if (targetIndex < 0 || targetIndex >= steps.length) return steps;
        const updated = [...steps];
        const [movedItem] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, movedItem);
        return updated;
      };

      const updateRecursive = (steps: WorkoutStep[], pPath: string[]): WorkoutStep[] => {
        if (pPath.length === 0) return reorderList(steps);
        const [head, ...tail] = pPath;
        const idx = parseInt(head, 10);
        return steps.map((item, i) => {
          if (i !== idx) return item;
          return {
            ...item,
            nestedSteps: updateRecursive(item.nestedSteps || [], tail),
          };
        });
      };

      return updateRecursive(list, parentPath);
    };

    if (editingLibraryId) {
      setLibraryWorkouts((prev) =>
        prev.map((lib) => {
          if (lib.id === editingLibraryId) {
            const updatedLib = { ...lib, steps: applyMove(lib.steps) };
            handleSaveLibraryWorkoutToSupabase(updatedLib);
            return updatedLib;
          }
          return lib;
        })
      );
    } else {
      setDraftWorkouts((prev) =>
        prev.map((w) => (w.id === workoutId ? { ...w, steps: applyMove(w.steps) } : w))
      );
    }
  };

  const handleDropStepInWorkout = (workoutId: string, targetPath: string[]) => {
    if (!draggedStepPath) return;

    const sourceParent = draggedStepPath.slice(0, -1).join("-");
    const targetParent = targetPath.slice(0, -1).join("-");

    if (sourceParent !== targetParent) {
      setDraggedStepPath(null);
      return;
    }

    const fromIdx = parseInt(draggedStepPath[draggedStepPath.length - 1], 10);
    const toIdx = parseInt(targetPath[targetPath.length - 1], 10);

    if (fromIdx === toIdx) {
      setDraggedStepPath(null);
      return;
    }

    const applyDrop = (list: WorkoutStep[]) => {
      const parentPath = draggedStepPath.slice(0, -1);

      const swapList = (steps: WorkoutStep[]): WorkoutStep[] => {
        const updated = [...steps];
        const [movedItem] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, movedItem);
        return updated;
      };

      const updateRecursive = (steps: WorkoutStep[], pPath: string[]): WorkoutStep[] => {
        if (pPath.length === 0) return swapList(steps);
        const [head, ...tail] = pPath;
        const idx = parseInt(head, 10);
        return steps.map((item, i) => {
          if (i !== idx) return item;
          return {
            ...item,
            nestedSteps: updateRecursive(item.nestedSteps || [], tail),
          };
        });
      };

      return updateRecursive(list, parentPath);
    };

    if (editingLibraryId) {
      setLibraryWorkouts((prev) =>
        prev.map((lib) => {
          if (lib.id === editingLibraryId) {
            const updatedLib = { ...lib, steps: applyDrop(lib.steps) };
            handleSaveLibraryWorkoutToSupabase(updatedLib);
            return updatedLib;
          }
          return lib;
        })
      );
    } else {
      setDraftWorkouts((prev) =>
        prev.map((w) => (w.id === workoutId ? { ...w, steps: applyDrop(w.steps) } : w))
      );
    }

    setDraggedStepPath(null);
  };

  // FINALISATION ET SAUVEGARDE DU PLAN DANS SUPABASE
  const handleFinalizePlan = async () => {
    if (!session?.user) return;

    const targetUserId = isCoachInspecting ? inspectingAthleteId : session.user.id;
    if (!targetUserId) return;

    const calculatedWeeks = calculateWeeks(newPlanForm.startDate, newPlanForm.eventDate);

    let formattedDistance = "";
    if (newPlanForm.raceCategory === "route") {
      formattedDistance =
        newPlanForm.roadPreset === "custom"
          ? newPlanForm.customDistance
            ? `${newPlanForm.customDistance} km`
            : "Route"
          : newPlanForm.roadPreset;
    } else if (newPlanForm.raceCategory === "piste") {
      formattedDistance =
        newPlanForm.trackPreset === "custom"
          ? newPlanForm.customDistance || "Piste"
          : newPlanForm.trackPreset;
    } else {
      const catLabel = newPlanForm.raceCategory === "trail" ? "Trail" : "Course Nature";
      const dist = newPlanForm.customDistance ? `${newPlanForm.customDistance} km` : catLabel;
      const elev = newPlanForm.elevationGain ? ` (${newPlanForm.elevationGain}m D+)` : "";
      formattedDistance = `${dist}${elev}`;
    }

    const planId = activePlan ? activePlan.id : `plan_${Date.now()}`;

    await supabase
      .from("plans")
      .update({ is_active: false })
      .eq("user_id", targetUserId);

    const { error: planError } = await supabase.from("plans").upsert({
      id: planId,
      user_id: targetUserId,
      name: newPlanForm.name || `Plan ${formattedDistance}`,
      target_distance: formattedDistance,
      target_time: newPlanForm.targetTime || null,
      race_category: newPlanForm.raceCategory,
      elevation_gain: newPlanForm.elevationGain ? parseFloat(newPlanForm.elevationGain) : null,
      start_date: newPlanForm.startDate,
      event_date: newPlanForm.eventDate,
      duration_weeks: calculatedWeeks.toString(),
      week_types: draftWeekTypes,
      is_active: true,
      is_archived: false,
    });

    if (planError) {
      console.error("❌ Erreur sauvegarde plan:", planError.message);
      return;
    }

    await supabase.from("workouts").delete().eq("plan_id", planId);

    const usedIds = new Set<string>();
    const workoutsPayload = draftWorkouts.map((w, idx) => {
      let uniqueId = w.id;
      if (!uniqueId || usedIds.has(uniqueId)) {
        uniqueId = `w_${planId}_${w.weekNumber}_${w.dayIndex}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      }
      usedIds.add(uniqueId);

      return {
        id: uniqueId,
        plan_id: planId,
        user_id: targetUserId,
        week_number: w.weekNumber,
        day_index: w.dayIndex,
        day_name: w.dayName,
        session_name: w.sessionName,
        is_rest: w.isRest,
        type: w.type,
        title: w.title,
        description: w.description,
        km: w.km,
        rpe: w.rpe,
        remark: w.remark,
        steps: w.steps || [],
        completed_rpe: w.completedRpe || null,
        athlete_comment: w.athleteComment || null,
        shoe_id: w.shoeId || null,
        completed_km: w.completedKm || null,
        completed_time_minutes: w.completedTimeMinutes || null,
        completed_elevation_gain: w.completedElevationGain || null,
      };
    });

    const { error: workoutsError } = await supabase.from("workouts").upsert(workoutsPayload);

    if (workoutsError) {
      console.error("❌ Erreur sauvegarde séances:", workoutsError.message);
    } else {
      console.log("✅ Plan & séances synchronisés avec Supabase !");
    }

    const createdPlan: Plan = {
      id: planId,
      name: newPlanForm.name || `Plan ${formattedDistance}`,
      targetDistance: formattedDistance,
      targetTime: newPlanForm.targetTime || undefined,
      raceCategory: newPlanForm.raceCategory,
      elevationGain: newPlanForm.elevationGain ? parseFloat(newPlanForm.elevationGain) : undefined,
      startDate: newPlanForm.startDate,
      eventDate: newPlanForm.eventDate,
      durationWeeks: calculatedWeeks.toString(),
      weekTypes: draftWeekTypes,
      workouts: draftWorkouts,
    };

    const currentWeekNum = getCurrentWeekNumber(
      newPlanForm.startDate,
      calculatedWeeks.toString()
    );

    setActivePlan(createdPlan);
    setGoal(formattedDistance);
    setIsCreatingPlan(false);
    setPlanCreationStep(1);
    setSelectedPlanWeek(currentWeekNum);
    setOpenWeeks({ [currentWeekNum]: true });
    setCompletedWorkouts({});
    setActiveTab("plan");
  };

  const toggleWorkout = (id: string) => {
    if (isCoachInspecting) return;
    setCompletedWorkouts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // HANDLER POUR SAUVEGARDER LE DÉBRIEFING D'UNE SÉANCE
  const handleSaveDebrief = async ({
    workoutId,
    completedRpe,
    comment,
    shoeId,
    completedKm,
    completedTimeMinutes,
    completedElevationGain,
  }: {
    workoutId: string;
    completedRpe: number;
    comment: string;
    shoeId: string;
    completedKm: number;
    completedTimeMinutes: number;
    completedElevationGain: number;
  }) => {
    if (shoeId && completedKm > 0) {
      setShoes((prevShoes) =>
        prevShoes.map((shoe) =>
          shoe.id === shoeId
            ? { ...shoe, currentKm: shoe.currentKm + completedKm }
            : shoe
        )
      );
    }

    if (activePlan) {
      const updatedWorkouts = activePlan.workouts.map((w) => {
        if (w.id === workoutId) {
          return {
            ...w,
            completedRpe,
            athleteComment: comment,
            shoeId,
            completedKm,
            completedTimeMinutes,
            completedElevationGain,
          };
        }
        return w;
      });

      setActivePlan({ ...activePlan, workouts: updatedWorkouts });
    }

    if (session?.user) {
      await supabase.from("workouts").update({
        completed_rpe: completedRpe,
        athlete_comment: comment,
        shoe_id: shoeId || null,
        completed_km: completedKm,
        completed_time_minutes: completedTimeMinutes,
        completed_elevation_gain: completedElevationGain,
      }).eq("id", workoutId);

      if (completedKm > 0) {
        const runDate = new Date().toISOString().split("T")[0];
        const durationHours = completedTimeMinutes / 60;
        const runId = `debrief_${workoutId}_${Date.now()}`;

        const newRunObj: CompletedRun = {
          id: runId,
          date: runDate,
          km: completedKm,
          durationHours,
          elevation: completedElevationGain,
        };

        setCompletedRuns((prev) => [newRunObj, ...prev]);

        try {
          await supabase.from("completed_runs").insert([
            {
              id: runId,
              user_id: session.user.id,
              date: runDate,
              km: completedKm,
              duration_hours: durationHours,
              elevation: completedElevationGain || 0,
              race_notes: comment || null,
            },
          ]);
        } catch (err) {
          console.error("Erreur sauvegarde débriefing Supabase:", err);
        }
      }
    }

    setCompletedWorkouts((prev) => ({ ...prev, [workoutId]: true }));
    setDebriefWorkout(null);
  };

  const getTodayWorkouts = (plan: Plan | null) => {
    if (!plan) return [];
    const todayStr = safeFormatDateFr(new Date().toISOString().split("T")[0]);
    const matches = plan.workouts.filter(
      (w) => getExactDayDate(plan.startDate, w.weekNumber, w.dayIndex) === todayStr
    );
    if (matches.length > 0) return matches;

    const todayObj = new Date();
    const jsDay = todayObj.getDay();
    const dayIdxMap = [6, 0, 1, 2, 3, 4, 5];
    const currentDayIdx = dayIdxMap[jsDay];

    return plan.workouts.filter(
      (w) => w.weekNumber === selectedPlanWeek && w.dayIndex === currentDayIdx
    );
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400 text-xs font-bold uppercase tracking-widest">
        Chargement de Volaris...
      </div>
    );
  }

  // ROUTING ÉCRANS AUTH & CRÉATION DE PROFIL
  if (screen === "landing") {
    return <LandingScreen onNavigateToAuth={() => setScreen("auth")} />;
  }

  if (screen === "auth") {
    return (
      <AuthScreen
        userRole={userRole}
        setUserRole={setUserRole}
        authMode={authMode}
        setAuthMode={setAuthMode}
        athleteName={athleteName}
        setAthleteName={setAthleteName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onBack={() => setScreen("landing")}
        onSubmit={handleAuthSubmit}
        onSocialAuth={handleSocialAuth}
      />
    );
  }

  if (screen === "profile_creation") {
    return (
      <ProfileWizard
        profileStep={profileStep}
        setProfileStep={setProfileStep}
        athleteName={athleteName}
        setAthleteName={setAthleteName}
        height={height}
        setHeight={setHeight}
        weight={weight}
        setWeight={setWeight}
        vma={vma}
        setVma={setVma}
        unknownVma={unknownVma}
        setUnknownVma={setUnknownVma}
        fcRest={fcRest}
        setFcRest={setFcRest}
        fcMax={fcMax}
        setFcMax={setFcMax}
        records={records}
        setRecords={setRecords}
        onFinishWizard={async () => {
          await saveProfileToSupabase({
            fullName: athleteName,
            heightVal: height,
            weightVal: weight,
            vmaVal: unknownVma ? "" : vma,
            fcRestVal: fcRest,
            fcMaxVal: fcMax,
            recordsMap: records,
          });
          setScreen("app");
        }}
        onBackToAuth={() => setScreen("auth")}
      />
    );
  }

  // ÉDITION D'UNE SÉANCE DE BIBLIOTHÈQUE (MODÈLE)
  if (editingLibraryId) {
    const libTemplate = libraryWorkouts.find((l) => l.id === editingLibraryId);
    if (!libTemplate) {
      setEditingLibraryId(null);
      return null;
    }

    const mockWorkout: Workout = {
      id: libTemplate.id,
      weekNumber: 1,
      dayIndex: 0,
      dayName: "Modèle",
      sessionName: libTemplate.title,
      isRest: false,
      type: libTemplate.categoryId,
      title: libTemplate.title,
      description: libTemplate.description,
      km: libTemplate.km,
      rpe: libTemplate.rpe,
      steps: libTemplate.steps,
    };

    return (
      <WorkoutEditor
        workout={mockWorkout}
        startDate={newPlanForm.startDate}
        onClose={() => setEditingLibraryId(null)}
        onUpdateWorkout={(id, field, value) => {
          setLibraryWorkouts((prev) =>
            prev.map((lib) => {
              if (lib.id === id) {
                let updatedFieldKey = field;
                if (field === "sessionName") updatedFieldKey = "title";
                const updatedLib = { ...lib, [updatedFieldKey]: value };
                handleSaveLibraryWorkoutToSupabase(updatedLib);
                return updatedLib;
              }
              return lib;
            })
          );
        }}
        onAddStep={handleAddStepToWorkout}
        onUpdateStep={handleUpdateStepInWorkout}
        onDeleteStep={handleDeleteStepInWorkout}
        onMoveStep={handleMoveStepInWorkout}
        onDropStep={handleDropStepInWorkout}
        draggedStepPath={draggedStepPath}
        setDraggedStepPath={setDraggedStepPath}
        libraryWorkouts={libraryWorkouts}
        categories={customCategories}
        userRole={userRole}
      />
    );
  }

  // ÉDITION D'UNE SÉANCE DE PLAN
  if (editingWorkoutId) {
    const workout = draftWorkouts.find((w) => w.id === editingWorkoutId);
    if (!workout) {
      setEditingWorkoutId(null);
      return null;
    }

    return (
      <WorkoutEditor
        workout={workout}
        startDate={newPlanForm.startDate}
        onClose={() => setEditingWorkoutId(null)}
        onUpdateWorkout={handleUpdateDraftWorkout}
        onAddStep={handleAddStepToWorkout}
        onUpdateStep={handleUpdateStepInWorkout}
        onDeleteStep={handleDeleteStepInWorkout}
        onMoveStep={handleMoveStepInWorkout}
        onDropStep={handleDropStepInWorkout}
        draggedStepPath={draggedStepPath}
        setDraggedStepPath={setDraggedStepPath}
        libraryWorkouts={libraryWorkouts}
        categories={customCategories}
        userRole={userRole}
      />
    );
  }

  if (selectedWorkoutDetail && activePlan) {
    return (
      <WorkoutDetail
        workout={selectedWorkoutDetail}
        plan={activePlan}
        completedWorkouts={completedWorkouts}
        onClose={() => setSelectedWorkoutDetail(null)}
        onToggleWorkout={toggleWorkout}
      />
    );
  }

  // ÉCRAN PRINCIPAL DE L'APPLICATION
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans pb-20">
      <Header
        userRole={userRole}
        athleteName={session?.user?.user_metadata?.full_name || athleteName}
        onLogout={handleLogout}
      />

      <DeletePlanModal
        isOpen={showDeletePlanModal}
        onClose={() => setShowDeletePlanModal(false)}
        onArchive={handleArchiveActivePlan}
        onDelete={handleDeleteActivePlan}
      />

      {/* PAGE DÉDIÉE DE DÉBRIEFING DE SÉANCE */}
      {debriefWorkout && (
        <WorkoutDebriefView
          workout={debriefWorkout}
          shoes={shoes}
          onClose={() => setDebriefWorkout(null)}
          onSaveDebrief={handleSaveDebrief}
        />
      )}

      <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-5">
        {/* MODE COACH : LISTE DES ATHLÈTES ET AFFICHAGE DU CODE COACH UNIQUE */}
        {userRole === "coach" && !inspectingAthleteId && activeTab === "athletes" && (
          <div className="space-y-4">
            {coachCode && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Votre Code Coach Unique :</p>
                  <p className="text-sm font-black text-[#CF9A61] font-mono tracking-widest mt-0.5">{coachCode}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(coachCode);
                    alert("Code Coach copié dans le presse-papier !");
                  }}
                  className="text-[10px] font-black uppercase text-stone-200 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-stone-700 transition cursor-pointer"
                >
                  📋 Copier
                </button>
              </div>
            )}

            <ManagedAthletes
              managedAthletes={managedAthletes}
              onSelectAthlete={(id) => {
                setInspectingAthleteId(id);
                setActiveTab("plan");
              }}
              onInviteAthlete={() =>
                alert(`Transmettez votre Code Coach (${coachCode}) à votre athlète pour qu'il le renseigne dans l'onglet Messages !`)
              }
            />
          </div>
        )}

        {/* MODE COACH : BIBLIOTHÈQUE DE SÉANCES AVEC CATÉGORIES PERSONNALISÉES */}
        {userRole === "coach" && !inspectingAthleteId && activeTab === "library" && (
          <WorkoutLibraryView
            libraryWorkouts={libraryWorkouts}
            categories={customCategories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onCreateNewTemplate={handleCreateNewTemplate}
            onEditTemplate={(id) => setEditingLibraryId(id)}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {/* MODE ATHLÈTE : BIBLIOTHÈQUE PERSONNELLE (ACCÉS DEPUIS LE PROFIL) */}
        {userRole === "athlete" && activeTab === "profil" && showAthleteLibrary && (
          <AthleteWorkoutLibraryView
            libraryWorkouts={libraryWorkouts}
            categories={customCategories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onCreateNewTemplate={handleCreateNewTemplate}
            onEditTemplate={(id) => setEditingLibraryId(id)}
            onDeleteTemplate={handleDeleteTemplate}
            onBackToProfile={() => setShowAthleteLibrary(false)}
          />
        )}

        {/* MODE COACH : BANDEAU MIROIR DE CONSULTATION */}
        {isCoachInspecting && (
          <div className="bg-[#CDCF61]/20 border border-[#CDCF61]/40 p-3 rounded-2xl flex items-center justify-between text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-[#CDCF61] font-black">👁️ Consultation :</span>
              <span className="font-extrabold text-stone-100">{selectedAthlete?.name}</span>
            </div>
            <button
              onClick={() => setInspectingAthleteId(null)}
              className="text-[10px] font-black uppercase text-[#CDCF61] hover:underline bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 transition cursor-pointer"
            >
              ← Retour liste
            </button>
          </div>
        )}

        {/* VUES ACCESSIBLES POUR L'ATHLÈTE ET L'ENTRAÎNEUR */}
        {(userRole === "athlete" || isCoachInspecting || activeTab === "messages") && (
          <>
            {/* 1. ACCUEIL / DASHBOARD (STRICTEMENT RÉSERVÉ À L'ATHLÈTE) */}
            {userRole === "athlete" && activeTab === "accueil" && (
              <AthleteDashboard
                activePlan={activePlan}
                completedWorkouts={completedWorkouts}
                todayWorkouts={getTodayWorkouts(activePlan)}
                onSelectWorkoutDetail={setSelectedWorkoutDetail}
                onToggleWorkout={toggleWorkout}
                onOpenDebrief={(workout) => setDebriefWorkout(workout)}
                onCreatePlanRequest={() => {
                  setActiveTab("plan");
                  setIsCreatingPlan(true);
                  setPlanCreationStep(1);
                }}
                onNavigateToVolumeChart={() => setActiveTab("stats")}
              />
            )}

            {/* 2. PLAN & CRÉATION (MODIFICATION AUTORISÉE POUR L'ENTRAÎNEUR) */}
            {activeTab === "plan" && (
              <div className="space-y-6 animate-fadeIn">
                {/* BOUTON ÉVOLUTION VOLUME & CHARGE EN TEXTE BLANC */}
                {activePlan && !isCreatingPlan && (
                  <div className="flex justify-between items-[#stone-100] items-center flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab("stats")}
                      className="text-[10px] font-black text-stone-100 hover:text-white bg-stone-900 border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <span>📊 Évoluton Volume & Charge</span>
                    </button>

                    <button
                      onClick={() => setShowDeletePlanModal(true)}
                      className="text-[10px] font-bold text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                    >
                      ➕ Nouveau plan
                    </button>
                  </div>
                )}

                {!activePlan && !isCreatingPlan && (
                  <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 bg-[#CF9A61]/10 border border-[#CF9A61]/30 rounded-2xl flex items-center justify-center mx-auto text-[#CF9A61] text-2xl">
                      📋
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-stone-100">
                        Aucun plan en cours
                      </h3>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        {userRole === "coach"
                          ? "Créez le programme personnalisé de votre athlète étape par étape."
                          : "Créez votre programme personnalisé étape par étape pour atteindre votre objectif."}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsCreatingPlan(true);
                        setPlanCreationStep(1);
                      }}
                      className="w-full py-3.5 bg-[#CF9A61] hover:bg-[#b88652] text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
                    >
                      ➕ Créer un nouveau plan
                    </button>
                  </div>
                )}

                {isCreatingPlan && (
                  <PlanWizard
                    planCreationStep={planCreationStep}
                    setPlanCreationStep={setPlanCreationStep}
                    newPlanForm={newPlanForm}
                    setNewPlanForm={setNewPlanForm}
                    draftWeekTypes={draftWeekTypes}
                    draftWorkouts={draftWorkouts}
                    openCreationWeeks={openCreationWeeks}
                    toggleCreationWeekAccordion={toggleCreationWeekAccordion}
                    onStartSetup={handleStartEmptyWorkoutSetup}
                    onUpdateWeekType={handleUpdateWeekType}
                    onAddWorkoutToDay={handleAddWorkoutToDay}
                    onDeleteWorkout={handleDeleteWorkout}
                    onUpdateDraftWorkout={handleUpdateDraftWorkout}
                    onEditWorkout={setEditingWorkoutId}
                    onFinalizePlan={handleFinalizePlan}
                    onCancel={() => setIsCreatingPlan(false)}
                  />
                )}

                {!isCreatingPlan && activePlan && (
                  <ActivePlanView
                    activePlan={activePlan}
                    completedWorkouts={completedWorkouts}
                    openWeeks={openWeeks}
                    toggleWeekAccordion={toggleWeekAccordion}
                    onEditActivePlan={handleEditActivePlan}
                    onChangePlanRequest={() => setShowDeletePlanModal(true)}
                    onSelectWorkoutDetail={setSelectedWorkoutDetail}
                    onToggleWorkout={(id) => {
                      const targetWorkout = activePlan.workouts.find((w) => w.id === id);
                      if (targetWorkout) {
                        setDebriefWorkout(targetWorkout);
                      } else {
                        toggleWorkout(id);
                      }
                    }}
                    onNavigateToVolumeChart={() => setActiveTab("stats")}
                  />
                )}
              </div>
            )}

            {/* 3. MESSAGERIE INSTANTANÉE CONDITIONNELLE */}
            {activeTab === "messages" && (
              userRole === "athlete" && !assignedCoachId ? (
                <ConnectCoachView
                  onCoachConnected={(cId, cName) => {
                    setAssignedCoachId(cId);
                    setAssignedCoachName(cName);
                  }}
                />
              ) : (
                <ChatView
                  userRole={userRole}
                  currentAthleteName={userRole === "coach" ? (selectedAthlete?.name || "") : athleteName}
                  athleteId={userRole === "coach" ? (selectedAthlete?.id || "") : session?.user?.id}
                  messages={messages}
                  onSendMessage={(text) => handleSendMessage(text, userRole === "coach" ? selectedAthlete?.id : session?.user?.id)}
                />
              )
            )}

            {/* 4. STATISTIQUES (MODE LECTURE SEULE POUR LE COACH) */}
            {activeTab === "stats" && (
              <AnnualStats
                completedRuns={completedRuns}
                activePlan={activePlan}
                completedWorkouts={completedWorkouts}
                onAddRun={handleAddCompletedRun}
                draftWorkouts={draftWorkouts}
                newPlanForm={newPlanForm}
                draftWeekTypes={draftWeekTypes}
                goal={goal}
                onBackToDashboard={() => setActiveTab("accueil")}
                isReadOnly={isCoachInspecting}
              />
            )}

            {/* 5. PROFIL (SYNCHRONISÉ À 100%) */}
            {activeTab === "profil" && !showAthleteLibrary && (
              <ProfileView
                athleteName={selectedAthlete ? selectedAthlete.name : (session?.user?.user_metadata?.full_name || athleteName)}
                setAthleteName={async (newName) => {
                  setAthleteName(newName);
                  await saveProfileToSupabase({ fullName: newName });
                }}
                height={height}
                setHeight={async (newHeight) => {
                  setHeight(newHeight);
                  await saveProfileToSupabase({ heightVal: newHeight });
                }}
                weight={weight}
                setWeight={async (newWeight) => {
                  setWeight(newWeight);
                  await saveProfileToSupabase({ weightVal: newWeight });
                }}
                vma={vma}
                setVma={async (newVma) => {
                  setVma(newVma);
                  await saveProfileToSupabase({ vmaVal: newVma });
                }}
                unknownVma={unknownVma}
                setUnknownVma={setUnknownVma}
                fcRest={fcRest}
                setFcRest={async (newFcRest) => {
                  setFcRest(newFcRest);
                  await saveProfileToSupabase({ fcRestVal: newFcRest });
                }}
                fcMax={fcMax}
                setFcMax={async (newFcMax) => {
                  setFcMax(newFcMax);
                  await saveProfileToSupabase({ fcMaxVal: newFcMax });
                }}
                records={records}
                setRecords={async (actionOrValue) => {
                  const nextRecords = typeof actionOrValue === "function" ? actionOrValue(records) : actionOrValue;
                  setRecords(nextRecords);
                  await saveProfileToSupabase({
                    fullName: athleteName,
                    heightVal: height,
                    weightVal: weight,
                    vmaVal: vma,
                    fcRestVal: fcRest,
                    fcMaxVal: fcMax,
                    recordsMap: nextRecords,
                  });
                }}
                onSaveFullProfile={async (data) => {
                  setAthleteName(data.name);
                  setHeight(data.height);
                  setWeight(data.weight);
                  setVma(data.vma);
                  setUnknownVma(data.unknownVma);
                  setFcRest(data.fcRest);
                  setFcMax(data.fcMax);
                  setRecords(data.records);

                  await saveProfileToSupabase({
                    fullName: data.name,
                    heightVal: data.height,
                    weightVal: data.weight,
                    vmaVal: data.unknownVma ? "" : data.vma,
                    fcRestVal: data.fcRest,
                    fcMaxVal: data.fcMax,
                    recordsMap: data.records,
                  });
                }}
                races={races}
                newRace={newRace}
                setNewRace={setNewRace}
                onAddRace={handleAddRace}
                onDeleteRace={handleDeleteRace}
                connectedDevices={connectedDevices}
                toggleDeviceConnection={toggleDeviceConnection}
                archivedPlans={archivedPlans}
                shoes={shoes}
                onAddShoe={handleAddShoe}
                onDeleteShoe={handleDeleteShoe}
                onToggleActiveShoe={handleToggleActiveShoe}
                onOpenAthleteLibrary={() => setShowAthleteLibrary(true)}
                isReadOnly={isCoachInspecting}
              />
            )}
          </>
        )}
      </div>

      {/* NAVIGATION BASSE */}
      <BottomNav
        userRole={userRole}
        activeTab={activeTab}
        screen={screen}
        inspectingAthleteId={inspectingAthleteId}
        onSelectTab={(tab) => {
          setScreen("app");
          setActiveTab(tab);
          setShowAthleteLibrary(false);
        }}
      />
    </main>
  );
}