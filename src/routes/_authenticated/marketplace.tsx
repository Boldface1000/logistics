/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/marketplace"!</div>;
}
