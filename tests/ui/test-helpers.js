import { render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { swrDefaults } from "lib/swr";

export function renderWithFreshSWR(component) {
  return render(
    <SWRConfig value={{ ...swrDefaults, provider: () => new Map() }}>
      {component}
    </SWRConfig>,
  );
}
