/**
 * Migration to create notifica_frete_users table for storing user credentials with bcrypt hashing.
 * Uses Bun.password with bcrypt algorithm (cost 12 rounds).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("notifica_frete_users", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    username: {
      type: "varchar(128)",
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: "varchar(255)",
      notNull: true,
      comment: "Bcrypt hash of password (Bun.password algorithm, cost 12)",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Index for fast username lookups
  pgm.createIndex("notifica_frete_users", "username", {
    name: "idx_nf_users_username",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("notifica_frete_users", "username", {
    name: "idx_nf_users_username",
    ifExists: true,
  });
  pgm.dropTable("notifica_frete_users");
};
