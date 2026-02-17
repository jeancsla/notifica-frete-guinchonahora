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

    // 2. Filter new cargas (not in database)
    const newCargas = [];
    for (const scrapedCarga of scrapedCargas) {
      const exists = await cargasRepository.exists(scrapedCarga.viagem);
      if (!exists) {
        newCargas.push(scrapedCarga);
      }
    }

    console.log(`[CargoProcessor] ${newCargas.length} new cargas to process`);

    // 3. Process each new carga
    const processedCargas = [];
    for (const scrapedCarga of newCargas) {
      try {
        // Convert to Carga model
        const carga = Carga.fromScrapedData(scrapedCarga);

        if (!carga.isValid()) {
          console.warn(
            `[CargoProcessor] Skipping invalid carga: ${scrapedCarga.viagem}`,
          );
          continue;
        }

        // 3.1 Save to database
        console.log(`[CargoProcessor] Saving carga ${carga.id_viagem}...`);
        await cargasRepository.save(carga);

        // 3.2 Send notifications
        console.log(
          `[CargoProcessor] Sending notifications for ${carga.id_viagem}...`,
        );
        await whatsappNotifier.notifyJean(carga);
        await whatsappNotifier.notifyJefferson(carga);

        // 3.3 Mark as notified
        await cargasRepository.markAsNotified(carga.id_viagem);

        processedCargas.push(carga);
        console.log(`[CargoProcessor] Processed carga ${carga.id_viagem}`);
      } catch (error) {
        console.error(
          `[CargoProcessor] Error processing carga ${scrapedCarga.viagem}:`,
          error,
        );
        throw error;
      }
    }

    console.log(
      `[CargoProcessor] Completed. Processed ${processedCargas.length} cargas`,
    );

    return {
      processed: processedCargas.length,
      new_cargas: processedCargas.map((c) => ({
        id_viagem: c.id_viagem,
        origem: c.origem,
        destino: c.destino,
        produto: c.produto,
        equipamento: c.equipamento,
        prevColeta: c.prevColeta,
      })),
    };
  },
};

export default cargoProcessor;
