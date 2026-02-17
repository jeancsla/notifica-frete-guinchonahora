#!/usr/bin/env node
/**
 * Webhook verification script
 * Tests the n8n webhook endpoint locally before deploying
 *
 * Usage:
 *   node scripts/verify-webhook.js
 *   CRON_WEBHOOK_SECRET=your-secret node scripts/verify-webhook.js
 */

const CRON_SECRET = process.env.CRON_WEBHOOK_SECRET || "test-secret";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testWebhook() {
  console.log("🔍 Testing webhook endpoint...\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `Secret: ${CRON_SECRET.slice(0, 3)}...${CRON_SECRET.slice(-3)}\n`,
  );

  const tests = [
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
      const icon = success ? "✅" : "❌";

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
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("\n✨ All tests passed! Your webhook is secure and working.");
    console.log("\nNext steps:");
    console.log("1. Deploy to Vercel: git push");
    console.log("2. Set CRON_WEBHOOK_SECRET in Vercel dashboard");
    console.log("3. Configure n8n webhook with your secret");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Check your setup.");
    process.exit(1);
  }
}

testWebhook();
