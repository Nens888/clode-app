import { GlassCard } from "@/components/GlassCard";

export default function MusicPlaylistsPage() {
  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="px-6 py-10 text-center">
          <div className="text-base font-semibold text-white/90">Музыка</div>
          <div className="mt-2 text-sm text-white/50">Разработка</div>
        </div>
      </GlassCard>
    </div>
  );
}
