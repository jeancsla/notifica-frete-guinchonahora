import { SWRConfig } from "swr";
import RouteLoadingBar from "../components/RouteLoadingBar";
import { swrDefaults } from "../lib/swr";
import "../styles/global.css";

export default function App({ Component, pageProps }) {
  return (
    <SWRConfig value={swrDefaults}>
      <RouteLoadingBar />
      <Component {...pageProps} />
    </SWRConfig>
  );
}
