import { buildActivityEvents, countActivityAlerts } from "lib/activity";

describe("activity helpers", () => {
  it("builds events from cargas and status", () => {
    const events = buildActivityEvents(
      [
        { id_viagem: "1", created_at: "2026-02-17T10:00:00Z" },
        { id_viagem: "2", prev_coleta: "2026-02-16" },
      ],
      { updated_at: "2026-02-17T10:05:00Z" },
    );

    expect(events[0].title).toBe("Carga capturada");
    expect(events[0].description).toBe("Viagem 1 importada do portal Mills.");
    expect(
      events.find((event) => event.title === "Status checado"),
    ).toBeTruthy();
  });

  it("counts alerts for missing fields", () => {
    const alerts = countActivityAlerts([
      { id_viagem: "1", prev_coleta: "", destino: "SP" },
      { id_viagem: "2", prev_coleta: "2026-02-17", destino: "" },
      { id_viagem: "3", prev_coleta: "2026-02-17", destino: "RJ" },
    ]);

    expect(alerts).toBe(2);
  });
});
