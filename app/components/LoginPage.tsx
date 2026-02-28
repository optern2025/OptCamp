"use client";

import { ArrowLeft, Lock, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface LoginPageProps {
  onBack: () => void;
}

const LoginPage = ({ onBack }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        `Signed in as ${data.user?.email ?? "your account"}. You can now continue.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center animate-in">
      <div className="max-w-2xl w-full border border-white/10 bg-[#0B0F14] relative p-8 md:p-12">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-500 font-black text-xs uppercase tracking-widest mb-10 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Simulation Specs
        </button>

        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">
          Login to Sprint
        </h2>
        <p className="text-white/40 font-bold text-xs uppercase tracking-[0.2em] mb-12">
          Returning candidates only
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="block text-[10px] font-black uppercase tracking-widest text-white/60"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                required
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@university.edu"
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="block text-[10px] font-black uppercase tracking-widest text-white/60"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                required
                id="login-password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                placeholder="Your account password"
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 text-black font-black py-6 uppercase tracking-[0.2em] italic hover:bg-cyan-400 transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing In..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
