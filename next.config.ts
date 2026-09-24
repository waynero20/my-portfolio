import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function resolveBuildSha(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.10"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  env: {
    BUILD_SHA: resolveBuildSha(),
    BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
