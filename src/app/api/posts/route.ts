import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const text = String(form.get("text") ?? "").trim();
    const file = form.get("file") as File | null;

    if (!text && !file) {
      return NextResponse.json({ error: "Пост пустой" }, { status: 400 });
    }

    let media_url: string | null = null;
    let media_type: "image" | "video" | null = null;

    if (file) {
      const mime = file.type || "";
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");

      if (!isImage && !isVideo) {
        return NextResponse.json({ error: "Неподдерживаемый тип файла" }, { status: 400 });
      }

      // Basic size limits
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Файл слишком большой (max ${isVideo ? "50" : "10"} MB)` },
          { status: 400 },
        );
      }

      media_type = isVideo ? "video" : "image";

      const supabaseStorage = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const fileExt = (file.name.split(".").pop() ?? "").toLowerCase();
      const safeExt = fileExt || (isVideo ? "mp4" : "jpg");
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
      const filePath = `${session.userId}/${fileName}`;

      const { error: uploadError } = await supabaseStorage.storage
        .from("posts")
        .upload(filePath, file, { upsert: false, contentType: mime });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseStorage.storage
        .from("posts")
        .getPublicUrl(filePath);

      media_url = publicUrlData.publicUrl;
    }

    const supabase = createSupabaseAdminClient();

    const { data: post, error } = await supabase
      .from("posts")
      .insert({ author_id: session.userId, text, media_url, media_type })
      .select("id,text,created_at,author_id,media_url,media_type")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
