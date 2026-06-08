import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

const BASE_URL = "https://battle-fids.vercel.app";
const SPLASH_COLOR = "#07020e";

export const metadata: Metadata = {
  title: "The Protocol",
  description: "Farcaster Identity Cards — collect, compare, and battle Farcaster profiles",
  other: {
    // Farcaster Mini App embed meta tag
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${BASE_URL}/og.png`,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
