import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const isVisible = true;
    const isHidden = false;
    expect(cn("foo", isVisible && "bar")).toBe("foo bar");
    expect(cn("foo", isHidden && "bar")).toBe("foo");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
    expect(cn("base", ["foo", "bar"])).toBe("base foo bar");
  });

  it("handles objects", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
    expect(cn({ foo: true, bar: true })).toBe("foo bar");
  });

  it("merges tailwind classes correctly", () => {
    // twMerge should handle conflicting utility classes
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("handles complex combinations", () => {
    const isActive = true;
    const isDisabled = false;
    
    expect(cn(
      "base-class",
      isActive && "active",
      isDisabled && "disabled",
      { "hover:bg-gray-100": true }
    )).toBe("base-class active hover:bg-gray-100");
  });
});
