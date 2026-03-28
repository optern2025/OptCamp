import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clerkEnv", () => ({
  hasClerkPublishableKey: true,
}));

vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) =>
      key === "cohortId" ? "cohort-1" : key === "sprintDayId" ? "day-1" : null,
  }),
}));

describe("SprintDayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cohort: {
          id: "cohort-1",
          type: "AI / ML",
        },
        membershipStatus: "enrolled",
        isFinalSprintDay: false,
        sprintDay: {
          id: "day-1",
          day_number: 1,
          title: "Environment Setup",
          description: "Set things up.",
          brief: "Submit the repo link.",
          status: "submitted",
          submission: {
            github_url: "https://github.com/example/repo",
            submitted_at: "2026-03-27T12:00:00.000Z",
          },
        },
      }),
    }) as typeof fetch;
  });

  it("renders submitted sprint-day state without a resubmission action", async () => {
    const Page = (await import("@/app/dashboard/sprint-day/page")).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/Environment Setup/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Submission received/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Already Submitted/i }),
    ).toBeDisabled();
  });
});
