/**
 * Script to create an initial admin user in the database.
 * Usage: bun run apps/api/src/scripts/create-admin.ts <username> <password>
 *
 * The password must meet strong password requirements:
 * - 12+ characters
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Special character (!@#$%^&*-_=+)
 */

import { getPooledClient } from "../infra/database";
import { createUser } from "../repositories/users-repository";
import { StrongPasswordSchema, formatZodError } from "../lib/schemas";
import { logger } from "../lib/logger";

const log = logger.child({ component: "create_admin_script" });

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: bun run apps/api/src/scripts/create-admin.ts <username> <password>",
    );
    console.error("");
    console.error("Password requirements:");
    console.error("  - Minimum 12 characters");
    console.error("  - Must contain uppercase letter");
    console.error("  - Must contain lowercase letter");
    console.error("  - Must contain number");
    console.error("  - Must contain special character (!@#$%^&*-_=+)");
    process.exit(1);
  }

  const [username, password] = args;

  // Validate username
  if (username.length < 1 || username.length > 128) {
    console.error("Error: Username must be 1-128 characters");
    process.exit(1);
  }

  // Validate password strength
  const passwordResult = StrongPasswordSchema.safeParse(password);
  if (!passwordResult.success) {
    console.error("Error: Password does not meet requirements");
    console.error(formatZodError(passwordResult.error));
    process.exit(1);
  }

  try {
    const client = await getPooledClient();

    try {
      // Create the user
      const user = await createUser(client, username, password);
      log.info("admin_user_created", { user_id: user.id, username });
      console.log(`✓ Admin user created successfully`);
      console.log(`  Username: ${user.username}`);
      console.log(`  User ID: ${user.id}`);
      console.log(`  Created: ${user.created_at}`);
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      console.error(`Error: Username '${username}' already exists`);
      process.exit(1);
    }

    log.error("admin_user_creation_failed", { error, username });
    console.error("Error: Failed to create admin user");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  log.error("admin_script_error", { error });
  console.error("Fatal error:", error);
  process.exit(1);
});
