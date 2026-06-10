import { createFileRoute } from "@tanstack/react-router";
import { CustomerDashboard } from "./dashboard";

export const Route = createFileRoute("/vendor-dashboard")({
  head: () => ({ meta: [{ title: "Vendor Dashboard — EasyBlue" }] }),
  component: () => <CustomerDashboard variant="vendor" />,
});
