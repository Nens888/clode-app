"use client";

import { cn } from "@/lib/cn";
import type { Track } from "@/store/playerStore";
import { usePlayerStore } from "@/store/playerStore";
import { Pause, Play } from "lucide-react";

export function MusicTrackRow({
  track,
  queue,
  index,
}: {
  track: Track;
  queue: Track[];
  index: number;
}) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  const active = currentTrack?.id === track.id;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition",
        "hover:bg-white/[0.04]",
        active && "border-white/[0.14] bg-white/[0.04]",
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white/85">
          {track.title}
        </div>
        <div className="text-xs text-white/40">{track.artist}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-white/35">{track.duration}</div>
        <button
          type="button"
          onClick={() => {
            if (active) {
              toggle();
            } else {
              setQueue(queue, index);
            }
          }}
          className={cn(
            "rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition",
            "hover:bg-white/[0.08] active:scale-[0.98]",
          )}
        >
          <span className="inline-flex items-center gap-2">
            {active && isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {active && isPlaying ? "Пауза" : "Играть"}
          </span>
        </button>
      </div>
    </div>
  );
}
