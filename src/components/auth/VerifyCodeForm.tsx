"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";
import { ArrowLeft, Key } from "lucide-react";

export function VerifyCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        body: JSON.stringify({ code: fullCode }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Неверный код");

      router.push("/auth/register");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неверный код");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0ea5e9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <AuthCard title="Пригласительный код" subtitle="Введите код для входа">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9]/20 to-purple-500/20 border border-white/[0.08]">
              <Key className="w-7 h-7 text-[#0ea5e9]" />
            </div>
          </div>

          {/* Code input */}
          <div>
            <div className="text-xs text-white/45 mb-4 text-center">Введите 6-значный код</div>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 text-center">
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
            {loading ? "Проверяем..." : "Продолжить"}
          </button>

          <div className="flex justify-center">
            <Link 
              href="/auth/login" 
              className="flex items-center gap-2 text-sm text-white/45 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
