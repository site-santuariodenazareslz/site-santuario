const privateHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const privateIpV4Patterns = [
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
];
const safeSchemes = new Set(["https:", "mailto:", "tel:"]);
const controlCharacters = /[\u0000-\u001f\u007f]/;

export function isSafeUrl(value: string): boolean {
  if (!value || /\s/.test(value) || controlCharacters.test(value)) return false;

  try {
    const normalized = value.trim();
    if (normalized.startsWith("#")) return true;

    const url = new URL(normalized, "https://example.invalid");
    if (url.protocol === "https:") {
      const hostname = url.hostname.toLowerCase();
      if (
        privateHosts.has(hostname) ||
        hostname.endsWith(".localhost") ||
        privateIpV4Patterns.some((pattern) => pattern.test(hostname)) ||
        url.username ||
        url.password
      ) {
        return false;
      }
      return true;
    }

    return safeSchemes.has(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function siteUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
