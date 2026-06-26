"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best effort
    } finally {
      router.push("/auth");
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 ${className}`}
    >
      <LogOut className="w-4 h-4" />
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
