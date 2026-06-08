import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
