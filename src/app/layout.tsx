import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://battle-fids.vercel.app";
const SPLASH_COLOR = "#050c18";

export const metadata: Metadata = {
  title: "Battle FIDs",
  description: "Farcaster Identity Battle Cards — collect, compare, and battle Farcaster profiles",
  other: {
    // Farcaster Mini App embed meta tag
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${BASE_URL}/og.png`,
      button: {
        title: "Play Battle FIDs",
        action: {
          type: "launch_miniapp",
          name: "Battle FIDs",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Photorealistic Roman backdrop — drop bg-roman.jpg into /public/ */}
        <div className="roman-backdrop" aria-hidden>
          <Image
            src="/bg-roman.png"
            alt=""
            fill
            priority
            unoptimized
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
