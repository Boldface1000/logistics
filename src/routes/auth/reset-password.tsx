import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — EasyBlue Logistics" }] }),
  component: ResetPasswordPage,
});

interface SearchParams {
  token?: string;
  type?: "recovery" | "email_change";
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/reset-password" }) as SearchParams;
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Verify the reset token on mount
    const verifyToken = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          // Token might be invalid or expired
          setIsValid(false);
          toast.error("Invalid or Expired Link", {
            description: "This password reset link is invalid or has expired. Please request a new one.",
          });
          setTimeout(() => navigate({ to: "/forgot-password" }), 3000);
        } else {
          setIsValid(true);
        }
      } catch (err) {
        setIsValid(false);
        toast.error("Verification Failed", {
          description: "Unable to verify the reset link. Please try again.",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password Reset Successful", {
        description: "Your password has been updated. You can now sign in with your new password.",
      });

      // Redirect to login after a short delay
      setTimeout(() => navigate({ to: "/login" }), 2000);
    } catch (err: any) {
      toast.error("Failed to Reset Password", {
        description: err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <MobileShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying reset link...</p>
          </div>
        </main>
      </MobileShell>
    );
  }

  if (!isValid) {
    return (
      <MobileShell>
        <main className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is invalid or has expired.
            </p>
            <button
              onClick={() => navigate({ to: "/forgot-password" })}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Request New Link
            </button>
          </div>
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto px-5 py-8 scrollbar-hide flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Create New Password
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Enter a strong password to secure your account.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* New Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  disabled={isLoading}
                  className="w-full h-12 pl-4 pr-12 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                  className="w-full h-12 pl-4 pr-12 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
              <p className="font-semibold mb-2">Password requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>At least 6 characters long</li>
                <li>Mix of uppercase and lowercase letters (recommended)</li>
                <li>Include numbers and special characters (recommended)</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
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
        </div>
      </main>
    </MobileShell>
  );
}
