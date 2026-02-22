import { describe, expect, test } from "bun:test";
import { createApp } from "./app";
import { resetAuthRateLimitState } from "./lib/rate-limit";
import { buildSessionCookie } from "./lib/session";

describe("Bun API basic routes", () => {
  test("GET /api/v1 returns v1 metadata", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/v1"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBe("v1");
  });

  test("Auth login rejects invalid payload", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: 1 }),
      }),
    );

    expect(response.status).toBe(400);
  });

  test("Auth login returns 500 when credentials are missing", async () => {
    const previousUsername = process.env.ADMIN_USERNAME;
    const previousPassword = process.env.ADMIN_PASSWORD;
    const previousDevDefault = process.env.ALLOW_DEV_DEFAULT_ADMIN;
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ALLOW_DEV_DEFAULT_ADMIN;

    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "wrong", password: "wrong" }),
      }),
    );

    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.message).toBe("Server misconfigured");

    if (previousDevDefault === undefined) {
      delete process.env.ALLOW_DEV_DEFAULT_ADMIN;
    } else {
      process.env.ALLOW_DEV_DEFAULT_ADMIN = previousDevDefault;
    }
  });

  test("Auth login enforces rate limit after repeated failures", async () => {
    resetAuthRateLimitState();

    const previousUsername = process.env.ADMIN_USERNAME;
    const previousPassword = process.env.ADMIN_PASSWORD;
    const previousMaxAttempts = process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
    const previousWindow = process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS;
    const previousBlock = process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS;

    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "admin";
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "3";
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = "60";
    process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS = "60";

    const app = createApp();
    let finalResponse: Response | null = null;

    for (let i = 0; i < 3; i += 1) {
      finalResponse = await app.handle(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "wrong" }),
        }),
      );
    }

    expect(finalResponse?.status).toBe(429);
    expect(finalResponse?.headers.get("retry-after")).toBeTruthy();
    resetAuthRateLimitState();

    if (previousMaxAttempts === undefined) {
      delete process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
    } else {
      process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = previousMaxAttempts;
    }
    if (previousWindow === undefined) {
      delete process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS;
    } else {
      process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = previousWindow;
    }
    if (previousBlock === undefined) {
      delete process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS;
    } else {
      process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS = previousBlock;
    }

    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }
  });

  test("Auth login + user + logout flow", async () => {
    const previousUsername = process.env.ADMIN_USERNAME;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "admin";

    const app = createApp();

    const loginResponse = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" }),
      }),
    );

    expect(loginResponse.status).toBe(200);

    const cookie =
      loginResponse.headers.get("set-cookie") || buildSessionCookie("admin");
    const sessionCookie = cookie.split(";")[0] || "";
    expect(cookie).toBeTruthy();

    const userResponse = await app.handle(
      new Request("http://localhost/api/v1/auth/user", {
        headers: {
          cookie: sessionCookie,
        },
      }),
    );

    expect(userResponse.status).toBe(200);
    const userBody = await userResponse.json();
    expect(typeof userBody.isLoggedIn).toBe("boolean");

    const logoutResponse = await app.handle(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: {
          cookie: sessionCookie,
        },
      }),
    );

    expect(logoutResponse.status).toBe(200);

    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }

    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }
  });

  test("Malformed cookie does not trigger 500 on protected routes", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas", {
        headers: {
          cookie: "cargo_session=%E0%A4%A",
        },
      }),
    );

    expect(response.status).toBe(401);
  });

  test("Migrations endpoint requires admin API key even with valid session", async () => {
    const previousUsername = process.env.ADMIN_USERNAME;
    const previousPassword = process.env.ADMIN_PASSWORD;
    const previousApiKey = process.env.ADMIN_API_KEY;
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "admin";
    process.env.ADMIN_API_KEY = "test-admin-key";

    const app = createApp();
    const sessionCookie = buildSessionCookie("admin").split(";")[0] || "";

    const response = await app.handle(
      new Request("http://localhost/api/v1/migrations", {
        method: "POST",
        headers: {
          cookie: sessionCookie,
        },
      }),
    );

    expect(response.status).toBe(401);

    if (previousUsername === undefined) {
      delete process.env.ADMIN_USERNAME;
    } else {
      process.env.ADMIN_USERNAME = previousUsername;
    }
    if (previousPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousPassword;
    }
    if (previousApiKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = previousApiKey;
    }
  });
});
