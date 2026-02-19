/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
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

    render(<Dashboard allowMigrations={false} />);

    const firstId = await screen.findAllByText("123");
    expect(firstId.length).toBeGreaterThan(0);
    expect(screen.getByText("Total pendentes")).toBeInTheDocument();
    expect(screen.getByText("Fretes pendentes")).toBeInTheDocument();
    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    await waitFor(() => expect(fetchCargas).toHaveBeenCalledTimes(2));
    const secondId = await screen.findAllByText("456");
    expect(secondId.length).toBeGreaterThan(0);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
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

    render(<Dashboard allowMigrations={false} />);

    await screen.findAllByText("789");

    const headers = screen.getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Viagem");
    expect(headerTexts).toContain("Origem");
    expect(headerTexts).toContain("Destino");
    expect(headerTexts).toContain("Produto");
    expect(headerTexts).toContain("Previsao");
    expect(headerTexts).toContain("Criado em");
    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();
    expect(screen.getAllByText("20/02/2026").length).toBeGreaterThanOrEqual(2);
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

    render(<Dashboard allowMigrations={false} />);

    await screen.findAllByText("999");

    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
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

    render(<Dashboard allowMigrations={false} />);

    await screen.findAllByText("105712");

    expect(
      screen.getByText(
        "Nenhum frete pendente no momento. Exibindo fretes recentes.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
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

    render(<Dashboard allowMigrations={true} />);

    await screen.findAllByText("001");

    expect(
      screen.getByRole("button", { name: "Rodar migrations" }),
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

    render(<Dashboard allowMigrations={false} />);

    await screen.findAllByText("002");

    expect(
      screen.queryByRole("button", { name: "Rodar migrations" }),
    ).not.toBeInTheDocument();
  });
});
