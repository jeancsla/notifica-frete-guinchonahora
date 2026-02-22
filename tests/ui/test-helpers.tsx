import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { swrDefaults } from "lib/swr";

export function renderWithFreshSWR(component: ReactElement) {
  return render(
    <SWRConfig value={{ ...swrDefaults, provider: () => new Map() }}>
      {component}
    </SWRConfig>,
  );
}
