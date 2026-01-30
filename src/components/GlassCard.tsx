import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
};

export function GlassCard({ children, className, interactive }: GlassCardProps) {
  const isInteractive = interactive ?? true;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-[var(--shadow)] backdrop-blur-2xl saturate-150",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
        "before:[background:radial-gradient(600px_220px_at_25%_15%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(520px_220px_at_85%_0%,rgba(99,102,241,0.16),transparent_60%)]",
        isInteractive &&
          "transition-[transform,background-color,border-color] duration-200 hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-[color:var(--card-hover)] hover:before:opacity-100 active:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
