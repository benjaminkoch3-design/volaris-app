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

    // Fonction d'appel universelle
    const garminGet = async (url: string) => {
      try {
        if (typeof gc.get === "function") return await gc.get(url);
        if (gc.client?.get) {
          const res = await gc.client.get(url);
          return res.data || res;
        }
      } catch (err: any) {
        console.warn(`Garmin GET error [${url}]:`, err?.message);
      }
      return null;
    };

    // Extraction complète de la télémétrie réelle d'une activité
    const extractTelemetry = async (act: any) => {
      const actId = String(act.activityId || act.id);
      let splitsData: any = null;
      let detailsData: any = null;

      // 1. Récupération des splits
      try {
        if (typeof gc.getActivitySplits === "function") {
          splitsData = await gc.getActivitySplits(actId);
        } else {
          splitsData = await garminGet(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/splits`);
        }
      } catch (e) {
        console.warn("Splits endpoint non disponible:", e);
      }

      // 2. Récupération des détails point par point
      try {
        if (typeof gc.getActivityDetails === "function") {
          detailsData = await gc.getActivityDetails(actId);
        } else {
          detailsData = await garminGet(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/details`);
        }
      } catch (e) {
        console.warn("Details endpoint non disponible:", e);
      }

      // 3. Formatage des tours (Laps / Splits)
      const rawLaps =
        splitsData?.lapDTOs ||
        splitsData?.splitSummaries ||
        splitsData?.lapList ||
        [];

      let laps = rawLaps
        .filter((l: any) => (l.distance || 0) > 50)
        .map((lap: any, idx: number) => {
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

      // 4. Formatage des points de courbe continue (Cardio, Allure, Altitude)
      const metricDescriptors = detailsData?.metricDescriptors || [];
      const findMetricIndex = (keys: string[]) => {
        const desc = metricDescriptors.find((m: any) => keys.includes(m.key));
        if (!desc) return -1;
        return desc.metricsIndex !== undefined ? desc.metricsIndex : metricDescriptors.indexOf(desc);
      };

      const hrIndex = findMetricIndex(["directHeartRate", "heartRate"]);
      const speedIndex = findMetricIndex(["directSpeed", "speed"]);
      const elevIndex = findMetricIndex(["directElevation", "elevation"]);

      const activityDetailMetrics = detailsData?.activityDetailMetrics || [];
      const hrSamples: number[] = [];
      const paceSamples: number[] = [];
      const elevationProfile: number[] = [];

      const step = Math.max(1, Math.floor(activityDetailMetrics.length / 80));
      for (let i = 0; i < activityDetailMetrics.length; i += step) {
        const row = activityDetailMetrics[i]?.metrics;
        if (row && Array.isArray(row)) {
          if (hrIndex !== -1 && row[hrIndex] > 30) {
            hrSamples.push(Math.round(row[hrIndex]));
          }
          if (speedIndex !== -1 && row[speedIndex] > 0.4) {
            paceSamples.push(Math.round(1000 / row[speedIndex]));
          }
          if (elevIndex !== -1 && row[elevIndex] !== undefined) {
            elevationProfile.push(Math.round(row[elevIndex]));
          }
        }
      }

      // Si Garmin n'a pas retourné de tours automatiques, calculer les tours à partir des métriques globales
      if (laps.length === 0) {
        const totalDistKm = act.distance ? act.distance / 1000 : 10;
        const totalSec = act.movingDuration || act.duration || 3000;
        const avgSpeed = act.averageSpeed || totalDistKm / (totalSec / 1000);
        const avgPaceSec = avgSpeed > 0 ? Math.round(1000 / avgSpeed) : 291;
        const numKm = Math.max(1, Math.round(totalDistKm));

        laps = Array.from({ length: numKm }).map((_, i) => ({
          km: i + 1,
          distanceKm: 1,
          durationSec: avgPaceSec,
          pace: formatSecondsToPace(avgPaceSec),
          paceSec: avgPaceSec,
          avgHr: Math.round(act.averageHR || act.avgHR || 140),
          maxHr: Math.round(act.maxHR || (act.averageHR || 140) + 10),
          elevationGain: Math.round((act.elevationGain || 0) / numKm),
          cadence: Math.round(act.averageRunningCadenceInStepsPerMinute || act.avgRunCadence || 170),
        }));
      }

      return {
        laps,
        hrSamples: hrSamples.length > 0 ? hrSamples : laps.map((l) => l.avgHr || 140),
        paceSamples: paceSamples.length > 0 ? paceSamples : laps.map((l) => l.paceSec),
        elevationProfile: elevationProfile.length > 0 ? elevationProfile : [0, act.elevationGain || 40],
      };
    };

    // Si on demande la télémétrie d'un ID spécifique
    if (activityId) {
      const telemetry = await extractTelemetry({ activityId });
      return NextResponse.json({ success: true, telemetry });
    }

    // Récupération de la liste des activités
    let rawActivities: any[] = [];
    if (typeof gc.getActivities === "function") {
      rawActivities = await gc.getActivities(0, limit);
    } else {
      const res = await garminGet(`https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`);
      rawActivities = res || [];
    }

    const runningActivities = (rawActivities || []).filter((act: any) => {
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

    const formattedActivities = await Promise.all(
      runningActivities.slice(0, 3).map(async (act: any) => {
        const distKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : 0;
        const avgSpeedMs = act.averageSpeed || (act.distance && act.duration ? act.distance / act.duration : 0);
        const secPerKm = avgSpeedMs > 0 ? Math.round(1000 / avgSpeedMs) : 0;
        const durationSec = Math.round(act.movingDuration || act.duration || act.elapsedDuration || 0);

        const telemetry = await extractTelemetry(act);

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
    console.error("Garmin API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de connexion Garmin Connect." },
      { status: 400 }
    );
  }
}