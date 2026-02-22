import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
    },
  },
  {
    files: [
      "app/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
      "pages/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
      "components/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
      "lib/api.ts",
      "lib/activity.ts",
      "lib/date-format.ts",
      "lib/swr.ts",
    ],
    ignores: ["app/api/**"],
    rules: {
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["services/*", "infra/*", "apps/api/*", "repositories/*"],
              message:
                "Client/UI code must not import server-side modules or server logging code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: [
      "**/*.test.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
      "**/*.spec.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
      "tests/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
