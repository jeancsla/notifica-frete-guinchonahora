exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("cargas", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    id_viagem: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },
    tipo_transporte: {
      type: "varchar(100)",
    },
    origem: {
      type: "varchar(255)",
    },
    destino: {
      type: "varchar(255)",
    },
    produto: {
      type: "varchar(255)",
    },
    equipamento: {
      type: "varchar(100)",
    },
    prev_coleta: {
      type: "varchar(50)",
    },
    qtd_entregas: {
      type: "varchar(10)",
    },
    vr_frete: {
      type: "varchar(50)",
    },
    termino: {
      type: "varchar(50)",
    },
    notificado_em: {
      type: "timestamp",
    },
    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("cargas");
};
