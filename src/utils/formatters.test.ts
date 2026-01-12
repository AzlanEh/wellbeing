import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatTime,
  getPercentage,
  getDayName,
  getDayNameFromTimestamp,
} from "./formatters";

describe("formatDuration", () => {
  it("returns seconds for values under 60", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("returns minutes for values between 60 and 3600", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(1800)).toBe("30m");
    expect(formatDuration(3599)).toBe("59m");
  });

  it("returns hours and minutes for values over 3600", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3660)).toBe("1h 1m");
    expect(formatDuration(7200)).toBe("2h 0m");
    expect(formatDuration(7380)).toBe("2h 3m");
    expect(formatDuration(36000)).toBe("10h 0m");
  });

  it("handles edge cases", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("formatTime", () => {
  it("formats seconds only", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(30)).toBe("0:30");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7265)).toBe("2:01:05");
    expect(formatTime(36000)).toBe("10:00:00");
  });

  it("pads numbers correctly", () => {
    expect(formatTime(3605)).toBe("1:00:05");
    expect(formatTime(3665)).toBe("1:01:05");
  });
});

describe("getPercentage", () => {
  it("returns 0 when total is 0", () => {
    expect(getPercentage(50, 0)).toBe(0);
    expect(getPercentage(0, 0)).toBe(0);
  });

  it("calculates percentage correctly", () => {
    expect(getPercentage(50, 100)).toBe(50);
    expect(getPercentage(25, 100)).toBe(25);
    expect(getPercentage(1, 3)).toBe(33);
    expect(getPercentage(2, 3)).toBe(67);
  });

  it("returns 100 for equal values", () => {
    expect(getPercentage(100, 100)).toBe(100);
    expect(getPercentage(50, 50)).toBe(100);
  });

  it("handles values over 100%", () => {
    expect(getPercentage(150, 100)).toBe(150);
    expect(getPercentage(200, 100)).toBe(200);
  });
});

describe("getDayName", () => {
  it("returns correct day names for YYYY-MM-DD format", () => {
    // Test with known dates
    expect(getDayName("2026-01-12")).toBe("Mon"); // January 12, 2026 is Monday
    expect(getDayName("2026-01-11")).toBe("Sun"); // January 11, 2026 is Sunday
    expect(getDayName("2026-01-13")).toBe("Tue"); // January 13, 2026 is Tuesday
  });
});

describe("getDayNameFromTimestamp", () => {
  it("converts Unix timestamp to day name", () => {
    // January 12, 2026 at noon UTC = 1768132800
    const timestamp = 1768132800;
    // Note: Result depends on local timezone
    const result = getDayNameFromTimestamp(timestamp);
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(result);
  });

  it("handles different timestamps", () => {
    // Test that it returns valid day names
    const result1 = getDayNameFromTimestamp(0); // Jan 1, 1970
    const result2 = getDayNameFromTimestamp(86400); // Jan 2, 1970
    
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(result1);
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(result2);
    // They should be different days
    expect(result1).not.toBe(result2);
  });
});
