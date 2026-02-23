import { Carga } from "@notifica/shared/models/Carga";
import { logger } from "../lib/logger";
import { cargasRepository } from "../repositories/cargas-repository";
import { tegmaScraper } from "./tegma-scraper";
import { whatsappNotifier } from "./whatsapp-notifier";
import {
  recordCargaProcessed,
  recordNotification,
} from "../lib/metrics";

const log = logger.child({ component: "cargo_processor" });

export const cargoProcessor = {
  async process() {
    log.info("cargo_processor.start");
    const scrapedCargas = await tegmaScraper.fetchCargas();

    if (!scrapedCargas || scrapedCargas.length === 0) {
      log.info("cargo_processor.no_cargas");
      return { processed: 0, new_cargas: [] as unknown[] };
    }

    const idViagemList = scrapedCargas.map((c) => c.viagem);
    const existingIds = await cargasRepository.existsBatch(idViagemList);

    const newCargas = scrapedCargas.filter(
      (scrapedCarga) => !existingIds.has(scrapedCarga.viagem),
    );

    // Record duplicates
    const duplicateCount = scrapedCargas.length - newCargas.length;
    for (let i = 0; i < duplicateCount; i++) {
      recordCargaProcessed("duplicate");
    }

    const processedCargas: Array<{
      id_viagem: string;
      origem?: string;
      destino?: string;
      produto?: string;
      equipamento?: string;
      prevColeta?: string;
      notificationErrors?: Array<{ recipient: string; error: string }>;
    }> = [];
    const failedCargas: Array<{ id_viagem: string; error: string }> = [];

    for (const scrapedCarga of newCargas) {
      const carga = Carga.fromScrapedData(scrapedCarga);

      if (!carga.isValid()) {
        recordCargaProcessed("failed");
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: "Invalid carga data",
        });
        continue;
      }

      try {
        await cargasRepository.save(carga.toDatabase());

        const notificationErrors: Array<{ recipient: string; error: string }> = [];
        let notificationSuccessCount = 0;

        try {
          await whatsappNotifier.notifyJean(carga);
          notificationSuccessCount++;
          recordNotification("jean", "success");
        } catch (error) {
          notificationErrors.push({
            recipient: "jean",
            error: (error as Error).message,
          });
          recordNotification("jean", "failed");
          log.warn("cargo_processor.notify_failed", {
            recipient: "jean",
            id_viagem: carga.id_viagem,
            error,
          });
        }

        try {
          await whatsappNotifier.notifyJefferson(carga);
          notificationSuccessCount++;
          recordNotification("jefferson", "success");
        } catch (error) {
          notificationErrors.push({
            recipient: "jefferson",
            error: (error as Error).message,
          });
          recordNotification("jefferson", "failed");
          log.warn("cargo_processor.notify_failed", {
            recipient: "jefferson",
            id_viagem: carga.id_viagem,
            error,
          });
        }

        // Only mark as notified if at least one notification succeeded
        if (notificationSuccessCount > 0) {
          await cargasRepository.markAsNotified(carga.id_viagem);
        } else {
          log.warn("cargo_processor.no_notifications_sent", {
            id_viagem: carga.id_viagem,
          });
        }

        recordCargaProcessed("success");
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
      } catch (error) {
        recordCargaProcessed("failed");
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: (error as Error).message,
        });
        log.error("cargo_processor.process_item_failed", {
          id_viagem: scrapedCarga.viagem,
          error,
        });
      }
    }

    log.info("cargo_processor.completed", {
      processed: processedCargas.length,
      failed: failedCargas.length,
    });

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
