"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileAvatarEdit } from "@/components/ProfileAvatarEdit";
import { ProfileBannerEdit } from "@/components/ProfileBannerEdit";

export function ProfileMediaSection({
  isMe,
  avatarUrl,
  bannerUrl,
  username,
}: {
  isMe: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  username: string;
}) {
  const router = useRouter();
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [currentBannerUrl, setCurrentBannerUrl] = useState(bannerUrl);

  const handleAvatarUpdated = (url: string) => {
    setCurrentAvatarUrl(url);
    router.refresh();
  };

  const handleBannerUpdated = (url: string) => {
    setCurrentBannerUrl(url);
    router.refresh();
  };

  return (
    <>
      {/* Banner */}
      <div className="relative h-44 overflow-hidden">
        {isMe ? (
          <div className="h-full w-full">
            <ProfileBannerEdit bannerUrl={currentBannerUrl} onUpdated={handleBannerUpdated} />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent" />
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_200px_at_20%_10%,rgba(34,211,238,0.45),transparent_55%)]" />
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_220px_at_85%_15%,rgba(99,102,241,0.35),transparent_55%)]" />
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </>
        )}
      </div>

      {/* Avatar area */}
      <div className="px-5 pb-5">
        <div className="-mt-9 flex items-start justify-between">
          {isMe ? (
            <ProfileAvatarEdit avatarUrl={currentAvatarUrl} onUpdated={handleAvatarUpdated} />
          ) : (
            <div className="grid size-16 place-items-center overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06] text-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                "🫧"
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
