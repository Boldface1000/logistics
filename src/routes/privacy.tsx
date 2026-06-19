import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy & Security — EasyBlue" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <Link
          to="/"
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Privacy &amp; Security</h1>
          <p className="text-xs text-muted-foreground">Last updated · May 2026</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground mb-4">
          This policy explains what information EasyBlue collects, how we use it, and the security
          controls protecting your account and shipments.
        </p>

        <Section title="1. Information We Collect">
          Account details (name, email, phone), business and license details for Partners and
          Riders, device identifiers, approximate location during active deliveries, and order
          history.
        </Section>

        <Section title="2. How We Use It">
          To operate the marketplace, route deliveries, authenticate users, prevent fraud, and
          provide customer support. We do not sell personal data to third parties.
        </Section>

        <Section title="3. OTP &amp; Email Verification">
          One-time passcodes (OTP) are issued for new sign-ups and sensitive actions. OTPs are
          single-use, expire within 60 seconds, and are never shared with third parties.
        </Section>

        <Section title="4. Location Data">
          Rider location is collected only while a delivery is active and is shared with the
          customer of that specific order. Background tracking stops as soon as the rider goes
          offline.
        </Section>

        <Section title="5. Storage &amp; Encryption">
          Personal data is encrypted in transit (TLS 1.2+) and at rest. Passwords are salted and
          hashed with industry-standard algorithms.
        </Section>

        <Section title="6. Your Choices">
          You may review, export, or delete your data from Settings → Security at any time. Closing
          your account triggers a 30-day soft-delete window for compliance recovery.
        </Section>

        <Section title="7. Data Sharing">
          We share the minimum data required to complete an order: customer name/drop-off with the
          assigned Rider, delivery confirmation with the Partner, and aggregated metrics with
          analytics providers under strict contracts.
        </Section>

        <Section title="8. Security Reports">
          Suspect abuse or a vulnerability? Email{" "}
          <span className="text-primary font-medium">security@easyblue.test</span> — we acknowledge
          reports within one business day.
        </Section>

        <Section title="9. Updates">
          Material changes to this policy will be announced in-app at least 14 days before they take
          effect.
        </Section>

        <p className="text-xs text-muted-foreground mt-6">
          See also our{" "}
          <Link to="/terms" className="text-primary font-semibold">
            Terms of Use
          </Link>
          .
        </p>
      </main>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-foreground mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
