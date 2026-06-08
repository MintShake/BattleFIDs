import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const caveat    = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["700"] });

const BASE_URL    = "https://the-protocol-xi.vercel.app";
const SPLASH_COLOR = "#07020e";
// Bump this when you want to force Farcaster to re-fetch cached embed/splash images
const ASSET_V = "20260608c";

export const metadata: Metadata = {
  title: "The Protocol",
  description: "Farcaster Identity Cards — collect, compare, and battle Farcaster profiles",
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${BASE_URL}/og.png?v=${ASSET_V}`,
      button: {
        title: "Play The Protocol",
        action: {
          type: "launch_miniapp",
          name: "The Protocol",
          url: BASE_URL,
          splashImageUrl: `${BASE_URL}/splash.png`,
          splashBackgroundColor: SPLASH_COLOR,
        },
      },
    }),
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${BASE_URL}/og.png?v=${ASSET_V}`,
      button: {
        title: "Play The Protocol",
        action: {
          type: "launch_miniapp",
          name: "The Protocol",
          url: BASE_URL,
          splashImageUrl: `${BASE_URL}/splash.png`,
          splashBackgroundColor: SPLASH_COLOR,
        },
      },
    }),
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
