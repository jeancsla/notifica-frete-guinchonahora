const nextConfig = require("eslint-config-next");
const jestPlugin = require("eslint-plugin-jest");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  ...nextConfig,
  {
    files: [
      "**/*.test.{js,jsx,ts,tsx,mjs,cjs}",
      "**/*.spec.{js,jsx,ts,tsx,mjs,cjs}",
      "tests/**/*.{js,jsx,ts,tsx,mjs,cjs}",
    ],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...jestPlugin.configs["flat/recommended"].rules,
    },
  },
  {
    rules: {
      ...prettierConfig.rules,
    },
  },
];
