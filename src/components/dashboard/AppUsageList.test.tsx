import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppUsageList } from "./AppUsageList";
import { AppUsage } from "@/types";

const mockApps: AppUsage[] = [
  {
    app_name: "Firefox",
    duration_seconds: 3600,
    session_count: 5,
    category: "Productivity",
  },
  {
    app_name: "VS Code",
    duration_seconds: 7200,
    session_count: 3,
    category: "Development",
  },
  {
    app_name: "Discord",
    duration_seconds: 1800,
    session_count: 2,
    category: null,
  },
];

describe("AppUsageList", () => {
  const mockOnCategoryChange = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders app list with correct names", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("Firefox")).toBeInTheDocument();
    expect(screen.getByText("VS Code")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("displays session counts", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("5 sessions")).toBeInTheDocument();
    expect(screen.getByText("3 sessions")).toBeInTheDocument();
    expect(screen.getByText("2 sessions")).toBeInTheDocument();
  });

  it("displays formatted durations", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("1h 0m")).toBeInTheDocument(); // 3600s
    expect(screen.getByText("2h 0m")).toBeInTheDocument(); // 7200s
    expect(screen.getByText("30m")).toBeInTheDocument(); // 1800s
  });

  it("displays category badges for categorized apps", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("Productivity")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("displays 'Set category' for uncategorized apps", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("Set category")).toBeInTheDocument();
  });

  it("displays empty state when no apps", () => {
    render(
      <AppUsageList
        apps={[]}
        totalToday={0}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("No apps tracked yet")).toBeInTheDocument();
    expect(screen.getByText("Start using your computer to see data here!")).toBeInTheDocument();
  });

  it("renders app initials as avatars", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    // Check for first letter of each app name
    expect(screen.getByText("F")).toBeInTheDocument(); // Firefox
    expect(screen.getByText("V")).toBeInTheDocument(); // VS Code
    expect(screen.getByText("D")).toBeInTheDocument(); // Discord
  });

  it("shows category selector when badge is clicked", async () => {
    const user = userEvent.setup();
    
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    // Click on "Set category" badge for Discord
    const setCategoryBadge = screen.getByText("Set category");
    await user.click(setCategoryBadge);

    // Should now show a select dropdown
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders the header", () => {
    render(
      <AppUsageList
        apps={mockApps}
        totalToday={12600}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText("App Usage Today")).toBeInTheDocument();
  });
});
