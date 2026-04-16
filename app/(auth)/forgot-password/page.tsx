"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { normalizeAuthError } from "@/lib/auth-utils";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    const presetEmail = searchParams.get("email");

    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "กรุณากรอกอีเมลก่อนส่งลิงก์รีเซ็ตรหัสผ่าน"
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        throw new Error(normalizeAuthError(payload));
      }

      setMessage({
        type: "success",
        text:
          payload.message ||
          "If this email exists in our system, check your email for the reset link."
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      subtitle={
        <>
          กรอกอีเมลของคุณเพื่อรับลิงก์ตั้งรหัสผ่านใหม่{" "}
          <Link className="font-extrabold underline underline-offset-4" href="/login">
            กลับไปเข้าสู่ระบบ
          </Link>
        </>
      }
    >
      <form className="mx-auto mt-8 grid w-full max-w-2xl gap-5" onSubmit={handleSubmit}>
        <label className="block text-left text-sm font-bold uppercase tracking-[0.08em] text-ink">
          <span className="mb-2 block">
            อีเมล <span className="text-wine">*</span>
          </span>
          <input
            className="block w-full min-h-14 rounded-2xl border border-[#d7cec1] bg-[#fffdf9] px-4 text-base text-ink outline-none placeholder:text-[#8d8d8d] focus:border-gold focus:ring-4 focus:ring-[#b8924724]"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            type="email"
            value={email}
          />
        </label>

        <button
          className="block w-full min-h-[58px] rounded-2xl bg-[linear-gradient(135deg,#171212_0%,#302520_100%)] px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_16px_28px_rgba(23,18,18,0.18)] disabled:cursor-wait disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "กำลังส่งลิงก์รีเซ็ต..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
        </button>
      </form>

      <p
        className={`mt-4 min-h-6 text-left text-sm font-semibold ${
          message?.type === "error" ? "text-[#ef473a]" : "text-[#1a7f37]"
        }`}
      >
        {message?.text}
      </p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
