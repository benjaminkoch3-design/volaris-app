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

const formatDurationSec = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(1);
  return `${mins}:${parseFloat(secs) < 10 ? "0" : ""}${secs}`;
};

const mapIntensityType = (typeStr: string) => {
  const t = (typeStr || "").toUpperCase();
  if (t.includes("WARMUP") || t.includes("WARM_UP")) return "Échauffement";
  if (t.includes("INTERVAL") || t.includes("ACTIVE")) return "Course à pied";
  if (t.includes("RECOVERY") || t.includes("REST")) return "Récupération";
  if (t.includes("COOLDOWN") || t.includes("COOL_DOWN")) return "Retour au calme";
  return "Étape";
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

    const client = gc.client || gc;

    const garminGet = async (url: string) => {
      try {
        if (typeof gc.get === "function") return await gc.get(url);
        if (client.get) {
          const res = await client.get(url);
          return res.data || res;
        }
      } catch (err: any) {
        console.warn(`Erreur sur ${url}:`, err?.message);
      }
      return null;
    };

    // Extraction des vrais intervalles Garmin (comme sur votre capture d'écran)
    const extractIntervalsAndTelemetry = async (actId: string | number) => {
      const splitsData = await garminGet(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/splits`);
      const detailsData = await garminGet(`https://connect.garmin.com/modern/proxy/activity-service/activity/${actId}/details`);

      // 1. EXTRACTION DES INTERVALLES & CIRCUITS (STRUCTURE GARMIN CONNECT)
      const lapDTOs = splitsData?.lapDTOs || splitsData?.splitSummaries || [];
      let cumulativeTimeSec = 0;
      let intervalCount = 0;

      const intervals = lapDTOs.map((lap: any, idx: number) => {
        const durSec = lap.duration || lap.movingDuration || 0;
        cumulativeTimeSec += durSec;

        const distM = lap.distance || 0;
        const distKm = Math.round((distM / 1000) * 100) / 100;
        const speedMs = lap.averageSpeed || (distM > 0 && durSec > 0 ? distM / durSec : 0);
        const secPerKm = speedMs > 0 ? Math.round(1000 / speedMs) : 0;

        const stepType = mapIntensityType(lap.intensityType || lap.splitType);
        
        let intervalNumber = "";
        if (stepType === "Course à pied") {
          intervalCount += 1;
          intervalNumber = String(intervalCount);
        }

        return {
          circuit: lap.lapIndex !== undefined ? lap.lapIndex + 1 : idx + 1,
          intervalNum: intervalNumber,
          stepType,
          durationFormatted: formatDurationSec(durSec),
          durationSec: durSec,
          cumulativeTime: formatDurationSec(cumulativeTimeSec),
          distanceKm: distKm.toFixed(2),
          pace: formatSecondsToPace(secPerKm),
          paceSec: secPerKm,
          avgHr: Math.round(lap.averageHR || lap.avgHR || 0) || null,
          maxHr: Math.round(lap.maxHR || 0) || null,
          elevationGain: Math.round(lap.elevationGain || 0),
          cadence: Math.round(lap.averageRunningCadenceInStepsPerMinute || lap.avgRunCadence || 0) || null,
        };
      });

      // 2. EXTRACTION DES POINTS DE COURBE CONTINUE
      const metricDescriptors = detailsData?.metricDescriptors || [];
      const findMetricIdx = (keys: string[]) => {
        const desc = metricDescriptors.find((m: any) => keys.includes(m.key));
        if (!desc) return -1;
        return desc.metricsIndex !== undefined ? desc.metricsIndex : metricDescriptors.indexOf(desc);
      };

      const hrIdx = findMetricIdx(["directHeartRate", "heartRate"]);
      const speedIdx = findMetricIdx(["directSpeed", "speed"]);
      const elevIdx = findMetricIdx(["directElevation", "elevation"]);

      const metricsList = detailsData?.activityDetailMetrics || [];
      const hrSamples: number[] = [];
      const paceSamples: number[] = [];
      const elevationProfile: number[] = [];

      const step = Math.max(1, Math.floor(metricsList.length / 80));
      for (let i = 0; i < metricsList.length; i += step) {
        const row = metricsList[i]?.metrics;
        if (row) {
          if (hrIdx !== -1 && row[hrIdx] > 30) hrSamples.push(Math.round(row[hrIdx]));
          if (speedIdx !== -1 && row[speedIdx] > 0.4) {
            paceSamples.push(Math.round(1000 / row[speedIdx]));
          }
          if (elevIdx !== -1 && row[elevIdx] !== undefined) {
            elevationProfile.push(Math.round(row[elevIdx]));
          }
        }
      }

      return {
        intervals: intervals.length > 0 ? intervals : null,
        laps: intervals.length > 0 ? intervals : null,
        hrSamples: hrSamples.length > 0 ? hrSamples : null,
        paceSamples: paceSamples.length > 0 ? paceSamples : null,
        elevationProfile: elevationProfile.length > 0 ? elevationProfile : null,
      };
    };

    if (activityId) {
      const telemetry = await extractIntervalsAndTelemetry(activityId);
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

        const telemetry = await extractIntervalsAndTelemetry(act.activityId);

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

    return NextResponse.json({ success: true, activities: formattedActivities });
  } catch (error: any) {
    console.error("Garmin API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de connexion Garmin Connect." },
      { status: 400 }
    );
  }
}