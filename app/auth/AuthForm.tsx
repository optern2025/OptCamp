"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Badge } from "@/app/components/ui/design-system";
import { Eye, EyeOff, Check, AlertCircle, ArrowRight, ArrowLeft, GraduationCap, PlayCircle, Award, Target, Orbit } from "lucide-react";

type Mode = "login" | "signup" | "forgot_password";
type Step = "form" | "otp" | "reset_password";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const pwdScore = calculatePasswordStrength(password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(data.redirect || redirectTo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, full_name: fullName, mobile_number: mobileNumber,
          user_type: "student",
          is_admin_request: false
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start signup");

      setStep("otp");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, otp, password, full_name: fullName, mobile_number: mobileNumber,
          user_type: "student",
          is_admin_request: false
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify OTP");

      router.push(data.redirect || redirectTo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset code");
      setStep("otp");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setSuccessMsg("Password reset successfully. Please log in.");
      setMode("login");
      setStep("form");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D12] flex overflow-hidden">
      
      {/* Left Panel: Auth Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-12 relative z-10 bg-[#0A0D12] shadow-[20px_0_40px_rgba(0,0,0,0.5)] border-r border-white/[0.05]">
        
        <div className="w-full max-w-[360px] mx-auto">
          {/* Logo & Header */}
          <div className="mb-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <Orbit className="w-5 h-5 text-cyan-400" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">OptCamp</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              {mode === "login" ? "Welcome back" : mode === "forgot_password" ? "Reset your password" : "Create your account"}
            </h2>
            <p className="text-sm font-medium text-white/50">
              {mode === "login" ? "Enter your details to sign in to your workspace." : mode === "forgot_password" ? "We'll send you a code to reset your password." : "Join the next sprint-based cohort and accelerate your career."}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 flex items-start gap-3 text-sm text-emerald-400 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === "otp" && mode === "forgot_password" ? (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Reset Code</label>
                <input
                  type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20 font-mono tracking-widest"
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">New Password</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Confirm New Password</label>
                <input
                  type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20"
                />
              </div>
              <Button type="submit" variant="primary" isLoading={loading} className="w-full mt-6 py-5 bg-white !text-black hover:bg-white/90">
                Reset Password
              </Button>
            </form>
          ) : step === "otp" ? (
            <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleSignupVerify}>
              <div className="mb-6">
                <Badge variant="info" className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Step 2 of 2</Badge>
                <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                <p className="text-sm text-white/50">We sent a 6-digit verification code to <span className="text-white">{email}</span>.</p>
              </div>
              <div>
                <input
                  type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/10"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <Button type="submit" variant="primary" isLoading={loading} className="w-full py-6 bg-white !text-black hover:bg-white/90 text-sm font-bold">
                Verify & Complete Setup
              </Button>
              <div className="flex justify-between items-center text-xs font-semibold">
                <button type="button" onClick={() => setStep("form")} className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button type="button" disabled={countdown > 0} onClick={handleSignupStart} className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors">
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {mode !== "forgot_password" && (
                <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] mb-8">
                  <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "login" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}>
                    Sign In
                  </button>
                  <button onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "signup" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}>
                    Sign Up
                  </button>
                </div>
              )}

              <form className="space-y-4" onSubmit={mode === "login" ? handleLogin : mode === "forgot_password" ? handleForgotPassword : handleSignupStart}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20" placeholder="you@example.com" />
                </div>

                {mode !== "forgot_password" && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50">Password</label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot_password")} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 pr-10 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-white/30 hover:text-white/70 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {mode === "signup" && password.length > 0 && (
                      <div className="mt-2 flex gap-1 h-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className={`flex-1 rounded-full ${i < pwdScore ? (pwdScore < 2 ? 'bg-red-500' : pwdScore < 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/10'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {mode === "signup" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Confirm Password</label>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20" placeholder="••••••••" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Full Name</label>
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20" placeholder="Jane Doe" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Mobile</label>
                        <input type="tel" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-cyan-500 focus:bg-cyan-500/5 focus:outline-none transition-all placeholder:text-white/20" placeholder="+1 234 567 890" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" variant="primary" isLoading={loading} className="w-full group py-5 bg-white !text-black hover:bg-white/90 font-bold tracking-wide">
                    {mode === "login" ? "Sign In" : mode === "forgot_password" ? "Send Reset Code" : "Continue"}
                    {mode !== "login" && !loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </div>

                {mode === "forgot_password" && (
                  <div className="text-center mt-6">
                    <button type="button" onClick={() => setMode("login")} className="text-xs font-semibold text-white/40 hover:text-white transition-colors">
                      Back to login
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Premium Showcase */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-[#0A0D12] to-[#0A1A24] overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-cyan-500/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[400px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl px-12 animate-in fade-in slide-in-from-right-8 duration-1000">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 mb-6 font-bold tracking-widest uppercase">Student OS</Badge>
          <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
            Accelerate your career with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">sprint-based cohorts.</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sprint-Based Learning</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Join structured, intense cohorts designed to simulate real-world engineering environments.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
                <PlayCircle className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Screening</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Prove your skills through our advanced AI proctored screening systems to qualify for cohorts.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verified Certificates</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Earn cryptographically verifiable certificates upon successfully completing cohorts.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/30">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Curated Tracks</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Follow carefully designed learning paths created by industry experts to land top roles.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
