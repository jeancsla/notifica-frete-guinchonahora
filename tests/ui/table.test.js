/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableView from "pages/table";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => ({ children, href }) => (
  <a href={href}>{children}</a>
));

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/table" }),
}));

jest.mock("lib/api", () => ({
  fetchCargas: jest.fn(),
}));

describe("Table view", () => {
  it("renders rows from the API", async () => {
    fetchCargas.mockResolvedValue({
      cargas: [
        {
          id_viagem: "789",
          tipo_transporte: "Rodoviario",
          origem: "SP",
          destino: "MG",
        },
      ],
      pagination: { total: 1, limit: 15, offset: 0 },
    });

    render(<TableView />);

    expect(await screen.findByText("789")).toBeInTheDocument();
    expect(screen.getByText("Rodoviario")).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
