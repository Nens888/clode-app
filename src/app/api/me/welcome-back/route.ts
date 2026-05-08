import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    
    const { data: user } = await supabase
      .from("users")
      .select("last_login_at, created_at")
      .eq("id", session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
    const createdAt = new Date(user.created_at);
    const now = new Date();

    // Calculate days since last login
    let daysAway = 0;
    if (lastLogin) {
      daysAway = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    } else if (user.created_at) {
      // First login - calculate from account creation
      daysAway = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Skip if user was away for less than 1 day
    if (daysAway < 1) {
      return NextResponse.json({ showWelcome: false });
    }

    // Fetch real weather data from Open-Meteo (free, no API key)
    // Using Moscow as default location
    let weatherData = null;
    try {
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&past_days=7&forecast_days=1"
      );
      if (weatherRes.ok) {
        const weather = await weatherRes.json();
        
        const daily = weather.daily;
        const totalRain = daily?.precipitation_sum?.reduce((a: number, b: number) => a + (b || 0), 0) || 0;
        const avgTemp = daily?.temperature_2m_max?.reduce((a: number, b: number) => a + (b || 0), 0) / 7 || 0;
        
        weatherData = {
          totalRainMm: Math.round(totalRain * 10) / 10,
          avgTemp: Math.round(avgTemp),
          sunnyDays: daily?.weathercode?.filter((code: number) => code <= 3).length || 0,
        };
      }
    } catch {
      // Weather API failed, use fallback
    }

    // Get platform stats
    const [{ count: totalUsers }, { count: totalPosts }] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      showWelcome: true,
      daysAway,
      weather: weatherData,
      platformStats: {
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}