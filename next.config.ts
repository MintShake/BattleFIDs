import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@farcaster/miniapp-sdk', '@farcaster/miniapp-core'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "web-legoblocksapps.vercel.app",
        pathname: "/api/image/**",
      },
    ],
  },
};

export default nextConfig;
