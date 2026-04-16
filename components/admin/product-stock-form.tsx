"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  updateProductStockAction,
  type ProductFormState
} from "@/app/admin/actions";

const initialState: ProductFormState = {
  status: "idle",
  message: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-[#171212] px-5 text-sm font-bold text-white transition hover:bg-[#2b2424] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "เพิ่มจำนวน"}
    </button>
  );
}

export function ProductStockForm({
  productId,
  productSlug
}: {
  productId: string;
  productSlug: string;
}) {
  const [state, formAction] = useFormState(updateProductStockAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="quantityToAdd"
          type="number"
          min="1"
          step="1"
          required
          placeholder="ใส่จำนวนที่ต้องการเพิ่ม"
          className="min-h-[44px] flex-1 rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
        />
        <SubmitButton />
      </div>

      <p className="text-xs leading-5 text-[#7a736b]">
        ใส่จำนวนที่ต้องการเพิ่มเข้าระบบ เช่น ใส่ 10 แล้วระบบจะบวกเพิ่มจากจำนวนเดิม
      </p>

      {state.message ? (
        <p
          className={`text-sm font-semibold ${
            state.status === "success" ? "text-[#207443]" : "text-[#b42318]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
