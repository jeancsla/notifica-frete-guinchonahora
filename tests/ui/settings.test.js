import { describe, expect, it, jest } from "bun:test";
import "tests/ui.setup.js";
/** @jest-environment jsdom */
import userEvent from "@testing-library/user-event";
import Settings from "pages/settings";
import { renderWithFreshSWR } from "./test-helpers";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/settings" }),
}));

describe("Settings page", () => {
  describe("content and refresh", () => {
    it("renders settings content", async () => {
      const view = renderWithFreshSWR(<Settings />);
      expect(view.getByText("Notificações")).toBeInTheDocument();
      expect(view.getByText("WhatsApp")).toBeInTheDocument();

      const refresh = view.getByRole("button", { name: "Atualizar" });
      await userEvent.click(refresh);
      expect(
        await view.findByText("Atualizado com sucesso"),
      ).toBeInTheDocument();
      expect(view.getByText("Atualizado agora")).toBeInTheDocument();
    });
  });
});
