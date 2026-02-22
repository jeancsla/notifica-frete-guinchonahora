import { beforeEach, describe, expect, it, jest } from "bun:test";
import "tests/ui.setup";
/** @jest-environment jsdom */
import type { ReactNode } from "react";
import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "pages/dashboard";
import { fetchCargas } from "lib/api";
import { renderWithFreshSWR } from "./test-helpers";
import { asMock } from "tests/test-utils";

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
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
  const fetchCargasMock = asMock(fetchCargas);
  const renderDashboard = (props: { allowMigrations: boolean }) =>
    renderWithFreshSWR(<Dashboard user={{ username: "test" }} {...props} />);

  beforeEach(() => {
    fetchCargasMock.mockReset();
  });

  describe("refresh and fetch lifecycle", () => {
    it("loads cargas and updates on refresh", async () => {
      fetchCargasMock.mockResolvedValueOnce({
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
      });
      fetchCargasMock.mockResolvedValueOnce({
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

      const view = renderDashboard({ allowMigrations: false });

      const firstId = await view.findAllByText("123");
      expect(firstId.length).toBeGreaterThan(0);
      expect(view.getByText("Total pendentes")).toBeInTheDocument();
      expect(view.getByText("Fretes pendentes")).toBeInTheDocument();
      expect(view.getByText(/Exibindo/)).toBeInTheDocument();

      const refresh = view.getByRole("button", { name: "Atualizar" });
      await userEvent.click(refresh);

      await waitFor(() => expect(fetchCargasMock).toHaveBeenCalledTimes(2));
      const secondId = await view.findAllByText("456");
      expect(secondId.length).toBeGreaterThan(0);
      expect(
        await view.findByText("Atualizado com sucesso"),
      ).toBeInTheDocument();
      expect(view.getByText("Atualizado agora")).toBeInTheDocument();
    });
  });

  describe("table rendering", () => {
    it("displays table with correct columns", async () => {
      fetchCargasMock.mockResolvedValue({
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

      const view = renderDashboard({ allowMigrations: false });

      await view.findAllByText("789");

      const headers = view.getAllByRole("columnheader");
      const headerTexts = headers.map((header) => header.textContent);
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
      fetchCargasMock.mockResolvedValue({
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

      const view = renderDashboard({ allowMigrations: false });

      await view.findAllByText("999");

      expect(view.queryByText("Invalid Date")).not.toBeInTheDocument();
      expect(view.getAllByText("-").length).toBeGreaterThan(0);
    });
  });

  describe("conditional sections", () => {
    it("shows recent fretes when there are no pending fretes", async () => {
      fetchCargasMock.mockResolvedValueOnce({
        cargas: [],
        pagination: { total: 0, limit: 10, offset: 0 },
      });
      fetchCargasMock.mockResolvedValueOnce({
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

      const view = renderDashboard({ allowMigrations: false });

      await view.findAllByText("105712");

      expect(
        view.getByText(
          "Nenhum frete pendente no momento. Exibindo fretes recentes.",
        ),
      ).toBeInTheDocument();
      expect(view.getByText("0")).toBeInTheDocument();
      expect(fetchCargasMock).toHaveBeenCalledTimes(2);
    });

    it("shows migrations button when allowMigrations is true", async () => {
      fetchCargasMock.mockResolvedValue({
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

      const view = renderDashboard({ allowMigrations: true });

      await view.findAllByText("001");

      expect(
        view.getByRole("button", { name: "Rodar migrations" }),
      ).toBeInTheDocument();
    });

    it("hides migrations button when allowMigrations is false", async () => {
      fetchCargasMock.mockResolvedValue({
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

      const view = renderDashboard({ allowMigrations: false });

      await view.findAllByText("002");

      expect(
        view.queryByRole("button", { name: "Rodar migrations" }),
      ).not.toBeInTheDocument();
    });
  });
});
