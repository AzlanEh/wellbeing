import { useCallback, useRef } from "react";
import { toast } from "sonner";

interface UndoAction {
  id: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  description: string;
  onComplete?: () => void;
}

const UNDO_TIMEOUT = 5000; // 5 seconds to undo

/**
 * Hook for managing undoable actions with toast notifications.
 * Shows a toast with an "Undo" button that allows reverting the action
 * within a specified timeout period.
 */
export function useUndo() {
  const pendingActions = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const executeWithUndo = useCallback(
    async ({ id, execute, undo, description, onComplete }: UndoAction) => {
      // Cancel any existing pending action with same ID
      const existingTimeout = pendingActions.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        pendingActions.current.delete(id);
      }

      // Execute the action immediately
      await execute();

      // Show toast with undo option
      toast(description, {
        duration: UNDO_TIMEOUT,
        action: {
          label: "Undo",
          onClick: async () => {
            // Cancel the finalization timeout
            const timeout = pendingActions.current.get(id);
            if (timeout) {
              clearTimeout(timeout);
              pendingActions.current.delete(id);
            }

            // Execute undo
            try {
              await undo();
              toast.success("Action undone");
            } catch (error) {
              toast.error("Failed to undo", {
                description: String(error),
              });
            }
          },
        },
        onDismiss: () => {
          // Clean up when toast is dismissed
          const timeout = pendingActions.current.get(id);
          if (timeout) {
            clearTimeout(timeout);
            pendingActions.current.delete(id);
          }
        },
      });

      // Set timeout to finalize action (optional callback)
      if (onComplete) {
        const timeout = setTimeout(() => {
          pendingActions.current.delete(id);
          onComplete();
        }, UNDO_TIMEOUT);
        pendingActions.current.set(id, timeout);
      }
    },
    []
  );

  const cancelPending = useCallback((id: string) => {
    const timeout = pendingActions.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      pendingActions.current.delete(id);
    }
  }, []);

  return { executeWithUndo, cancelPending };
}
