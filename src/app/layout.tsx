import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { MiniAppReady } from "@/components/MiniAppReady";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const caveat    = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["700"] });

const BASE_URL    = "https://battle-fids.vercel.app";
const SPLASH_COLOR = "#07020e";
// Bump this when you want to force Farcaster to re-fetch cached embed/splash images
const ASSET_V = "20260608c";

export async function generateMetadata(): Promise<Metadata> {
  // Pull the default edition from DB to drive the embed card
  let embedImageUrl  = `${BASE_URL}/og.png?v=${ASSET_V}`;
  let splashImageUrl = `${BASE_URL}/splash.png?v=${ASSET_V}`;
  let editionName    = "The Protocol";

  try {
    // Import sql lazily so layout stays compatible with edge runtime when needed
    const { sql } = await import('@/lib/db');
    const rows = await sql`
      SELECT name, embed_image_url, splash_image_url
      FROM   editions
      WHERE  is_active = TRUE AND is_default = TRUE
      LIMIT  1
    `;
    if (rows[0]) {
      const r = rows[0];
      if (r.embed_image_url)  embedImageUrl  = r.embed_image_url;
      if (r.splash_image_url) splashImageUrl = r.splash_image_url;
      if (r.name)             editionName    = r.name;
    }
  } catch {
    // DB unavailable (build time, missing tables) — fall through to defaults
  }

  return {
    title: "The Protocol",
    description: "Farcaster Identity Cards — collect, compare, and battle Farcaster profiles",
    other: {
      "fc:miniapp": JSON.stringify({
        version: "1",
        imageUrl: embedImageUrl,
        button: {
          title: `Play ${editionName}`,
          action: {
            type: "launch_miniapp",
            name: "The Protocol",
            url: BASE_URL,
            splashImageUrl,
            splashBackgroundColor: SPLASH_COLOR,
          },
        },
      }),
      "fc:frame": JSON.stringify({
        version: "1",
        imageUrl: embedImageUrl,
        button: {
          title: `Play ${editionName}`,
          action: {
            type: "launch_miniapp",
            name: "The Protocol",
            url: BASE_URL,
            splashImageUrl,
            splashBackgroundColor: SPLASH_COLOR,
          },
        },
      }),
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MiniAppReady />
        {children}
      </body>
    </html>
  );
}
