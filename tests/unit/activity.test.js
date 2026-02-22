import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  test,
} from "bun:test";
import {
  buildActivityEvents,
  countActivityAlerts,
  countTodayEvents,
} from "lib/activity";

describe("activity helpers", () => {
  it("builds events from cargas and status", () => {
    const events = buildActivityEvents(
      [
        { id_viagem: "1", created_at: "2026-02-17T10:00:00Z" },
        { id_viagem: "2", prev_coleta: "2026-02-16" },
      ],
      { updated_at: "2026-02-17T10:05:00Z" },
    );

    expect(
      events.find((event) => event.title === "Carga capturada"),
    ).toBeTruthy();
    expect(events.some((event) => event.description.includes("Viagem 1"))).toBe(
      true,
    );
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

  it("counts only events from the current day", () => {
    const today = new Date("2026-02-17T12:00:00Z");
    const events = [
      { timestamp: new Date("2026-02-17T01:00:00Z").getTime() },
      { timestamp: new Date("2026-02-17T23:59:00Z").getTime() },
      { timestamp: new Date("2026-02-16T23:59:00Z").getTime() },
    ];

    expect(countTodayEvents(events, today)).toBe(2);
  });
});
