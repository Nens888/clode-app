"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PlayerBar } from "@/components/PlayerBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith("/auth");
  const isMessages = pathname?.startsWith("/messages");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-20">
        <div
          className={
            isMessages
              ? "grid min-h-screen grid-cols-[160px_1fr] gap-5 py-10"
              : "grid min-h-screen grid-cols-[160px_1fr_260px] gap-5 py-10"
          }
        >
          <div className="justify-self-end">
            <Sidebar />
          </div>
          <main className={isMessages ? "w-full max-w-none" : "w-full max-w-[640px] justify-self-center"}>
            {children}
          </main>
          {!isMessages ? (
            <aside>
              <RightSidebar />
            </aside>
          ) : null}
        </div>
      </div>
      <PlayerBar />
    </>
  );
}
