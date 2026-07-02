import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// We use tseslint.config() which is a helper that acts just like defineConfig
// but is specifically built to support TypeScript ESLint arrays.
export default tseslint.config(
    // 1. Define which files to lint
    { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"] },

    // 2. Set the Node.js global environment variables
    { languageOptions: { globals: globals.node } },

    // 3. Add the base JavaScript recommended rules directly
    js.configs.recommended,

    // 4. Add the TypeScript recommended rules
    ...tseslint.configs.recommended,
);