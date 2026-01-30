"use client";

import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { usePlayerStore } from "@/store/playerStore";
import {
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Volume2,
  Check,
} from "lucide-react";

export function PlayerBar() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const library = usePlayerStore((s) => s.library);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleInLibrary = usePlayerStore((s) => s.toggleInLibrary);

  const track = queue[currentIndex];
  if (!track) return null;

  const inLibrary = Boolean(library[track.id]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-[920px] px-6 pb-6">
        <div className="group">
          <GlassCard
            className={cn(
              "px-4 py-3",
              "transition-[max-height] duration-300",
              "max-h-[60px] group-hover:max-h-[110px]",
            )}
            interactive={false}
          >
            <div className="flex items-center gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white/90">
                  {track.title}
                </div>
                <div className="truncate text-xs text-white/45">{track.artist}</div>
              </div>

              <div className="mx-auto flex items-center gap-2">
                <IconButton ariaLabel="Предыдущий" onClick={prev}>
                  <SkipBack size={18} />
                </IconButton>
                <IconButton
                  ariaLabel={isPlaying ? "Пауза" : "Играть"}
                  onClick={toggle}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </IconButton>
                <IconButton ariaLabel="Следующий" onClick={next}>
                  <SkipForward size={18} />
                </IconButton>
              </div>

              <div className="ml-1 text-xs text-white/35">{track.duration}</div>
            </div>

            <div
              className={cn(
                "mt-3 flex items-center justify-between gap-4",
                "overflow-hidden opacity-0 transition-all duration-300",
                "max-h-0 group-hover:max-h-20 group-hover:opacity-100",
              )}
            >
              <div className="flex items-center gap-3">
                <Volume2 size={16} className="text-white/45" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  className="player-range w-44"
                  aria-label="Громкость"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-white/35">Добавить</div>
                <IconButton
                  ariaLabel={
                    inLibrary
                      ? "Убрать из моей музыки"
                      : "Добавить в мою музыку"
                  }
                  onClick={() => toggleInLibrary(track)}
                >
                  {inLibrary ? <Check size={18} /> : <Plus size={18} />}
                </IconButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-white/[0.06] bg-white/[0.04] text-white/80 transition",
        "hover:bg-white/[0.08] active:scale-[0.97]",
      )}
    >
      {children}
    </button>
  );
}
