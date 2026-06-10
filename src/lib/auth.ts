// Client-side auth for the demo. Recognizes seeded customer, vendor, rider, and split admin scopes.
export type AuthRole = "customer" | "vendor" | "rider" | "admin";
export type AdminScope = "super" | "logistics";

export interface AuthUser {
  email: string;
  role: AuthRole;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Only set when role === "admin" */
  adminScope?: AdminScope;
}

const KEY = "easyblue.session";

interface DemoAccount { email: string; password: string; user: AuthUser; }

const DEMO: DemoAccount[] = [
  // Customer
  {
    email: "eferideogheneudumebraye@gmail.com",
    password: "781227",
    user: {
      email: "eferideogheneudumebraye@gmail.com",
      role: "customer",
      firstName: "Eferi",
      lastName: "Udumebraye",
      phone: "+2348010000005",
    },
  },
  // Vendor demo
  {
    email: "bola@easyblue.test",
    password: "781227",
    user: { email: "bola@easyblue.test", role: "vendor", firstName: "Bola", lastName: "Vendor", phone: "+2348010000002" },
  },
  // Rider demo
  {
    email: "chi@easyblue.test",
    password: "781227",
    user: { email: "chi@easyblue.test", role: "rider", firstName: "Chi", lastName: "Rider", phone: "+2348010000003" },
  },
  // Split admins
  {
    email: "easybluelogistics@gmail.com",
    password: "781227",
    user: { email: "easybluelogistics@gmail.com", role: "admin", firstName: "Super", lastName: "Admin", adminScope: "super" },
  },
  {
    email: "easybluelogisticslogistic@gmail.com",
    password: "781227",
    user: { email: "easybluelogisticslogistic@gmail.com", role: "admin", firstName: "Logistics", lastName: "Admin", adminScope: "logistics" },
  },
  {
    email: "easybluelogisticsrecords@gmail.com",
    password: "781227",
    user: { email: "easybluelogisticsrecords@gmail.com", role: "admin", firstName: "Operations", lastName: "Admin", adminScope: "logistics" },
  },
  {
    email: "easybluelogisticsproduct@gmail.com",
    password: "781227",
    user: { email: "easybluelogisticsproduct@gmail.com", role: "admin", firstName: "Logistics", lastName: "Admin", adminScope: "logistics" },
  },
];

export const auth = {
  signIn(email: string, password: string): AuthUser | null {
    const match = DEMO.find(
      (d) => d.email.toLowerCase() === email.trim().toLowerCase() && d.password === password,
    );
    if (!match) return null;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(match.user));
    }
    return match.user;
  },
  current(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(window.localStorage.getItem(KEY) ?? "null"); }
    catch { return null; }
  },
  signOut() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
  /** Where to send the user after a successful login. */
  homeFor(user: AuthUser): "/dashboard" | "/vendor-dashboard" | "/rider-dashboard" | "/admin" {
    switch (user.role) {
      case "vendor": return "/vendor-dashboard";
      case "rider":  return "/rider-dashboard";
      case "admin":  return "/admin";
      default:       return "/dashboard";
    }
  },
};
