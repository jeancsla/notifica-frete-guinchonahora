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
