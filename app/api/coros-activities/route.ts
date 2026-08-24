// @ts-nocheck
// app/api/coros-activities/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const md5Hash = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex");
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, limit = 10 } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Identifiants COROS manquants." },
        { status: 400 }
      );
    }

    const pwdMd5 = md5Hash(password);
    const loginRes = await fetch("https://open.coros.com/v2/coros/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: email,
        accountType: 2,
        pwd: pwdMd5,
      }),
    });

    const loginData = await loginRes.json();
    const token = loginData?.data?.accessToken || loginData?.data?.token;

    if (!token && loginData.result !== "0000") {
      throw new Error(loginData?.message || "Identifiants COROS invalides.");
    }

    // Récupération de la liste des activités COROS
    const actRes = await fetch(`https://open.coros.com/v2/coros/activity/query?size=${limit}&pageNumber=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accessToken: token,
      },
    });

    const actData = await actRes.json();
    const rawList = actData?.data?.dataList || [];

    const runningActivities = rawList
      .filter((act: any) => act.sportType === 100 || act.sportType === 101 || act.sportType === 1)
      .map((act: any) => {
        const distKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : 0;
        const durationSec = Math.round(act.totalTime || 0);
        const durationMin = Math.round(durationSec / 60);

        let avgPaceStr = "-";
        if (distKm > 0 && durationSec > 0) {
          const secPerKm = Math.round(durationSec / distKm);
          const pMin = Math.floor(secPerKm / 60);
          const pSec = secPerKm % 60;
          avgPaceStr = `${pMin}:${pSec < 10 ? "0" : ""}${pSec}`;
        }

        const dateStr = act.startTime
          ? new Date(act.startTime * 1000).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        return {
          id: String(act.activityId || act.labelId || Date.now()),
          title: act.activityName || "Course COROS",
          date: dateStr,
          distanceKm: distKm,
          durationMinutes: durationMin,
          durationSeconds: durationSec,
          avgPace: avgPaceStr,
          avgHr: Math.round(act.avgHeartRate || 0) || null,
          maxHr: Math.round(act.maxHeartRate || 0) || null,
          calories: Math.round(act.calorie || 0) || null,
          elevationGain: Math.round(act.elevationGain || 0) || 0,
        };
      });

    return NextResponse.json({
      success: true,
      activities: runningActivities,
    });
  } catch (error: any) {
    console.error("COROS Fetch Activities Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération des activités COROS." },
      { status: 400 }
    );
  }
}