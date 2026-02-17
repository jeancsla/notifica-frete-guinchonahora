/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Profile from "pages/profile";

jest.mock("next/link", () => ({ children, href }) => (
  <a href={href}>{children}</a>
));

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/profile" }),
}));

describe("Profile page", () => {
  it("renders profile details", async () => {
    render(<Profile />);
    expect(screen.getByText("Operador principal")).toBeInTheDocument();
    expect(screen.getByText("Equipe Guincho Agora")).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Atualizar" });
    await userEvent.click(refresh);
    expect(
      await screen.findByText("Atualizado com sucesso"),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizado agora")).toBeInTheDocument();
  });
});
