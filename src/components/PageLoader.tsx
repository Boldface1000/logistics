import { useEffect, useState } from "react";
import { Truck } from "lucide-react";

/** Full-frame branded loading screen. Use during route transitions / data loads. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
          <Truck className="h-8 w-8 text-primary-foreground" />
        </div>
        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-cta ring-4 ring-background animate-ping" />
      </div>
      <p className="mt-5 text-sm font-bold text-foreground tracking-wide">EasyBlue</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
        {label}…
      </p>
      <div className="mt-4 h-1 w-32 rounded-full bg-secondary overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[loadbar_1.2s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
    </div>
  );
}

/** Hook that returns true for `ms` after mount — used to show <PageLoader/> briefly. */
export function useArtificialLoading(ms = 500): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
