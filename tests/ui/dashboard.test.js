/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "pages/dashboard";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => ({ children, href }) => (
  <a href={href}>{children}</a>
));

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
            prev_coleta: "2026-02-17",
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
            prev_coleta: "2026-02-18",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

    render(<Dashboard />);

    const firstId = await screen.findAllByText("123");
    expect(firstId.length).toBeGreaterThan(0);
    expect(screen.getByText("Em fila")).toBeInTheDocument();

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
});
