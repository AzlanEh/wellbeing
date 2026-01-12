import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCards } from "./StatsCards";

describe("StatsCards", () => {
  it("renders all three stat cards", () => {
    render(<StatsCards totalToday={0} appsCount={0} weeklyTotal={0} />);
    
    expect(screen.getByText("Total Today")).toBeInTheDocument();
    expect(screen.getByText("Apps Used")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
  });

  it("displays formatted duration for totalToday", () => {
    render(<StatsCards totalToday={3665} appsCount={0} weeklyTotal={0} />);
    
    // 3665 seconds = 1h 1m
    expect(screen.getByText("1h 1m")).toBeInTheDocument();
  });

  it("displays apps count", () => {
    render(<StatsCards totalToday={0} appsCount={5} weeklyTotal={0} />);
    
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("displays formatted duration for weeklyTotal", () => {
    render(<StatsCards totalToday={0} appsCount={0} weeklyTotal={7200} />);
    
    // 7200 seconds = 2h 0m
    expect(screen.getByText("2h 0m")).toBeInTheDocument();
  });

  it("displays all values together", () => {
    render(<StatsCards totalToday={1800} appsCount={3} weeklyTotal={10800} />);
    
    expect(screen.getByText("30m")).toBeInTheDocument(); // 1800s
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("3h 0m")).toBeInTheDocument(); // 10800s
  });

  it("handles zero values", () => {
    render(<StatsCards totalToday={0} appsCount={0} weeklyTotal={0} />);
    
    // 0 seconds displays as "0s"
    const zeroElements = screen.getAllByText("0s");
    expect(zeroElements).toHaveLength(2); // totalToday and weeklyTotal
    
    expect(screen.getByText("0")).toBeInTheDocument(); // appsCount
  });

  it("handles large values", () => {
    render(<StatsCards totalToday={86400} appsCount={100} weeklyTotal={604800} />);
    
    // 86400s = 24h 0m
    expect(screen.getByText("24h 0m")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // 604800s = 168h 0m
    expect(screen.getByText("168h 0m")).toBeInTheDocument();
  });
});
