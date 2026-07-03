/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, User, Store, Bike, Mail, Eye, EyeOff, Check } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";
import { safeText, digitsOnly, nameOnly, maxLen } from "@/lib/validators";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up — EasyBlue Logistics" }] }),
  component: SignupPage,
});

type Role = "customer" | "vendor" | "rider";

interface RoleOption {
  id: Role;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const roles: RoleOption[] = [
  {
    id: "customer",
    label: "Personal Account",
    sub: "Shop & track",
    icon: <User className="h-6 w-6" />,
  },
  {
    id: "vendor",
    label: "Business Account",
    sub: "Sell products",
    icon: <Store className="h-6 w-6" />,
  },
  {
    id: "rider",
    label: "Rider Account",
    sub: "Earn dispatching",
    icon: <Bike className="h-6 w-6" />,
  },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  remember: boolean;
  agreed: boolean;
  businessName: string;
  businessPhone: string;
  hasLicense: boolean | null;
  isExperienced: boolean | null;
  nin: string;
  ninPhoto: string | null;
}

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  remember: false,
  agreed: false,
  businessName: "",
  businessPhone: "",
  hasLicense: null,
  isExperienced: null,
  nin: "",
  ninPhoto: null,
};

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPwd, setShowPwd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Validation per role for step 2
  const step2Valid = (() => {
    const base =
      form.firstName &&
      form.lastName &&
      form.email.includes("@") &&
      form.password.length >= 6 &&
      form.agreed;
    if (role === "customer") return !!(base && form.phone.trim().length >= 7);
    if (role === "vendor") return !!(base && form.businessName && form.businessPhone);
    if (role === "rider")
      return !!(
        base &&
        form.phone.trim().length >= 7 &&
        form.hasLicense !== null &&
        form.isExperienced !== null &&
        /^\d{11}$/.test(form.nin) &&
        form.ninPhoto
      );
    return false;
  })();

const handleSubmit = async () => {
  setIsSubmitting(true);
  const currentRole = role; // snapshot before async

  try {
    const phoneToCheck = (currentRole === "vendor" ? form.businessPhone : form.phone).trim();

    // Pre-check: phone uniqueness (Supabase Auth never checks this since phone
    // is only stored in user_metadata, not the Auth `phone` column). Uses a
    // SECURITY DEFINER RPC so anonymous visitors can check existence without
    // gaining read access to the `users` table itself.
    if (phoneToCheck) {
      const { data: phoneExists, error: phoneCheckError } = await supabase.rpc(
        "check_phone_exists",
        { p_phone: phoneToCheck }
      );

      if (phoneCheckError) {
        throw new Error("Could not verify phone number right now. Please try again.");
      }
      if (phoneExists) {
        throw new Error("An account with this phone number is already registered. Please log in instead.");
      }
    }

    let ninPhotoUrl: string | undefined = undefined;

    if (currentRole === "rider" && form.ninPhoto) {
      const [meta, base64Data] = form.ninPhoto.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      const byteChars = atob(base64Data);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: mimeType });
      const ext = mimeType.split("/")[1] ?? "jpeg";
      const safeName = form.email.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = Date.now() + "_" + safeName + "." + ext;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("nin-photos")
        .upload(filename, blob, { contentType: mimeType, upsert: false });

      if (uploadError) throw new Error("Failed to upload NIN photo: " + uploadError.message);
      ninPhotoUrl = supabase.storage.from("nin-photos").getPublicUrl(uploadData.path).data.publicUrl;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          user_role: currentRole, // ← renamed from "role"
          phone: form.phone || form.businessPhone,
          agreed_terms: form.agreed,
          business_name: currentRole === "vendor" ? form.businessName : undefined,
          business_phone: currentRole === "vendor" ? form.businessPhone : undefined,
          vehicle_type: currentRole === "rider" ?
            (form.hasLicense ? "licensed" : "unlicensed") : undefined,
          nin: currentRole === "rider" ? form.nin : undefined,
          nin_photo_url: currentRole === "rider" ? ninPhotoUrl : undefined,
        },
      },
    });

    const cleanupNinPhoto = async () => {
      if (currentRole === "rider" && ninPhotoUrl) {
        const path = ninPhotoUrl.split("/nin-photos/")[1];
        if (path) await supabase.storage.from("nin-photos").remove([path]);
      }
    };

    if (error) {
      await cleanupNinPhoto();

      // Supabase returns a real error (422 "user_already_exists") when
      // "Confirm email" is OFF and the email is already registered.
      const msg = (error.message || "").toLowerCase();
      if (
        (error as any).code === "user_already_exists" ||
        msg.includes("already registered") ||
        msg.includes("already exists")
      ) {
        throw new Error("An account with this email already exists. Please log in instead.");
      }
      throw error;
    }

    // When "Confirm email" is ON, Supabase does NOT return an error for a
    // duplicate email — to prevent account enumeration it silently returns
    // `error: null` with a decoy user whose `identities` array is empty.
    // That's the only client-visible signal a real signup didn't happen.
    if (signUpData?.user && signUpData.user.identities?.length === 0) {
      await cleanupNinPhoto();
      throw new Error("An account with this email already exists. Please log in instead.");
    }

    // Navigate outside try-catch to avoid router redirect being caught as error
    if (currentRole === "vendor" || currentRole === "rider") {
      window.location.href = `/pending-approval?role=${currentRole === "vendor" ? "partner" : "rider"}`;
      return;
    }

    toast.success("Account created!", {
      description: "Check your email and click the confirmation link to activate your account.",
    });
    window.location.href = "/login";

  } catch (err: any) {
    toast.error("Account Creation Failed", {
      description: err?.message || err?.error_description || "Unexpected error. Please try again.",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const stepLabels = ["Profile", "Details"];

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep((s) => (s - 1) as 1 | 2))}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Create Account</h1>
          <p className="text-xs text-muted-foreground">
            Step {step} of 2 — {stepLabels[step - 1]}
          </p>
        </div>
      </header>

      <div className="px-5 py-4 flex items-center gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1.5 rounded-full transition-all ${step >= n ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-1">Choose your profile</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Pick the role that fits how you'll use EasyBlue.
            </p>
            <div className="flex flex-col gap-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition flex items-center gap-4 active:scale-[0.99] ${
                    role === r.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  }`}
                >
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      role === r.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {r.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.sub}</div>
                  </div>
                  {role === r.id && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <RoleForm
            role={role}
            form={form}
            update={update}
            showPwd={showPwd}
            toggleShowPwd={() => setShowPwd((s) => !s)}
          />
        )}
      </main>

      <footer className="safe-bottom px-5 pt-3 border-t border-border bg-card">
        <button
          onClick={() => {
            if (step === 1) setStep(2);
            else if (step === 2 && step2Valid) handleSubmit();
          }}
          disabled={(step === 2 && !step2Valid) || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition shadow-lg shadow-primary/20 flex items-center justify-center"
        >
          {isSubmitting ? "Creating Account..." : step === 2 ? "Sign Up" : "Continue"}
        </button>
      </footer>
    </MobileShell>
  );
}

// ---------------- Role-specific forms ----------------

interface RoleFormProps {
  role: Role;
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  showPwd: boolean;
  toggleShowPwd: () => void;
}

function RoleForm({ role, form, update, showPwd, toggleShowPwd }: RoleFormProps) {
  return (
    <>
      <h2 className="text-xl font-bold text-foreground mb-1">
        {role === "customer" && "Profile details"}
        {role === "vendor" && "Profile details"}
        {role === "rider" && "Rider details"}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">Fill in your information to continue.</p>

      <div className="flex flex-col gap-3">
        {role === "vendor" && (
          <>
            <SubHeader>Business Info</SubHeader>
            <Field label="Registered business name">
              <TextInput
                value={form.businessName}
                onChange={(v) => update("businessName", safeText(maxLen(v, 20)))}
                placeholder="Acme Logistics Ltd."
              />
            </Field>
          </>
        )}

        <Field label="Firstname">
          <TextInput
            value={form.firstName}
            onChange={(v) => update("firstName", nameOnly(maxLen(v, 15)))}
            placeholder="Jane"
          />
        </Field>
        <Field label="Lastname">
          <TextInput
            value={form.lastName}
            onChange={(v) => update("lastName", nameOnly(maxLen(v, 15)))}
            placeholder="Doe"
          />
        </Field>

        {role === "vendor" && <SubHeader className="mt-2">Security credentials</SubHeader>}

        {role === "vendor" && (
          <Field label="Business phone number">
            <TextInput
              value={form.businessPhone}
              onChange={(v) => update("businessPhone", digitsOnly(maxLen(v, 11)))}
              placeholder="080..."
            />
          </Field>
        )}

        <Field label={role === "rider" ? "Email (for OTP verification)" : "Email"}>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="youremail@email.com"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </Field>

        {(role === "customer" || role === "rider") && (
          <Field label="Phone number">
            <TextInput
              value={form.phone}
              onChange={(v) => update("phone", digitsOnly(maxLen(v, 11)))}
              placeholder="080..."
            />
          </Field>
        )}

        {role === "rider" && (
          <>
            <Field label="NIN (National Identification Number)">
              <TextInput
                value={form.nin}
                onChange={(v) => update("nin", v.replace(/\D/g, "").slice(0, 11))}
                placeholder="11-digit NIN"
              />
            </Field>
            <Field label="Upload NIN photo proof">
              <label className="flex items-center gap-3 h-12 px-4 rounded-xl bg-input border border-border text-foreground cursor-pointer active:scale-[0.99]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => update("ninPhoto", reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                <span className="text-sm flex-1 truncate text-muted-foreground">
                  {form.ninPhoto ? "Photo selected" : "Choose a photo (JPG/PNG)"}
                </span>
                {form.ninPhoto && (
                  <img
                    src={form.ninPhoto}
                    alt="NIN preview"
                    className="h-8 w-8 rounded object-cover"
                  />
                )}
              </label>
            </Field>
          </>
        )}

        <Field label="Password">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full h-12 pl-4 pr-12 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={toggleShowPwd}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {role === "rider" && (
          <>
            <YesNo
              label="Do you have a driver's license?"
              value={form.hasLicense}
              onChange={(v) => update("hasLicense", v)}
            />
            <YesNo
              label="Are you an experienced rider?"
              value={form.isExperienced}
              onChange={(v) => update("isExperienced", v)}
            />
          </>
        )}

        {role !== "rider" && (
          <label className="flex items-center gap-2.5 mt-1 select-none">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => update("remember", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Remember me</span>
          </label>
        )}

        <label className="flex items-start gap-2.5 mt-2 select-none">
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(e) => update("agreed", e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded border-border accent-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I have read and agreed to{" "}
            <Link
              to="/privacy"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              Privacy & Security
            </Link>{" "}
            and our{" "}
            <Link
              to="/terms"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            .
          </span>
        </label>
      </div>
    </>
  );
}

// UI Components

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

function TextInput({ value, onChange, placeholder, type = "text" }: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

function SubHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-foreground mt-4 ${className || ""}`}>{children}</h3>
  );
}

interface YesNoProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}

function YesNo({ label, value, onChange }: YesNoProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-2.5 rounded-xl font-medium transition ${
            value === true
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-2.5 rounded-xl font-medium transition ${
            value === false
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
