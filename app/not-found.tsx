import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-800 border border-surface-700 mb-8">
          <span className="text-4xl font-black text-surface-400">404</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Page not found</h1>
        <p className="text-surface-400 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-surface-700 bg-surface-800 text-white text-sm font-medium hover:bg-surface-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
