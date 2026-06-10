// Lightweight client-side pending signups store (simulates DB) for
// approval flow between signup -> admin profile review.

export type PendingRole = "partner" | "rider";

export interface PendingSignup {
  id: string;
  role: PendingRole;
  firstName: string;
  lastName: string;
  email: string;
  // Partner-only
  businessName?: string;
  businessPhone?: string;
  // Rider-only
  hasLicense?: boolean;
  isExperienced?: boolean;
  nin?: string;
  ninPhoto?: string | null;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
}

const KEY = "easyblue.pendingSignups";

function read(): PendingSignup[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(list: PendingSignup[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("easyblue:pending-changed"));
}

export const pendingStore = {
  list: read,
  pending: () => read().filter((p) => p.status === "pending"),
  add(entry: Omit<PendingSignup, "id" | "createdAt" | "status">) {
    const next: PendingSignup = {
      ...entry,
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      status: "pending",
    };
    write([next, ...read()]);
    return next;
  },
  setStatus(id: string, status: PendingSignup["status"]) {
    write(read().map((p) => (p.id === id ? { ...p, status } : p)));
  },
  subscribe(cb: () => void) {
    const fn = () => cb();
    window.addEventListener("easyblue:pending-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("easyblue:pending-changed", fn);
      window.removeEventListener("storage", fn);
    };
  },
};
