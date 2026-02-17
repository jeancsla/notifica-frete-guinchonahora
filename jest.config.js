const dotenv = require("dotenv");
dotenv.config({
  path: ".env.development",
});

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  moduleDirectories: ["node_modules", "<rootDir>/"],
  moduleNameMapper: {
    "^uncrypto$": "<rootDir>/node_modules/uncrypto/dist/crypto.node.cjs",
  },
  testEnvironment: "jest-environment-node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "/node_modules/(?!(iron-session|uncrypto|cheerio|parse5|devlop|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)",
  ],
  testTimeout: 60000,
};

module.exports = createJestConfig(customJestConfig);
