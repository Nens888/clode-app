"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface WelcomeBackData {
  showWelcome: boolean;
  daysAway?: number;
  weather?: {
    totalRainMm: number;
    avgTemp: number;
    sunnyDays: number;
  };
  platformStats?: {
    totalUsers: number;
    totalPosts: number;
  };
}

export function WelcomeBack() {
  const [data, setData] = useState<WelcomeBackData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/welcome-back")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data?.showWelcome || dismissed) {
    return null;
  }

  const { daysAway = 0, weather, platformStats } = data;

  // Generate interesting facts
  const facts: { icon: string; text: string; color: string }[] = [];

  // Weather facts
  if (weather) {
    if (weather.totalRainMm > 0) {
      facts.push({
        icon: "🌧️",
        text: `Пока тебя не было, выпало ${weather.totalRainMm} мм осадков`,
        color: "bg-blue-500/20 border-blue-500/30",
      });
    }
    if (weather.sunnyDays > 0) {
      facts.push({
        icon: "☀️",
        text: `Было ${weather.sunnyDays} солнечных дней`,
        color: "bg-yellow-500/20 border-yellow-500/30",
      });
    }
    facts.push({
      icon: "🌡️",
      text: `Средняя температура: ${weather.avgTemp}°C`,
      color: "bg-orange-500/20 border-orange-500/30",
    });
  }

  // Time away fact
  if (daysAway > 0) {
    const daysText = daysAway === 1 ? "день" : daysAway < 5 ? "дня" : "дней";
    facts.push({
      icon: "⏰",
      text: `Тебя не было ${daysAway} ${daysText}`,
      color: "bg-purple-500/20 border-purple-500/30",
    });
  }

  // Platform growth (simulated based on time away)
  if (platformStats && daysAway > 1) {
    const estimatedNewUsers = Math.floor(daysAway * (platformStats.totalUsers / 100));
    const estimatedNewPosts = Math.floor(daysAway * (platformStats.totalPosts / 200));
    
    if (estimatedNewUsers > 0) {
      facts.push({
        icon: "👥",
        text: `Присоединилось ~${estimatedNewUsers} новых users`,
        color: "bg-green-500/20 border-green-500/30",
      });
    }
    if (estimatedNewPosts > 0) {
      facts.push({
        icon: "📝",
        text: `Опубликовано ~${estimatedNewPosts} новых постов`,
        color: "bg-pink-500/20 border-pink-500/30",
      });
    }
  }

  // Random fun facts
  const funFacts = [
    { icon: "🌙", text: "Земля совершила оборот вокруг Солнца", color: "bg-gray-500/20 border-gray-500/30" },
    { icon: "💤", text: "Ты мог бы посмотреть 500 серий сериала", color: "bg-indigo-500/20 border-indigo-500/30" },
    { icon: "🎵", text: "В мире прослушали 100M песен", color: "bg-red-500/20 border-red-500/30" },
  ];

  // Add a random fun fact
  if (facts.length < 4 && daysAway > 3) {
    const randomFunFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    facts.push(randomFunFact);
  }

  return (
    <GlassCard className="overflow-hidden border-l-4 border-l-[#0ea5e9]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white">С возвращением! 👋</h2>
            <p className="text-sm text-white/50">Вот что происходило, пока тебя не было</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {facts.slice(0, 4).map((fact, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-white/90",
                  fact.color
                )}
              >
                <span>{fact.icon}</span>
                <span>{fact.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </GlassCard>
  );
}
