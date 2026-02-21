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
import Profile from "pages/profile";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/profile" }),
}));

describe("Profile page", () => {
  it("renders profile details", async () => {
    const view = render(<Profile />);
    expect(view.getByText("Operador principal")).toBeInTheDocument();
    expect(view.getByText("Equipe Guincho Na Hora")).toBeInTheDocument();

    const refresh = view.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(await view.findByText("Atualizado com sucesso")).toBeInTheDocument();
    expect(view.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
