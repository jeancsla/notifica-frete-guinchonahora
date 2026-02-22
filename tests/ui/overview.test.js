import { describe, expect, it, jest } from "bun:test";
import "tests/ui.setup.js";
/** @jest-environment jsdom */
import Overview from "pages/index";
import { renderWithFreshSWR } from "./test-helpers";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/" }),
}));

describe("Overview page", () => {
  describe("hero", () => {
    it("renders primary actions and title", () => {
      const view = renderWithFreshSWR(<Overview />);
      expect(view.getByText("Controle de Operações")).toBeInTheDocument();
      expect(view.getByText("Abrir dashboard")).toBeInTheDocument();
      expect(view.getByText("Ver tabela")).toBeInTheDocument();
    });
  });
});
