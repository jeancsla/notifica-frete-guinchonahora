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
import "tests/ui.setup.js";
/** @jest-environment jsdom */
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import Activity from "pages/activity";
import { fetchCargas, fetchStatus } from "lib/api";
import { swrDefaults } from "lib/swr";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/activity" }),
}));

jest.mock("lib/api", () => ({
  fetchCargas: jest.fn(),
  fetchStatus: jest.fn(),
}));

describe("Activity page", () => {
  const renderActivity = () =>
    render(
      <SWRConfig value={{ ...swrDefaults, provider: () => new Map() }}>
        <Activity />
      </SWRConfig>,
    );

  beforeEach(() => {
    fetchCargas.mockReset();
    fetchStatus.mockReset();
  });

  it("renders timeline events", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    fetchStatus.mockResolvedValue({
      updated_at: "2026-02-17T10:05:00Z",
    });

    const view = renderActivity();
    expect(await view.findByText("Timeline")).toBeInTheDocument();
    expect(await view.findByText("Carga capturada")).toBeInTheDocument();
    expect(view.queryByText("2026-02-17T10:00:00Z")).not.toBeInTheDocument();
  });

  it("shows 'Sem data' when event timestamp is missing", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [{ id_viagem: "123", created_at: null, prev_coleta: null }],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    fetchStatus.mockResolvedValue({
      updated_at: null,
    });

    const view = renderActivity();
    const badges = await view.findAllByText("Sem data");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows refresh feedback after update", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    fetchStatus.mockResolvedValue({
      updated_at: "2026-02-17T10:05:00Z",
    });

    const view = renderActivity();

    const refresh = await view.findByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
