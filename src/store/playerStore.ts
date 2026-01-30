import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
};

type PlayerState = {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  library: Record<string, Track>;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (value: number) => void;
  toggleInLibrary: (track: Track) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [
    { id: "t1", title: "Midnight Glass", artist: "Cloude", duration: "3:12" },
    { id: "t2", title: "Neon Drift", artist: "Novki", duration: "2:48" },
    { id: "t3", title: "Satin Blur", artist: "Teamwork", duration: "4:05" },
  ],
  currentIndex: 0,
  isPlaying: false,
  volume: 0.7,
  library: {},

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: Math.max(0, startIndex), isPlaying: true }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () =>
    set((s) => {
      const nextIndex = s.queue.length
        ? (s.currentIndex + 1) % s.queue.length
        : 0;
      return { currentIndex: nextIndex, isPlaying: true };
    }),
  prev: () =>
    set((s) => {
      const len = s.queue.length;
      const prevIndex = len ? (s.currentIndex - 1 + len) % len : 0;
      return { currentIndex: prevIndex, isPlaying: true };
    }),
  setVolume: (value) => set({ volume: Math.min(1, Math.max(0, value)) }),
  toggleInLibrary: (track) =>
    set((s) => {
      const exists = Boolean(s.library[track.id]);
      const library = { ...s.library };
      if (exists) {
        delete library[track.id];
      } else {
        library[track.id] = track;
      }
      return { library };
    }),
}));
