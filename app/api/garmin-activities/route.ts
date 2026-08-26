// @ts-nocheck
// app/api/garmin-activities/route.ts
import { NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";

const formatSecondsToPace = (secPerKm: number): string => {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 1200) return "-";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, limit = 5, activityId } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants Garmin manquants." }, { status: 400 });
    }

    const gc = new GarminConnect({ username: email, password: password });
    await gc.login();

    // Fonction d'extraction complète avec gestion de tous les types de clients internes GarminConnect
    const fetchFullTelemetry = async (actId: string | number) => {
      let splitsData: any = null;
      let detailsData: any = null;

      const client = gc.client || gc;

      // 1. Récupération des Splits / Laps
      try {
        if (typeof gc.getActivitySplits === "function") {
          splitsData = await gc.getActivitySplits(actId);
        } else if (client.get) {
          const res = await client.get(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/splits`);
          splitsData = res.data || res;
        }
      } catch (e) {
        console.warn("Splits non accessibles via endpoint 1, tentative alternative:", e);
      }

      // 2. Récupération des Détails Point par Point (Graphiques)
      try {
        if (typeof gc.getActivityDetails === "function") {
          detailsData = await gc.getActivityDetails(actId);
        } else if (client.get) {
          const res = await client.get(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/details`);
          detailsData = res.data || res;
        }
      } catch (e) {
        console.warn("Details non accessibles via endpoint 1:", e);
      }

      // Formatage des LAPS / SPLITS
      const rawLaps = splitsData?.lapDTOs || splitsData?.splitSummaries || splitsData?.lapList || [];
      const laps = rawLaps.map((lap: any, idx: number) => {
        const distM = lap.distance || 1000;
        const distKm = Math.round((distM / 1000) * 100) / 100;
        const durSec = Math.round(lap.duration || lap.movingDuration || 0);
        const speedMs = lap.averageSpeed || (distM > 0 && durSec > 0 ? distM / durSec : 0);
        const secPerKm = speedMs > 0 ? Math.round(1000 / speedMs) : 0;

        return {
          km: lap.lapIndex !== undefined ? lap.lapIndex + 1 : idx + 1,
          distanceKm: distKm,
          durationSec: durSec,
          pace: formatSecondsToPace(secPerKm),
          paceSec: secPerKm,
          avgHr: Math.round(lap.averageHR || lap.avgHR || lap.averageHeartRate || 0) || null,
          maxHr: Math.round(lap.maxHR || lap.maxHeartRate || 0) || null,
          elevationGain: Math.round(lap.elevationGain || lap.gain || 0),
          cadence: Math.round(lap.averageRunningCadenceInStepsPerMinute || lap.avgRunCadence || lap.averageCadence || 0) || null,
        };
      });

      // Formatage des ÉCHANTILLONS COURBES (Cardio, Allure, Altitude)
      const metricDescriptors = detailsData?.metricDescriptors || [];
      const hrIndex = metricDescriptors.findIndex((m: any) => m.key === "directHeartRate" || m.key === "heartRate");
      const speedIndex = metricDescriptors.findIndex((m: any) => m.key === "directSpeed" || m.key === "speed");
      const elevIndex = metricDescriptors.findIndex((m: any) => m.key === "directElevation" || m.key === "elevation");

      const activityDetailMetrics = detailsData?.activityDetailMetrics || [];
      const hrSamples: number[] = [];
      const paceSamples: number[] = [];
      const elevationProfile: number[] = [];

      const step = Math.max(1, Math.floor(activityDetailMetrics.length / 60));
      for (let i = 0; i < activityDetailMetrics.length; i += step) {
        const row = activityDetailMetrics[i]?.metrics;
        if (row) {
          if (hrIndex !== -1 && row[hrIndex] > 30) hrSamples.push(Math.round(row[hrIndex]));
          if (speedIndex !== -1 && row[speedIndex] > 0.3) {
            paceSamples.push(Math.round(1000 / row[speedIndex]));
          }
          if (elevIndex !== -1 && row[elevIndex] !== undefined) {
            elevationProfile.push(Math.round(row[elevIndex]));
          }
        }
      }

      return {
        laps: laps.length > 0 ? laps : null,
        hrSamples: hrSamples.length > 0 ? hrSamples : null,
        paceSamples: paceSamples.length > 0 ? paceSamples : null,
        elevationProfile: elevationProfile.length > 0 ? elevationProfile : null,
      };
    };

    // Si on demande les détails d'une activité spécifique
    if (activityId) {
      const telemetry = await fetchFullTelemetry(activityId);
      return NextResponse.json({ success: true, telemetry });
    }

    // Récupération de la liste des activités
    let activities: any[] = [];
    if (typeof gc.getActivities === "function") {
      activities = await gc.getActivities(0, limit);
    } else {
      const res = await (gc.client || gc).get(
        `https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`
      );
      activities = res.data || res;
    }

    const runningActivities = (activities || []).filter((act: any) => {
      const typeKey =
        act.activityType?.typeKey ||
        act.activityTypeDTO?.typeKey ||
        act.activityType ||
        "";
      return (
        typeKey.includes("running") ||
        typeKey.includes("trail_running") ||
        typeKey.includes("treadmill_running") ||
        typeKey.includes("track_running")
      );
    });

    // Chargement automatique de la télémétrie pour les 3 dernières courses
    const formattedActivities = await Promise.all(
      runningActivities.slice(0, 3).map(async (act: any) => {
        const distKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : 0;
        const avgSpeedMs = act.averageSpeed || (act.distance && act.duration ? act.distance / act.duration : 0);
        const secPerKm = avgSpeedMs > 0 ? Math.round(1000 / avgSpeedMs) : 0;
        const durationSec = Math.round(act.movingDuration || act.duration || act.elapsedDuration || 0);

        const telemetry = await fetchFullTelemetry(act.activityId);

        return {
          id: String(act.activityId),
          title: act.activityName || "Course à pied Garmin",
          date: (act.startTimeLocal || act.startTimeGMT || "").split(" ")[0] || "",
          distanceKm: distKm,
          durationMinutes: Math.round(durationSec / 60),
          durationSeconds: durationSec,
          avgPace: formatSecondsToPace(secPerKm),
          avgPaceSec: secPerKm,
          avgHr: Math.round(act.averageHR || act.avgHR || 0) || null,
          maxHr: Math.round(act.maxHR || 0) || null,
          elevationGain: Math.round(act.elevationGain || 0),
          avgCadence: Math.round(act.averageRunningCadenceInStepsPerMinute || act.avgRunCadence || 0) || null,
          activityTelemetry: telemetry,
        };
      })
    );

    return NextResponse.json({
      success: true,
      activities: formattedActivities,
    });
  } catch (error: any) {
    console.error("Garmin Activities Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération Garmin." },
      { status: 400 }
    );
  }
}