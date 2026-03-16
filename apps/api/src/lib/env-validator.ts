/**
 * Environment variable validation and startup checks.
 * Called before app initialization to ensure all required configuration is present.
 */

const log = console; // Use console for startup validation

interface ValidationError {
  field: string;
  message: string;
}

const errors: ValidationError[] = [];

/**
 * Validate that a required env var is present and non-empty
 */
function validateRequired(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    errors.push({
      field: name,
      message: "Required but not set or empty",
    });
    return null;
  }
  return value;
}

/**
 * Validate that a secret is at least 32 bytes long (to prevent weak secrets)
 */
function validateSecretLength(name: string, minBytes = 32): boolean {
  const value = process.env[name];
  if (!value) {
    errors.push({
      field: name,
      message: `Secret not set (required)`,
    });
    return false;
  }

  // Base64 encoding: 4 chars = 3 bytes, so 32 bytes = ~43 chars base64
  // Allow 30 chars minimum to be safe
  if (value.length < minBytes) {
    errors.push({
      field: name,
      message: `Secret too short (${value.length} chars, need ${minBytes}+). Generate with: openssl rand -base64 32`,
    });
    return false;
  }

  return true;
}

/**
 * Validate that a URL is HTTPS (for credentials protection)
 */
function validateHttpsUrl(name: string): boolean {
  const value = process.env[name];
  if (!value) {
    errors.push({
      field: name,
      message: "URL not set",
    });
    return false;
  }

  if (!value.startsWith("https://")) {
    errors.push({
      field: name,
      message: `Must use HTTPS to protect credentials (got: ${value})`,
    });
    return false;
  }

  return true;
}

/**
 * Validate password strength (12+ chars, uppercase, lowercase, number, special)
 */
function validatePasswordStrength(name: string): boolean {
  const password = process.env[name];
  if (!password) {
    errors.push({
      field: name,
      message: "Password not set",
    });
    return false;
  }

  const checks = [
    { test: password.length >= 12, message: "Minimum 12 characters" },
    { test: /[A-Z]/.test(password), message: "At least one uppercase letter" },
    { test: /[a-z]/.test(password), message: "At least one lowercase letter" },
    { test: /[0-9]/.test(password), message: "At least one number" },
    {
      test: /[!@#$%^&*\-_=+]/.test(password),
      message: "At least one special character (!@#$%^&*-_=+)",
    },
  ];

  const failedChecks = checks.filter((c) => !c.test);
  if (failedChecks.length > 0) {
    errors.push({
      field: name,
      message: `Weak password. Missing: ${failedChecks.map((c) => c.message).join(", ")}`,
    });
    return false;
  }

  return true;
}

/**
 * Validate that ALLOW_DEV_DEFAULT_ADMIN is not set in production (EC-7)
 */
function validateDevDefaultsNotInProduction(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDevDefaults = process.env.ALLOW_DEV_DEFAULT_ADMIN === "true";

  if (isProduction && allowDevDefaults) {
    errors.push({
      field: "ALLOW_DEV_DEFAULT_ADMIN",
      message:
        "MUST NOT be set in production. Remove this env var before deploying.",
    });
    return false;
  }

  return true;
}

/**
 * Main validation function
 */
export function validateEnv(): void {
  log.log("🔍 Validating environment variables...");

  // Database
  validateRequired("DATABASE_URL");
  validateRequired("POSTGRES_HOST");
  validateRequired("POSTGRES_PORT");
  validateRequired("POSTGRES_USER");
  validateRequired("POSTGRES_DB");
  validateRequired("POSTGRES_PASSWORD");

  // Auth & Security
  validateRequired("ADMIN_USERNAME");
  validatePasswordStrength("ADMIN_PASSWORD");
  validateSecretLength("SESSION_SECRET", 32);
  validateSecretLength("ADMIN_API_KEY", 32);
  validateSecretLength("CRON_WEBHOOK_SECRET", 32);

  // Tegma/Mills Integration
  validateRequired("TEGMA_BASE_URL");
  validateHttpsUrl("TEGMA_BASE_URL"); // EC-12
  validateRequired("TEGMA_USERNAME");
  validateRequired("TEGMA_PASSWORD");

  // Evolution API (WhatsApp)
  validateRequired("EVOLUTION_API_INSTANCE");
  validateRequired("EVOLUTION_API_KEY");
  validateRequired("NOTIFY_JEAN_PHONE");
  validateRequired("NOTIFY_JEFFERSON_PHONE");

  // Special checks
  validateDevDefaultsNotInProduction(); // EC-7

  // If any errors, throw and prevent startup
  if (errors.length > 0) {
    console.error("\n❌ Environment validation FAILED:\n");
    errors.forEach((err) => {
      console.error(`  ${err.field}: ${err.message}`);
    });
    console.error(
      "\n📖 See .env.example for required variables and their formats.\n",
    );

    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      console.error(
        "💡 For local development, copy .env.example to .env.development\n" +
          "   and fill in your values. For secrets, use:\n" +
          "   $ openssl rand -base64 32\n",
      );
    }

    throw new Error(
      `Environment validation failed. See errors above. (${errors.length} error${errors.length !== 1 ? "s" : ""})`,
    );
  }

  log.log("✅ All environment variables validated successfully\n");
}
