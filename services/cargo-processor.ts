import type { ScrapedCargaInput } from "@notifica/shared/models/Carga";
import Carga from "@notifica/shared/models/Carga";
import tegmaScraper from "./tegma-scraper";
import whatsappNotifier from "./whatsapp-notifier";
import cargasRepository from "repositories/cargas-repository";

type NotificationError = { recipient: string; error: string };

type ProcessedCarga = {
  id_viagem: string;
  origem?: string;
  destino?: string;
  produto?: string;
  equipamento?: string;
  prevColeta?: string;
  notificationErrors?: NotificationError[];
};

const cargoProcessor = {
  async process() {
    console.log("[CargoProcessor] Starting cargo processing...");

    const scrapedCargas = await tegmaScraper.fetchCargas();

    if (!scrapedCargas || scrapedCargas.length === 0) {
      console.log("[CargoProcessor] No cargas found");
      return { processed: 0, new_cargas: [] as ProcessedCarga[] };
    }

    console.log(`[CargoProcessor] Found ${scrapedCargas.length} total cargas`);

    const idViagemList = scrapedCargas.map((c) => c.viagem);
    const existingIds = await cargasRepository.existsBatch(idViagemList);

    const newCargas = scrapedCargas.filter(
      (scrapedCarga) => !existingIds.has(scrapedCarga.viagem),
    );

    console.log(`[CargoProcessor] ${newCargas.length} new cargas to process`);

    const processedCargas: ProcessedCarga[] = [];
    const failedCargas: Array<{ id_viagem: string; error: string }> = [];

    for (const scrapedCarga of newCargas) {
      const carga = Carga.fromScrapedData(scrapedCarga as ScrapedCargaInput);

      if (!carga.isValid()) {
        console.warn(
          `[CargoProcessor] Skipping invalid carga: ${scrapedCarga.viagem}`,
        );
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: "Invalid carga data",
        });
        continue;
      }

      try {
        console.log(`[CargoProcessor] Saving carga ${carga.id_viagem}...`);
        await cargasRepository.save(carga);

        console.log(
          `[CargoProcessor] Sending notifications for ${carga.id_viagem}...`,
        );
        const notificationErrors: NotificationError[] = [];

        try {
          await whatsappNotifier.notifyJean(carga);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[CargoProcessor] Failed to notify Jean for ${carga.id_viagem}:`,
            message,
          );
          notificationErrors.push({ recipient: "jean", error: message });
        }

        try {
          await whatsappNotifier.notifyJefferson(carga);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[CargoProcessor] Failed to notify Jefferson for ${carga.id_viagem}:`,
            message,
          );
          notificationErrors.push({ recipient: "jefferson", error: message });
        }

        await cargasRepository.markAsNotified(carga.id_viagem);

        processedCargas.push({
          id_viagem: carga.id_viagem,
          origem: carga.origem,
          destino: carga.destino,
          produto: carga.produto,
          equipamento: carga.equipamento,
          prevColeta: carga.prevColeta,
          notificationErrors:
            notificationErrors.length > 0 ? notificationErrors : undefined,
        });

        console.log(`[CargoProcessor] Processed carga ${carga.id_viagem}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[CargoProcessor] Error processing carga ${scrapedCarga.viagem}:`,
          error,
        );
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: message,
        });
      }
    }

    console.log(
      `[CargoProcessor] Completed. Processed ${processedCargas.length} cargas, ${failedCargas.length} failed`,
    );

    return {
      processed: processedCargas.length,
      failed: failedCargas.length,
      new_cargas: processedCargas,
      failures: failedCargas,
    };
  },
};

export default cargoProcessor;
