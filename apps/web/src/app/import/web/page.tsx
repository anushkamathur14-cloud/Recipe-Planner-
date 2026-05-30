"use client";

import { useState } from "react";
import Link from "next/link";

export default function WebImportPage() {
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlResults, setUrlResults] = useState<
    { url: string; recipeId: string; skipped: boolean }[] | null
  >(null);
  const [imageResults, setImageResults] = useState<
    { fileName: string; recipeId: string; skipped: boolean }[] | null
  >(null);
  const [error, setError] = useState("");

  async function importWebsites(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUrlResults(null);
    const res = await fetch("/api/import/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Website import failed");
      return;
    }
    setUrlResults(data.results);
  }

  async function importImages(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) {
      setError("Choose one or more screenshots first");
      return;
    }
    setLoading(true);
    setError("");
    setImageResults(null);
    const form = new FormData();
    for (let i = 0; i < files.length; i++) {
      form.append("files", files[i]!);
    }
    const res = await fetch("/api/import/image", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Image import failed");
      return;
    }
    setImageResults(data.results);
    setFiles(null);
  }

  return (
    <div className="container">
      <h1>Import from website or screenshot</h1>
      <p className="muted">
        Paste links to recipe blogs and articles, or upload screenshots (cookbook
        pages, Pinterest, Notes, etc.). The worker fetches page text or reads images
        with Gemini (if set) or GPT-4o vision.
      </p>

      <form onSubmit={importWebsites} className="card">
        <h3>Website links</h3>
        <p className="muted">
          One URL per line. YouTube, Instagram, and Facebook links belong on their
          own import pages.
        </p>
        <label htmlFor="urls">Recipe page URLs</label>
        <textarea
          id="urls"
          rows={6}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://www.example.com/recipes/chicken-tikka"
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Queueing…" : "Import from websites"}
        </button>
      </form>

      {urlResults && (
        <div className="card">
          <h3>Queued {urlResults.length} website(s)</h3>
          <ul>
            {urlResults.map((r) => (
              <li key={r.url}>
                {r.skipped ? "Already imported: " : "Queued: "}
                <Link href={`/recipes/${r.recipeId}`}>{r.url}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={importImages} className="card">
        <h3>Screenshot images</h3>
        <p className="muted">
          JPEG, PNG, WebP, or GIF — up to 8 MB each. Duplicate uploads are skipped.
        </p>
        <label htmlFor="images">Screenshots</label>
        <input
          id="images"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Queueing…" : "Import screenshots"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {imageResults && (
        <div className="card">
          <h3>Queued {imageResults.length} image(s)</h3>
          <ul>
            {imageResults.map((r) => (
              <li key={r.fileName}>
                {r.skipped ? "Already imported: " : "Queued: "}
                <Link href={`/recipes/${r.recipeId}`}>{r.fileName}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
