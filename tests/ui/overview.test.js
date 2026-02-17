/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
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
    render(<Overview />);
    expect(screen.getByText("Controle de Operacoes")).toBeInTheDocument();
    expect(screen.getByText("Abrir dashboard")).toBeInTheDocument();
    expect(screen.getByText("Ver tabela")).toBeInTheDocument();
  });
});
