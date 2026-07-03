import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Store,
  Sliders,
  Bike,
  Zap,
  Wallet,
  MapPin,
  Download,
  ChevronRight,
  Truck,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { supabase } from "@/integrations/client"; // FIXED: Realigned with project client import path

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyBlue Logistics — Ship Globally, Deliver Locally" },
      { name: "description", content: "Dispatch at Your fingertips." },
    ],
  }),
  component: WelcomePage,
});

interface Slide {
  title: string;
  description: string;
  icons: React.ReactNode;
  accent: string;
}

const slides: Slide[] = [
  {
    title: "Marketplace",
    description: "Browse high-end appliances, bags, and electronics from trusted vendors.",
    icons: (
      <div className="flex gap-3">
        <Users className="h-10 w-10" />
        <Store className="h-10 w-10" />
      </div>
    ),
    accent: "from-primary to-primary-glow",
  },
  {
    title: "Business Hub",
    description:
      "Real-time control panel, stock management, subject to admin operational approval.",
    icons: <Sliders className="h-12 w-12" />,
    accent: "from-primary-glow to-primary",
  },
  {
    title: "Riders Network",
    description: "Sign up, accept local dispatches, and track earnings on your schedule.",
    icons: <Bike className="h-12 w-12" />,
    accent: "from-cta to-cta/70",
  },
  {
    title: "Lightning Shipping & Instant Pay",
    description: "Rapid local delivery.",
    icons: (
      <div className="flex gap-3">
        <Zap className="h-10 w-10" />
        <Wallet className="h-10 w-10" />
      </div>
    ),
    accent: "from-cta to-primary",
  },
  {
    title: "Realtime Tracking",
    description: "Live delivery streams from sender to doorstep with offline tracking.",
    icons: <MapPin className="h-12 w-12" />,
    accent: "from-primary to-cta",
  },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function WelcomePage() {
  const [idx, setIdx] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const navigate = useNavigate();
  

  // 1. Session Interceptor: Bounce authenticated users straight into the workspace
  useEffect(() => {
    async function checkActiveSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        navigate({ to: "/dashboard" });
      }
    }
    checkActiveSession();
  }, [navigate]);

  // Carousel timer
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, []);

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt as BeforeInstallPromptEvent;
    prompt.prompt();
    await prompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <MobileShell>
      {/* Header */}
      <header className="safe-top px-5 pb-3 flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground">EasyBlue</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5 uppercase tracking-widest">
              Logistics
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">
          {installPrompt && (
            <button
              onClick={handleInstall}
              aria-label="Install app"
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 text-primary text-xs font-semibold border border-primary/20 active:scale-95 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
          )}
          <DarkModeToggle />
        </div>
      </header>

      <div className="px-5 pb-4">
        <p className="text-sm text-muted-foreground leading-snug">
          International shipping merged with local dispatch.
          <br />
          <span className="text-foreground font-medium">
            Partner discounts, always-on tracking.
          </span>
        </p>
      </div>

      {/* Carousel */}
      <main className="flex-1 px-5 overflow-hidden flex flex-col">
        <div className="relative flex-1 rounded-3xl overflow-hidden bg-card border border-border shadow-sm">
          {slides.map((s, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <div
                className={`h-1/2 bg-gradient-to-br ${s.accent} text-primary-foreground flex items-center justify-center`}
              >
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-50 bg-white/30 rounded-full" />
                  <div className="relative">{s.icons}</div>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-2">
                <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      </main>

      {/* Footer CTAs */}
      <footer className="safe-bottom px-5 pt-2 flex flex-col gap-2.5 border-t border-border bg-card">
        <Link
          to="/signup"
          className="w-full h-12 py-3.5 rounded-2xl bg-cta text-cta-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-cta/30"
        >
          Get Started — Sign Up <ChevronRight className="h-5 w-5" />
        </Link>
        <Link
          to="/login"
          className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition border border-border"
        >
          Log into Existing Account
        </Link>
      </footer>
    </MobileShell>
  );
}
