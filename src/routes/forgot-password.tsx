/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — EasyBlue Logistics" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Password Reset Email Sent", {
        description: "Check your email for instructions to reset your password.",
      });
    } catch (err: any) {
      toast.error("Failed to Send Reset Email", {
        description: err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => navigate({ to: "/login" })}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Reset Password</h1>
          <p className="text-xs text-muted-foreground">We'll help you recover your account</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-8 scrollbar-hide flex flex-col items-center justify-center">
        {!isSubmitted ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Forgot your password?
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="w-full max-w-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      disabled={isLoading}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <button
                  onClick={() => navigate({ to: "/login" })}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
              We've sent a password reset link to <span className="font-semibold">{email}</span>.
              Click the link in your email to reset your password.
            </p>

            <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <p className="text-xs text-blue-900">
                <strong>Tip:</strong> Check your spam or junk folder if you don't see the email
                within a few minutes.
              </p>
            </div>

            <button
              onClick={() => navigate({ to: "/login" })}
              className="w-full max-w-sm py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition shadow-lg shadow-primary/20"
            >
              Back to Sign In
            </button>
          </>
        )}
      </main>
    </MobileShell>
  );
}
