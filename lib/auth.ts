import "server-only";

import { betterAuth } from "better-auth";
import { createEmailVerificationToken } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { deleteBusinessDocumentsForUser } from "@/lib/business-documents";
import { db } from "@/lib/db";
import { getDashboardRoute, type AppRole } from "@/lib/auth-utils";
import { sendResetPasswordEmailMessage, sendVerificationEmailMessage } from "@/lib/email";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const verificationExpiresInSeconds = 3600;
const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const appURL = process.env.NEXT_PUBLIC_APP_URL || baseURL;

function buildVerificationPageUrl(token: string, email: string) {
  return `${appURL}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

async function sendVerificationEmailForUser(user: {
  email: string;
  name?: string | null;
}) {
  const token = await createEmailVerificationToken(
    getRequiredEnv("BETTER_AUTH_SECRET"),
    user.email,
    void 0,
    verificationExpiresInSeconds
  );

  await sendVerificationEmailMessage({
    to: user.email,
    userName: user.name,
    verifyUrl: buildVerificationPageUrl(token, user.email)
  });
}

export const auth = betterAuth({
  appName: "PattayaBev",
  database: db,
  baseURL,
  trustedOrigins: [
    "http://localhost:3000",
    "https://pattayabev-azih1vgoi-chayada9871s-projects.vercel.app",
    "https://*.vercel.app"
  ],
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  plugins: [nextCookies()],
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: verificationExpiresInSeconds,
    async sendVerificationEmail({ user, token }) {
      await sendVerificationEmailMessage({
        to: user.email,
        userName: user.name,
        verifyUrl: buildVerificationPageUrl(token, user.email)
      });
    }
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: verificationExpiresInSeconds,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendResetPasswordEmailMessage({
        to: user.email,
        userName: user.name,
        resetUrl: url
      });
    },
    async onExistingUserSignUp({ user }) {
      if (!user.emailVerified) {
        await sendVerificationEmailForUser(user);
      }
    }
  },
  user: {
    deleteUser: {
      enabled: true,
      async beforeDelete(user) {
        await deleteBusinessDocumentsForUser(user.id);
      }
    },
    additionalFields: {
      role: {
        type: ["admin", "manager", "user"],
        required: false,
        defaultValue: "user",
        input: false
      }
    }
  }
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];

function getRoleFromSession(session: AuthSession | null | undefined): AppRole {
  return (session?.user.role as AppRole | undefined) ?? "user";
}

const getCachedServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers()
  });
});

export async function getServerSession() {
  return getCachedServerSession();
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers
  });
}

export function isAdminSession(session: AuthSession | null | undefined) {
  return getRoleFromSession(session) === "admin";
}

export async function requireSession() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role?: AppRole, options?: { onUnauthorized?: "redirect" | "forbidden" }) {
  const session = await requireSession();
  const currentRole = getRoleFromSession(session);

  if (role && currentRole !== role) {
    redirect(getDashboardRoute(currentRole));
  }

  return session;
}

export async function requireAdmin() {
  return requireRole("admin", { onUnauthorized: "forbidden" });
}

export async function requireAdminApi(request: Request) {
  const session = await getRequestSession(request);

  if (!isAdminSession(session)) {
    return {
      ok: false as const,
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    session
  };
}
