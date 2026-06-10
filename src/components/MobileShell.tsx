import type { ReactNode } from "react";

/**
 * MobileShell — fixed mobile viewport container that emulates a native app frame.
 * On larger screens it centers in a phone-sized window; on mobile it fills the screen.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/10 via-background to-cta/5 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen md:min-h-[860px] md:my-6 md:rounded-[2.5rem] md:shadow-2xl md:ring-1 md:ring-border bg-background overflow-hidden flex flex-col no-tap-highlight">
        {children}
      </div>
    </div>
  );
}
