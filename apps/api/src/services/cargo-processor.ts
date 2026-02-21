import { Carga } from "../models/carga";
import { cargasRepository } from "../repositories/cargas-repository";
import { tegmaScraper } from "./tegma-scraper";
import { whatsappNotifier } from "./whatsapp-notifier";

export const cargoProcessor = {
  async process() {
    const scrapedCargas = await tegmaScraper.fetchCargas();

    if (!scrapedCargas || scrapedCargas.length === 0) {
      return { processed: 0, new_cargas: [] as unknown[] };
    }

    const idViagemList = scrapedCargas.map((c) => c.viagem);
    const existingIds = await cargasRepository.existsBatch(idViagemList);

    const newCargas = scrapedCargas.filter(
      (scrapedCarga) => !existingIds.has(scrapedCarga.viagem),
    );

    const processedCargas: Array<
      Carga & {
        notificationErrors?: Array<{ recipient: string; error: string }>;
      }
    > = [];
    const failedCargas: Array<{ id_viagem: string; error: string }> = [];

    for (const scrapedCarga of newCargas) {
      const carga = Carga.fromScrapedData(scrapedCarga);

      if (!carga.isValid()) {
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: "Invalid carga data",
        });
        continue;
      }

      try {
        await cargasRepository.save(carga.toDatabase());

        const notificationErrors: Array<{ recipient: string; error: string }> =
          [];

        try {
          await whatsappNotifier.notifyJean(carga);
        } catch (error) {
          notificationErrors.push({
            recipient: "jean",
            error: (error as Error).message,
          });
        }

        try {
          await whatsappNotifier.notifyJefferson(carga);
        } catch (error) {
          notificationErrors.push({
            recipient: "jefferson",
            error: (error as Error).message,
          });
        }

        await cargasRepository.markAsNotified(carga.id_viagem);

        processedCargas.push({
          ...carga,
          notificationErrors:
            notificationErrors.length > 0 ? notificationErrors : undefined,
        });
      } catch (error) {
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: (error as Error).message,
        });
      }
    }

    return {
      processed: processedCargas.length,
      failed: failedCargas.length,
      new_cargas: processedCargas.map((c) => ({
        id_viagem: c.id_viagem,
        origem: c.origem,
        destino: c.destino,
        produto: c.produto,
        equipamento: c.equipamento,
        prevColeta: c.prevColeta,
        notificationErrors: c.notificationErrors,
      })),
      failures: failedCargas,
    };
  },
};
