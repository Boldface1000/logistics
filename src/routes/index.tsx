import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Store, Sliders, Bike, Zap, Wallet, MapPin, ChevronRight, Truck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { DarkModeToggle } from "@/components/DarkModeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyBlue Logistics — Ship Globally, Deliver Locally" },
      { name: "description", content: "International shipping merged with local dispatch with partner discounts." },
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
    title: "Customers & Marketplace",
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
    title: "Vendors Hub",
    description: "Control panel, stock management, and exclusive partner pricing inventory.",
    icons: <Sliders className="h-12 w-12" />,
    accent: "from-primary-glow to-primary",
  },
  {
    title: "Riders Network",
    description: "Sign up, accept dispatches, and earn locally on your schedule.",
    icons: <Bike className="h-12 w-12" />,
    accent: "from-cta to-cta/70",
  },
  {
    title: "Lightning Shipping & Instant Pay",
    description: "Rapid local legs with secure escrow and instant rider payouts.",
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
    description: "Live delivery streams from sender to doorstep with route polylines.",
    icons: <MapPin className="h-12 w-12" />,
    accent: "from-primary to-cta",
  },
];

function WelcomePage() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <MobileShell>
      {/* Header */}
      <header className="safe-top px-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground">EasyBlue</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5 uppercase tracking-widest">Logistics</p>
          </div>
        </div>
        <DarkModeToggle />
      </header>

      <div className="px-5 pb-4">
        <p className="text-sm text-muted-foreground leading-snug">
          International shipping merged with local dispatch.<br />
          <span className="text-foreground font-medium">Partner discounts, always-on tracking.</span>
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
              <div className={`h-1/2 bg-gradient-to-br ${s.accent} text-primary-foreground flex items-center justify-center`}>
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
          className="w-full h-13 py-3.5 rounded-2xl bg-cta text-cta-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-cta/30"
        >
          Get Started — Sign Up <ChevronRight className="h-5 w-5" />
        </Link>
        <Link
          to="/login"
          className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition border border-border"
        >
          Sign In to Account
        </Link>
      </footer>
    </MobileShell>
  );
}
