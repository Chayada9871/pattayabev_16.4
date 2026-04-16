import "server-only";

import { unlink } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security";

const PRIVATE_BUSINESS_DOCUMENT_PREFIX = "private://business-documents/";

export function getBusinessDocumentsStorageDir() {
  return path.join(process.cwd(), "storage", "private", "business-documents");
}

export function sanitizeBusinessDocumentFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function buildStoredBusinessDocumentReference(fileName: string) {
  return `${PRIVATE_BUSINESS_DOCUMENT_PREFIX}${sanitizeBusinessDocumentFileName(path.basename(fileName))}`;
}

export function buildBusinessDocumentRoute(documentId: string, download = false) {
  return `/api/business-documents/${encodeURIComponent(documentId)}${download ? "?download=1" : ""}`;
}

export function resolveBusinessDocumentAbsolutePath(fileUrl: string) {
  if (fileUrl.startsWith(PRIVATE_BUSINESS_DOCUMENT_PREFIX)) {
    const fileName = sanitizeBusinessDocumentFileName(path.basename(fileUrl.slice(PRIVATE_BUSINESS_DOCUMENT_PREFIX.length)));
    return path.join(getBusinessDocumentsStorageDir(), fileName);
  }

  if (fileUrl.startsWith("/uploads/business-documents/")) {
    const fileName = sanitizeBusinessDocumentFileName(path.basename(fileUrl));
    return path.join(process.cwd(), "public", "uploads", "business-documents", fileName);
  }

  return null;
}

export function getBusinessDocumentMimeType(fileName: string, fallback?: string | null) {
  if (fallback) {
    return fallback;
  }

  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  return "application/octet-stream";
}

export async function deleteBusinessDocumentsForUser(userId: string) {
  const result = await db.query(
    `
      select bd.file_url
      from public.business_documents bd
      inner join public.business_profiles bp on bp.id = bd.business_profile_id
      where bp.user_id = $1
    `,
    [userId]
  );

  await Promise.allSettled(
    result.rows.map(async (row) => {
      const fileUrl = String(row.file_url ?? "");
      const absolutePath = resolveBusinessDocumentAbsolutePath(fileUrl);

      if (!absolutePath) {
        return;
      }

      try {
        await unlink(absolutePath);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          String((error as { code?: string }).code) === "ENOENT"
        ) {
          return;
        }

        logSecurityEvent("business-documents.cleanup.failed", {
          userId,
          fileUrl,
          reason: error instanceof Error ? error.message : "unknown"
        });
      }
    })
  );
}
