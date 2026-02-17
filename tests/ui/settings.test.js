/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "pages/settings";

jest.mock("next/link", () => ({ children, href }) => (
  <a href={href}>{children}</a>
));

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/settings" }),
}));

describe("Settings page", () => {
  it("renders settings content", async () => {
    render(<Settings />);
    expect(screen.getByText("Notificacoes")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
