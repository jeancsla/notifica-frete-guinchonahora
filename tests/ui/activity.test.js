import { beforeEach, describe, expect, it, jest } from "bun:test";
import "tests/ui.setup.js";
/** @jest-environment jsdom */
import userEvent from "@testing-library/user-event";
import Activity from "pages/activity";
import { fetchCargas, fetchStatus } from "lib/api";
import { renderWithFreshSWR } from "./test-helpers";

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
  beforeEach(() => {
    fetchCargas.mockReset();
    fetchStatus.mockReset();
  });

  describe("timeline", () => {
    it("renders timeline events", async () => {
      fetchCargas.mockResolvedValue({
        cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
      fetchStatus.mockResolvedValue({
        updated_at: "2026-02-17T10:05:00Z",
      });

      const view = renderWithFreshSWR(<Activity />);
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

      const view = renderWithFreshSWR(<Activity />);
      const badges = await view.findAllByText("Sem data");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("refresh feedback", () => {
    it("shows success feedback after update", async () => {
      fetchCargas.mockResolvedValue({
        cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
      fetchStatus.mockResolvedValue({
        updated_at: "2026-02-17T10:05:00Z",
      });

      const view = renderWithFreshSWR(<Activity />);

      const refresh = await view.findByRole("button", { name: "Atualizar" });
      await userEvent.click(refresh);

      expect(
        await view.findByText("Atualizado com sucesso"),
      ).toBeInTheDocument();
      expect(view.getByText("Atualizado agora")).toBeInTheDocument();
    });
  });
});
