/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2, User as UserIcon, Mail, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";

type Role = "customer" | "vendor" | "rider";

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  approval: string;
  is_verified: boolean;
  created_at: string;
}

export function AdminUsersDialog({
  open,
  onOpenChange,
  onDeleteUser,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleteUser: (id: string) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<Role>("customer");
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
  setLoading(true);
  const { data: profiles, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, display_name, email, phone, approval, created_at, is_verified")
    .eq("role", tab)
    .order("created_at", { ascending: false });
  if (error) { toast.error(error.message); setRows([]); setLoading(false); return; }
  setRows((profiles ?? []) as Row[]);
  setLoading(false);
};

  useEffect(() => {
    if (open) load(); /* eslint-disable-next-line */
  }, [open, tab]);

  const remove = async (id: string) => {
    if (!confirm("Permanently delete this user from database?.")) return;

    try {
      await onDeleteUser(id);
      toast.success("User deleted");
      setRows((r) => r.filter((x) => x.id ! ==id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <DialogTitle>Users</DialogTitle>
            <DialogDescription>Manage verified accounts by type.</DialogDescription>
            <div className="mt-3 grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary">
              {(["customer", "vendor", "rider"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTab(r)}
                  className={`h-8 rounded-lg text-xs font-semibold capitalize ${
                    tab === r
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground"
                  }`}
                >
                  {r}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No {tab}s yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border"
                  >
                    <button
                      onClick={() => setDetail(r)}
                      className="flex-1 flex items-center gap-3 text-left active:opacity-70"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.display_name ?? `${r.first_name} ${r.last_name}`.trim() ?? r.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      aria-label="Delete"
                      className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>User details</DialogTitle>
          <DialogDescription className="sr-only">Signup information</DialogDescription>
          {detail && (
            <div className="space-y-2 text-sm">
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                label="Name"
                value={`${detail.first_name} ${detail.last_name}`.trim() || "—"}
              />
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                label="Display name"
                value={detail.display_name ?? "—"}
              />
              <Field icon={<Mail className="h-4 w-4" />} label="Email" value={detail.email} />
              <Field
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={detail.phone ?? "—"}
              />
              <Field
                icon={<Calendar className="h-4 w-4" />}
                label="Joined"
                value={new Date(detail.created_at).toLocaleString()}
              />
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                label="Approval"
                value={detail.approval}
              />
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email verified"
                value={detail.is_verified ? "Yes" : "No"}
              />
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                label="User ID"
                value={detail.id}
                mono
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/50">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
