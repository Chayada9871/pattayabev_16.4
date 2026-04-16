"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { normalizeAuthError } from "@/lib/auth-utils";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const errorParam = searchParams.get("error") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const invalidMessage = useMemo(() => {
    if (errorParam === "INVALID_TOKEN" || !token) {
      return "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว";
    }

    return "";
  }, [errorParam, token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setMessage({
        type: "error",
        text: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว"
      });
      return;
    }

    if (!password || !confirmPassword) {
      setMessage({
        type: "error",
        text: "กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน"
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "รหัสผ่านใหม่และการยืนยันรหัสผ่านต้องตรงกัน"
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          newPassword: password
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
        text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังพากลับไปยังหน้าเข้าสู่ระบบ..."
      });

      window.setTimeout(() => {
        router.replace("/login?reset=1");
      }, 900);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "ไม่สามารถตั้งรหัสผ่านใหม่ได้"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="ตั้งรหัสผ่านใหม่"
      subtitle={
        <>
          กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ{" "}
          <Link className="font-extrabold underline underline-offset-4" href="/login">
            กลับไปเข้าสู่ระบบ
          </Link>
        </>
      }
    >
      {invalidMessage ? (
        <div className="mx-auto mt-8 max-w-2xl border border-[#efc3c5] bg-[#fff7f7] px-5 py-4 text-sm font-semibold text-[#a32024]">
          {invalidMessage}
        </div>
      ) : (
        <form className="mx-auto mt-8 grid w-full max-w-2xl gap-5" onSubmit={handleSubmit}>
          <label className="block text-left text-sm font-bold uppercase tracking-[0.08em] text-ink">
            <span className="mb-2 block">
              รหัสผ่านใหม่ <span className="text-wine">*</span>
            </span>
            <input
              className="block w-full min-h-14 rounded-2xl border border-[#d7cec1] bg-[#fffdf9] px-4 text-base text-ink outline-none placeholder:text-[#8d8d8d] focus:border-gold focus:ring-4 focus:ring-[#b8924724]"
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="อย่างน้อย 10 ตัวอักษร"
              type="password"
              value={password}
            />
          </label>

          <label className="block text-left text-sm font-bold uppercase tracking-[0.08em] text-ink">
            <span className="mb-2 block">
              ยืนยันรหัสผ่านใหม่ <span className="text-wine">*</span>
            </span>
            <input
              className="block w-full min-h-14 rounded-2xl border border-[#d7cec1] bg-[#fffdf9] px-4 text-base text-ink outline-none placeholder:text-[#8d8d8d] focus:border-gold focus:ring-4 focus:ring-[#b8924724]"
              minLength={10}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              type="password"
              value={confirmPassword}
            />
          </label>

          <button
            className="block w-full min-h-[58px] rounded-2xl bg-[linear-gradient(135deg,#171212_0%,#302520_100%)] px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_16px_28px_rgba(23,18,18,0.18)] disabled:cursor-wait disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? "กำลังบันทึกรหัสผ่านใหม่..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </form>
      )}

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
