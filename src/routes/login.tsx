import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/login")({
  // SSR off: beforeLoad reads the browser-persisted Supabase session (localStorage),
  // which the server can't see. Rendering this route on the server caused the
  // server's "no session" markup to diverge from the client's "session exists,
  // redirecting" pass mid-hydration -> hydration mismatch + setState-before-mount warning.
  ssr: false,
  head: () => ({ meta: [{ title: "Sign In — EasyBlue" }] }),
  beforeLoad: async () => {
    // Safely check session context before rendering route
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If the user is already authenticated, bypass login and move them forward
    if (session) {
      const { data: profile } = await supabase
        .from("users")
        .select("role, approval")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        if (profile.approval === "pending") return;
        if (profile.role === "admin") throw redirect({ to: "/admin" });
        if (profile.role === "vendor") throw redirect({ to: "/vendor-dashboard" });
        if (profile.role === "rider") throw redirect({ to: "/rider-dashboard" });
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Missing credentials", {
        description: "Please populate your email and password fields.",
      });
      return;
    }

    try {
      setLoading(true);

      // Sign in via production Supabase engine
      // FIX: persistSession is not a valid signInWithPassword option in supabase-js v2.
      // Session persistence is configured at client creation level, not per sign-in call.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!user) throw new Error("Authentication failed. No user found.");

      // Fetch verified user platform roles matching schema triggers
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("first_name, role, approval")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Handle cases where database record hasn't been provisioned yet
      if (!profile) {
        toast.error("Profile Not Found", {
          description:
            "Your authentication is valid, but your user record is missing. Please contact support.",
        });
        await supabase.auth.signOut();
        return;
      }

      // Handle account approval flows
      if (profile.approval === "pending") {
        toast.warning("Account Pending Approval", {
          description: "Your access is currently under validation by system administrators.",
        });
        await supabase.auth.signOut();
        return;
      }

      if (profile.approval === "rejected") {
        toast.error("Access Denied", {
          description: "Your registration request has been rejected.",
        });
        await supabase.auth.signOut();
        return;
      }

      toast.success(`Welcome back, ${profile.first_name || "User"}`);

      localStorage.setItem("remember_me", remember ? "true" : "false");

      navigate({ to: "/login" });
      // Routing distribution matrix
      if (profile.role === "admin") {
        navigate({ to: "/admin" });
      } else if (profile.role === "vendor") {
        navigate({ to: "/vendor-dashboard" });
      } else if (profile.role === "rider") {
        navigate({ to: "/rider-dashboard" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error("Invalid credentials", {
        description: err instanceof Error ? err.message : "Check your details and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border bg-background">
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

      <main className="flex-1 overflow-y-auto px-5 pb-6 pt-6 scrollbar-hide bg-background">
        <h2 className="text-2xl font-bold text-foreground mb-1">Hello again</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in with your registered email.</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full h-12 pl-11 pr-12 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
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
            <button
              type="button"
              onClick={() => navigate({ to: "/forgot-password" })}
              className="text-sm font-semibold text-primary"
            >
              Forgot?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
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
