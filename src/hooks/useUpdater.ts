import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface UpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; info: UpdateInfo }
  | { status: "up-to-date" }
  | { status: "downloading"; progress: number }
  | { status: "installing" }
  | { status: "error"; message: string };

interface DownloadProgressEvent {
  chunkLength: number;
  contentLength: number | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  /**
   * Check for a new version.
   * @param silent - When true (background startup check), errors are swallowed
   *                 and state stays "idle". When false (manual check), errors
   *                 are surfaced as status:"error".
   */
  const checkForUpdate = useCallback(
    async (silent = false): Promise<UpdateInfo | null> => {
      setState({ status: "checking" });
      try {
        const info = await invoke<UpdateInfo | null>("check_for_update");
        if (info) {
          setState({ status: "available", info });
          return info;
        } else {
          setState({ status: "up-to-date" });
          return null;
        }
      } catch (err) {
        if (silent) {
          // Background check: don't alarm the user with an error state
          setState({ status: "idle" });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setState({ status: "error", message });
        }
        return null;
      }
    },
    [],
  );

  const installUpdate = useCallback(async (): Promise<void> => {
    let downloaded = 0;
    let total = 0;

    const unlisteners: UnlistenFn[] = [];

    const progressListener = await listen<DownloadProgressEvent>(
      "update-download-progress",
      (event) => {
        downloaded += event.payload.chunkLength;
        if (event.payload.contentLength) {
          total = event.payload.contentLength;
        }
        const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        setState({ status: "downloading", progress });
      },
    );
    unlisteners.push(progressListener);

    const installListener = await listen("update-install-complete", () => {
      setState({ status: "installing" });
    });
    unlisteners.push(installListener);

    try {
      await invoke("install_update");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message });
    } finally {
      unlisteners.forEach((fn) => fn());
    }
  }, []);

  const dismiss = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, checkForUpdate, installUpdate, dismiss };
}
