// Approved riders pool — seed + any approved via pending-store.
import { pendingStore } from "./pending-store";

export interface RiderEntry {
  id: string;
  name: string;
  email: string;
}

const SEED: RiderEntry[] = [
  { id: "rider-chi",    name: "Chi Rider",   email: "chi@easyblue.test" },
  { id: "rider-marcus", name: "Marcus Lee",  email: "marcus@easyblue.test" },
  { id: "rider-ada",    name: "Ada Nwosu",   email: "ada.rider@easyblue.test" },
];

export const ridersStore = {
  approved(): RiderEntry[] {
    const approvedSignups = pendingStore.list()
      .filter((p) => p.role === "rider" && p.status === "approved")
      .map<RiderEntry>((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
      }));
    // de-dupe by email
    const map = new Map<string, RiderEntry>();
    [...SEED, ...approvedSignups].forEach((r) => map.set(r.email.toLowerCase(), r));
    return Array.from(map.values());
  },
  findByEmail(email: string): RiderEntry | undefined {
    return this.approved().find((r) => r.email.toLowerCase() === email.toLowerCase());
  },
};
