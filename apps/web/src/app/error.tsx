"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container">
      <div className="card">
        <h1>Something went wrong</h1>
        <p className="muted">{error.message}</p>
        {error.digest && (
          <p className="muted">
            Digest: <code>{error.digest}</code>
          </p>
        )}
        <p>
          This is usually missing <code>DATABASE_URL</code>, tables not created
          yet (<code>npm run db:push</code>), or auth env vars on Railway.
        </p>
        <button type="button" className="btn" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
