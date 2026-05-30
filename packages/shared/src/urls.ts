const IG_URL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[\w-]+/gi;

const FACEBOOK_URL_PATTERNS = [
  /https?:\/\/(?:www\.|m\.)?facebook\.com\/reels?\/[\w-]+/gi,
  /https?:\/\/(?:www\.|m\.)?facebook\.com\/share\/r\/[\w-]+/gi,
  /https?:\/\/(?:www\.|m\.)?facebook\.com\/watch\/?\?v=[\w-]+/gi,
  /https?:\/\/fb\.watch\/[\w-]+/gi,
];

function matchUrls(text: string, pattern: RegExp): string[] {
  const re = new RegExp(pattern.source, pattern.flags);
  return text.match(re) ?? [];
}

export function extractInstagramUrls(text: string): string[] {
  const matches = matchUrls(text, IG_URL_PATTERN);
  return [...new Set(matches.map(normalizeSourceUrl))];
}

export function extractFacebookUrls(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of FACEBOOK_URL_PATTERNS) {
    matches.push(...matchUrls(text, pattern));
  }
  return [...new Set(matches.map(normalizeSourceUrl))];
}

/** Instagram reels/posts + Facebook reels (paste import). */
export function extractSocialReelUrls(text: string): string[] {
  return [...new Set([...extractInstagramUrls(text), ...extractFacebookUrls(text)])];
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

export function isInstagramUrl(url: string): boolean {
  return extractInstagramUrls(url).length > 0;
}

export function isFacebookUrl(url: string): boolean {
  return extractFacebookUrls(url).length > 0;
}

export function isSocialReelUrl(url: string): boolean {
  return isInstagramUrl(url) || isFacebookUrl(url);
}

/** Canonical watch URL for Gemini / yt-dlp (youtu.be → youtube.com/watch). */
export function toYouTubeWatchUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/watch?v=${v}`;
    }
  } catch {
    // fall through
  }
  return url.trim();
}

export function normalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.search = "";
    parsed.hash = "";
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.trim();
  }
}

export function normalizeYouTubeUrls(input: string): string[] {
  const lines = input
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const urls: string[] = [];
  for (const line of lines) {
    const match = line.match(/https?:\/\/[^\s]+/);
    const candidate = match ? match[0] : line;
    if (isYouTubeUrl(candidate)) {
      urls.push(normalizeSourceUrl(candidate));
    }
  }
  return [...new Set(urls)];
}

export function resolveSourceType(
  url: string
): "youtube" | "instagram" | "facebook" | null {
  const normalized = normalizeSourceUrl(url);
  if (isYouTubeUrl(normalized)) return "youtube";
  if (isInstagramUrl(normalized)) return "instagram";
  if (isFacebookUrl(normalized)) return "facebook";
  return null;
}

/** HTTP(S) recipe blog / article — not a supported video platform URL. */
export function isImportableWebsiteUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return resolveSourceType(normalizeSourceUrl(url)) === null;
  } catch {
    return false;
  }
}

export function normalizeWebsiteUrls(input: string): string[] {
  const lines = input
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const urls: string[] = [];
  for (const line of lines) {
    const match = line.match(/https?:\/\/[^\s]+/);
    const candidate = match ? match[0] : line;
    if (isImportableWebsiteUrl(candidate)) {
      urls.push(normalizeSourceUrl(candidate));
    }
  }
  return [...new Set(urls)];
}
