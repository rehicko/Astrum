// app/settings/layout.tsx
import type { ReactNode } from "react";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Let the global app/layout.tsx handle the main header + chrome.
  // Settings just renders its own page contents.
  return <>{children}</>;
}
