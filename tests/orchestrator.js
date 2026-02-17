import retry from "async-retry";

async function waitForAllServices() {
  await waitForPostgres();
  await waitForWebServer();
  await runMigrations();

  async function waitForWebServer() {
    console.log("Waiting for Web Server...");
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
      onRetry: (error, attempt) => {
        console.log(
          `Attempt ${attempt}: Web Server not ready yet... ${error.message}`,
        );
      },
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw new Error(`Status page returned ${response.status}`);
      }
      console.log("Web Server is ready!");
    }
  }
}

async function waitForPostgres() {
  console.log("Waiting for Postgres (via Web Server status)...");
  return retry(fetchStatusPage, {
    retries: 100,
    maxTimeout: 1000,
    onRetry: (error, attempt) => {
      console.log(
        `Attempt ${attempt}: Postgres not ready yet... ${error.message}`,
      );
    },
  });

  async function fetchStatusPage() {
    const response = await fetch("http://localhost:3000/api/v1/status");

    if (response.status !== 200) {
      throw new Error(`Status page returned ${response.status}`);
    }
    console.log("Postgres is ready (status page 200)!");
  }
}

async function runMigrations() {
  const response = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
    headers: {
      "x-admin-key": process.env.ADMIN_API_KEY || "",
    },
  });

  if (![200, 201].includes(response.status)) {
    throw new Error("Failed to run migrations");
  }
}

async function getAuthCookie() {
  const response = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin",
    }),
  });

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Failed to get auth cookie");
  }

  return setCookie.split(";")[0];
}

const orchestrator = {
  waitForAllServices,
  getAuthCookie,
};

export default orchestrator;
