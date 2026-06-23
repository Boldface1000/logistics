/**
 * Notification infrastructure — isomorphic wrapper.
 *
 * Production path: Firebase Cloud Messaging via HTTP v1 API.
 * Requires server env: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY.
 * When all three are present, sendPush() POSTs to FCM.
 *
 * Development / missing-creds path: silent fallback to console.log so
 * the critical app path never breaks while credentials are being provisioned.
 *
 * This module is browser-safe (no top-level FCM imports). The actual FCM
 * call lives inside a dynamic import gated by typeof process !== "undefined",
 * so it never ends up in the client bundle.
 */

export type NotificationKind =
  | "signup.new"         // super-admin alert — new user awaiting approval
  | "order.placed"       // admin alert — customer placed a new delivery order
  | "order.assigned"     // rider alert — order assigned to them by admin
  | "order.accepted"     // admin alert — rider accepted the dispatched order
  | "order.delivered"    // admin + customer alert — delivery marked successful
  | "payment.confirmed"; // rider alert — super-admin approved payment transfer

export interface NotificationPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Per-user targeting (uses push_subscriptions tokens) */
  userIds?: string[];
  /** Topic targeting (e.g. "admin-alerts") */
  topic?: string;
}

// ─── Admin topic constant ────────────────────────────────────────────────────
/**
 * All admin devices subscribe to this FCM topic so a single sendPush() call
 * reaches every logged-in admin without enumerating individual tokens.
 *
 * Subscribe on the client with:
 *   messaging.subscribeToTopic(token, ADMIN_FCM_TOPIC)
 * or via the FCM HTTP v1 batch-subscribe endpoint.
 */
export const ADMIN_FCM_TOPIC = "admin-alerts";

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * Fire a push notification to ALL admin devices (via the shared topic).
 * Safe to call from any server function / API route.
 */
export async function notifyAdmin(
  kind: NotificationKind,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  return sendPush({ kind, title, body, data, topic: ADMIN_FCM_TOPIC });
}

/**
 * Emit the four key order-lifecycle admin alerts.
 */
export const orderNotifications = {
  placed: (orderId: string, description: string) =>
    notifyAdmin(
      "order.placed",
      "📦 New Delivery Order",
      `Order ${orderId}: ${description} is awaiting dispatch.`,
      { orderId, event: "placed" },
    ),

  assigned: (orderId: string, riderName: string) =>
    notifyAdmin(
      "order.assigned",
      "🚴 Order Assigned",
      `Order ${orderId} has been dispatched to ${riderName}.`,
      { orderId, event: "assigned", riderName },
    ),

  accepted: (orderId: string, riderName: string) =>
    notifyAdmin(
      "order.accepted",
      "✅ Rider Accepted Order",
      `${riderName} accepted order ${orderId} and is en route.`,
      { orderId, event: "accepted", riderName },
    ),

  delivered: (orderId: string) =>
    notifyAdmin(
      "order.delivered",
      "🎉 Delivery Successful",
      `Order ${orderId} has been delivered successfully.`,
      { orderId, event: "delivered" },
    ),
};

// ─── Core FCM infrastructure ─────────────────────────────────────────────────

interface FcmCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function readCreds(): FcmCreds | null {
  if (typeof process === "undefined" || !process.env) return null;
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/**
 * Fetch an OAuth2 access token for the FCM service account.
 * Uses Web Crypto (RS256) — Worker-compatible, no Node-only deps.
 */
async function getAccessToken(creds: FcmCreds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: creds.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (s: string) =>
    btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(claim))}`;

  const pem = creds.privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const sig = b64(String.fromCharCode(...new Uint8Array(sigBuf)));
  const jwt = `${unsigned}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function postFcm(
  creds: FcmCreds,
  accessToken: string,
  target: { token?: string; topic?: string },
  payload: NotificationPayload,
) {
  const message: Record<string, unknown> = {
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  };
  if (target.token) message.token = target.token;
  if (target.topic) message.topic = target.topic;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM send failed (${res.status}): ${text}`);
  }
}

/**
 * Send a push. Safe to call from anywhere on the server.
 * Returns { delivered: number } so callers can log without throwing.
 * Never throws on missing credentials — falls back to console.log/warnings.
 */
export async function sendPush(
  payload: NotificationPayload,
): Promise<{ delivered: number; mode: "fcm" | "log" | "disabled" }> {
  const creds = readCreds();
  const isProd = import.meta.env.PROD;

  if (!creds) {
    if (isProd) {
      return { delivered: 0, mode: "disabled" };
    }
    console.log("[notifications:log]", payload.kind, payload.title, payload.body, {
      userIds: payload.userIds?.length ?? 0,
      topic: payload.topic ?? null,
    });
    return { delivered: 0, mode: "log" };
  }

  try {
    const accessToken = await getAccessToken(creds);
    let delivered = 0;

    if (payload.topic) {
      await postFcm(creds, accessToken, { topic: payload.topic }, payload);
      delivered += 1;
    }

    if (payload.userIds?.length) {
      const { supabaseAdmin } = await import("@/integrations/client.server");
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("token")
        .in("user_id", payload.userIds);
      for (const row of subs ?? []) {
        try {
          await postFcm(creds, accessToken, { token: row.token }, payload);
          delivered += 1;
        } catch (err) {
          if (isProd) {
            console.warn("[notifications] Transmission dropped for targeted subscription token.");
          } else {
            console.warn("[notifications] Token send failed:", err);
          }
        }
      }
    }

    return { delivered, mode: "fcm" };
  } catch (err) {
    if (isProd) {
      console.error("[notifications] FCM execution transmission infrastructure exception.");
      console.warn("[notifications:fallback] Payload suppressed. Event Metadata:", {
        kind: payload.kind,
        titleLength: payload.title?.length ?? 0,
        bodyLength: payload.body?.length ?? 0,
        userIdsCount: payload.userIds?.length ?? 0,
        topic: payload.topic ?? null,
      });
    } else {
      console.error("[notifications] FCM failure, falling back to log:", err);
      console.log("[notifications:log:fallback]", payload);
    }
    return { delivered: 0, mode: "log" };
  }
}
