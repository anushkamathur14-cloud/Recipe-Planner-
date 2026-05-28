export function SetupBanner({
  title = "Setup required",
  issues,
  message,
}: {
  title?: string;
  issues?: string[];
  message?: string;
}) {
  return (
    <div className="container">
      <div className="card" style={{ borderColor: "#c62828" }}>
        <h1>{title}</h1>
        {message && <p>{message}</p>}
        {issues && issues.length > 0 && (
          <ul>
            {issues.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <p className="muted">
          In Railway: add <strong>PostgreSQL</strong>, link{" "}
          <code>DATABASE_URL</code> to the web service, set{" "}
          <code>NEXTAUTH_SECRET</code> (any long random string) and{" "}
          <code>NEXTAUTH_URL</code> to your public domain. Then run{" "}
          <code>npm run db:push</code> locally with the Railway database URL, or
          use Settings → run migrations if you have a deploy hook.
        </p>
      </div>
    </div>
  );
}
