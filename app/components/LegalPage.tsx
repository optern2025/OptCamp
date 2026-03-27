"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TabType = "tos" | "privacy";

interface LegalPageProps {
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function LegalPage({
  onBack,
  backHref,
  backLabel = "Back to Arena",
}: LegalPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tos");

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-32">
      <div className="mx-auto max-w-4xl">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} /> {backLabel}
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} /> {backLabel}
          </Link>
        ) : null}

        {/* Tab Navigation */}
        <div className="mb-8 flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("tos")}
            className={`px-6 py-4 text-xs font-black uppercase tracking-[0.24em] transition-colors ${
              activeTab === "tos"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`px-6 py-4 text-xs font-black uppercase tracking-[0.24em] transition-colors ${
              activeTab === "privacy"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Terms & Conditions */}
        {activeTab === "tos" && (
          <section>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-8 pb-4 border-b border-cyan-500/30">
              Terms & Conditions
            </h1>

            <div className="space-y-6 text-sm font-bold uppercase tracking-[0.16em] text-white/70">
              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  1. Acceptance of Terms
                </h3>
                <p>
                  By registering for and participating in OptCamp, participants
                  agree to comply with these Terms & Conditions. If you do not
                  agree, you should not participate.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  2. Eligibility
                </h3>
                <p className="mb-2">Participants must:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>
                    Be students or early-career individuals in technical domains
                  </li>
                  <li>
                    Provide accurate and complete information during
                    registration
                  </li>
                  <li>Meet deadlines and participation requirements</li>
                </ul>
                <p className="mt-2">
                  Optern reserves the right to accept or reject any application.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  3. Program Structure
                </h3>
                <p className="mb-2">OptCamp includes:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Application phase</li>
                  <li>Qualifier round</li>
                  <li>Sprint phase</li>
                </ul>
                <p className="mt-2">
                  Advancement is based on performance. Participation in later
                  stages is not guaranteed.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  4. Evaluation & Selection
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>
                    All evaluations are conducted based on predefined internal
                    criteria
                  </li>
                  <li>
                    Scores, rankings, and decisions made by Optern are final and
                    non-negotiable
                  </li>
                  <li>
                    Optern reserves the right to modify evaluation parameters if
                    required
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  5. Participant Responsibilities
                </h3>
                <p className="mb-2">Participants must:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Complete tasks independently</li>
                  <li>Submit original work</li>
                  <li>Follow all deadlines strictly</li>
                  <li>Maintain professional conduct</li>
                </ul>
                <p className="mt-2">
                  Any misconduct may result in disqualification.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  6. Disqualification
                </h3>
                <p className="mb-2">Participants may be disqualified for:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Plagiarism or copying</li>
                  <li>Use of unauthorized external help</li>
                  <li>Misrepresentation of identity or work</li>
                  <li>Missing deadlines</li>
                  <li>Disruptive or unethical behavior</li>
                </ul>
                <p className="mt-2">
                  No appeals will be entertained in such cases.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  7. Intellectual Property
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Participants retain ownership of their submitted work</li>
                  <li>
                    By participating, participants grant Optern the right to:
                    evaluate, share with partner companies, use anonymized data
                    for analysis or promotion
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  8. No Guarantee of Employment
                </h3>
                <p className="mb-2">Participation does not guarantee:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Job offers</li>
                  <li>Internships</li>
                  <li>Interviews</li>
                </ul>
                <p className="mt-2">
                  All hiring decisions are made solely by partner companies.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  9. Limitation of Liability
                </h3>
                <p className="mb-2">Optern shall not be liable for:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Technical issues</li>
                  <li>Loss of data</li>
                  <li>Missed deadlines due to participant-side issues</li>
                  <li>Any indirect or consequential damages</li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  10. Modifications
                </h3>
                <p className="mb-2">Optern reserves the right to:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Modify program structure</li>
                  <li>Update timelines</li>
                  <li>Change rules if necessary</li>
                </ul>
                <p className="mt-2">
                  Participants will be informed where applicable.
                </p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  11. Governing Law
                </h3>
                <p>These Terms shall be governed by the laws of India.</p>
              </div>
            </div>
          </section>
        )}

        {/* Privacy Policy */}
        {activeTab === "privacy" && (
          <section>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-8 pb-4 border-b border-cyan-500/30">
              Privacy Policy
            </h1>

            <div className="space-y-6 text-sm font-bold uppercase tracking-[0.16em] text-white/70">
              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  1. Information Collected
                </h3>
                <p className="mb-2">We may collect:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Name, email, contact details</li>
                  <li>Educational and technical background</li>
                  <li>Submitted work and performance data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  2. Purpose of Data Collection
                </h3>
                <p className="mb-2">Data is collected to:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Manage participation</li>
                  <li>Evaluate performance</li>
                  <li>Share candidate profiles with partner companies</li>
                  <li>Improve program quality</li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  3. Data Sharing
                </h3>
                <p className="mb-2">We may share participant data with:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Partner companies (for hiring purposes)</li>
                </ul>
                <p className="mt-2">We do NOT:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Sell personal data</li>
                  <li>Share data with unrelated third parties</li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  4. Data Security
                </h3>
                <p className="mb-2">We take reasonable measures to:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Protect participant data</li>
                  <li>Prevent unauthorized access</li>
                </ul>
                <p className="mt-2">However, no system is completely secure.</p>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  5. Data Retention
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>
                    Data may be retained for future cohort analysis and
                    improvement
                  </li>
                  <li>
                    Participants may request removal of their data by contacting
                    us
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  6. Participant Consent
                </h3>
                <p className="mb-2">By registering, participants:</p>
                <ul className="list-disc pl-5 space-y-1 text-white/60">
                  <li>Consent to data collection and usage</li>
                  <li>Agree to data sharing with partner companies</li>
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                  7. Updates
                </h3>
                <p>This policy may be updated periodically.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
