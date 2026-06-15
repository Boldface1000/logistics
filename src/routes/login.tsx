import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — EasyBlue" }] }),
  beforeLoad: async () => {
    throw redirect({ to: "/auth" });
  },
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.signIn(email, password);
    if (!user) {
      toast.error("Invalid credentials", {
        description: "Check your email and password and try again.",
      });
      return;
    }
    toast.success(`Welcome back, ${user.firstName}`);
    navigate({ to: auth.homeFor(user) });
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <Link
          to="/"
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Sign in</h1>
          <p className="text-xs text-muted-foreground">Welcome back to EasyBlue</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 pt-6 scrollbar-hide">
        <h2 className="text-2xl font-bold text-foreground mb-1">Hello again</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in with your registered email.</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full h-12 pl-11 pr-12 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Remember me</span>
            </label>
            <button type="button" className="text-sm font-semibold text-primary">
              Forgot?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition shadow-lg shadow-primary/20"
          >
            Sign In
          </button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed mt-1">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary font-medium">
              Terms of Use
            </Link>{" "}
            &{" "}
            <Link to="/privacy" className="text-primary font-medium">
              Privacy & Security
            </Link>
            .
          </p>

          <p className="text-sm text-muted-foreground text-center mt-2">
            New here?{" "}
            <Link to="/signup" className="text-primary font-semibold">
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </MobileShell>
  );
}
