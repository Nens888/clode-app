type SendVerificationEmailArgs = {
  to: string;
  code: string;
};

export async function sendVerificationEmail({ to, code }: SendVerificationEmailArgs) {
  // Если включен статичный код — ничего не отправляем, только лог в dev
  if (process.env.AUTH_STATIC_VERIFY_CODE) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Clode][Auth] Verification code for ${to}: ${code} (static code mode)`);
    }
    return;
  }

  // В production без статичного кода — требуем настройки email
  if (process.env.NODE_ENV === "production") {
    throw new Error("Email service not configured in production");
  }

  // В dev без статичного кода — просто логируем
  console.log(`[Clode][Auth] Verification code for ${to}: ${code} (email skipped)`);
}
