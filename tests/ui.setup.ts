import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (typeof globalThis.document === "undefined") {
  GlobalRegistrator.register({
    url: "http://localhost:3000",
    width: 1280,
    height: 720,
  });
}

import "@testing-library/jest-dom";
