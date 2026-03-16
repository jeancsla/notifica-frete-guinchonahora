import type { PoolClient } from "pg";
import { query } from "../infra/database";
import { logger } from "../lib/logger";

const log = logger.child({ component: "users_repository" });

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// Pre-computed dummy hash for timing-safe password verification (EC-1)
// This is a bcrypt hash of a random password, used when a user doesn't exist
// to ensure the verification time is constant regardless of whether the user exists
let DUMMY_HASH: string | null = null;

/**
 * Initialize the dummy hash on first use.
 * This is done lazily to avoid unnecessary hashing on startup.
 */
async function getDummyHash(): Promise<string> {
  if (DUMMY_HASH) {
    return DUMMY_HASH;
  }

  try {
    // Generate a consistent dummy hash using a fixed password
    DUMMY_HASH = await Bun.password.hash(
      "dummy-password-for-timing-safe-verification",
      {
        algorithm: "bcrypt",
        cost: 12,
      },
    );
    return DUMMY_HASH;
  } catch (error) {
    log.error("users_repository.dummy_hash_generation_failed", { error });
    // Fallback: use a pre-generated bcrypt hash of the same password
    // This should never be reached, but provides safety
    DUMMY_HASH = "$2b$12$M.JrNmfFCIQ3KVVLWLq8gOYL7p.7qmx5.HQnkVJLHJGqJLp5QaVJW";
    return DUMMY_HASH;
  }
}

/**
 * Hash a plaintext password using bcrypt (via Bun.password)
 */
async function hashPassword(plainPassword: string): Promise<string> {
  return Bun.password.hash(plainPassword, {
    algorithm: "bcrypt",
    cost: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  });
}

/**
 * Create a new user with hashed password.
 * Using client for transaction support.
 */
export async function createUser(
  client: PoolClient,
  username: string,
  plainPassword: string,
): Promise<User> {
  const passwordHash = await hashPassword(plainPassword);

  const result = await client.query(
    `INSERT INTO notifica_frete_users (username, password_hash, created_at, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, username, password_hash, created_at, updated_at`,
    [username, passwordHash],
  );

  return result.rows[0] as User;
}

/**
 * Find a user by username (without password verification).
 * Returns null if user not found.
 */
export async function findByUsername(username: string): Promise<User | null> {
  const result = await query({
    text: `SELECT id, username, password_hash, created_at, updated_at
           FROM notifica_frete_users
           WHERE username = $1`,
    values: [username],
  });

  return result.rows[0] ? (result.rows[0] as User) : null;
}

/**
 * Verify a user's password with timing-safe comparison (EC-1).
 *
 * This function is designed to prevent timing attacks via username enumeration:
 * - Always runs Bun.password.verify() even if user doesn't exist
 * - Uses a dummy hash when user doesn't exist to ensure constant time
 * - Returns null only after the verify completes (timing is same regardless)
 *
 * Returns the User object if password is correct, null otherwise.
 */
export async function verifyPassword(
  username: string,
  plainPassword: string,
): Promise<User | null> {
  // Fetch user and dummy hash in parallel for better performance
  const [user, dummyHash] = await Promise.all([
    findByUsername(username),
    getDummyHash(),
  ]);

  // Always verify using either the real hash or dummy hash
  // This ensures timing is constant whether user exists or not
  const hashToVerify = user?.password_hash ?? dummyHash;

  try {
    const isValid = await Bun.password.verify(plainPassword, hashToVerify);

    // Only return user if password is valid AND user exists
    // If user is null, return null even if dummy hash matched (impossible case)
    if (isValid && user) {
      log.debug("users_repository.password_verification_success", {
        username,
      });
      return user;
    }

    if (!isValid && user) {
      log.warn("users_repository.password_verification_failed", {
        username,
      });
    }

    return null;
  } catch (error) {
    log.error("users_repository.password_verification_error", {
      error,
      username,
    });
    return null;
  }
}

/**
 * Update a user's password
 */
export async function updatePassword(
  client: PoolClient,
  userId: number,
  plainPassword: string,
): Promise<void> {
  const passwordHash = await hashPassword(plainPassword);

  await client.query(
    `UPDATE notifica_frete_users
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId],
  );

  log.info("users_repository.password_updated", { user_id: userId });
}
