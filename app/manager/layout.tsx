import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth";

export default async function ManagerLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireRole("manager");

  return children;
}
