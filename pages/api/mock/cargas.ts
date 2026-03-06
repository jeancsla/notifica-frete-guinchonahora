import type { NextApiRequest, NextApiResponse } from "next";
import { generateMockCargas } from "../../../lib/mock-api";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cargas = generateMockCargas(25);
  res.status(200).json({
    cargas,
    total: cargas.length,
    pendingTotal: cargas.filter((c) => !c.notificado_em).length,
  });
}
