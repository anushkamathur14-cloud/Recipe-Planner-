"use client";

import { useState } from "react";
import Link from "next/link";

export default function YouTubeImportPage() {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { url: string; recipeId: string; skipped: boolean }[] | null
  >(null);
  const [error, setError] = useState("");

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
        Paste one or more YouTube URLs (one per line). The worker will
        transcribe and extract a structured recipe.
      </p>
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
