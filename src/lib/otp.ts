// Centralized OTP logic for email verification — shared by customer, partner, rider.
// Generates a 6-digit code per email, "sends" it (mock — shown via toast & console),
// and verifies it. Persists to localStorage so it survives navigation/refresh.
import { toast } from "sonner";

const KEY = "easyblue.otp";
const TTL_MS = 60_000;

interface OtpRecord {
  email: string;
  code: string;
  sentAt: number;
  expiresAt: number;
}

function read(): Record<string, OtpRecord> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}
function write(map: Record<string, OtpRecord>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const otpService = {
  /** Issue & "send" a fresh 6-digit code to the email. Returns the code (for dev/testing). */
  send(email: string): OtpRecord {
    const code = genCode();
    const now = Date.now();
    const rec: OtpRecord = { email, code, sentAt: now, expiresAt: now + TTL_MS };
    const map = read();
    map[email.toLowerCase()] = rec;
    write(map);

    // Mock email send — surface code via toast so testers can use it.
    toast.success(`OTP sent to ${email}`, {
      description: `Dev code: ${code} (expires in 60s)`,
      duration: 8000,
    });
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info(`[EasyBlue OTP] ${email} → ${code}`);
    }
    return rec;
  },

  /** Verify a 6-digit OTP for the email. Returns true on success. */
  verify(email: string, code: string): boolean {
    const map = read();
    const rec = map[email.toLowerCase()];
    if (!rec) return false;
    if (Date.now() > rec.expiresAt) return false;
    if (rec.code !== code) return false;
    delete map[email.toLowerCase()];
    write(map);
    return true;
  },

  /** Peek (dev helper) — returns current code if any. */
  peek(email: string): string | null {
    return read()[email.toLowerCase()]?.code ?? null;
  },
};
