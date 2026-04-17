"use client";

import { createAuthClient } from "better-auth/react";

import { getAppUrl } from "@/lib/app-url";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : getAppUrl(process.env.NEXT_PUBLIC_APP_URL);

export const authClient = createAuthClient({
  baseURL
});
