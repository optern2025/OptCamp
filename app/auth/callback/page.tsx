import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white flex items-center justify-center px-4">
      <section className="max-w-xl w-full border border-white/10 p-10 bg-black/30">
        <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4 text-cyan-500">
          Auth Provider Updated
        </h1>
        <p className="text-white/70 font-bold text-sm uppercase tracking-widest leading-relaxed">
          This legacy callback route is no longer required.
          <br />
          Continue from the cohort dashboard.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            href="/cohort-test"
            className="inline-block px-6 py-3 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 transition-colors"
          >
            Go to Cohort Test
          </Link>
          <Link
            href="/"
            className="inline-block px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
          >
            Back Home
          </Link>
        </div>
      </section>
    </main>
  );
}
