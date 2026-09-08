import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" hanya untuk preview lokal; di Vercel biarkan default (Vercel
  // menangani output Next.js sendiri dan tidak mendukung standalone).
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
