import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function DarkModeToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const { theme, toggle } = useTheme();
  const dim = size === "md" ? "h-11 w-11" : "h-9 w-9";
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`${dim} rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition shadow-sm border border-border`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
