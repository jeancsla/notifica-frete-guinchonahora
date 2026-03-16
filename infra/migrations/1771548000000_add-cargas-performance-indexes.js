exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex("notifica_frete_cargas", "created_at", {
    name: "idx_notifica_frete_cargas_created_at",
    ifNotExists: true,
  });

  pgm.createIndex("notifica_frete_cargas", ["notificado_em", "created_at"], {
    name: "idx_notifica_frete_cargas_notificado_created_at",
    ifNotExists: true,
  });

  pgm.createIndex("notifica_frete_cargas", "notificado_em", {
    name: "idx_notifica_frete_cargas_notificado_em",
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("notifica_frete_cargas", "notificado_em", {
    name: "idx_notifica_frete_cargas_notificado_em",
    ifExists: true,
  });

  pgm.dropIndex("notifica_frete_cargas", ["notificado_em", "created_at"], {
    name: "idx_notifica_frete_cargas_notificado_created_at",
    ifExists: true,
  });

  pgm.dropIndex("notifica_frete_cargas", "created_at", {
    name: "idx_notifica_frete_cargas_created_at",
    ifExists: true,
  });
};
