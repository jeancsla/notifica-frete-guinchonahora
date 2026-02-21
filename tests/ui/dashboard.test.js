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
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "pages/dashboard";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/dashboard" }),
}));

jest.mock("lib/api", () => ({
  fetchCargas: jest.fn(),
}));

describe("Dashboard page", () => {
  beforeEach(() => {
    fetchCargas.mockReset();
  });

  it("loads cargas and updates on refresh", async () => {
    fetchCargas
      .mockResolvedValueOnce({
        cargas: [
          {
            id_viagem: "123",
            origem: "SP",
            destino: "RJ",
            produto: "Cimento",
            prev_coleta: "2026-02-17",
            created_at: "2026-02-16T14:30:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      })
      .mockResolvedValueOnce({
        cargas: [
          {
            id_viagem: "456",
            origem: "BH",
            destino: "RJ",
            produto: "Areia",
            prev_coleta: "2026-02-18",
            created_at: "2026-02-17T10:15:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

    const view = render(<Dashboard allowMigrations={false} />);

    const firstId = await view.findAllByText("123");
    expect(firstId.length).toBeGreaterThan(0);
    expect(view.getByText("Total pendentes")).toBeInTheDocument();
    expect(view.getByText("Fretes pendentes")).toBeInTheDocument();
    expect(view.getByText(/Exibindo/)).toBeInTheDocument();

    const refresh = view.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    await waitFor(() => expect(fetchCargas).toHaveBeenCalledTimes(2));
    const secondId = await view.findAllByText("456");
    expect(secondId.length).toBeGreaterThan(0);
    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });

  it("displays table with correct columns", async () => {
    fetchCargas.mockResolvedValueOnce({
      cargas: [
        {
          id_viagem: "789",
          origem: "MG",
          destino: "SP",
          produto: "Brita",
          prev_coleta: "2026-02-20",
          created_at: "2026-02-18T08:00:00Z",
        },
      ],
      pagination: { total: 5, limit: 10, offset: 0 },
    });

    const view = render(<Dashboard allowMigrations={false} />);

    await view.findAllByText("789");

    const headers = view.getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Viagem");
    expect(headerTexts).toContain("Origem");
    expect(headerTexts).toContain("Destino");
    expect(headerTexts).toContain("Produto");
    expect(headerTexts).toContain("Previsão");
    expect(headerTexts).toContain("Criado em");
    expect(view.getByText(/Exibindo/)).toBeInTheDocument();
    expect(view.getAllByText("20/02/2026").length).toBeGreaterThanOrEqual(2);
  });

  it("renders fallback for invalid previsao date", async () => {
    fetchCargas.mockResolvedValueOnce({
      cargas: [
        {
          id_viagem: "999",
          origem: "SP",
          destino: "RJ",
          produto: "Aco",
          prev_coleta: "abc",
          created_at: "2026-02-18T08:00:00Z",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });

    const view = render(<Dashboard allowMigrations={false} />);

    await view.findAllByText("999");

    expect(view.queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(view.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("shows recent fretes when there are no pending fretes", async () => {
    fetchCargas
      .mockResolvedValueOnce({
        cargas: [],
        pagination: { total: 0, limit: 10, offset: 0 },
      })
      .mockResolvedValueOnce({
        cargas: [
          {
            id_viagem: "105712",
            origem: "TAUBATE-SP",
            destino: "TAUBATE-SP",
            produto: "PLATAFORMA AEREA",
            prev_coleta: "02/10/2025",
            created_at: "2025-10-04T23:35:06.005Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

    const view = render(<Dashboard allowMigrations={false} />);

    await view.findAllByText("105712");

    expect(
      view.getByText(
        "Nenhum frete pendente no momento. Exibindo fretes recentes.",
      ),
    ).toBeInTheDocument();
    expect(view.getByText("0")).toBeInTheDocument();
    expect(fetchCargas).toHaveBeenCalledTimes(2);
  });

  it("shows migrations button when allowMigrations is true", async () => {
    fetchCargas.mockResolvedValueOnce({
      cargas: [
        {
          id_viagem: "001",
          origem: "SP",
          destino: "RJ",
          produto: "Cimento",
          prev_coleta: "2026-02-17",
          created_at: "2026-02-16T14:30:00Z",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });

    const view = render(<Dashboard allowMigrations={true} />);

    await view.findAllByText("001");

    expect(
      view.getByRole("button", { name: "Rodar migrations" }),
    ).toBeInTheDocument();
  });

  it("hides migrations button when allowMigrations is false", async () => {
    fetchCargas.mockResolvedValueOnce({
      cargas: [
        {
          id_viagem: "002",
          origem: "SP",
          destino: "RJ",
          produto: "Cimento",
          prev_coleta: "2026-02-17",
          created_at: "2026-02-16T14:30:00Z",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });

    const view = render(<Dashboard allowMigrations={false} />);

    await view.findAllByText("002");

    expect(
      view.queryByRole("button", { name: "Rodar migrations" }),
    ).not.toBeInTheDocument();
  });
});
