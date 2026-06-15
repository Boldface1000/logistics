import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/client";
import { sendSignupOtp, verifySignupOtp } from "@/lib/otp.functions";
import { useServerFn } from "@tanstack/react-start";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in — EasyBlue" }] }),
  component: AuthPage,
});

// ---------------------------------------------------------------------------
// Validation — strict zod schemas neutralize single-quote / overflow attacks.
// ---------------------------------------------------------------------------
const EmailSchema = z.string().trim().toLowerCase().email().max(254);
const PasswordSchema = z.string().min(8).max(128);
const NameSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[\p{L}\p{M}\s'.-]+$/u, "Letters and spaces only");
const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{7,15}$/, "Use international format e.g. +2348012345678");

type Mode = "signin" | "signup" | "verify";

function AuthPage() {
  const navigate = useNavigate();
  const sendOtp = useServerFn(sendSignupOtp);
  const verifyOtp = useServerFn(verifySignupOtp);

  const [mode, setMode] = useState<Mode>("signin");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    // Brief skeleton on first paint while we resolve session state.
    const t = setTimeout(() => setBootstrapping(false), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const parsed = z
        .object({ email: EmailSchema, password: PasswordSchema })
        .parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword(parsed);
      if (error) throw error;
      toast.success("Welcome back");
      // Role-based redirect using Supabase roles
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        navigate({ to: "/dashboard" });
        return;
      }
      const [rolesRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userData.user.id),
      ]);
      const roles = (rolesRes.data ?? []).map((r) => r.role as string);

      // Admins
      if (roles.includes("admin") || roles.includes("super_admin")) {
        navigate({ to: "/admin" });
        return;
      }

      // Riders / Vendors
      if (roles.includes("rider")) {
        navigate({ to: "/rider-dashboard" });
        return;
      }
      if (roles.includes("vendor")) {
        navigate({ to: "/vendor-dashboard" });
        return;
      }

      // Customers fallback
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const parsed = z
        .object({
          email: EmailSchema,
          password: PasswordSchema,
          firstName: NameSchema,
          lastName: NameSchema,
          phone: PhoneSchema,
        })
        .parse({ email, password, firstName, lastName, phone });

      // Send OTP first; account creation happens after verification.
      const res = await sendOtp({ data: { email: parsed.email } });
      toast.success(
        res.mode === "sent"
          ? "Code sent to your email"
          : "Code generated (check server logs in dev)",
      );
      setMode("verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const codeParsed = z.object({ code: z.string().regex(/^\d{6}$/) }).parse({ code: otp });
      const result = await verifyOtp({ data: { email, code: codeParsed.code } });
      if (!result.ok) {
        toast.error(
          result.reason === "expired"
            ? "Code expired — request a new one"
            : result.reason === "too_many_attempts"
              ? "Too many attempts — request a new code"
              : "Wrong code",
        );
        return;
      }
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: firstName, last_name: lastName, phone },
        },
      });
      if (signUpErr) throw signUpErr;
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setPending(false);
    }
  }

  if (bootstrapping) {
    return (
      <MobileShell>
        <div className="flex-1 px-6 pt-20 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto px-6 pt-14 pb-10">
        <header className="mb-8">
          {mode === "verify" && (
            <button
              onClick={() => setMode("signup")}
              className="mb-3 inline-flex items-center text-sm text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </button>
          )}
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create account"
                : "Verify email"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "verify"
              ? `We sent a 6-digit code to ${email}`
              : "EasyBlue Logistics — fast local dispatch."}
          </p>
        </header>

        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <TextField
              icon={<Mail className="h-4 w-4" />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <TextField
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            <SubmitButton pending={pending}>Sign in</SubmitButton>
            <p className="text-center text-sm text-muted-foreground pt-2">
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary font-semibold"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <TextField
              icon={<UserIcon className="h-4 w-4" />}
              placeholder="First name"
              value={firstName}
              onChange={setFirstName}
              maxLength={60}
              autoComplete="given-name"
            />
            <TextField
              icon={<UserIcon className="h-4 w-4" />}
              placeholder="Last name"
              value={lastName}
              onChange={setLastName}
              maxLength={60}
              autoComplete="family-name"
            />
            <TextField
              icon={<Mail className="h-4 w-4" />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <TextField
              placeholder="Phone (+234…)"
              value={phone}
              onChange={setPhone}
              maxLength={16}
              autoComplete="tel"
              inputMode="tel"
            />
            <TextField
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Password (8+ chars)"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <SubmitButton pending={pending}>Send verification code</SubmitButton>
            <p className="text-center text-sm text-muted-foreground pt-2">
              Have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-primary font-semibold"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerifyAndCreate} className="space-y-4">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              className="w-full h-14 text-center text-2xl tracking-[8px] font-bold rounded-2xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <SubmitButton pending={pending} disabled={otp.length !== 6}>
              Verify &amp; create account
            </SubmitButton>
            <button
              type="button"
              onClick={async () => {
                setPending(true);
                try {
                  const res = await sendOtp({ data: { email } });
                  toast.success(res.mode === "sent" ? "New code sent" : "Code regenerated");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not resend");
                } finally {
                  setPending(false);
                }
              }}
              className="w-full text-sm text-muted-foreground"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </MobileShell>
  );
}

// ---------------------------------------------------------------------------

function TextField({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  maxLength,
  autoComplete,
  inputMode,
}: {
  icon?: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`w-full h-12 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary text-sm
                    ${icon ? "pl-11" : "pl-4"} pr-4`}
      />
    </div>
  );
}

function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm
                 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}
