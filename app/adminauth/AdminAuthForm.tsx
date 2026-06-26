"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Badge } from "@/app/components/ui/design-system";
import { Eye, EyeOff, Check, AlertCircle, ArrowRight, ArrowLeft, ShieldAlert, BarChart3, Users, Settings2, FileCheck } from "lucide-react";

type Mode = "login" | "admin_signup";
type Step = "form" | "otp" | "pending";

export default function AdminAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>(statusParam === "pending" ? "pending" : "form");

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
    if (countdown > 0) timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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
      router.push(data.redirect || "/admin");
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
          is_admin_request: true
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start admin request");
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
          is_admin_request: true
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify OTP");
      setStep("pending");
      setSuccessMsg(data.message || "Your admin request has been submitted for approval.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D12] flex overflow-hidden">
      
      {/* Left Panel: Admin Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-12 relative z-10 bg-[#0A0D12] shadow-[20px_0_40px_rgba(0,0,0,0.5)] border-r border-white/[0.05]">
        
        <div className="w-full max-w-[360px] mx-auto">
          {/* Logo & Header */}
          <div className="mb-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">OptCamp OS</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              {step === "pending" ? "Request Submitted" : mode === "login" ? "Admin Sign In" : "Request Admin Access"}
            </h2>
            <p className="text-sm font-medium text-white/50">
              {step === "pending" ? "Your request is under review." : mode === "login" ? "Enter your credentials to access the command center." : "Apply for administrative privileges to manage cohorts."}
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

          {step === "pending" ? (
            <div className="text-center space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-400/20">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-white/50 leading-relaxed">
                Your admin access request has been submitted successfully and is currently pending approval by an existing system administrator.
              </p>
              <Button onClick={() => { setStep("form"); setMode("login"); }} className="w-full mt-4 py-5 bg-white/[0.05] hover:bg-white/[0.1] text-white">
                Return to Login
              </Button>
            </div>
          ) : step === "otp" ? (
            <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleSignupVerify}>
              <div className="mb-6">
                <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">Security Verification</Badge>
                <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                <p className="text-sm text-white/50">We sent a 6-digit code to <span className="text-white">{email}</span>.</p>
              </div>
              <input
                type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/10"
                placeholder="000000"
                maxLength={6}
              />
              <Button type="submit" isLoading={loading} className="w-full py-6 bg-amber-500 !text-black hover:bg-amber-400 font-bold tracking-wide">
                Verify & Submit Request
              </Button>
              <div className="flex justify-between items-center text-xs font-semibold">
                <button type="button" onClick={() => setStep("form")} className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button type="button" disabled={countdown > 0} onClick={handleSignupStart} className="text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors">
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] mb-8">
                <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "login" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}>
                  Admin Login
                </button>
                <button onClick={() => { setMode("admin_signup"); setError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "admin_signup" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}>
                  Request Access
                </button>
              </div>

              <form className="space-y-4" onSubmit={mode === "login" ? handleLogin : handleSignupStart}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/20"
                    placeholder="admin@optcamp.com" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 pr-10 text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/20"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-white/30 hover:text-white/70 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === "admin_signup" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Confirm Password</label>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/20"
                        placeholder="••••••••" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Full Name</label>
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/20"
                          placeholder="Admin Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Mobile</label>
                        <input type="tel" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white focus:border-amber-500 focus:bg-amber-500/5 focus:outline-none transition-all placeholder:text-white/20"
                          placeholder="+1 234 567 890" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" isLoading={loading} className="w-full group py-5 bg-amber-500 !text-black hover:bg-amber-400 font-bold tracking-wide">
                    {mode === "login" ? "Sign In to Console" : "Submit Request"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Premium Showcase */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-[#0A0D12] to-[#12100A] overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[400px] bg-orange-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl px-12 animate-in fade-in slide-in-from-right-8 duration-1000">
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-6 font-bold tracking-widest uppercase">Admin Command Center</Badge>
          <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
            Orchestrate learning at <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">global scale.</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cohort Management</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Design, launch, and manage intense sprint-based cohorts across different timezones.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center mb-4 border border-rose-500/30">
                <Settings2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Screening Operations</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Configure AI parameters and review thousands of automated screening assessments efficiently.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Executive Analytics</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Gain real-time insights into completion rates, funnel drops, and cohort performance.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 border border-cyan-500/30">
                <FileCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Certifications</h3>
              <p className="text-sm font-medium text-white/50 leading-relaxed">Review final submissions and issue cryptographically secure completion certificates.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
