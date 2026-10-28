import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // react-three-fiber's whole API is mutating objects it hands you from useThree()/useFrame()
    // (camera.position, camera.rotation, …) — that's the documented pattern, not a bug, and the
    // React Compiler's mutation rule has no escape hatch for it other than disabling per file.
    files: ["src/components/store3d/components/3d/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
