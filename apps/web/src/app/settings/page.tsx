"use client";

import { useEffect, useState } from "react";

type IgConfig = {
  id: string;
  threadFolderName: string;
  displayName: string;
  enabled: boolean;
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<IgConfig[]>([]);
  const [folder, setFolder] = useState("");
  const [display, setDisplay] = useState("");

  async function load() {
    const res = await fetch("/api/ig-threads");
    setConfigs(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function addConfig(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/ig-threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadFolderName: folder,
        displayName: display || folder,
        enabled: true,
      }),
    });
    setFolder("");
    setDisplay("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/ig-threads?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="container">
      <h1>Settings</h1>

      <div className="card">
        <h3>Instagram thread filters</h3>
        <p className="muted">
          After previewing an export, add folder names (e.g.{" "}
          <code>friendname_123456789</code>) to only import links from those
          chats. Leave empty to import all selected threads.
        </p>
        <form onSubmit={addConfig}>
          <label>Thread folder name</label>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="username_12345678901234567"
          />
          <label>Display name</label>
          <input
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            placeholder="Recipe group chat"
          />
          <button type="submit" className="btn">
            Add thread filter
          </button>
        </form>
        <ul>
          {configs.map((c) => (
            <li key={c.id}>
              {c.displayName} ({c.threadFolderName}){" "}
              <button type="button" onClick={() => remove(c.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Environment</h3>
        <p className="muted">
          Required: DATABASE_URL, OPENAI_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL,
          AUTH_USERNAME, AUTH_PASSWORD. Run the worker service alongside the web
          app for transcription jobs.
        </p>
      </div>
    </div>
  );
}
