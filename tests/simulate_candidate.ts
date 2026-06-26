import { gradePracticalSubmission } from "../lib/aiGrading";

const question = "Explain how React components work and why they are useful.";
const rubric = "Components are reusable building blocks of a UI. They manage their own state and can be composed to form complex interfaces. Look for keywords like reusable, UI, state, composition.";
const concepts = ["Reusability", "UI Building Blocks", "State Management"];

async function runTest(candidateName: string, answer: string, expectedPass: boolean) {
  console.log(`\n--- Testing ${candidateName} ---`);
  console.log(`Answer: "${answer}"`);
  
  const result = await gradePracticalSubmission(
    question,
    answer,
    rubric,
    concepts
  );
  
  console.log(`Result Score: ${result.score}`);
  console.log(`Is Correct: ${result.isCorrect}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Feedback: ${result.reasoning}`);
  
  const passed = result.score >= 70;
  console.log(`PASS/FAIL STATUS: ${passed ? "PASS" : "FAIL"} (Expected: ${expectedPass ? "PASS" : "FAIL"})`);
  
  if (passed === expectedPass) {
    console.log(`✅ MATCHES EXPECTATION`);
  } else {
    console.log(`❌ EXPECTATION FAILED`);
  }
}

async function main() {
  await runTest(
    "Candidate A (Perfect)", 
    "React components are essentially isolated, reusable pieces of code that represent parts of the user interface. They are highly beneficial because they allow developers to construct complex UIs by composing these smaller blocks. Each component can also hold its own internal state, making it self-contained.",
    true
  );
  
  await runTest(
    "Candidate B (Mostly correct)",
    "They are reusable UI parts. You use them to build the frontend. I like them because you don't have to rewrite code, you just reuse the component.",
    true
  );

  await runTest(
    "Candidate C (Half correct)",
    "React uses components. They are functions that return HTML. It's for the frontend.",
    true
  );

  await runTest(
    "Candidate D (Incorrect)",
    "React components are database tables used to store user data securely on the backend.",
    false
  );
}

main().catch(console.error);
