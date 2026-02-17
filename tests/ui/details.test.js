/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Details from "pages/details";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => ({ children, href }) => (
  <a href={href}>{children}</a>
));

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/details", isReady: true, query: {} }),
}));

jest.mock("lib/api", () => ({
  fetchCargas: jest.fn(),
}));

describe("Details page", () => {
  beforeEach(() => {
    fetchCargas.mockReset();
  });

  it("shows selected carga details", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [
        {
          id_viagem: "555",
          origem: "SP",
          destino: "GO",
          produto: "Equipamento",
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0 },
    });

    render(<Details />);

    const idCells = await screen.findAllByText("555");
    expect(idCells.length).toBeGreaterThan(0);
    const productCells = screen.getAllByText("Equipamento");
    expect(productCells.length).toBeGreaterThan(0);

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
