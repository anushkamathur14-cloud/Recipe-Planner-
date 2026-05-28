const IG_URL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[\w-]+/gi;

export function extractInstagramUrls(text: string): string[] {
  const matches = text.match(IG_URL_PATTERN) ?? [];
  return [...new Set(matches.map((u) => u.split("?")[0]))];
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

export function normalizeYouTubeUrls(input: string): string[] {
  const lines = input
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return [...new Set(lines.filter(isYouTubeUrl))];
}
