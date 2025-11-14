import type { ReactNode } from "react";
import EnsureProfileMount from "./EnsureProfileMount";

export default function GlobalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureProfileMount />
      {children}
    </>
  );
}
