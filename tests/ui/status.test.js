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
import Status from "pages/status";
import { fetchStatus } from "lib/api";
import { swrDefaults } from "lib/swr";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
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
  const renderStatus = () =>
    render(
      <SWRConfig value={{ ...swrDefaults, provider: () => new Map() }}>
        <Status />
      </SWRConfig>,
    );

  beforeEach(() => {
    fetchStatus.mockReset();
  });

  it("renders database status", async () => {
    fetchStatus.mockResolvedValue({
      updated_at: "2026-02-17T10:00:00Z",
      dependencies: {
        database: {
          version: "16.1",
          max_connections: 100,
          opened_connections: 2,
        },
      },
    });

    const view = renderStatus();

    expect(await view.findByText("16.1")).toBeInTheDocument();
    expect(view.getByText("100")).toBeInTheDocument();

    const refresh = view.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });

  it("shows error feedback when refresh fails", async () => {
    fetchStatus
      .mockResolvedValueOnce({
        updated_at: "2026-02-17T10:00:00Z",
        dependencies: {
          database: {
            version: "16.1",
            max_connections: 100,
            opened_connections: 2,
          },
        },
      })
      .mockRejectedValueOnce(new Error("API down"));

    const view = renderStatus();

    const refresh = await view.findByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    expect(await view.findByText("Erro: API down")).toBeInTheDocument();
  });
});
