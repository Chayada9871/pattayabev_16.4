import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  getBusinessDocumentMimeType,
  resolveBusinessDocumentAbsolutePath
} from "@/lib/business-documents";
import { getRequestSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit, isUuid, logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    enforceRateLimit(request, {
      keyPrefix: "business-documents:view",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
      message: "Too many document requests. Please wait before trying again."
    });

    if (!isUuid(params.documentId)) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const session = await getRequestSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await db.query(
      `
        select
          bd.id,
          bd.file_url,
          bd.original_name,
          bd.mime_type,
          bp.user_id
        from public.business_documents bd
        inner join public.business_profiles bp on bp.id = bd.business_profile_id
        where bd.id = $1::uuid
        limit 1
      `,
      [params.documentId]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const row = result.rows[0];
    const ownerUserId = String(row.user_id);
    const role = String(session.user.role ?? "user");

    if (role !== "admin" && ownerUserId !== String(session.user.id)) {
      logSecurityEvent("business-documents.access.denied", {
        documentId: params.documentId,
        userId: session.user.id,
        role
      });

      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const fileUrl = String(row.file_url);
    const absolutePath = resolveBusinessDocumentAbsolutePath(fileUrl);

    if (!absolutePath) {
      logSecurityEvent("business-documents.path.invalid", {
        documentId: params.documentId,
        fileUrl
      });

      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const fileBuffer = await readFile(absolutePath);
    const originalName = String(row.original_name || path.basename(absolutePath));
    const mimeType = getBusinessDocumentMimeType(originalName, row.mime_type ? String(row.mime_type) : null);
    const download = new URL(request.url).searchParams.get("download") === "1";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": mimeType,
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(originalName)}`
      }
    });
  } catch (error) {
    logSecurityEvent("business-documents.access.error", {
      documentId: params.documentId,
      reason: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json({ error: "Unable to load the document." }, { status: 500 });
  }
}
