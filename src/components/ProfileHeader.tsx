import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil, User as UserIcon, Camera, History as HistoryIcon, ChevronRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { profileStore } from "@/lib/profile-store";
import type { AuthUser } from "@/lib/auth";

/**
 * Reusable profile header used inside Settings panels for customer, vendor,
 * rider, and admin dashboards.
 *
 * - Pen icon in the header opens a popover bubble for editing the display name
 *   and changing the profile photo.
 * - History button navigates to /history (a per-role transaction page).
 */
export function ProfileHeader({ user }: { user: AuthUser | null }) {
  useSyncExternalStore(
    (cb) => profileStore.subscribe(cb),
    () => JSON.stringify(profileStore.get(user?.email ?? "")),
    () => "{}",
  );

  const [open, setOpen] = useState(false);
  const override = user ? profileStore.get(user.email) : {};
  const defaultName = user ? `${user.firstName} ${user.lastName}` : "Guest";
  const displayName = override.displayName?.trim() || defaultName;
  const photo = override.photoDataUrl;

  return (
    <div className="relative">
      <div className="rounded-2xl bg-card border border-border p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center">
            {photo ? (
              <img src={photo} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? "Not signed in"}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Edit profile"
            className="h-9 w-9 rounded-full bg-secondary text-foreground/80 flex items-center justify-center active:scale-90 transition"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Link
        to="/history"
        className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-3 active:scale-[0.99]"
      >
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <HistoryIcon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1 text-left">History</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {open && user && (
        <EditBubble
          user={user}
          initialName={displayName}
          initialPhoto={photo}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function EditBubble({
  user,
  initialName,
  initialPhoto,
  onClose,
}: {
  user: AuthUser;
  initialName: string;
  initialPhoto?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<string | undefined>(initialPhoto);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!bubbleRef.current) return;
      if (!bubbleRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large", { description: "Please choose an image under 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    profileStore.set(user.email, { displayName: name.trim() || initialName, photoDataUrl: photo });
    toast.success("Profile updated");
    onClose();
  };

  return (
    <div
      ref={bubbleRef}
      className="absolute right-2 top-16 z-40 w-72 rounded-2xl border border-border
                 bg-card/90 backdrop-blur-xl shadow-2xl shadow-primary/20 p-4
                 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Edit profile</p>
        <button onClick={onClose} aria-label="Close" className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 h-10 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Camera className="h-4 w-4" /> Change photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
        Display name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        className="w-full h-10 px-3 rounded-xl bg-input border border-border text-sm text-foreground mb-4"
      />

      <button
        onClick={save}
        className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95"
      >
        <Check className="h-4 w-4" /> Save changes
      </button>
    </div>
  );
}
