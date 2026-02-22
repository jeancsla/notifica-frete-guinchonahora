import type { AppProps } from "next/app";
import Head from "next/head";
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
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d0f14" />
        <meta name="application-name" content="Notifica Frete" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <SWRConfig value={swrDefaults}>
        <RouteLoadingBar />
        <Component {...pageProps} />
      </SWRConfig>
    </div>
  );
}
