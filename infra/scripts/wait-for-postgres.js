const { exec } = require("node:child_process");

function checkPostgres() {
  exec("docker exec postgres-dev pg_isready --host localhost", handleReturn);

  // eslint-disable-next-line no-unused-vars
  function handleReturn(error, stdout, stderr) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");
      checkPostgres();
      return;
    }

    process.stdout.write(
      "\n\n🟢 Postgres está pronto e aceitando conexões\n\n",
    );
  }
}

process.stdout.write("🔴 Aguardando Postgres");
checkPostgres();
