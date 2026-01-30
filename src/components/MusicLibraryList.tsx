"use client";

import { MusicTrackRow } from "@/components/MusicTrackRow";
import type { Track } from "@/store/playerStore";
import { usePlayerStore } from "@/store/playerStore";

export function MusicLibraryList() {
  const library = usePlayerStore((s) => s.library);
  const tracks: Track[] = Object.values(library);

  if (!tracks.length) {
    return <div className="px-6 py-10 text-center text-sm text-white/40">Моя музыка пока пустая</div>;
  }

  return (
    <div className="px-6 py-4">
      <div className="text-sm font-semibold text-white/90">Моя музыка</div>
      <div className="mt-3 space-y-3">
        {tracks.map((t, idx) => (
          <MusicTrackRow key={t.id} track={t} queue={tracks} index={idx} />
        ))}
      </div>
    </div>
  );
}
