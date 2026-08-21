// @ts-nocheck
// app/api/garmin-activities/route.ts
import { NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, limit = 10 } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Identifiants Garmin manquants." },
        { status: 400 }
      );
    }

    const gc = new GarminConnect({ username: email, password: password });
    await gc.login();

    // Récupération des dernières activités
    let activities: any[] = [];
    if (typeof gc.getActivities === "function") {
      activities = await gc.getActivities(0, limit);
    } else if (typeof gc.get === "function") {
      activities = await gc.get(
        `https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`
      );
    } else {
      const res = await gc.client.get(
        `https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`
      );
      activities = res.data;
    }

    // Filtrer et formater pour les courses à pied (running)
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
        const durationSec = Math.round(act.duration || act.elapsedDuration || 0);
        const durationMin = Math.round(durationSec / 60);

        // Calcul de l'allure moyenne
        let avgPaceStr = "-";
        if (distKm > 0 && durationSec > 0) {
          const secPerKm = Math.round(durationSec / distKm);
          const pMin = Math.floor(secPerKm / 60);
          const pSec = secPerKm % 60;
          avgPaceStr = `${pMin}:${pSec < 10 ? "0" : ""}${pSec}`;
        }

        // Date de l'activité au format ISO YYYY-MM-DD
        const startDateRaw = act.startTimeLocal || act.startTimeGMT || "";
        const dateStr = startDateRaw.split(" ")[0] || startDateRaw.split("T")[0] || "";

        return {
          id: String(act.activityId),
          title: act.activityName || "Course à pied",
          date: dateStr,
          distanceKm: distKm,
          durationMinutes: durationMin,
          durationSeconds: durationSec,
          avgPace: avgPaceStr,
          avgHr: Math.round(act.averageHR || act.avgHR || 0) || null,
          maxHr: Math.round(act.maxHR || 0) || null,
          calories: Math.round(act.calories || 0) || null,
          elevationGain: Math.round(act.elevationGain || 0) || 0,
        };
      });

    return NextResponse.json({
      success: true,
      activities: runningActivities,
    });
  } catch (error: any) {
    console.error("Garmin Fetch Activities Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération des activités Garmin." },
      { status: 400 }
    );
  }
}