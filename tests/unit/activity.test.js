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
  BUSINESS_TIME_ZONE,
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
    expect(events.every((event) => event.id)).toBe(true);
  });

  it("counts alerts for missing fields", () => {
    const alerts = countActivityAlerts([
      { id_viagem: "1", prev_coleta: "", destino: "SP" },
      { id_viagem: "2", prev_coleta: "2026-02-17", destino: "" },
      { id_viagem: "3", prev_coleta: "2026-02-17", destino: "RJ" },
    ]);

    expect(alerts).toBe(2);
  });

  it("counts only events from the current day in Sao Paulo timezone", () => {
    const today = new Date("2026-02-17T18:00:00Z");
    const events = [
      { timestamp: new Date("2026-02-17T14:00:00Z").getTime() },
      { timestamp: new Date("2026-02-17T02:00:00Z").getTime() },
      { timestamp: null },
    ];

    expect(countTodayEvents(events, today, BUSINESS_TIME_ZONE)).toBe(1);
  });

  it("keeps unknown dates as 'Sem data' and out of today's count", () => {
    const events = buildActivityEvents(
      [{ id_viagem: "1", created_at: null, prev_coleta: null }],
      null,
    );

    expect(events[0].time).toBe("Sem data");
    expect(events[0].timestamp).toBeNull();
    expect(countTodayEvents(events, new Date("2026-02-17T12:00:00Z"))).toBe(0);
  });
});
