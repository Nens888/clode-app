import { GlassCard } from "@/components/GlassCard";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <GlassCard className="overflow-hidden">
        <div className="px-6 py-5">
          <div className="text-lg font-semibold text-white/90">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-white/45">{subtitle}</div>
          ) : null}
        </div>
        <div className="border-t border-white/[0.06] px-6 py-5">{children}</div>
      </GlassCard>
    </div>
  );
}
