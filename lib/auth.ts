import "server-only";

import { betterAuth } from "better-auth";
import { createEmailVerificationToken } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAppUrl } from "@/lib/app-url";
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

function buildVerificationPageUrl(token: string, email: string) {
  const appURL = getAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.BETTER_AUTH_URL, process.env.VERCEL_URL);
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

function createAuth() {
  const baseURL = getAppUrl(process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL);
  const trustedOrigins = Array.from(
    new Set([
      "http://localhost:3000",
      baseURL,
      "https://pattayabev-azih1vgoi-chayada9871s-projects.vercel.app",
      "https://*.vercel.app"
    ])
  );

  return betterAuth({
    appName: "PattayaBev",
    database: db,
    baseURL,
    trustedOrigins,
    secret: getRequiredEnv("BETTER_AUTH_SECRET"),
    plugins: [nextCookies()],
    emailVerification: {
      sendOnSignUp: true,
      // Keep login independent from mail transport so unverified users
      // get a clear auth error instead of a server failure when SMTP is down.
      sendOnSignIn: false,
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
}

type AuthInstance = ReturnType<typeof createAuth>;

declare global {
  var __pattayabevAuth: AuthInstance | undefined;
}

function getAuth() {
  const authInstance = global.__pattayabevAuth ?? createAuth();

  if (process.env.NODE_ENV !== "production") {
    global.__pattayabevAuth = authInstance;
  }

  return authInstance;
}

function isMissingRequiredEnvError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Missing required environment variable:");
}

function hasBetterAuthSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return false;
  }

  return /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookieHeader);
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, property, receiver) {
    const authInstance = getAuth();
    const value = Reflect.get(authInstance, property, receiver);

    return typeof value === "function" ? value.bind(authInstance) : value;
  }
});

type BaseAuthSession = AuthInstance["$Infer"]["Session"];

export type AuthSession = Omit<BaseAuthSession, "user"> & {
  user: BaseAuthSession["user"] & {
    role?: AppRole | null;
  };
};
export type AuthUser = AuthSession["user"];

function getRoleFromSession(session: AuthSession | null | undefined): AppRole {
  return (session?.user.role as AppRole | undefined) ?? "user";
}

const getCachedServerSession = cache(async (): Promise<AuthSession | null> => {
  const requestHeaders = await headers();

  if (!hasBetterAuthSessionCookie(requestHeaders.get("cookie"))) {
    return null;
  }

  return (await auth.api.getSession({
    headers: requestHeaders
  })) as AuthSession | null;
});

export async function getServerSession(): Promise<AuthSession | null> {
  return getCachedServerSession();
}

export async function getOptionalServerSession(): Promise<AuthSession | null> {
  try {
    return await getServerSession();
  } catch (error) {
    if (isMissingRequiredEnvError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function getRequestSession(request: Request): Promise<AuthSession | null> {
  if (!hasBetterAuthSessionCookie(request.headers.get("cookie"))) {
    return null;
  }

  return (await auth.api.getSession({
    headers: request.headers
  })) as AuthSession | null;
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
