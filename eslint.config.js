const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
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
      "**/*.test.{js,jsx,mjs,cjs}",
      "**/*.spec.{js,jsx,mjs,cjs}",
      "tests/**/*.{js,jsx,mjs,cjs}",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
