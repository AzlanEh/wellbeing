import { createContext, useContext } from "react";
import type { UpdateState } from "@/hooks/useUpdater";

interface UpdaterContextValue {
  state: UpdateState;
  checkForUpdate: (silent?: boolean) => Promise<import("@/hooks/useUpdater").UpdateInfo | null>;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
}

export const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function useUpdaterContext() {
  const ctx = useContext(UpdaterContext);
  if (!ctx) throw new Error("useUpdaterContext must be used inside UpdaterContext.Provider");
  return ctx;
}
