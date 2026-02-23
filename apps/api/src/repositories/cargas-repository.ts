import { sql } from "kysely";
import type { CargaRecord } from "@notifica/shared/types";
import { query } from "../infra/database";
import { getKyselyDb } from "../infra/kysely-db";
import {
  ALL_COLUMNS,
  SORTABLE_COLUMNS,
  SORT_ORDERS,
  PREV_COLETA_ORDER_EXPR,
  type ColumnName,
  type SortableColumn,
  type SortOrder,
} from "../infra/db-types";

/**
 * Validate and sanitize field selection to only allow valid column names.
 * Returns validated columns or all columns if none provided.
 */
function getSelectedColumns(fields?: string[]): ColumnName[] {
  if (!fields || fields.length === 0) {
    return [...ALL_COLUMNS];
  }

  const validFields = fields.filter((field): field is ColumnName =>
    ALL_COLUMNS.includes(field as ColumnName)
  );

  return validFields.length > 0 ? validFields : [...ALL_COLUMNS];
}

/**
 * Validate sort column to prevent SQL injection.
 */
function getValidSortColumn(sortBy?: string): SortableColumn {
  if (!sortBy) return "created_at";
  return SORTABLE_COLUMNS.includes(sortBy as SortableColumn)
    ? (sortBy as SortableColumn)
    : "created_at";
}

/**
 * Validate sort order to prevent SQL injection.
 */
function getValidSortOrder(sortOrder?: string): SortOrder {
  if (!sortOrder) return "DESC";
  const upper = sortOrder.toUpperCase();
  return SORT_ORDERS.includes(upper as SortOrder)
    ? (upper as SortOrder)
    : "DESC";
}

export const cargasRepository = {
  async exists(id_viagem: string) {
    const result = await query({
      text: "SELECT EXISTS (SELECT 1 FROM cargas WHERE id_viagem = $1);",
      values: [id_viagem],
    });

    return Boolean(result.rows[0]?.exists);
  },

  async existsBatch(idViagemList: string[]) {
    if (!idViagemList || idViagemList.length === 0) {
      return new Set<string>();
    }

    const result = await query({
      text: "SELECT id_viagem FROM cargas WHERE id_viagem = ANY($1);",
      values: [idViagemList],
    });

    return new Set<string>(result.rows.map((row) => String(row.id_viagem)));
  },

  async save(carga: CargaRecord & { toDatabase?: () => CargaRecord }) {
    const dbData = carga.toDatabase ? carga.toDatabase() : carga;

    const result = await query({
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

    return result.rows[0] as CargaRecord;
  },

  async markAsNotified(id_viagem: string) {
    await query({
      text: "UPDATE cargas SET notificado_em = CURRENT_TIMESTAMP WHERE id_viagem = $1;",
      values: [id_viagem],
    });
  },

  async findAll({
    limit = 10,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
    fields,
  }: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    fields?: string[];
  } = {}) {
    const selectedColumns = getSelectedColumns(fields);
    const orderColumn = getValidSortColumn(sortBy);
    const orderDirection = getValidSortOrder(sortOrder);

    const db = getKyselyDb();

    // Build query with Kysely for type safety
    let qb = db.selectFrom("cargas").select(selectedColumns);

    // Handle special ordering for prev_coleta column
    if (orderColumn === "prev_coleta") {
      // Use raw SQL for the date parsing expression
      qb = qb.orderBy(
        sql.raw(`${PREV_COLETA_ORDER_EXPR} ${orderDirection} NULLS LAST`)
      );
    } else {
      qb = qb.orderBy(orderColumn, orderDirection);
    }

    const result = await qb.limit(limit).offset(offset).execute();

    return result as unknown as CargaRecord[];
  },

  async findNotNotified({
    limit = 100,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
    fields,
  }: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    fields?: string[];
  } = {}) {
    const selectedColumns = getSelectedColumns(fields);
    const orderColumn = getValidSortColumn(sortBy);
    const orderDirection = getValidSortOrder(sortOrder);

    const db = getKyselyDb();

    // Build query with Kysely for type safety
    let qb = db
      .selectFrom("cargas")
      .select(selectedColumns)
      .where("notificado_em", "is", null);

    // Handle special ordering for prev_coleta column
    if (orderColumn === "prev_coleta") {
      qb = qb.orderBy(
        sql.raw(`${PREV_COLETA_ORDER_EXPR} ${orderDirection} NULLS LAST`)
      );
    } else {
      qb = qb.orderBy(orderColumn, orderDirection);
    }

    const result = await qb.limit(limit).offset(offset).execute();

    return result as unknown as CargaRecord[];
  },

  async countNotNotified() {
    const result = await query({
      text: "SELECT COUNT(*) FROM cargas WHERE notificado_em IS NULL;",
    });
    return parseInt(String(result.rows[0]?.count ?? 0), 10);
  },

  async count() {
    const result = await query("SELECT COUNT(*) FROM cargas;");
    return parseInt(String(result.rows[0]?.count ?? 0), 10);
  },
};
