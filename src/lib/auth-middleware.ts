import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/client";

/**
 * Global protection middleware to ensure a valid session exists.
 */
export const requireAuthMiddleware = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    throw redirect({ to: "/login" });
  }
  return { session: data.session };
};

/**
 * Role middleware specifically tailored for the Rider operational grid.
 */
export const requireRiderMiddleware = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) throw redirect({ to: "/login" });

  // Query verification mapping directly
  const { data: rider } = await supabase
    .from("riders")
    .select("approval")
    .eq("user_id", data.session.user.id)
    .maybeSingle();

  if (!rider || rider.approval !== "approved") {
    throw redirect({
      to: "/pending-approval",
      search: { role: "rider" },
    });
  }

  return { session: data.session, rider };
};
