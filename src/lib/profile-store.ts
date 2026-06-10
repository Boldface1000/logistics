// Client-side per-user profile overrides (display name + photo) keyed by email.
const KEY = "easyblue.profile";

export interface ProfileOverride {
  displayName?: string;
  photoDataUrl?: string;
}

type Map = Record<string, ProfileOverride>;

function read(): Map {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}
function write(map: Map) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("easyblue:profile-changed"));
}

export const profileStore = {
  get(email: string): ProfileOverride {
    return read()[email.toLowerCase()] ?? {};
  },
  set(email: string, patch: ProfileOverride) {
    const key = email.toLowerCase();
    const map = read();
    map[key] = { ...map[key], ...patch };
    write(map);
  },
  subscribe(cb: () => void) {
    const fn = () => cb();
    window.addEventListener("easyblue:profile-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("easyblue:profile-changed", fn);
      window.removeEventListener("storage", fn);
    };
  },
};
