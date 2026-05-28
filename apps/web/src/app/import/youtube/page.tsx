"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GeminiUsage = {
  limit: number;
  used: number;
  remaining: number;
  resetsAtUtc: string;
};

export default function YouTubeImportPage() {
  const [urls, setUrls] = useState("");
  const [geminiUsage, setGeminiUsage] = useState<GeminiUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { url: string; recipeId: string; skipped: boolean }[] | null
  >(null);
  const [error, setError] = useState("");
  const [seedSummary, setSeedSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/import/gemini-usage")
      .then((r) => r.json())
      .then((d) => setGeminiUsage(d))
      .catch(() => setGeminiUsage(null));
  }, [loading, seedSummary, results]);

  async function importStarterLibrary() {
    setLoading(true);
    setError("");
    setSeedSummary(null);
    const res = await fetch("/api/import/seed", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Starter import failed");
      return;
    }
    setSeedSummary(
      `Queued ${data.queued} recipes (${data.skipped} already imported, ${data.failed} failed). Worker will transcribe them.`
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    const res = await fetch("/api/import/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResults(data.results);
  }

  return (
    <div className="container">
      <h1>Import from YouTube</h1>
      <p className="muted">
        Paste one or more YouTube URLs (one per line). The worker uses free
        captions when available, then Gemini (daily cap), then audio download.
      </p>
      {geminiUsage && (
        <div className="card" style={{ borderColor: "#1565c0" }}>
          <h3>Gemini quota (today, UTC)</h3>
          <p>
            <strong>{geminiUsage.used}</strong> / {geminiUsage.limit} videos
            analyzed with Gemini · <strong>{geminiUsage.remaining}</strong>{" "}
            remaining
          </p>
          <p className="muted">
            Resets at {geminiUsage.resetsAtUtc}. Captions-first imports do not
            use Gemini. Bulk starter library may use Whisper after quota is
            used.
          </p>
        </div>
      )}
      <div className="card">
        <h3>Starter library</h3>
        <p className="muted">
          Import your saved collection (~80 links). Requires the worker to be
          running.
        </p>
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={importStarterLibrary}
        >
          {loading ? "Queueing…" : "Import starter library"}
        </button>
        {seedSummary && <p className="muted" style={{ marginTop: 12 }}>{seedSummary}</p>}
      </div>

      <form onSubmit={onSubmit} className="card">
        <label htmlFor="urls">YouTube URLs</label>
        <textarea
          id="urls"
          rows={8}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Queueing…" : "Import recipes"}
        </button>
      </form>
      {results && (
        <div className="card">
          <h3>Queued {results.length} URL(s)</h3>
          <ul>
            {results.map((r) => (
              <li key={r.url}>
                {r.skipped ? "Already imported: " : "Queued: "}
                <Link href={`/recipes/${r.recipeId}`}>{r.url}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
