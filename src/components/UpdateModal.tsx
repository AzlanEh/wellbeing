import { Download, RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { UpdateState } from "@/hooks/useUpdater";
import { cn } from "@/lib/utils";

interface UpdateModalProps {
  state: UpdateState;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateModal({ state, onInstall, onDismiss }: UpdateModalProps) {
  const isOpen =
    state.status === "available" ||
    state.status === "downloading" ||
    state.status === "installing";

  if (!isOpen) return null;

  const isDownloading = state.status === "downloading";
  const isInstalling = state.status === "installing";
  const isBusy = isDownloading || isInstalling;
  const progress = state.status === "downloading" ? state.progress : 0;
  const info = state.status === "available" ? state.info : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Update Available
          </DialogTitle>
          <DialogDescription>
            {info
              ? `Version ${info.version} is ready to install.`
              : isInstalling
                ? "Installing update…"
                : "Downloading update…"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {info?.body && (
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                What's new
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{info.body}</p>
            </div>
          )}

          {(isDownloading || isInstalling) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isInstalling ? "Installing…" : "Downloading…"}</span>
                {isDownloading && <span>{progress}%</span>}
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isInstalling
                      ? "w-full bg-primary animate-pulse"
                      : "bg-gradient-to-r from-primary to-cyan-500",
                  )}
                  style={isDownloading ? { width: `${progress}%` } : undefined}
                />
              </div>
              {isDownloading && progress === 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Calculating download size…
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isBusy && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Later
            </Button>
          )}
          <Button
            size="sm"
            onClick={onInstall}
            disabled={isBusy}
            className="gap-1.5"
          >
            {isBusy ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {isInstalling ? "Installing…" : `${progress}%`}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Update Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
