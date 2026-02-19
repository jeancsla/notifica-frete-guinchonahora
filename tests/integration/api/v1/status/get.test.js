import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

test("GET /api/v1/status deve retornar status 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("public");
  expect(response.headers.get("etag")).toBeTruthy();
  expect(response.headers.get("x-response-time")).toMatch(/ms$/);

  const responseBody = await response.json();

  const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
  expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

  expect(responseBody.dependencies.database.version).toEqual("18.2");
  expect(responseBody.dependencies.database.max_connections).toEqual(100);
  expect(responseBody.dependencies.database.opened_connections).toEqual(1);
});

test("GET /api/v1/status should include cache metadata headers", async () => {
  const firstResponse = await fetch("http://localhost:3000/api/v1/status");
  expect(firstResponse.status).toBe(200);
  expect(firstResponse.headers.get("etag")).toBeTruthy();

  const secondResponse = await fetch("http://localhost:3000/api/v1/status");
  expect(secondResponse.status).toBe(200);
  expect(secondResponse.headers.get("cache-control")).toContain("public");
  expect(secondResponse.headers.get("x-response-time")).toMatch(/ms$/);
});
