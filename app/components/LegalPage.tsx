"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

        {/* Terms & Conditions */}
        <section className="mb-16">
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
                  Provide accurate and complete information during registration
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

        {/* Privacy Policy */}
        <section className="mb-16">
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

        {/* Rules & Regulations */}
        <section className="mb-16">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-8 pb-4 border-b border-cyan-500/30">
            Rules & Regulations
          </h1>

          <div className="space-y-6 text-sm font-bold uppercase tracking-[0.16em] text-white/70">
            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                1. Time Discipline
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>All submissions must be made within deadlines</li>
                <li>Late submissions will not be accepted</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                2. Independent Work
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>All tasks must be completed individually</li>
                <li>
                  Collaboration is strictly prohibited unless explicitly allowed
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                3. Plagiarism Policy
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  Any copied or reused work will result in immediate
                  disqualification
                </li>
                <li>Tools and references must be used responsibly</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                4. Communication
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  Participants must follow official communication channels
                </li>
                <li>Unprofessional behavior will not be tolerated</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                5. Submission Guidelines
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Submissions must follow specified formats</li>
                <li>
                  Incomplete or non-functional submissions may be penalized
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                6. Fair Evaluation
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>All participants are evaluated uniformly</li>
                <li>No special consideration will be given</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                7. Technical Responsibility
              </h3>
              <p className="mb-2">Participants are responsible for:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Their own systems and tools</li>
                <li>Ensuring submissions run correctly</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                8. Code of Conduct
              </h3>
              <p className="mb-2">Participants must:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Act professionally</li>
                <li>Respect organizers and peers</li>
                <li>Avoid any disruptive behavior</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                9. Organizer Rights
              </h3>
              <p className="mb-2">Optern reserves the right to:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Disqualify participants</li>
                <li>Modify rules if necessary</li>
                <li>Make final decisions in disputes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Participant Agreement */}
        <section className="mb-16">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-8 pb-4 border-b border-cyan-500/30">
            Participant Agreement
          </h1>

          <div className="space-y-6 text-sm font-bold uppercase tracking-[0.16em] text-white/70">
            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                1. Agreement Overview
              </h3>
              <p>
                By registering and participating in OptCamp, the participant
                ("Participant") agrees to the terms outlined in this Agreement
                with Optern (OptCamp Initiative). This Agreement is binding upon
                acceptance during registration.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                2. Participation Commitment
              </h3>
              <p className="mb-2">The Participant agrees to:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Complete all assigned tasks independently</li>
                <li>Adhere strictly to deadlines</li>
                <li>
                  Participate actively in all stages (Qualifier and Sprint)
                </li>
                <li>Maintain professional conduct throughout the program</li>
              </ul>
              <p className="mt-2">
                Failure to comply may result in disqualification.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                3. Academic Integrity & Original Work
              </h3>
              <p className="mb-2">The Participant confirms that:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>All submitted work will be original</li>
                <li>
                  No plagiarism, copying, or unauthorized collaboration will
                  occur
                </li>
                <li>
                  External tools (including AI tools) will not be used in a way
                  that violates fairness
                </li>
              </ul>
              <p className="mt-2">
                Optern reserves the right to audit submissions and disqualify
                participants without prior notice.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                4. Evaluation & Ranking
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  Participants will be evaluated based on internal scoring
                  criteria
                </li>
                <li>
                  Rankings and decisions made by Optern are final and binding
                </li>
                <li>
                  No re-evaluation requests or disputes will be entertained
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                5. Data Usage & Consent
              </h3>
              <p className="mb-2">
                The Participant agrees that their profile, submissions, and
                performance data may be:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Evaluated and shared with partner companies</li>
                <li>
                  Used (in anonymized or identified form) for program
                  improvement, reporting, and promotion
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                6. Candidate Visibility
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  Top-performing participants may be shared with partner
                  companies
                </li>
                <li>Visibility does not guarantee interviews or job offers</li>
                <li>Hiring decisions are solely made by companies</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                7. Confidentiality
              </h3>
              <p className="mb-2">
                Participants agree not to share during or after the program
                without permission:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Challenge content</li>
                <li>Evaluation methods</li>
                <li>Internal communication</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                8. Disqualification Clause
              </h3>
              <p className="mb-2">Optern may disqualify participants for:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Plagiarism or cheating</li>
                <li>Misrepresentation</li>
                <li>Missing deadlines</li>
                <li>Unprofessional conduct</li>
              </ul>
              <p className="mt-2">Such decisions are final.</p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                9. Limitation of Liability
              </h3>
              <p className="mb-2">Optern is not responsible for:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Technical failures on participant's side</li>
                <li>Loss of submissions</li>
                <li>Any indirect damages or missed opportunities</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                10. Program Modifications
              </h3>
              <p className="mb-2">Optern reserves the right to:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Modify structure, tasks, or timelines</li>
                <li>Update evaluation criteria</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                11. Governing Law
              </h3>
              <p>This Agreement shall be governed by the laws of India.</p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                12. Acceptance
              </h3>
              <p>
                By registering for OptCamp, the Participant acknowledges and
                agrees to all terms stated above.
              </p>
            </div>
          </div>
        </section>

        {/* Company / Partner Agreement */}
        <section className="mb-16">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-8 pb-4 border-b border-cyan-500/30">
            Company / Partner Agreement
          </h1>

          <div className="space-y-6 text-sm font-bold uppercase tracking-[0.16em] text-white/70">
            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                1. Agreement Overview
              </h3>
              <p>
                This Agreement is entered into between Optern (OptCamp
                Initiative) and Partner Companies. This governs access to
                candidates identified through OptCamp.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                2. Purpose
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  To provide the Partner with access to pre-evaluated candidates
                </li>
                <li>To ensure ethical and structured use of candidate data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                3. Candidate Access
              </h3>
              <p className="mb-2">Optern agrees to:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Share shortlisted candidates based on performance</li>
                <li>
                  Provide relevant candidate insights and evaluation summaries
                </li>
              </ul>
              <p className="mt-2">The Partner agrees:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>To use candidate data solely for hiring purposes</li>
                <li>Not to misuse or redistribute candidate information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                4. Non-Solicitation & Fair Use
              </h3>
              <p>The Partner shall:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Not share candidate data with third parties</li>
                <li>
                  Not use candidate data for marketing, database building, or
                  resale
                </li>
                <li>
                  Not engage candidates in misleading or exploitative
                  opportunities
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                5. No Guarantee Clause
              </h3>
              <p className="mb-2">Optern does not guarantee:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Candidate performance</li>
                <li>Hiring outcomes</li>
              </ul>
              <p className="mt-2">
                The Partner is solely responsible for its hiring decisions.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                6. Data Protection
              </h3>
              <p className="mb-2">The Partner agrees to:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Protect candidate data</li>
                <li>Use it only within reasonable hiring timelines</li>
                <li>Delete or archive responsibly after use</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                7. Intellectual Property
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Evaluation frameworks and processes belong to Optern</li>
                <li>
                  The Partner shall not replicate or reverse engineer the system
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                8. Branding Rights
              </h3>
              <p className="mb-2">Optern may list the Partner as a:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>"Hiring Partner"</li>
                <li>"Collaboration Partner"</li>
              </ul>
              <p className="mt-2">Any logo usage must be mutually approved.</p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                9. Non-Exclusivity
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>This agreement is non-exclusive</li>
                <li>Optern may share candidates with multiple partners</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                10. Limitation of Liability
              </h3>
              <p className="mb-2">Optern is not liable for:</p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Hiring outcomes</li>
                <li>Candidate performance post-hiring</li>
              </ul>
              <p className="mt-2">
                Neither party is liable for indirect damages.
              </p>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                11. Term & Termination
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Valid for the duration of the current cohort</li>
                <li>Either party may terminate with written notice</li>
                <li>Confidentiality obligations survive termination</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                12. Dispute Resolution
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>
                  Disputes will first be resolved through mutual discussion
                </li>
                <li>If unresolved, governed by laws of India</li>
              </ul>
            </div>

            <div>
              <h3 className="text-cyan-400 text-[11px] uppercase tracking-[0.24em] mb-3">
                13. Acceptance
              </h3>
              <p>
                By participating as a partner, the Company agrees to all terms
                stated above.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
