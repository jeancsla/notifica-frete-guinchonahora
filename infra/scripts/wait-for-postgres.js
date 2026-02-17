const { exec } = require("node:child_process");

function checkPostgres() {
  exec(
    "docker inspect --format='{{.State.Health.Status}}' postgres-dev",
    handleReturn,
  );

  function handleReturn(error, stdout, stderr) {
    if (error || stdout.trim() !== "healthy") {
      process.stdout.write(".");
      setTimeout(checkPostgres, 1000);
      return;
    }

    process.stdout.write(
      "\n\n🟢 Postgres está pronto e aceitando conexões\n\n",
    );
    process.exit(0);
  }
}

process.stdout.write("🔴 Aguardando Postgres");
checkPostgres();
