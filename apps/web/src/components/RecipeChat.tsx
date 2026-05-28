"use client";

import { useEffect, useState } from "react";

type Message = { id: string; role: string; content: string };

export function RecipeChat({ recipeId }: { recipeId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/chat/${recipeId}`)
      .then((r) => r.json())
      .then(setMessages)
      .catch(() => {});
  }, [recipeId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/chat/${recipeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setQuestion("");
      const refreshed = await fetch(`/api/chat/${recipeId}`).then((r) =>
        r.json()
      );
      setMessages(refreshed);
    }
  }

  return (
    <div className="chat-panel card">
      <h3>Recipe guidance (LLM)</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted">
            Ask about substitutions, timing, or ingredient amounts.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Assistant"}:</strong>{" "}
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Can I use Greek yogurt instead of sour cream?"
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
