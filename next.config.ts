import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.10"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gravatar.com" },
    ],
  },
};

export default nextConfig;
