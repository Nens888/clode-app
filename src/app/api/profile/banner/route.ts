import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (4 MB)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const fileExt = file.name.split(".").pop();
    const safeExt = (fileExt ?? "").toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
    const filePath = `${session.userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("banners")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update user banner_url
    const { error: updateError } = await supabase
      .from("users")
      .update({ banner_url: publicUrl })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ bannerUrl: publicUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
