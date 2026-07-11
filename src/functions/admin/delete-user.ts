import { createClient } from "@supabase/supabase-js";

export const onRequestPost = async (context: {
  request: Request;
  env: { VITE_SUPABASE_URL: string; VITE_SUPABASE_SERVICE_ROLE_KEY: string };
}) => {
  const { userId } = await context.request.json() as { userId: string };

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    context.env.VITE_SUPABASE_URL,
    context.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) return Response.json({ error: authError.message }, { status: 500 });

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);
  if (dbError) return Response.json({ error: dbError.message }, { status: 500 });

  return Response.json({ success: true });
};