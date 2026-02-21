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
import TableView from "pages/table";
import { fetchCargas } from "lib/api";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

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

    const view = render(<TableView />);

    expect(await view.findByText("789")).toBeInTheDocument();
    expect(view.getByText("Rodoviario")).toBeInTheDocument();

    const refresh = view.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
