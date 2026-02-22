import { beforeEach, describe, expect, it, jest } from "bun:test";
import "tests/ui.setup";
/** @jest-environment jsdom */
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import Status from "pages/status";
import { fetchStatus } from "lib/api";
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
  useRouter: () => ({ pathname: "/status" }),
}));

jest.mock("lib/api", () => ({
  fetchStatus: jest.fn(),
}));

describe("Status page", () => {
  const fetchStatusMock = asMock(fetchStatus);

  beforeEach(() => {
    fetchStatusMock.mockReset();
  });

  describe("status cards", () => {
    it("renders database status", async () => {
      fetchStatusMock.mockResolvedValue({
        updated_at: "2026-02-17T10:00:00Z",
        dependencies: {
          database: {
            version: "16.1",
            max_connections: 100,
            opened_connections: 2,
          },
        },
      });

      const view = renderWithFreshSWR(<Status />);

      expect(await view.findByText("16.1")).toBeInTheDocument();
      expect(view.getByText("100")).toBeInTheDocument();
    });
  });

  describe("refresh feedback", () => {
    it("shows success feedback when refresh succeeds", async () => {
      fetchStatusMock.mockResolvedValue({
        updated_at: "2026-02-17T10:00:00Z",
        dependencies: {
          database: {
            version: "16.1",
            max_connections: 100,
            opened_connections: 2,
          },
        },
      });

      const view = renderWithFreshSWR(<Status />);

      const refresh = await view.findByRole("button", { name: "Atualizar" });
      await userEvent.click(refresh);
      expect(
        await view.findByText("Atualizado com sucesso"),
      ).toBeInTheDocument();
      expect(view.getByText("Atualizado agora")).toBeInTheDocument();
    });

    it("shows error feedback when refresh fails", async () => {
      fetchStatusMock.mockResolvedValueOnce({
        updated_at: "2026-02-17T10:00:00Z",
        dependencies: {
          database: {
            version: "16.1",
            max_connections: 100,
            opened_connections: 2,
          },
        },
      });
      fetchStatusMock.mockRejectedValueOnce(new Error("API down"));

      const view = renderWithFreshSWR(<Status />);

      const refresh = await view.findByRole("button", { name: "Atualizar" });
      await userEvent.click(refresh);

      expect(await view.findByText("Erro: API down")).toBeInTheDocument();
    });
  });
});
