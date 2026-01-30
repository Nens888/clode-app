"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type TabItem = {
  label: string;
  href: string;
};

export function Tabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-white/[0.06]">
      <div className="grid grid-flow-col auto-cols-fr">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-3 text-center text-sm font-medium text-white/60 transition hover:text-white active:scale-[0.99]",
                active && "text-white",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[2px] w-2/3 rounded-full bg-transparent transition-colors",
                  active && "bg-[color:var(--accent)]",
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
