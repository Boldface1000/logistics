import type { ReactNode } from "react";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full bg-gradient-to-br from-primary/10 via-background to-cta/5 flex items-stretch justify-center overflow-hidden">
      <div className="relative w-full max-w-[440px] h-full md:h-[860px] md:my-auto md:rounded-[2.5rem] md:shadow-2xl md:ring-1 md:ring-border bg-background flex flex-col no-tap-highlight overflow-hidden">
        {children}
      </div>
    </div>
  );
}
