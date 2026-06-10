// Vendor stock store. Stock entries are created/edited/deleted only by the
// Product Admin (after the vendor has been approved by the Super Admin).
// Each vendor sees their own stock list in real-time (read-only on their side).

export interface StockItem {
  id: string;
  vendorEmail: string;       // owner vendor (approved partner email)
  vendorName: string;
  productType: string;
  imageDataUrl?: string;
  quantity: number;
  receivedAt: string;        // ISO date (yyyy-mm-dd)
  updatedAt: number;
}

const KEY = "easyblue.stocks";

function read(): StockItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function write(list: StockItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("easyblue:stocks-changed"));
}

export const stocksStore = {
  list: read,
  byVendor: (email: string) =>
    read().filter((s) => s.vendorEmail.toLowerCase() === email.toLowerCase())
      .sort((a, b) => b.updatedAt - a.updatedAt),
  add(entry: Omit<StockItem, "id" | "updatedAt">) {
    const next: StockItem = {
      ...entry,
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      updatedAt: Date.now(),
    };
    write([next, ...read()]);
    return next;
  },
  update(id: string, patch: Partial<Omit<StockItem, "id" | "vendorEmail">>) {
    write(read().map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
    ));
  },
  remove(id: string) {
    write(read().filter((s) => s.id !== id));
  },
  subscribe(cb: () => void) {
    const fn = () => cb();
    window.addEventListener("easyblue:stocks-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("easyblue:stocks-changed", fn);
      window.removeEventListener("storage", fn);
    };
  },
};
