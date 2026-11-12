import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // File readers for the brain's Drive sync load as plain Node packages instead of being bundled.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
