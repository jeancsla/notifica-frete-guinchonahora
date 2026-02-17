import retry from "async-retry";

async function waitForAllServices() {
  await waitForWebServer();
  await runMigrations();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw new Error("Status page is not available");
      }
    }
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

const orchestrator = {
  waitForAllServices,
};

export default orchestrator;
