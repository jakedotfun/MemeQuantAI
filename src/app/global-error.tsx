"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0a0f", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" }}>
          <h2 style={{ fontSize: "18px" }}>Something went wrong</h2>
          <p style={{ color: "#8B95A9", fontSize: "14px" }}>{error.message}</p>
          <button
            onClick={reset}
            style={{ padding: "8px 20px", background: "#2D7EFF", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
