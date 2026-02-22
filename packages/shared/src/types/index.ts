export type SessionUser = {
  username: string;
};

export type CargaRecord = {
  id?: number;
  id_viagem: string;
  tipo_transporte?: string;
  origem?: string;
  destino?: string;
  produto?: string;
  equipamento?: string;
  prev_coleta?: string;
  qtd_entregas?: string;
  vr_frete?: string;
  termino?: string;
  notificado_em?: string | null;
  created_at?: string;
};

export type Pagination = {
  total: number | null;
  limit: number;
  offset: number;
};

export type CargasResponse = {
  cargas: CargaRecord[];
  pagination: Pagination;
};

export type StatusResponse = {
  updated_at: string;
  dependencies: {
    database: {
      version?: string;
      max_connections?: number;
      opened_connections?: number;
    };
  };
};

export type DashboardData = {
  pendingTotal: number;
  showingRecentFallback: boolean;
  cargas: CargaRecord[];
  total: number;
};
