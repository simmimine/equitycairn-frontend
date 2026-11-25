import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Story } from "@/lib/feed/types";

import { StoryCard } from "./story-card";

const notice = vi.hoisted(() => vi.fn());

vi.mock("./coming-soon", () => ({ useComingSoon: () => notice }));
vi.mock("@/lib/feed/format", () => ({
  formatPublished: (iso: string) => `published ${iso}`,
  coverageLabel: (story: { linkCount: number }) =>
    `coverage of ${story.linkCount}`,
}));

const story: Story = {
  id: "s1",
  ticker: "BRK.B",
  headline: "Sample headline about a holding company",
  publisher: "Example Wire",
  kind: "news",
  publishedAt: "2026-11-25T09:30:00Z",
  linkCount: 3,
  originalUrl: "https://example.com/story",
  isNew: true,
};

beforeEach(() => {
  notice.mockReset();
});

describe("StoryCard", () => {
  it("is an article named by its headline", () => {
    render(<StoryCard story={story} />);
    const article = screen.getByRole("article", { name: story.headline });
    expect(article).toContainElement(
      screen.getByRole("heading", { level: 2, name: story.headline }),
    );
    expect(screen.getByText("BRK.B")).toBeInTheDocument();
    expect(screen.getByText("SAMPLE")).toBeInTheDocument();
    expect(screen.getByText("Example Wire")).toBeInTheDocument();
    expect(screen.getByText("coverage of 3")).toBeInTheDocument();
  });

  it("marks up the published time", () => {
    render(<StoryCard story={story} />);
    const time = screen.getByText(`published ${story.publishedAt}`);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", story.publishedAt);
  });

  it("badges a new story", () => {
    render(<StoryCard story={story} />);
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("has no badge on an older story", () => {
    render(<StoryCard story={{ ...story, isNew: false }} />);
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("links to the original in a new tab", () => {
    render(<StoryCard story={story} />);
    const link = screen.getByRole("link", {
      name: /^Original story.*\(opens in a new tab\)$/,
    });
    expect(link).toHaveAttribute("href", story.originalUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("says coverage is coming soon", async () => {
    render(<StoryCard story={story} />);
    await userEvent.click(
      screen.getByRole("button", { name: /view coverage/i }),
    );
    expect(notice).toHaveBeenCalledWith("Coverage view");
  });

  it("draws the NEW badge as a secondary pill", () => {
    render(<StoryCard story={story} />);
    expect(screen.getByText("NEW")).toHaveClass(
      "h-[22px]",
      "w-[42px]",
      "rounded-full",
      "bg-secondary",
      "text-link",
    );
  });

  it("describes both actions with the headline", () => {
    render(<StoryCard story={story} />);
    for (const action of [
      screen.getByRole("link", { name: /original story/i }),
      screen.getByRole("button", { name: /view coverage/i }),
    ]) {
      expect(action).toHaveAccessibleDescription(story.headline);
    }
  });

  it("gives the original link a focus ring and a 24px target", () => {
    render(<StoryCard story={story} />);
    expect(screen.getByRole("link")).toHaveClass(
      "focus-visible:ring-3",
      "py-1",
      "-my-1",
    );
  });

  it("lets a long publisher name wrap", () => {
    render(<StoryCard story={story} />);
    expect(screen.getByText("Example Wire")).toHaveClass(
      "min-w-0",
      "break-words",
    );
  });
});
