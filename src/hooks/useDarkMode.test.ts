import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "./useDarkMode";

describe("useDarkMode", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    
    // Reset document classes
    document.documentElement.classList.remove("light", "dark");
  });

  it("defaults to system theme when no stored value", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.theme).toBe("system");
  });

  it("loads stored theme from localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");
    
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.theme).toBe("dark");
  });

  it("saves theme to localStorage when changed", () => {
    const { result } = renderHook(() => useDarkMode());
    
    act(() => {
      result.current.setTheme("dark");
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith("wellbeing-theme", "dark");
  });

  it("updates theme state when setTheme is called", () => {
    const { result } = renderHook(() => useDarkMode());
    
    act(() => {
      result.current.setTheme("light");
    });
    
    expect(result.current.theme).toBe("light");
  });

  it("applies dark class to document when theme is dark", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");
    
    renderHook(() => useDarkMode());
    
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("applies light class to document when theme is light", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");
    
    renderHook(() => useDarkMode());
    
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("isDark is true when resolvedTheme is dark", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");
    
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.isDark).toBe(true);
  });

  it("isDark is false when resolvedTheme is light", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");
    
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.isDark).toBe(false);
  });

  it("returns valid theme values only from localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("invalid-theme");
    
    const { result } = renderHook(() => useDarkMode());
    
    // Should fallback to system when invalid
    expect(result.current.theme).toBe("system");
  });

  it("cycles through themes correctly", () => {
    const { result } = renderHook(() => useDarkMode());
    
    // Start with system (default)
    expect(result.current.theme).toBe("system");
    
    // Switch to light
    act(() => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");
    
    // Switch to dark
    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    
    // Switch back to system
    act(() => {
      result.current.setTheme("system");
    });
    expect(result.current.theme).toBe("system");
  });
});
