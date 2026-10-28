import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D Video Store — No Limit Flix",
  description: "Walk the aisles of a 3D video store built from your real library.",
};

export default function Store3DLayout({ children }: { children: React.ReactNode }) {
  return children;
}
