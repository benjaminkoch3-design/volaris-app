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

// Parser XML pour extraire les vrais tours et points du TCX Garmin
function parseGarminTcx(tcxXml: string) {
  if (!tcxXml || typeof tcxXml !== "string" || !tcxXml.includes("<Lap")) {
    return null;
  }

  const laps: any[] = [];
  const hrSamples: number[] = [];
  const paceSamples: number[] = [];
  const elevationProfile: number[] = [];

  // 1. EXTRACTION DES VRAIS LAPS / TOURS (BIPS 1 KM)
  const lapMatches = tcxXml.match(/<Lap[\s\S]*?<\/Lap>/g) || [];
  lapMatches.forEach((lapXml, idx) => {
    const totalTimeSecMatch = lapXml.match(/<TotalTimeSeconds>([\d.]+)<\/TotalTimeSeconds>/);
    const distanceMetersMatch = lapXml.match(/<DistanceMeters>([\d.]+)<\/DistanceMeters>/);
    const avgHrMatch = lapXml.match(/<AverageHeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>/);
    const maxHrMatch = lapXml.match(/<MaximumHeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>/);
    const cadenceMatch = lapXml.match(/<Cadence>(\d+)<\/Cadence>/);

    const durSec = totalTimeSecMatch ? Math.round(parseFloat(totalTimeSecMatch[1])) : 0;
    const distM = distanceMetersMatch ? parseFloat(distanceMetersMatch[1]) : 1000;
    const distKm = Math.round((distM / 1000) * 100) / 100;
    const secPerKm = distKm > 0 && durSec > 0 ? Math.round(durSec / distKm) : 0;

    // Calcul du D+ dans ce tour précis
    const altitudeMatches = [...lapXml.matchAll(/<AltitudeMeters>([\d.-]+)<\/AltitudeMeters>/g)];
    let lapGain = 0;
    for (let i = 1; i < altitudeMatches.length; i++) {
      const prev = parseFloat(altitudeMatches[i - 1][1]);
      const curr = parseFloat(altitudeMatches[i][1]);
      if (curr > prev) lapGain += (curr - prev);
    }

    laps.push({
      km: idx + 1,
      distanceKm: distKm,
      durationSec: durSec,
      pace: formatSecondsToPace(secPerKm),
      paceSec: secPerKm,
      avgHr: avgHrMatch ? parseInt(avgHrMatch[1], 10) : null,
      maxHr: maxHrMatch ? parseInt(maxHrMatch[1], 10) : null,
      elevationGain: Math.round(lapGain),
      cadence: cadenceMatch ? parseInt(cadenceMatch[1], 10) : null,
    });
  });

  // 2. EXTRACTION DES VRAIS TRACKPOINTS CHRONOLOGIQUES (COURBES)
  const trackpoints = tcxXml.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/g) || [];
  let lastDist = 0;
  let lastTime: number | null = null;

  const step = Math.max(1, Math.floor(trackpoints.length / 80));

  for (let i = 0; i < trackpoints.length; i += step) {
    const tp = trackpoints[i];
    const hrMatch = tp.match(/<HeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>/);
    const altMatch = tp.match(/<AltitudeMeters>([\d.-]+)<\/AltitudeMeters>/);
    const distMatch = tp.match(/<DistanceMeters>([\d.]+)<\/DistanceMeters>/);
    const timeMatch = tp.match(/<Time>(.*?)<\/Time>/);

    if (hrMatch) hrSamples.push(parseInt(hrMatch[1], 10));
    if (altMatch) elevationProfile.push(Math.round(parseFloat(altMatch[1])));

    if (distMatch && timeMatch) {
      const currentDist = parseFloat(distMatch[1]);
      const currentTime = new Date(timeMatch[1]).getTime() / 1000;

      if (lastTime !== null && currentDist > lastDist) {
        const deltaDistKm = (currentDist - lastDist) / 1000;
        const deltaTimeSec = currentTime - lastTime;
        if (deltaDistKm > 0 && deltaTimeSec > 0) {
          const instantPace = Math.round(deltaTimeSec / deltaDistKm);
          if (instantPace >= 120 && instantPace <= 900) {
            paceSamples.push(instantPace);
          }
        }
      }
      lastDist = currentDist;
      lastTime = currentTime;
    }
  }

  return {
    laps: laps.length > 0 ? laps : null,
    hrSamples: hrSamples.length > 0 ? hrSamples : null,
    paceSamples: paceSamples.length > 0 ? paceSamples : null,
    elevationProfile: elevationProfile.length > 0 ? elevationProfile : null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, limit = 5, activityId } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants Garmin manquants." }, { status: 400 });
    }

    const gc = new GarminConnect({ username: email, password: password });
    await gc.login();

    // Fonction de téléchargement du fichier brut TCX
    const fetchTcxTelemetry = async (actId: string | number) => {
      try {
        const client = gc.client || gc;
        let tcxData: string | null = null;

        if (typeof gc.get === "function") {
          tcxData = await gc.get(`https://connect.garmin.com/modern/proxy/download-service/export/tcx/activity/${actId}`);
        } else if (client.get) {
          const res = await client.get(`https://connect.garmin.com/modern/proxy/download-service/export/tcx/activity/${actId}`);
          tcxData = res.data || res;
        }

        if (tcxData && typeof tcxData === "string") {
          return parseGarminTcx(tcxData);
        }
      } catch (err) {
        console.warn(`Erreur téléchargement TCX (${actId}):`, err);
      }
      return null;
    };

    // 1. Si un ID spécifique est demandé
    if (activityId) {
      const telemetry = await fetchTcxTelemetry(activityId);
      return NextResponse.json({ success: true, telemetry });
    }

    // 2. Récupération des activités de course
    let rawActivities: any[] = [];
    if (typeof gc.getActivities === "function") {
      rawActivities = await gc.getActivities(0, limit);
    } else {
      const client = gc.client || gc;
      const res = await client.get(`https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=${limit}`);
      rawActivities = res.data || res || [];
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

    // 3. Téléchargement et parsing du vrai TCX pour les activités
    const formattedActivities = await Promise.all(
      runningActivities.slice(0, 3).map(async (act: any) => {
        const distKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : 0;
        const avgSpeedMs = act.averageSpeed || (act.distance && act.duration ? act.distance / act.duration : 0);
        const secPerKm = avgSpeedMs > 0 ? Math.round(1000 / avgSpeedMs) : 0;
        const durationSec = Math.round(act.movingDuration || act.duration || act.elapsedDuration || 0);

        // Vraies données natives Garmin
        const telemetry = await fetchTcxTelemetry(act.activityId);

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