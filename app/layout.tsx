import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/ui/design-system/Toast";
import GlobalLoginButton from "@/app/components/GlobalLoginButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OptCamp – Cohort Operating System",
    template: "%s | OptCamp",
  },
  description:
    "OptCamp is a production-grade cohort operating system for structured learning, sprint-based projects, and career acceleration. Apply to active cohorts and earn verified certificates.",
  keywords: ["cohort", "learning", "sprints", "certification", "tech", "career"],
  openGraph: {
    title: "OptCamp – Cohort Operating System",
    description: "Join structured cohorts, complete sprint-based projects, and earn verified certifications.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalLoginButton />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
