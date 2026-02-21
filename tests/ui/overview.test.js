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
import Overview from "pages/index";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/" }),
}));

describe("Overview page", () => {
  it("renders hero content", () => {
    const view = render(<Overview />);
    expect(view.getByText("Controle de Operações")).toBeInTheDocument();
    expect(view.getByText("Abrir dashboard")).toBeInTheDocument();
    expect(view.getByText("Ver tabela")).toBeInTheDocument();
  });
});
