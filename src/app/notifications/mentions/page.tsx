import { GlassCard } from "@/components/GlassCard";
import { Tabs } from "@/components/Tabs";

export default function MentionsPage() {
  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4">
        <h1 className="text-sm font-semibold text-white/90">Уведомления</h1>
      </div>
      <Tabs
        items={[
          { label: "Все", href: "/notifications" },
          { label: "Упоминания", href: "/notifications/mentions" },
        ]}
      />
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
        <div className="text-white/25">@</div>
        <div className="text-sm text-white/40">Нет упоминаний</div>
      </div>
    </GlassCard>
  );
}
