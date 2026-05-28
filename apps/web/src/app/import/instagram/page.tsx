"use client";

import { useState } from "react";
import Link from "next/link";

type ThreadPreview = {
  folderName: string;
  displayName: string;
  messageCount: number;
  urls: string[];
};

export default function InstagramImportPage() {
  const [urls, setUrls] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function previewZip(f: File) {
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/import/instagram/preview", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Preview failed");
      return;
    }
    setThreads(data.threads);
    setSelected(new Set(data.threads.map((t: ThreadPreview) => t.folderName)));
  }

  async function importUrls(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/import/instagram", {
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
    setMessage(`Queued ${data.results.filter((r: { skipped: boolean }) => !r.skipped).length} new URL(s)`);
  }

  async function importExport() {
    if (!file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("threads", JSON.stringify([...selected]));
    const res = await fetch("/api/import/instagram/export", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Export import failed");
      return;
    }
    setMessage(
      `Parsed ${data.threads.length} thread(s), enqueued ${data.enqueued} new recipe(s), skipped ${data.skipped} duplicate(s).`
    );
  }

  function toggleThread(folder: string) {
    const next = new Set(selected);
    if (next.has(folder)) next.delete(folder);
    else next.add(folder);
    setSelected(next);
  }

  return (
    <div className="container">
      <h1>Import from Instagram & Facebook</h1>

      <div className="card">
        <h3>Privacy notice</h3>
        <p className="muted">
          IG exports contain your full DM history. We parse the ZIP on the server,
          extract only reel/post URLs, and do not store the ZIP after processing.
          Request exports via Accounts Center → Download your information →
          Messages → JSON format.
        </p>
      </div>

      <div className="card">
        <h3>Paste reel URLs</h3>
        <p className="muted">
          Instagram reels/posts and Facebook reels (including fb.watch links).
        </p>
        <form onSubmit={importUrls}>
          <textarea
            rows={4}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={
              "https://www.instagram.com/reel/...\nhttps://www.facebook.com/reel/...\nhttps://fb.watch/..."
            }
          />
          <button type="submit" className="btn" disabled={loading}>
            Import URLs
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Upload Instagram export (ZIP)</h3>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) previewZip(f);
          }}
        />
        {threads.length > 0 && (
          <>
            <p className="muted">Select threads to import shared links from:</p>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {threads.map((t) => (
                <label
                  key={t.folderName}
                  style={{ display: "block", marginBottom: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(t.folderName)}
                    onChange={() => toggleThread(t.folderName)}
                  />{" "}
                  {t.displayName} ({t.urls.length} links, {t.messageCount}{" "}
                  messages)
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn"
              disabled={loading || !file}
              onClick={importExport}
            >
              Import selected threads
            </button>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {message && (
        <p className="card">
          {message}{" "}
          <Link href="/recipes">View recipes →</Link>
        </p>
      )}
    </div>
  );
}
