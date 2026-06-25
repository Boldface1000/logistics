import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Use — EasyBlue Logistics" }] }),
  component: TermsPage,
});

function TermsPage() {
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
          <h1 className="text-base font-bold text-foreground">Terms of Use</h1>
          <p className="text-xs text-muted-foreground">Last updated · May 2026</p>
        </div>
        <FileText className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground mb-4">
          These Terms of Use ("Terms") govern your use of the EasyBlue Logistics platform, including
          the mobile app, marketplace, and rider network.
        </p>

        <Section title="1. Acceptance">
          By creating an account or using EasyBlue, you agree to be bound by these Terms and our
          Privacy &amp; Security Policy. If you do not agree, please discontinue use.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 18 years old and able to enter binding contracts to use EasyBlue.
          Riders and Partners must additionally pass identity and compliance review.
        </Section>

        <Section title="3. Account Responsibilities">
          You are responsible for maintaining the confidentiality of your credentials, for all
          activity under your account, and for ensuring your registration information stays accurate
          and up to date.
        </Section>

        <Section title="4. Marketplace &amp; Orders">
          Products listed on EasyBlue are sold by independent Partners. Pricing, taxes,
          partner-discount eligibility, and delivery windows are shown at checkout and binding once
          an order is confirmed.
        </Section>

        <Section title="5. Rider Conduct">
          Riders must obey local traffic laws, handle shipments with care, and complete deliveries
          within the time window quoted to the customer. Violations may lead to suspension.
        </Section>

        <Section title="6. Payments &amp; Escrow">
          Customer payments are held in escrow and released to Partners and Riders upon proof of
          delivery. Refund and dispute terms are described inside the app at order time.
        </Section>

        <Section title="7. Prohibited Activity">
          You may not use EasyBlue to ship prohibited goods, defraud other users, attempt to
          reverse-engineer the platform, or otherwise violate applicable law.
        </Section>

        <Section title="8. Termination">
          EasyBlue may suspend or terminate accounts that violate these Terms. You may close your
          account at any time from Settings.
        </Section>

        <Section title="9. Changes">
          We may update these Terms periodically. Material changes will be announced in-app and take
          effect 14 days after notice unless you object by closing your account.
        </Section>

        <Section title="10. Contact">
          Questions? Reach our support team via the in-app helpdesk or by email at{" "}
          <span className="text-primary font-medium">support@easyblue.test</span>.
        </Section>

        <p className="text-xs text-muted-foreground mt-6">
          See also our{" "}
          <Link to="/privacy" className="text-primary font-semibold">
            Privacy &amp; Security Policy
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
