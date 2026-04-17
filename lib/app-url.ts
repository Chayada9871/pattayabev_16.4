function hasProtocol(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

function getHostname(candidate: string) {
  const withoutProtocol = candidate.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "");
  return withoutProtocol.split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
}

function getDefaultProtocol(candidate: string) {
  const hostname = getHostname(candidate);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" ? "http" : "https";
}

export function normalizeAppUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = hasProtocol(trimmed) ? trimmed : `${getDefaultProtocol(trimmed)}://${trimmed}`;

  try {
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

export function getAppUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeAppUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return "http://localhost:3000";
}
