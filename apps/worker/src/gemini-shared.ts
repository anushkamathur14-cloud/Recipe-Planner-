export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export function parseJsonResponse(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const json = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(json) as Record<string, unknown>;
}

export function geminiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("API key")) {
    return `Gemini API key error: check GEMINI_API_KEY on the worker. ${raw}`;
  }
  if (raw.includes("404") || raw.toLowerCase().includes("not found")) {
    return `Gemini model or resource not found (${getGeminiModel()}). Try GEMINI_MODEL=gemini-2.0-flash. ${raw}`;
  }
  return `Gemini failed: ${raw}`;
}
