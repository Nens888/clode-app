import { GlassCard } from "@/components/GlassCard";
import { Tabs } from "@/components/Tabs";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export default async function LikesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const normalized = username.startsWith("@") ? username.slice(1) : username;
  const supabase = createSupabaseAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id,username,display_name")
    .eq("username", normalized)
    .maybeSingle();

  if (!user?.id) {
    return (
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-10 text-center text-sm text-white/40">
          Пользователь не найден
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent" />
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_200px_at_20%_10%,rgba(34,211,238,0.45),transparent_55%)]" />
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_220px_at_85%_15%,rgba(99,102,241,0.35),transparent_55%)]" />
      </div>

      <div className="px-5 pb-5">
        <div className="-mt-9 grid size-16 place-items-center rounded-full border border-white/[0.08] bg-white/[0.06] text-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          🫧
        </div>
        <div className="mt-3">
          <div className="text-lg font-semibold text-white/90">
            {user.display_name}
          </div>
          <div className="text-sm text-white/40">@{user.username}</div>
        </div>
      </div>

      <Tabs
        items={[
          { label: "Посты", href: `/profile/${username}` },
          { label: "Понравившиеся", href: `/profile/${username}/likes` },
        ]}
      />

      <div className="px-5 py-10 text-center text-sm text-white/40">
        Пока нет понравившихся
      </div>
    </GlassCard>
  );
}
