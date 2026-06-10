// Client-side orders simulation. Drives the customer → records-admin → rider flow.

export type OrderType = "marketplace" | "waybill" | "standard";
export type OrderStatus =
  | "pending"      // placed, awaiting records admin
  | "assigned"     // records admin assigned a rider, awaiting rider response
  | "accepted"     // rider accepted
  | "declined"     // rider declined — back to pending
  | "in_transit"   // rider on the move
  | "delivered";

export interface OrderRecord {
  id: string;
  type: OrderType;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  pickup: string;
  dropoff: string;
  itemDescription: string;
  priceCents?: number;
  status: OrderStatus;
  assignedRiderId?: string;
  assignedRiderName?: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = "easyblue.orders";

function read(): OrderRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function write(list: OrderRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("easyblue:orders-changed"));
}

export const ordersStore = {
  list: read,
  byCustomer: (email: string) =>
    read().filter((o) => o.customerEmail.toLowerCase() === email.toLowerCase()),
  byRider: (riderId: string) =>
    read().filter((o) => o.assignedRiderId === riderId),
  pending: () => read().filter((o) => o.status === "pending"),
  create(input: Omit<OrderRecord, "id" | "status" | "createdAt" | "updatedAt">) {
    const next: OrderRecord = {
      ...input,
      id: `EB-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    write([next, ...read()]);
    return next;
  },
  assignRider(orderId: string, riderId: string, riderName: string) {
    write(read().map((o) => o.id === orderId
      ? { ...o, status: "assigned", assignedRiderId: riderId, assignedRiderName: riderName, updatedAt: Date.now() }
      : o));
  },
  riderRespond(orderId: string, accept: boolean) {
    write(read().map((o) => {
      if (o.id !== orderId) return o;
      if (accept) return { ...o, status: "accepted", updatedAt: Date.now() };
      return { ...o, status: "pending", assignedRiderId: undefined, assignedRiderName: undefined, updatedAt: Date.now() };
    }));
  },
  advance(orderId: string, status: OrderStatus) {
    write(read().map((o) => o.id === orderId ? { ...o, status, updatedAt: Date.now() } : o));
  },
  subscribe(cb: () => void) {
    const fn = () => cb();
    window.addEventListener("easyblue:orders-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("easyblue:orders-changed", fn);
      window.removeEventListener("storage", fn);
    };
  },
};
