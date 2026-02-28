import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OPTERN – Performance Sprint",
  description:
    "4-Day Real Startup Simulation built to identify the top 10%. Prove your execution under pressure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className="fixed right-4 top-4 z-[200] flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-2 bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-cyan-400 transition-colors"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-2 border border-cyan-500 text-cyan-500 font-black uppercase tracking-widest text-[10px] hover:bg-cyan-500 hover:text-black transition-colors"
                >
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
