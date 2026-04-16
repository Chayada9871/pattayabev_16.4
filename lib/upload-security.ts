import path from "node:path";

import { ValidationError } from "@/lib/security";

export type UploadPolicy = {
  label: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
};

export const IMAGE_UPLOAD_POLICY: UploadPolicy = {
  label: "image",
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"]
};

export const BUSINESS_DOCUMENT_UPLOAD_POLICY: UploadPolicy = {
  label: "business document",
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"]
};

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1);
}

export function getSafeUploadExtension(file: File, fallbackExtension: string, allowedExtensions: string[]) {
  const extension = path.extname(file.name || "").toLowerCase();

  if (allowedExtensions.includes(extension)) {
    return extension;
  }

  return fallbackExtension;
}

export function assertUploadMatchesPolicy(file: File, policy: UploadPolicy) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new ValidationError(`Please upload a valid ${policy.label} file.`);
  }

  if (file.size > policy.maxSizeBytes) {
    throw new ValidationError(
      `${policy.label[0].toUpperCase()}${policy.label.slice(1)} files must be ${formatMegabytes(policy.maxSizeBytes)} MB or smaller.`
    );
  }

  const extension = path.extname(file.name || "").toLowerCase();

  if (!extension || !policy.allowedExtensions.includes(extension)) {
    throw new ValidationError(
      `${policy.label[0].toUpperCase()}${policy.label.slice(1)} files must use one of these formats: ${policy.allowedExtensions.join(", ")}.`
    );
  }

  if (file.type && !policy.allowedMimeTypes.includes(file.type)) {
    throw new ValidationError(
      `${policy.label[0].toUpperCase()}${policy.label.slice(1)} uploads must match an allowed file type.`
    );
  }
}

export function assertUploadCount(files: File[], maxFiles: number, label: string) {
  if (files.length > maxFiles) {
    throw new ValidationError(`You can upload up to ${maxFiles} ${label} file${maxFiles === 1 ? "" : "s"} at a time.`);
  }
}
