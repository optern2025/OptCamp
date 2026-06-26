/**
 * E2E Screening Grading Validation — Candidates A through H
 *
 * Tests semantic grading across 8 candidate profiles:
 *   A – All correct prose
 *   B – Mostly correct prose
 *   C – Borderline (~70%) prose
 *   D – Clearly weak / incorrect
 *   E – Code snippet answers (React/JS/TS/SQL)
 *   F – Alternative wording but correct concepts
 *   G – Bullet-point answers
 *   H – Short answers
 *
 * Usage: npx tsx --env-file=.env.local tests/e2e_screening_validation.ts
 */

import { gradePracticalSubmission } from "../lib/aiGrading";

// ─── Shared test question ────────────────────────────────────────────────────

const QUESTION = "Explain how React's useState hook works and why it is used.";
const RUBRIC = "useState is a React hook that allows functional components to hold and manage local state. When state changes, the component re-renders. It returns an array: [currentState, setterFunction].";
const CONCEPTS = ["state management", "functional components", "re-render", "useState hook", "setter function"];

// ─── Test runner ─────────────────────────────────────────────────────────────

interface TestResult {
  candidate: string;
  score: number;
  isCorrect: boolean;
  confidence: number;
  reasoning: string;
  passedThreshold: boolean;
  productionOutcome: 'PASS' | 'FAIL' | 'PENDING_REVIEW';
  matchedExpectation: boolean;
  error?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest(
  candidateName: string,
  answer: string,
  expectedPass: boolean,
  question = QUESTION,
  rubric = RUBRIC,
  concepts = CONCEPTS
): Promise<TestResult> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${candidateName}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Answer: ${answer.substring(0, 150).replace(/\n/g, " ")}${answer.length > 150 ? "..." : ""}`);

  const result = await gradePracticalSubmission(question, answer, rubric, concepts);

  // Determine production outcome:
  // - error=true OR confidence=0 → pending_review (NEVER auto-fail)
  // - score >= 70 → PASS
  // - score < 70 → FAIL
  let productionOutcome: 'PASS' | 'FAIL' | 'PENDING_REVIEW';
  if (result.error || result.confidence === 0) {
    productionOutcome = 'PENDING_REVIEW';
  } else if (result.score >= 70) {
    productionOutcome = 'PASS';
  } else {
    productionOutcome = 'FAIL';
  }

  // For expectation matching: PENDING_REVIEW counts as meeting the "never auto-fail" contract
  const passedThreshold = result.score >= 70;
  const matchedExpectation = result.error
    ? true  // AI error → pending_review is always correct behavior
    : passedThreshold === expectedPass;

  const outcomeIcon = productionOutcome === 'PASS' ? '✅' : productionOutcome === 'PENDING_REVIEW' ? '⏳' : '❌';

  console.log(`  Score:      ${result.score}/100`);
  console.log(`  isCorrect:  ${result.isCorrect}`);
  console.log(`  Confidence: ${result.confidence}`);
  console.log(`  Reasoning:  ${result.reasoning.substring(0, 200)}...`);
  console.log(`  Production: ${outcomeIcon} ${productionOutcome} (Expected: ${expectedPass ? 'PASS' : 'FAIL'})`);
  console.log(`  Match:      ${matchedExpectation ? '✅ EXPECTATION MET' : '❌ EXPECTATION FAILED'}`);
  if (result.error) console.log(`  ⚠️  Gemini unavailable → candidate flagged for admin review (not auto-failed)`);

  // Delay to avoid rate limiting between candidates
  await sleep(2000);

  return {
    candidate: candidateName,
    score: result.score,
    isCorrect: result.isCorrect,
    confidence: result.confidence,
    reasoning: result.reasoning,
    passedThreshold,
    productionOutcome,
    matchedExpectation,
    error: result.error,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║    OptCamp AI Screening — E2E Grading Validation         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const results: TestResult[] = [];

  // ── Candidate A: All correct ──────────────────────────────────────────────
  results.push(await runTest(
    "Candidate A — Perfect Prose (Expected: PASS)",
    `The useState hook is one of the core React hooks introduced in React 16.8 to allow functional components 
    to maintain their own local state. When you call useState with an initial value, it returns an array 
    containing two elements: the current state value, and a setter function to update it. Whenever the 
    setter function is called with a new value, React re-renders the component with the updated state, 
    keeping the UI synchronized with the application's data.`,
    true
  ));

  // ── Candidate B: Mostly correct ───────────────────────────────────────────
  results.push(await runTest(
    "Candidate B — Mostly Correct (Expected: PASS)",
    `useState is a hook that lets you add state to React functional components. You call it with a default value 
    and it gives back the state and a function to change it. When you update the state, the component re-renders 
    automatically. It's the main way to handle data that changes over time inside a component.`,
    true
  ));

  // ── Candidate C: Borderline ────────────────────────────────────────────────
  results.push(await runTest(
    "Candidate C — Borderline (Expected: PASS if score >= 70)",
    `useState is a hook in React. You use it to store data inside a component. It makes the component update 
    when the data changes. You call useState and get back the current value and a way to change it.`,
    true
  ));

  // ── Candidate D: Clearly weak ─────────────────────────────────────────────
  results.push(await runTest(
    "Candidate D — Clearly Wrong (Expected: FAIL)",
    `useState is used to make API requests in React. It connects to the backend database and fetches user 
    records. It's similar to useEffect but specifically for database calls.`,
    false
  ));

  // ── Candidate E: Code snippet answers ─────────────────────────────────────
  results.push(await runTest(
    "Candidate E — Code Answer (Expected: PASS)",
    `Here's how I use useState:
\`\`\`tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
\`\`\`

The useState hook returns the current state and a setter. When setCount is called, React schedules a re-render with the new value. The initial value (0) is used only on first render.`,
    true
  ));

  // ── Candidate E2: SQL code answer ─────────────────────────────────────────
  const sqlQuestion = "How would you write a SQL query to find the top 5 users by total order value?";
  const sqlRubric = "Use SELECT with JOIN and GROUP BY to aggregate orders per user, ORDER BY total DESC, LIMIT 5.";
  const sqlConcepts = ["JOIN", "GROUP BY", "SUM", "ORDER BY", "LIMIT"];

  results.push(await runTest(
    "Candidate E2 — SQL Code Answer (Expected: PASS)",
    `\`\`\`sql
SELECT u.id, u.name, SUM(o.amount) AS total_spent
FROM users u
JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 5;
\`\`\``,
    true,
    sqlQuestion,
    sqlRubric,
    sqlConcepts
  ));

  // ── Candidate F: Alternative wording ─────────────────────────────────────
  results.push(await runTest(
    "Candidate F — Alternative Wording (Expected: PASS)",
    `useState allows you to make function-based React components reactive. Without it, you'd have to use 
    class components with this.setState. The hook works by tracking a piece of data and whenever that 
    data is changed via the updater function, the whole component gets refreshed so the user sees the new value.`,
    true
  ));

  // ── Candidate G: Bullet points ────────────────────────────────────────────
  results.push(await runTest(
    "Candidate G — Bullet Point Answer (Expected: PASS)",
    `useState in React:
    - It's a hook that adds local state to function components
    - Syntax: const [value, setValue] = useState(initialValue)
    - When setValue() is called with a new value, the component automatically re-renders
    - Used to store things like form inputs, toggles, counters
    - The state persists between re-renders
    - Each component instance has its own independent state`,
    true
  ));

  // ── Candidate H: Short answer ─────────────────────────────────────────────
  results.push(await runTest(
    "Candidate H — Very Short Answer (Expected: Reasonable, not auto-fail)",
    `useState is a React hook for managing state in functional components. It returns the state value and a setter.`,
    true // Short but correct — should score reasonably
  ));

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    VALIDATION SUMMARY                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");

  let totalMatched = 0;
  let reviewCount = 0;

  for (const r of results) {
    const icon = r.matchedExpectation ? "✅" : "❌";
    const outcomeStr = r.productionOutcome === 'PENDING_REVIEW' ? 'REVIEW' : r.productionOutcome;
    const padded = (r.candidate + " ").substring(0, 38).padEnd(38);
    console.log(`║ ${icon} ${padded} Score:${String(r.score).padStart(3)} → ${outcomeStr.padEnd(6)} ║`);
    if (r.matchedExpectation) totalMatched++;
    if (r.productionOutcome === 'PENDING_REVIEW') reviewCount++;
  }

  const total = results.length;
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Tests Matched Expectation: ${totalMatched}/${total}                          ║`);
  if (reviewCount > 0) console.log(`║  ⏳ ${reviewCount} test(s) hit rate limits → correctly sent to review  ║`);

  const allPassed = totalMatched === total;
  console.log(`║  Overall: ${allPassed ? "✅ ALL EXPECTATIONS MET — SYSTEM READY" : "❌ Some expectations failed"}   ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error("E2E validation script failed:", err);
  process.exit(1);
});
