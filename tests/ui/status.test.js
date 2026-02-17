/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Status from "pages/status";
import { fetchStatus } from "lib/api";

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

    render(<Status />);

    expect(await screen.findByText("16.1")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
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

    render(<Status />);

    const refresh = await screen.findByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    expect(await screen.findByText("Falha ao atualizar")).toBeInTheDocument();
    const errorMessages = screen.getAllByText("Erro: API down");
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});
