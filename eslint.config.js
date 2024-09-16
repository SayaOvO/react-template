// @ts-check

import js from "@eslint/js";
import react from "@eslint-react/eslint-plugin";
import * as tsParser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        parser: tsParser,
        project: "./tsconfig.json", // <-- Point to your project's "tsconfig.json" or create a new one.
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...react.configs["recommended-type-checked"], // <-- Requires type information
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@eslint-react/no-leaked-conditional-rendering": "error", // <-- Requires type information
    },
  },
];
