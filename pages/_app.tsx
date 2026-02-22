import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SWRConfig } from "swr";
import RouteLoadingBar from "../components/RouteLoadingBar";
import { swrDefaults } from "../lib/swr";
import "../styles/global.css";

const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-mono",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      className={`${fontSans.className} ${fontSans.variable} ${fontMono.variable}`}
    >
      <SWRConfig value={swrDefaults}>
        <RouteLoadingBar />
        <Component {...pageProps} />
      </SWRConfig>
    </div>
  );
}
