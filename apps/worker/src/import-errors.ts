export function formatImportError(
  err: unknown,
  options?: { geminiConfigured?: boolean; skippedDownload?: boolean }
): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes("sign in to confirm") ||
    lower.includes("not a bot") ||
    lower.includes("cookies-from-browser")
  ) {
    if (options?.geminiConfigured) {
      return (
        "Gemini could not analyze this video and YouTube blocked audio download. " +
        "Check GEMINI_API_KEY on the worker, confirm the video is public, then click Retry. " +
        "(Captions were not available.)"
      );
    }
    return (
      "YouTube blocked automated download. Add GEMINI_API_KEY on the worker service " +
      "(Google AI Studio) to process videos without yt-dlp, then retry."
    );
  }

  if (lower.includes("gemini") || lower.includes("api key")) {
    return raw.length > 600 ? `${raw.slice(0, 600)}…` : raw;
  }

  if (raw.length > 800) return `${raw.slice(0, 800)}…`;
  return raw;
}
