#!/usr/bin/env bun

const CRON_SECRET = process.env.CRON_WEBHOOK_SECRET || "test-secret";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

type WebhookTest = {
  name: string;
  request: {
    method: string;
    headers: Record<string, string>;
    url?: string;
  };
  expectStatus: number;
};

async function testWebhook() {
  console.log("Testing webhook endpoint...\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Secret: ***${CRON_SECRET.slice(-4)}\n`);

  const tests: WebhookTest[] = [
    {
      name: "Missing secret (should return 401)",
      request: {
        method: "POST",
        headers: {},
      },
      expectStatus: 401,
    },
    {
      name: "Invalid secret (should return 401)",
      request: {
        method: "POST",
        headers: {
          "x-cron-secret": "wrong-secret",
        },
      },
      expectStatus: 401,
    },
    {
      name: "Valid secret in header (should return 200)",
      request: {
        method: "POST",
        headers: {
          "x-cron-secret": CRON_SECRET,
          "x-cron-source": "n8n",
        },
      },
      expectStatus: 200,
    },
    {
      name: "Valid secret in query string (should return 200)",
      request: {
        method: "POST",
        url: `${BASE_URL}/api/v1/cargas/webhook?secret=${CRON_SECRET}`,
        headers: {
          "x-cron-source": "test",
        },
      },
      expectStatus: 200,
    },
    {
      name: "GET request (should return 405)",
      request: {
        method: "GET",
        headers: {
          "x-cron-secret": CRON_SECRET,
        },
      },
      expectStatus: 405,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const url = test.request.url || `${BASE_URL}/api/v1/cargas/webhook`;
      const response = await fetch(url, {
        method: test.request.method,
        headers: test.request.headers,
      });

      const success = response.status === test.expectStatus;
      const icon = success ? "PASS" : "FAIL";

      console.log(`${icon} ${test.name}`);
      console.log(
        `   Status: ${response.status} (expected: ${test.expectStatus})`,
      );

      if (success) {
        passed++;
        if (response.status === 200) {
          const data = await response.json();
          console.log(
            `   Response: ${JSON.stringify(data, null, 2).split("\n").join("\n   ")}`,
          );
        }
      } else {
        failed++;
        const data = await response.text();
        console.log(`   Error: ${data.slice(0, 100)}`);
      }
      console.log();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${test.name}`);
      console.log(`   Error: ${message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("\nAll tests passed! Your webhook is secure and working.");
    process.exit(0);
  }

  console.log("\nSome tests failed. Check your setup.");
  process.exit(1);
}

await testWebhook();

export {};
