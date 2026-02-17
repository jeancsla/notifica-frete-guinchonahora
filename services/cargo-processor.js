import tegmaScraper from "./tegma-scraper.js";
import whatsappNotifier from "./whatsapp-notifier.js";
import cargasRepository from "repositories/cargas-repository.js";
import Carga from "models/carga.js";

const cargoProcessor = {
  async process() {
    console.log("[CargoProcessor] Starting cargo processing...");

    // 1. Fetch cargas from Tegma
    const scrapedCargas = await tegmaScraper.fetchCargas();

    if (!scrapedCargas || scrapedCargas.length === 0) {
      console.log("[CargoProcessor] No cargas found");
      return { processed: 0, new_cargas: [] };
    }

    console.log(`[CargoProcessor] Found ${scrapedCargas.length} total cargas`);

    // 2. Filter new cargas (not in database) - using batch check to avoid N+1 queries
    const idViagemList = scrapedCargas.map((c) => c.viagem);
    const existingIds = await cargasRepository.existsBatch(idViagemList);

    const newCargas = scrapedCargas.filter((scrapedCarga) => {
      return !existingIds.has(scrapedCarga.viagem);
    });

    console.log(`[CargoProcessor] ${newCargas.length} new cargas to process`);

    // 3. Process each new carga
    const processedCargas = [];
    const failedCargas = [];

    for (const scrapedCarga of newCargas) {
      const carga = Carga.fromScrapedData(scrapedCarga);

      if (!carga.isValid()) {
        console.warn(`[CargoProcessor] Skipping invalid carga: ${scrapedCarga.viagem}`);
        failedCargas.push({ id_viagem: scrapedCarga.viagem, error: "Invalid carga data" });
        continue;
      }

      try {
        // 3.1 Save to database
        console.log(`[CargoProcessor] Saving carga ${carga.id_viagem}...`);
        await cargasRepository.save(carga);

        // 3.2 Send notifications (with individual error handling)
        console.log(`[CargoProcessor] Sending notifications for ${carga.id_viagem}...`);
        const notificationErrors = [];

        try {
          await whatsappNotifier.notifyJean(carga);
        } catch (error) {
          console.error(`[CargoProcessor] Failed to notify Jean for ${carga.id_viagem}:`, error.message);
          notificationErrors.push({ recipient: "jean", error: error.message });
        }

        try {
          await whatsappNotifier.notifyJefferson(carga);
        } catch (error) {
          console.error(`[CargoProcessor] Failed to notify Jefferson for ${carga.id_viagem}:`, error.message);
          notificationErrors.push({ recipient: "jefferson", error: error.message });
        }

        // 3.3 Mark as notified (even if some notifications failed)
        await cargasRepository.markAsNotified(carga.id_viagem);

        processedCargas.push({
          ...carga,
          notificationErrors: notificationErrors.length > 0 ? notificationErrors : undefined
        });

        console.log(`[CargoProcessor] Processed carga ${carga.id_viagem}`);

      } catch (error) {
        console.error(`[CargoProcessor] Error processing carga ${scrapedCarga.viagem}:`, error);
        failedCargas.push({
          id_viagem: scrapedCarga.viagem,
          error: error.message
        });
        // Continue with next carga instead of throwing
      }
    }

    console.log(`[CargoProcessor] Completed. Processed ${processedCargas.length} cargas, ${failedCargas.length} failed`);

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
        notificationErrors: c.notificationErrors
      })),
      failures: failedCargas
    };
  },
};

export default cargoProcessor;
