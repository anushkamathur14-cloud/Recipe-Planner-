const IG_URL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[\w-]+/gi;

export function extractInstagramUrls(text: string): string[] {
  const matches = text.match(IG_URL_PATTERN) ?? [];
  return [...new Set(matches.map(normalizeSourceUrl))];
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
