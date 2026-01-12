import { useEffect, useCallback, useState } from "react";

/**
 * Hook to detect keyboard navigation mode
 * Adds data-keyboard-nav="true" to body when user navigates with keyboard
 */
export function useKeyboardNav() {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab, arrows, Enter, Space indicate keyboard navigation
      if (
        e.key === "Tab" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        setIsKeyboardNav(true);
        document.body.setAttribute("data-keyboard-nav", "true");
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardNav(false);
      document.body.removeAttribute("data-keyboard-nav");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboardNav;
}

/**
 * Hook for roving tabindex navigation within a group of elements
 * Useful for lists, grids, and menu-like components
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: React.RefObject<T | null>[],
  options: {
    orientation?: "horizontal" | "vertical" | "both";
    wrap?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = "both", wrap = true, onSelect } = options;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const maxIndex = items.length - 1;
      let nextIndex = currentIndex;

      const shouldHandleHorizontal =
        orientation === "horizontal" || orientation === "both";
      const shouldHandleVertical =
        orientation === "vertical" || orientation === "both";

      switch (e.key) {
        case "ArrowRight":
          if (shouldHandleHorizontal) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex + 1) % items.length
              : Math.min(currentIndex + 1, maxIndex);
          }
          break;
        case "ArrowLeft":
          if (shouldHandleHorizontal) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex - 1 + items.length) % items.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case "ArrowDown":
          if (shouldHandleVertical) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex + 1) % items.length
              : Math.min(currentIndex + 1, maxIndex);
          }
          break;
        case "ArrowUp":
          if (shouldHandleVertical) {
            e.preventDefault();
            nextIndex = wrap
              ? (currentIndex - 1 + items.length) % items.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = maxIndex;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect?.(currentIndex);
          return;
      }

      if (nextIndex !== currentIndex) {
        setActiveIndex(nextIndex);
        items[nextIndex]?.current?.focus();
      }
    },
    [items, orientation, wrap, onSelect]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getTabIndex: (index: number) => (index === activeIndex ? 0 : -1),
  };
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const announcement = document.createElement("div");
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", priority);
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = message;
      document.body.appendChild(announcement);

      // Remove after announcement is read
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    },
    []
  );

  return announce;
}
