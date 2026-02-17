/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Activity from "pages/activity";
import { fetchCargas, fetchStatus } from "lib/api";

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

  it("renders timeline events", async () => {
    fetchCargas.mockResolvedValueOnce({
      cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    fetchStatus.mockResolvedValueOnce({
      updated_at: "2026-02-17T10:05:00Z",
    });

    render(<Activity />);
    expect(await screen.findByText("Timeline")).toBeInTheDocument();
    expect(await screen.findByText("Carga capturada")).toBeInTheDocument();
  });

  it("shows refresh feedback after update", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [{ id_viagem: "123", created_at: "2026-02-17T10:00:00Z" }],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    fetchStatus.mockResolvedValue({
      updated_at: "2026-02-17T10:05:00Z",
    });

    render(<Activity />);

    const refresh = await screen.findByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);

    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
