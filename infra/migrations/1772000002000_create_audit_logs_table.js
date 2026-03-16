/**
 * Migration to create notifica_frete_audit_logs table for security event tracking.
 * Stores login attempts, API access, and other security-relevant events.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("notifica_frete_audit_logs", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },
    event_type: {
      type: "varchar(64)",
      notNull: true,
      comment: "Type of event (login_success, login_failure, api_access, etc)",
    },
    user_id: {
      type: "integer",
      references: '"notifica_frete_users"(id)',
      onDelete: "set null",
    },
    username: {
      type: "varchar(128)",
      comment:
        "Username for the event (may differ from user_id if user deleted)",
    },
    ip_address: {
      type: "inet",
      comment: "IP address of the request",
    },
    user_agent: {
      type: "text",
      comment: "HTTP User-Agent header",
    },
    details: {
      type: "jsonb",
      default: "{}",
      comment: "Additional event details as JSON",
    },
    severity: {
      type: "varchar(32)",
      default: "info",
      check: "severity IN ('debug', 'info', 'warn', 'error')",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Indexes for efficient querying
  pgm.createIndex("notifica_frete_audit_logs", "event_type");
  pgm.createIndex("notifica_frete_audit_logs", "user_id");
  pgm.createIndex("notifica_frete_audit_logs", "created_at");
  pgm.createIndex("notifica_frete_audit_logs", "ip_address");
  pgm.createIndex("notifica_frete_audit_logs", "severity");

  // Composite index for common queries
  pgm.createIndex("notifica_frete_audit_logs", ["event_type", "created_at"], {
    name: "idx_nf_audit_event_time",
  });

  pgm.createIndex("notifica_frete_audit_logs", ["user_id", "created_at"], {
    name: "idx_nf_audit_user_time",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("notifica_frete_audit_logs", "event_type", {
    ifExists: true,
  });
  pgm.dropIndex("notifica_frete_audit_logs", "user_id", { ifExists: true });
  pgm.dropIndex("notifica_frete_audit_logs", "created_at", { ifExists: true });
  pgm.dropIndex("notifica_frete_audit_logs", "ip_address", { ifExists: true });
  pgm.dropIndex("notifica_frete_audit_logs", "severity", { ifExists: true });
  pgm.dropIndex("notifica_frete_audit_logs", ["event_type", "created_at"], {
    name: "idx_nf_audit_event_time",
    ifExists: true,
  });
  pgm.dropIndex("notifica_frete_audit_logs", ["user_id", "created_at"], {
    name: "idx_nf_audit_user_time",
    ifExists: true,
  });
  pgm.dropTable("notifica_frete_audit_logs");
};
