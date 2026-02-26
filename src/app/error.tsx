"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-bg-primary">
      <h2 className="text-white text-lg">Something went wrong</h2>
      <p className="text-text-secondary text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="px-5 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
