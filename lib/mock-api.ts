import { faker } from "@faker-js/faker/locale/pt_BR";

export type MockCarga = {
  id_viagem: string;
  origem: string;
  destino: string;
  produto: string;
  equipamento: string;
  prev_coleta: string;
  vr_frete: string;
  created_at: string;
  notificado_em: string | null;
};

export function generateMockCargas(count = 25): MockCarga[] {
  const cities = [
    "São Paulo",
    "Rio de Janeiro",
    "Belo Horizonte",
    "Curitiba",
    "Porto Alegre",
    "Salvador",
    "Fortaleza",
    "Brasília",
  ];
  const products = [
    "Eletrônicos",
    "Alimentos",
    "Químicos",
    "Têxteis",
    "Máquinas",
    "Móveis",
    "Papel",
    "Plásticos",
  ];
  const equipment = ["Truck", "Carreta", "Baú", "Sider", "Graneleiro", "Van"];

  return Array.from({ length: count }, () => {
    const now = new Date();
    const hoursOffset = faker.number.int({ min: -12, max: 120 });
    const prevColeta = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);

    return {
      id_viagem: faker.number.int({ min: 10000, max: 99999 }).toString(),
      origem: faker.helpers.arrayElement(cities),
      destino: faker.helpers.arrayElement(cities),
      produto: faker.helpers.arrayElement(products),
      equipamento: faker.helpers.arrayElement(equipment),
      prev_coleta: prevColeta.toISOString(),
      vr_frete: `R$ ${faker.number.int({ min: 1000, max: 50000 }).toLocaleString("pt-BR")}`,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      notificado_em: null,
    };
  });
}

export function generateMockStatus() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      version: "15.4",
      maxConnections: 100,
      openConnections: 5,
    },
  };
}
