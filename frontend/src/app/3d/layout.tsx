import type { Metadata } from "next";
// Imported here, not inside Store3DApp: that component is loaded with next/dynamic({ssr:false}),
// and CSS imported from inside such a component never gets a <link> in the server-rendered HTML,
// so the whole store shipped unstyled (.s3d-page is what makes the overlay fixed full-screen).
import "@/components/store3d/store3d.css";

export const metadata: Metadata = {
  title: "3D Video Store — No Limit Flix",
  description: "Walk the aisles of a 3D video store built from your real library.",
};

export default function Store3DLayout({ children }: { children: React.ReactNode }) {
  return children;
}
