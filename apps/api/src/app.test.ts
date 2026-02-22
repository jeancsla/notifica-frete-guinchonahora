import { describe, expect, test } from "bun:test";
import { createApp } from "./app";
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

  test("Auth login returns helpful message for invalid credentials in dev defaults", async () => {
    const previousUsername = process.env.ADMIN_USERNAME;
    const previousPassword = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;

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

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.message).toContain("admin/admin");
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
});
