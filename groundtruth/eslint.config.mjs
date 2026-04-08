import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pin React version so eslint-plugin-react skips auto-detection.
  // detectReactVersion() crashes on ESLint 10 ("contextOrFilename.getFilename
  // is not a function") because eslint-plugin-react 7.37.x predates ESLint 10's
  // Rule context API change. Explicit version bypasses that code path.
  {
    settings: {
      react: { version: "19" },
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
