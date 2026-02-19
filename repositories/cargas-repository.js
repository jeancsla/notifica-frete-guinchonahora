import database from "infra/database.js";

const cargasRepository = {
  async exists(id_viagem) {
    const result = await database.query({
      text: "SELECT EXISTS (SELECT 1 FROM cargas WHERE id_viagem = $1);",
      values: [id_viagem],
    });
    return result.rows[0].exists;
  },

  async existsBatch(idViagemList) {
    if (!idViagemList || idViagemList.length === 0) {
      return new Set();
    }

    const result = await database.query({
      text: "SELECT id_viagem FROM cargas WHERE id_viagem = ANY($1);",
      values: [idViagemList],
    });

    return new Set(result.rows.map((row) => row.id_viagem));
  },

  async save(carga) {
    const dbData = carga.toDatabase ? carga.toDatabase() : carga;

    const result = await database.query({
      text: `
        INSERT INTO cargas (
          id_viagem, tipo_transporte, origem, destino, produto,
          equipamento, prev_coleta, qtd_entregas, vr_frete, termino
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *;
      `,
      values: [
        dbData.id_viagem,
        dbData.tipo_transporte,
        dbData.origem,
        dbData.destino,
        dbData.produto,
        dbData.equipamento,
        dbData.prev_coleta,
        dbData.qtd_entregas,
        dbData.vr_frete,
        dbData.termino,
      ],
    });

    return result.rows[0];
  },

  async markAsNotified(id_viagem) {
    await database.query({
      text: "UPDATE cargas SET notificado_em = CURRENT_TIMESTAMP WHERE id_viagem = $1;",
      values: [id_viagem],
    });
  },

  async findAll({
    limit = 10,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const allowedColumns = [
      "created_at",
      "prev_coleta",
      "id_viagem",
      "origem",
      "destino",
      "produto",
    ];
    const allowedOrders = ["ASC", "DESC"];

    const orderColumn = allowedColumns.includes(sortBy) ? sortBy : "created_at";
    const orderDirection = allowedOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    const prevColetaOrderExpr = `
      CASE
        WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN to_date(prev_coleta, 'DD/MM/YYYY')
        WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{2}$' THEN to_date(prev_coleta, 'DD/MM/YY')
        ELSE NULL
      END
    `;

    const orderByClause =
      orderColumn === "prev_coleta"
        ? `${prevColetaOrderExpr} ${orderDirection} NULLS LAST`
        : `${orderColumn} ${orderDirection}`;

    const result = await database.query({
      text: `
        SELECT * FROM cargas
        ORDER BY ${orderByClause}
        LIMIT $1 OFFSET $2;
      `,
      values: [limit, offset],
    });

    return result.rows;
  },

  async findNotNotified({
    limit = 100,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const allowedColumns = [
      "created_at",
      "prev_coleta",
      "id_viagem",
      "origem",
      "destino",
      "produto",
    ];
    const allowedOrders = ["ASC", "DESC"];

    const orderColumn = allowedColumns.includes(sortBy) ? sortBy : "created_at";
    const orderDirection = allowedOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    const prevColetaOrderExpr = `
      CASE
        WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN to_date(prev_coleta, 'DD/MM/YYYY')
        WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{2}$' THEN to_date(prev_coleta, 'DD/MM/YY')
        ELSE NULL
      END
    `;

    const orderByClause =
      orderColumn === "prev_coleta"
        ? `${prevColetaOrderExpr} ${orderDirection} NULLS LAST`
        : `${orderColumn} ${orderDirection}`;

    const result = await database.query({
      text: `
        SELECT * FROM cargas
        WHERE notificado_em IS NULL
        ORDER BY ${orderByClause}
        LIMIT $1 OFFSET $2;
      `,
      values: [limit, offset],
    });

    return result.rows;
  },

  async countNotNotified() {
    const result = await database.query({
      text: "SELECT COUNT(*) FROM cargas WHERE notificado_em IS NULL;",
    });
    return parseInt(result.rows[0].count);
  },

  async count() {
    const result = await database.query("SELECT COUNT(*) FROM cargas;");
    return parseInt(result.rows[0].count);
  },
};

export default cargasRepository;
