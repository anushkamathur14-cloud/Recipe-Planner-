"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    await fetch(`/api/recipes/${recipeId}/retry`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={retry} disabled={loading}>
      {loading ? "Re-queueing…" : "Retry import"}
    </button>
  );
}
