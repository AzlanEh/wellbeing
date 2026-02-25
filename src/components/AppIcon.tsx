/**
 * AppIcon – displays a real app icon loaded via the Tauri asset protocol.
 * Falls back to a colored letter-avatar when no icon is available or on load error.
 *
 * Cross-platform:
 *   Linux  – resolves XDG icon names (e.g. "firefox") from hicolor / Papirus / pixmaps dirs
 *   Windows – resolves DisplayIcon registry paths (e.g. "C:\...\app.exe,0")
 */

import { useState, useEffect, memo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api } from "@/services/api";
import { COLORS } from "@/components/dashboard/constants";
import { cn } from "@/lib/utils";

// Module-level cache so repeated renders don't re-invoke the backend.
// Key: iconName string  →  Value: resolved asset URL | null (null = not found)
const iconCache = new Map<string, string | null>();

// Track in-flight promises to avoid duplicate concurrent requests for the same key.
const iconRequests = new Map<string, Promise<string | null>>();

async function resolveIcon(iconName: string): Promise<string | null> {
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }
  if (iconRequests.has(iconName)) {
    return iconRequests.get(iconName)!;
  }

  const request = api
    .resolveAppIcon(iconName)
    .then((filePath) => {
      const url = filePath ? convertFileSrc(filePath) : null;
      iconCache.set(iconName, url);
      iconRequests.delete(iconName);
      return url;
    })
    .catch(() => {
      iconCache.set(iconName, null);
      iconRequests.delete(iconName);
      return null;
    });

  iconRequests.set(iconName, request);
  return request;
}

// Deterministic color for a given app name (same logic as the old COLORS array approach).
function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export interface AppIconProps {
  /** The app's display name – used for the letter-avatar fallback */
  appName: string;
  /**
   * The raw icon identifier returned by the backend:
   *   Linux  → InstalledApp.icon  (e.g. "firefox", "/usr/share/pixmaps/firefox.png")
   *   Windows → InstalledApp.icon (e.g. "C:\\...\\app.exe,0")
   * If undefined/null the component goes straight to the fallback.
   */
  iconHint?: string | null;
  /** Tailwind size classes applied to the outer wrapper. Default: "h-10 w-10" */
  className?: string;
  /** Extra classes forwarded to the wrapper (stacks with className) */
  wrapperClassName?: string;
  /** Shape variant: "rounded-xl" (default, large cards) or "rounded-lg" (small lists) */
  shape?: "rounded-xl" | "rounded-lg" | "rounded-md" | "rounded-full";
  /** If true the hover scale transform is applied */
  hoverable?: boolean;
  /** Override the fallback background color (CSS color string) */
  color?: string;
}

export const AppIcon = memo(function AppIcon({
  appName,
  iconHint,
  className = "h-10 w-10",
  wrapperClassName,
  shape = "rounded-xl",
  hoverable = false,
  color,
}: AppIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!iconHint) return;

    let cancelled = false;
    resolveIcon(iconHint).then((url) => {
      if (!cancelled) setIconUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [iconHint]);

  const bgColor = color ?? getColorForName(appName);
  const showIcon = iconUrl && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden",
        className,
        shape,
        hoverable && "transition-transform group-hover:scale-105",
        !showIcon && "text-white font-bold shadow-sm",
        wrapperClassName
      )}
      style={!showIcon ? { background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)` } : undefined}
      aria-hidden="true"
    >
      {showIcon ? (
        <img
          src={iconUrl}
          alt={appName}
          className="w-full h-full object-contain p-1"
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-sm leading-none select-none">
          {appName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
});
