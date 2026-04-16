"use client";

import { useState } from "react";

import { normalizeAuthError } from "@/lib/auth-utils";

type AccountDeleteFormProps = {
  email: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return normalizeAuthError({ message: payload.message, code: "code" in payload ? payload.code : undefined });
  }

  if ("error" in payload && typeof payload.error === "string") {
    return normalizeAuthError({ message: payload.error, code: "code" in payload ? payload.code : undefined });
  }

  return fallback;
}

export function AccountDeleteForm({ email }: AccountDeleteFormProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      setMessage({
        type: "error",
        text: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการลบบัญชี"
      });
      return;
    }

    const confirmed = window.confirm(
      `ลบบัญชี ${email} แบบถาวรใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const callbackURL = `${window.location.origin}/login?deleted=1`;
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password,
          callbackURL
        })
      });

      const payload = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "ไม่สามารถลบบัญชีได้ในขณะนี้"));
      }

      setMessage({
        type: "success",
        text: "กำลังลบบัญชีและนำคุณกลับไปยังหน้าเข้าสู่ระบบ..."
      });

      window.location.assign("/login?deleted=1");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "ไม่สามารถลบบัญชีได้ในขณะนี้"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[#efc3c5] bg-[#fff7f7] px-5 py-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#a32024]">Danger Zone</p>
      <h3 className="mt-2 text-xl font-extrabold text-[#171212]">ลบบัญชีถาวร</h3>
      <p className="mt-3 text-sm leading-7 text-[#5f5852]">
        การลบบัญชีจะออกจากระบบทันที และข้อมูลบัญชีที่ผูกกับผู้ใช้จะถูกลบหรือยกเลิกการเชื่อมโยงตามโครงสร้างฐานข้อมูลปัจจุบัน
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-bold text-[#171212]">
          รหัสผ่านปัจจุบัน
          <input
            className="mt-2 block w-full border border-[#e4c9cb] bg-white px-4 py-3 text-sm text-[#171212] outline-none focus:border-[#d14b4f]"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
            type="password"
            value={password}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center bg-[#a32024] px-5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#86191d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "กำลังลบบัญชี..." : "ลบบัญชี"}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm font-semibold ${message.type === "error" ? "text-[#a32024]" : "text-[#1a7f37]"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
