/**
 * Kysely database types for type-safe SQL queries
 */

export interface CargasTable {
  id: number;
  id_viagem: string;
  tipo_transporte: string | null;
  origem: string | null;
  destino: string | null;
  produto: string | null;
  equipamento: string | null;
  prev_coleta: string | null;
  qtd_entregas: string | null;
  vr_frete: string | null;
  termino: string | null;
  notificado_em: Date | null;
  created_at: Date;
}

export interface Database {
  cargas: CargasTable;
}

// Column names as const array for runtime validation
export const ALL_COLUMNS = [
  "id",
  "id_viagem",
  "tipo_transporte",
  "origem",
  "destino",
  "produto",
  "equipamento",
  "prev_coleta",
  "qtd_entregas",
  "vr_frete",
  "termino",
  "notificado_em",
  "created_at",
] as const;

export type ColumnName = (typeof ALL_COLUMNS)[number];

// Sortable columns with runtime validation
export const SORTABLE_COLUMNS: ColumnName[] = [
  "created_at",
  "prev_coleta",
  "id_viagem",
  "origem",
  "destino",
  "produto",
];

export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export const SORT_ORDERS = ["ASC", "DESC"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// SQL expression for ordering by prev_coleta (handles both DD/MM/YYYY and DD/MM/YY formats)
export const PREV_COLETA_ORDER_EXPR = `
  CASE
    WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN to_date(prev_coleta, 'DD/MM/YYYY')
    WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{2}$' THEN to_date(prev_coleta, 'DD/MM/YY')
    ELSE NULL
  END
`;
