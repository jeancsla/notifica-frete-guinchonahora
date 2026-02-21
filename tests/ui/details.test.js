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
import Details from "pages/details";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

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

    const view = render(<Details />);

    const idCells = await view.findAllByText("555");
    expect(idCells.length).toBeGreaterThan(0);
    const productCells = view.getAllByText("Equipamento");
    expect(productCells.length).toBeGreaterThan(0);

    const refresh = view.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
