exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex("cargas", "created_at", {
    name: "idx_cargas_created_at",
    ifNotExists: true,
  });

  pgm.createIndex("cargas", ["notificado_em", "created_at"], {
    name: "idx_cargas_notificado_created_at",
    ifNotExists: true,
  });

  pgm.createIndex("cargas", "notificado_em", {
    name: "idx_cargas_notificado_em",
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("cargas", "notificado_em", {
    name: "idx_cargas_notificado_em",
    ifExists: true,
  });

  pgm.dropIndex("cargas", ["notificado_em", "created_at"], {
    name: "idx_cargas_notificado_created_at",
    ifExists: true,
  });

  pgm.dropIndex("cargas", "created_at", {
    name: "idx_cargas_created_at",
    ifExists: true,
  });
};
