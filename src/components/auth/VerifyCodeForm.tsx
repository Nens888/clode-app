"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";
import { Mail, ArrowLeft } from "lucide-react";

export function VerifyCodeForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("auth_email") ?? "";
    setEmail(saved);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const fullCode = code.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullCode.length !== 6) return;
    
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    
    try {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendCooldown(60);
    } catch {
      setError("Не удалось отправить код");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0ea5e9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <AuthCard title="Подтверждение" subtitle="Мы отправили код на ваш email">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email display */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0ea5e9]/20">
              <Mail className="w-5 h-5 text-[#0ea5e9]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/45">Email</div>
              <div className="text-sm text-white/90 truncate">{email || "—"}</div>
            </div>
          </div>

          {/* Code input */}
          <div>
            <div className="text-xs text-white/45 mb-3">Код подтверждения</div>
            <div className="flex gap-2 justify-between" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={cn(
                    "w-12 h-14 text-center text-lg font-semibold rounded-2xl border transition-all outline-none",
                    "bg-white/[0.04] text-white placeholder:text-white/20",
                    digit ? "border-[#0ea5e9]/50 bg-[#0ea5e9]/10" : "border-white/[0.06]",
                    "focus:border-[#0ea5e9] focus:bg-[#0ea5e9]/15 focus:ring-2 focus:ring-[#0ea5e9]/20",
                  )}
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || fullCode.length !== 6}
            className={cn(
              "w-full rounded-2xl bg-[#0ea5e9] px-5 py-3.5 text-sm font-semibold text-white transition-all",
              "hover:bg-[#0284c7] active:scale-[0.99]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0ea5e9]",
              loading && "animate-pulse",
            )}
          >
            {loading ? "Проверяем..." : "Подтвердить"}
          </button>

          {/* Resend code */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-white/45">Не получили код?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className={cn(
                "text-[#0ea5e9] hover:text-[#38bdf8] transition-colors",
                resendCooldown > 0 && "text-white/30 cursor-not-allowed",
              )}
            >
              {resendCooldown > 0 ? `Повторить через ${resendCooldown}с` : "Отправить снова"}
            </button>
          </div>

          <div className="flex justify-center">
            <Link 
              href="/auth/register" 
              className="flex items-center gap-2 text-sm text-white/45 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад к регистрации
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
