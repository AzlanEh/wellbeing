import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, X } from "lucide-react";
import "@/index.css";

export function LimitReached() {
  const [appName, setAppName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get app name from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const app = params.get("app");
    if (app) {
      setAppName(decodeURIComponent(app));
    }
  }, []);

  const handleQuitApp = async () => {
    if (!appName) return;
    setIsLoading(true);
    try {
      await invoke("quit_blocked_app", { appName });
    } catch (error) {
      console.error("Failed to quit app:", error);
    }
    setIsLoading(false);
  };

  const handleEmergencyUse = async () => {
    if (!appName) return;
    setIsLoading(true);
    try {
      await invoke("grant_emergency_access", { appName });
    } catch (error) {
      console.error("Failed to grant emergency access:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-lg border shadow-lg p-6 text-center">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-foreground mb-2">
          App Limit Reached
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-2">
          You've reached your daily limit for
        </p>
        <p className="text-lg font-medium text-foreground mb-6">
          {appName || "this app"}
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleQuitApp}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Quit App
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleEmergencyUse}
            disabled={isLoading}
          >
            <Clock className="w-4 h-4 mr-2" />
            Use for 10 min (Emergency)
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground mt-4">
          Emergency use grants temporary access. The limit will be enforced
          again after 10 minutes.
        </p>
      </div>
    </div>
  );
}
