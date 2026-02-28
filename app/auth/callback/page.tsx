"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type CallbackStatus =
  | "loading"
  | "missing"
  | "sending"
  | "sent"
  | "already_sent"
  | "failed";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSessionAndSendQualifier = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session?.user || !session.access_token) {
          setStatus("missing");
          return;
        }

        setEmail(session.user.email ?? null);
        setStatus("sending");

        const response = await fetch("/api/qualifier/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await response.json()) as {
          error?: string;
          alreadySent?: boolean;
        };

        if (!response.ok) {
          setErrorMessage(payload.error ?? "Failed to send qualifier email.");
          setStatus("failed");
          return;
        }

        setStatus(payload.alreadySent ? "already_sent" : "sent");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Verification callback failed.",
        );
        setStatus("failed");
      }
    };

    checkSessionAndSendQualifier();
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white flex items-center justify-center px-4">
      <section className="max-w-xl w-full border border-white/10 p-10 bg-black/30">
        {status === "loading" && (
          <>
            <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4">
              Verifying account...
            </h1>
            <p className="text-white/60 font-bold text-sm uppercase tracking-widest">
              Please wait while we finalize your sign-in session.
            </p>
          </>
        )}

        {status === "sending" && (
          <>
            <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4 text-cyan-500">
              Email verified
            </h1>
            <p className="text-white/70 font-bold text-sm uppercase tracking-widest leading-relaxed">
              Your account is active {email ? `for ${email}.` : "now."}
              <br />
              Sending your qualifier test link...
            </p>
          </>
        )}

        {(status === "sent" || status === "already_sent") && (
          <>
            <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4 text-cyan-500">
              {status === "sent" ? "Qualifier email sent" : "Already sent"}
            </h1>
            <p className="text-white/70 font-bold text-sm uppercase tracking-widest leading-relaxed">
              {status === "sent"
                ? "Your qualifier test link has been sent to your inbox."
                : "Your qualifier test email was already sent earlier."}
              <br />
              Open your cohort dashboard to continue.
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
          </>
        )}

        {status === "failed" && (
          <>
            <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4">
              Verification complete
            </h1>
            <p className="text-white/70 font-bold text-sm uppercase tracking-widest leading-relaxed">
              Your account is verified, but sending the qualifier email failed.
              <br />
              {errorMessage ?? "Please try again from the cohort test screen."}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/cohort-test"
                className="inline-block px-6 py-3 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 transition-colors"
              >
                Open Cohort Test
              </Link>
              <Link
                href="/"
                className="inline-block px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
              >
                Back Home
              </Link>
            </div>
          </>
        )}

        {status === "missing" && (
          <>
            <h1 className="text-3xl font-black uppercase italic tracking-tight mb-4">
              Verification completed
            </h1>
            <p className="text-white/70 font-bold text-sm uppercase tracking-widest leading-relaxed">
              The link is valid, but there is no active session in this tab.
              <br />
              Return to the home page and login with your email/password.
            </p>
            <Link
              href="/"
              className="inline-block mt-8 px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
            >
              Back to Home
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
