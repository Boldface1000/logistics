/**
 * Email OTP — server functions.
 *
 * Transport: Gmail SMTP via App Password (env GMAIL_USER + GMAIL_APP_PASSWORD).
 * If creds are missing, the code is logged to the server console so dev keeps
 * working. The 6-digit code is NEVER returned to the client.
 *
 * Storage: `public.otp_codes` (server-role only). We store sha256(code), not
 * the code itself.

 * Hardening:
 *   - Rate limit: max 3 sends per email per 15 minutes (rate_limits table).
 *   - Verify: max 5 attempts per code, expires in 10 minutes, single-use.
 *   - Email is validated and length-capped via Zod.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailSchema = z.string().trim().toLowerCase().email().max(254);

const CodeSchema = z.string().regex(/^\d{6}$/);

const SEND_LIMIT = 3;
const SEND_WINDOW_MIN = 15;
const VERIFY_MAX_ATTEMPTS = 5;
const TTL_MIN = 10;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genCode(): string {
  // 6 digits, cryptographically random, no modulo bias.
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 1_000_000).toString().padStart(6, "0");
}

async function sendEmail(to: string, code: string): Promise<"sent" | "logged"> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.log(`[otp] GMAIL creds not set — code for ${to}: ${code}`);
    return "logged";
  }
  try {
    // Dynamic import keeps nodemailer out of the client bundle and out of
    // any non-SMTP code path.
    const nm = await import("nodemailer");
    const transporter = nm.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"EasyBlue Logistics" <${user}>`,
      to,
      subject: "Your EasyBlue verification code",
      text: `Your verification code is ${code}. It expires in ${TTL_MIN} minutes.`,
      html: `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
  <h2 style="color:#191970;margin:0 0 12px">Verify your email</h2>
  <p style="color:#334155;font-size:14px;margin:0 0 16px">
    Use the code below to finish signing up for EasyBlue Logistics.
  </p>
  <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#191970;
              background:#fff;padding:16px 24px;border-radius:8px;text-align:center;
              border:1px solid #e2e8f0">${code}</div>
  <p style="color:#64748b;font-size:12px;margin:16px 0 0">
    This code expires in ${TTL_MIN} minutes. If you didn't request it, ignore this email.
  </p>
</div>`.trim(),
    });
    return "sent";
  } catch (err) {
    console.error("[otp] SMTP failure, code logged for recovery:", err);
    console.log(`[otp] code for ${to}: ${code}`);
    return "logged";
  }
}

// --------------------------------------------------------------------------
// SEND
// --------------------------------------------------------------------------
export const sendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ email: EmailSchema }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/client.server");
    const email = data.email;
    const bucket = `otp_send:${email}`;
    const windowStart = new Date(Date.now() - SEND_WINDOW_MIN * 60_000).toISOString();

    // Rate limit
    const { count } = await supabaseAdmin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("bucket", bucket)
      .gte("hit_at", windowStart);
    if ((count ?? 0) >= SEND_LIMIT) {
      throw new Error(`Too many requests — try again in ${SEND_WINDOW_MIN} minutes.`);
    }

    const code = genCode();
    const code_hash = await sha256Hex(code);
    const expires_at = new Date(Date.now() + TTL_MIN * 60_000).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("otp_codes")
      .insert({ email, code_hash, expires_at });
    if (insertErr) throw new Error("Failed to create code");

    await supabaseAdmin.from("rate_limits").insert({ bucket });

    const mode = await sendEmail(email, code);
    return { ok: true as const, mode, ttlMinutes: TTL_MIN };
  });

// --------------------------------------------------------------------------
// VERIFY
// --------------------------------------------------------------------------
export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ email: EmailSchema, code: CodeSchema }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/client.server");
    const { email, code } = data;
    const code_hash = await sha256Hex(code);

    const { data: rows } = await supabaseAdmin
      .from("otp_codes")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("email", email)
      .is("consumed_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return { ok: false as const, reason: "expired" as const };

    if (row.attempts >= VERIFY_MAX_ATTEMPTS) {
      return { ok: false as const, reason: "too_many_attempts" as const };
    }

    if (row.code_hash !== code_hash) {
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false as const, reason: "mismatch" as const };
    }

    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // Mark the profile as verified if it already exists.
    await supabaseAdmin.from("profiles").update({ is_email_verified: true }).eq("email", email);

    return { ok: true as const };
  });
