/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "easyblue-install-banner-dismissed-at";
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // re-surface after 3 days

function isIOSDevice() {
  const ua = window.navigator.userAgent;
  const isIOSUA = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as Mac, so also check for touch support on "Mac"
  const isIPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}

function isStandaloneMode() {
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mq || iosStandalone);
}

/**
 * Persistent install banner shown on both iOS and Android until the app
 * is installed or the user dismisses it (re-surfaces after a cooldown).
 */
export function InstallAppBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
    setInstalled(isStandaloneMode());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }

    const lastDismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (lastDismissed && Date.now() - lastDismissed < DISMISS_COOLDOWN_MS) {
      setDismissed(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const onInstalled = () => {
      setInstalled(true);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      localStorage.removeItem(DISMISS_KEY);
    }
    setInstallPrompt(null);
  };

  if (installed || dismissed) return null;

  return (
    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 relative">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
        className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install EasyBlue</p>
          {isIOS ? (
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              Tap the Share icon <Share className="h-3 w-3 inline -mt-0.5" /> in Safari, then choose
              "Add to Home Screen."
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              Add EasyBlue to your home screen for faster access.
            </p>
          )}
        </div>
      </div>

      {!isIOS && (
        <button
          onClick={handleInstall}
          disabled={!installPrompt}
          className="w-full mt-3 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {installPrompt ? "Install App" : "Preparing install…"}
        </button>
      )}
    </div>
  );
}
