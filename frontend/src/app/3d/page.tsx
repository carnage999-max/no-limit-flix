"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Three.js/@react-three-fiber touch window/document at import time, so this can only run in
// the browser — ssr:false keeps it out of the server bundle entirely.
const Store3DApp = dynamic(() => import("@/components/store3d/Store3DApp"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-nlf-black">
      <Loader2 className="animate-spin text-nlf-gold" size={32} />
    </div>
  ),
});

export default function Store3DPage() {
  return <Store3DApp />;
}
