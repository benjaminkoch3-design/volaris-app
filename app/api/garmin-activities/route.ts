// @ts-nocheck
// app/api/garmin-activities/route.ts
import { NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";

// Formatage précis des secondes en "M:SS"
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

    // 1. Si un ID spécifique est demandé pour extraire les splits détaillés
    if (activityId) {
      let details: any = null;
      let splitsData: any = null;

      try {
        if (typeof gc.getActivitySplits === "function") {
          splitsData = await gc.getActivitySplits(activityId);
        } else if (typeof gc.get === "function") {
          splitsData = await gc.get(
            `https://connect.garmin.com/modern/proxy/activity-service/activity/${activityId}/splits`
          );
        }
      } catch (e) {
        console.warn("Splits endpoint non disponible:", e);
      }

      const lapDTOs = splitsData?.lapDTOs || splitsData?.lapList || [];
      const formattedLaps = lapDTOs.map((lap: any, idx: number) => {
        const distM = lap.distance || 1000;
        const distKm = Math.round((distM / 1000) * 100) / 100;
        const durSec = Math.round(lap.duration || lap.movingDuration || 0);
        const secPerKm = distKm > 0 ? Math.round(durSec / distKm) : 0;

        return {
          km: lap.lapIndex !== undefined ? lap.lapIndex + 1 : idx + 1,
          distanceKm: distKm,
          durationSec: durSec,
          pace: formatSecondsToPace(secPerKm),
          paceSec: secPerKm,
          avgHr: Math.round(lap.averageHR || lap.avgHR || 0) || null,
          maxHr: Math.round(lap.maxHR || 0) || null,
          elevationGain: Math.round(lap.elevationGain || 0),
          cadence: Math.round(lap.averageRunningCadenceInStepsPerMinute || lap.avgRunCadence || 0) || null,
        };
      });

      return NextResponse.json({ success: true, laps: formattedLaps });
    }

    // 2. Récupération des dernières activités de course
    let activities: any[] = [];
    if (typeof gc.getActivities === "function") {
      activities = await gc.getActivities(0, limit);
    } else {
      const res = await gc.client.get(
        `https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`
      );
      activities = res.data;
    }

    const runningActivities = (activities || [])
      .filter((act: any) => {
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
      })
      .map((act: any) => {
        const distKm = act.distance
          ? Math.round((act.distance / 1000) * 100) / 100
          : 0;
        
        // Utiliser la vitesse moyenne en m/s en priorité pour une précision exacte
        const avgSpeedMs = act.averageSpeed || (act.distance && act.duration ? act.distance / act.duration : 0);
        const secPerKm = avgSpeedMs > 0 ? Math.round(1000 / avgSpeedMs) : 0;
        const durationSec = Math.round(act.movingDuration || act.duration || act.elapsedDuration || 0);
        const durationMin = Math.round(durationSec / 60);

        const startDateRaw = act.startTimeLocal || act.startTimeGMT || "";
        const dateStr = startDateRaw.split(" ")[0] || startDateRaw.split("T")[0] || "";

        return {
          id: String(act.activityId),
          title: act.activityName || "Course à pied Garmin",
          date: dateStr,
          distanceKm: distKm,
          durationMinutes: durationMin,
          durationSeconds: durationSec,
          avgPace: formatSecondsToPace(secPerKm),
          avgPaceSec: secPerKm,
          avgHr: Math.round(act.averageHR || act.avgHR || 0) || null,
          maxHr: Math.round(act.maxHR || 0) || null,
          elevationGain: Math.round(act.elevationGain || 0) || 0,
          elevationLoss: Math.round(act.elevationLoss || 0) || 0,
          calories: Math.round(act.calories || 0) || null,
          avgCadence: Math.round(act.averageRunningCadenceInStepsPerMinute || act.avgRunCadence || 0) || null,
        };
      });

    return NextResponse.json({
      success: true,
      activities: runningActivities,
    });
  } catch (error: any) {
    console.error("Garmin Activities Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération Garmin." },
      { status: 400 }
    );
  }
}