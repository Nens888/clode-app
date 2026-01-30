type SendVerificationEmailArgs = {
  to: string;
  code: string;
};

export async function sendVerificationEmail({ to, code }: SendVerificationEmailArgs) {
  const apiKey = process.env.UNOSEND_API_KEY;
  const from = process.env.UNOSEND_FROM;

  const baseUrl = process.env.UNOSEND_API_URL ?? "https://www.unosend.co/api/v1";

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Clode][Auth] Verification code for ${to}: ${code} (Unosend not configured)`,
      );
      return;
    }

    throw new Error("Missing UNOSEND_API_KEY or UNOSEND_FROM env vars");
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Код подтверждения",
      text: `Ваш код подтверждения: ${code}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Clode][Auth] Verification code for ${to}: ${code} (Unosend error ${res.status})`,
      );
      console.log(`[Clode][Auth] Unosend response: ${text}`);
      return;
    }

    throw new Error(`Unosend error ${res.status}: ${text}`);
  }
}
