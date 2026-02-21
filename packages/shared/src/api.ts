export const API_V1_PREFIX = "/api/v1";

export const API_ROUTES = {
  root: `${API_V1_PREFIX}`,
  status: `${API_V1_PREFIX}/status`,
  cargas: `${API_V1_PREFIX}/cargas`,
  cargasCheck: `${API_V1_PREFIX}/cargas/check`,
  cargasWebhook: `${API_V1_PREFIX}/cargas/webhook`,
  cargasHealth: `${API_V1_PREFIX}/cargas/health`,
  migrations: `${API_V1_PREFIX}/migrations`,
  authLogin: `${API_V1_PREFIX}/auth/login`,
  authLogout: `${API_V1_PREFIX}/auth/logout`,
  authUser: `${API_V1_PREFIX}/auth/user`,
} as const;
