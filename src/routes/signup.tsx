import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, User, Store, Bike, Mail, Check, RotateCw, Eye, EyeOff,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { pendingStore } from "@/lib/pending-store";
import { otpService } from "@/lib/otp";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up — EasyBlue Logistics" }] }),
  component: SignupPage,
});

type Role = "customer" | "partner" | "rider";

interface RoleOption {
  id: Role;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const roles: RoleOption[] = [
  { id: "customer", label: "Customer", sub: "Shop & track", icon: <User className="h-6 w-6" /> },
  { id: "partner", label: "Partner", sub: "Vendor / business", icon: <Store className="h-6 w-6" /> },
  { id: "rider", label: "Rider", sub: "Earn dispatching", icon: <Bike className="h-6 w-6" /> },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  remember: boolean;
  agreed: boolean;
  // partner
  businessName: string;
  businessPhone: string;
  // rider
  hasLicense: boolean | null;
  isExperienced: boolean | null;
  nin: string;
  ninPhoto: string | null;
}

const initialForm: FormState = {
  firstName: "", lastName: "", email: "", phone: "", password: "",
  remember: false, agreed: false,
  businessName: "", businessPhone: "",
  hasLicense: null, isExperienced: null,
  nin: "", ninPhoto: null,
};

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPwd, setShowPwd] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const sendOtp = () => {
    if (!form.email.includes("@")) {
      toast.error("Enter a valid email first");
      return;
    }
    otpService.send(form.email);
    setOtpSent(true);
    setCountdown(60);
    setOtp(["", "", "", "", "", ""]);
  };

  const setOtpDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = clean;
    setOtp(next);
    if (clean && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const otpComplete = otp.every((d) => d !== "");

  // Validation per role for step 2
  const step2Valid = (() => {
    const base = form.firstName && form.lastName && form.email.includes("@") && form.password.length >= 6 && form.agreed;
    if (role === "customer") return !!(base && form.phone.trim().length >= 7);
    if (role === "partner") return !!(base && form.businessName && form.businessPhone);
    if (role === "rider") return !!(base && form.hasLicense !== null && form.isExperienced !== null && /^\d{11}$/.test(form.nin) && form.ninPhoto);
    return false;
  })();

  const submitVerification = () => {
    const code = otp.join("");
    if (!otpService.verify(form.email, code)) {
      toast.error("Invalid or expired OTP", { description: "Resend the code and try again." });
      return;
    }
    toast.success("Email verified");

    // Persist pending signups for partners/riders for admin approval
    if (role === "partner") {
      pendingStore.add({
        role: "partner",
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        businessName: form.businessName,
        businessPhone: form.businessPhone,
      });
      navigate({ to: "/pending-approval", search: { role: "partner" } });
      return;
    }
    if (role === "rider") {
      pendingStore.add({
        role: "rider",
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        hasLicense: form.hasLicense ?? false,
        isExperienced: form.isExperienced ?? false,
        nin: form.nin,
        ninPhoto: form.ninPhoto,
      });
      navigate({ to: "/pending-approval", search: { role: "rider" } });
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const stepLabels = ["Profile", "Details", "Verify"];

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep((s) => (s - 1) as 1 | 2 | 3))}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Create Account</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 3 — {stepLabels[step - 1]}</p>
        </div>
      </header>

      <div className="px-5 py-4 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
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
            <p className="text-sm text-muted-foreground mb-5">Pick the role that fits how you'll use EasyBlue.</p>
            <div className="flex flex-col gap-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition flex items-center gap-4 active:scale-[0.99] ${
                    role === r.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    role === r.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>{r.icon}</div>
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

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-1">Verify your email</h2>
            <p className="text-sm text-muted-foreground mb-5">
              A 6-digit code will be sent to <span className="text-foreground font-medium">{form.email}</span>.
            </p>

            <button
              onClick={sendOtp}
              disabled={countdown > 0}
              className="w-full h-12 rounded-xl bg-cta text-cta-foreground font-semibold text-sm disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-1.5 mb-4"
            >
              {countdown > 0 ? (<><RotateCw className="h-3.5 w-3.5" />Resend in {countdown}s</>) : otpSent ? "Resend OTP" : "Send OTP"}
            </button>

            {otpSent && (
              <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                <p className="text-xs text-muted-foreground mb-3">Enter the 6-digit code</p>
                <div className="flex gap-2 justify-between">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      value={d}
                      onChange={(e) => setOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      className="h-12 w-11 text-center text-lg font-bold rounded-xl bg-card border-2 border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="safe-bottom px-5 pt-3 border-t border-border bg-card">
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1) setStep(2);
              else if (step === 2 && step2Valid) setStep(3);
            }}
            disabled={step === 2 && !step2Valid}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition shadow-lg shadow-primary/20"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={submitVerification}
            disabled={!otpComplete}
            className="w-full py-3.5 rounded-2xl bg-cta text-cta-foreground font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition shadow-lg shadow-cta/30"
          >
            Verify & Submit
          </button>
        )}
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
        {role === "customer" && "Customer details"}
        {role === "partner" && "Partner details"}
        {role === "rider" && "Rider details"}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">Fill in your information to continue.</p>

      <div className="flex flex-col gap-3">
        {role === "partner" && (
          <>
            <SubHeader>Business Info</SubHeader>
            <Field label="Registered business name">
              <TextInput value={form.businessName} onChange={(v) => update("businessName", v)} placeholder="Acme Logistics Ltd." />
            </Field>
          </>
        )}

        <Field label="Firstname">
          <TextInput value={form.firstName} onChange={(v) => update("firstName", v)} placeholder="Jane" />
        </Field>
        <Field label="Lastname">
          <TextInput value={form.lastName} onChange={(v) => update("lastName", v)} placeholder="Doe" />
        </Field>

        {role === "partner" && <SubHeader className="mt-2">Security credentials</SubHeader>}

        {role === "partner" && (
          <Field label="Business phone number">
            <TextInput value={form.businessPhone} onChange={(v) => update("businessPhone", v)} placeholder="+234 800 000 0000" />
          </Field>
        )}

        <Field label={role === "rider" ? "Email (for OTP verification)" : "Email"}>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@email.com"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </Field>

        {role === "customer" && (
          <Field label="Phone number">
            <TextInput value={form.phone} onChange={(v) => update("phone", v)} placeholder="+234 800 000 0000" />
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
                  <img src={form.ninPhoto} alt="NIN preview" className="h-8 w-8 rounded object-cover" />
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
            <Link to="/privacy" className="text-primary font-medium underline-offset-2 hover:underline">privacy and security</Link>
            {" "}&{" "}
            <Link to="/terms" className="text-primary font-medium underline-offset-2 hover:underline">terms of use</Link>.
          </span>
        </label>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold">Login</Link>
        </p>
      </div>
    </>
  );
}

function SubHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-widest text-primary mb-0.5 ${className}`}>
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        {[
          { label: "Yes", v: true },
          { label: "No", v: false },
        ].map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.v)}
              className={`flex-1 h-11 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition active:scale-[0.98] ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <span
                className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  active ? "bg-primary border-primary text-primary-foreground" : "border-border"
                }`}
              >
                {active && <Check className="h-3 w-3" />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
