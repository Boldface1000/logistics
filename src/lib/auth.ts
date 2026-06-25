import { supabase } from "@/integrations/client";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  approval: string;
  profilePhotoUrl?: string;
}

export const auth = {
  /**
   * Retrieves the current authenticated session cleanly from storage.
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Mask session lookup exceptions from flooding the logging aggregators
      if (import.meta.env.DEV) {
        console.error("Auth session sync failure:", error.message);
      }
      return null;
    }
    return data.session;
  },

  /**
   * Retrieves the current authenticated user with profile information.
   */
  async current(): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        if (import.meta.env.DEV) {
          console.error("Failed to get current user:", error?.message);
        }
        return null;
      }

      const user = data.user;

      // Fetch user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError && import.meta.env.DEV) {
        console.error("Failed to fetch user profile:", profileError.message);
      }

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id);

      if (rolesError && import.meta.env.DEV) {
        console.error("Failed to fetch user roles:", rolesError.message);
      }

      const userRoles = roles?.map((r) => r.role) ?? [];
      const primaryRole = userRoles[0] || "customer";

      return {
        id: user.id,
        email: profile?.email ?? user.email ?? "",
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        role: primaryRole,
        approval: profile?.approval ?? "pending",
        profilePhotoUrl: profile?.profile_photo_url ?? undefined,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching current user:", error);
      }
      return null;
    }
  },

  /**
   * Drops active tokens and cleans up local persistence items.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error && import.meta.env.DEV) {
      console.error("Signout sequence interrupt:", error.message);
    }
    window.location.href = "/login";
  },

  /**
   * Initiates a password reset flow by sending a reset email.
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message || "Failed to send password reset email");
    }
  },

  /**
   * Updates the user's password using a reset token.
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message || "Failed to update password");
    }
  },

  /**
   * Verifies the current user's email.
   */
  async verifyEmail(token: string, type: "email_change" | "signup") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type,
    });

    if (error) {
      throw new Error(error.message || "Failed to verify email");
    }
  },
};
