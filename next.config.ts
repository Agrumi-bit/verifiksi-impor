import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native-binding packages (PDF-to-image thumbnail rendering) — must stay as
  // real Node requires instead of being bundled, or their platform-specific
  // .node binary can't be resolved.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
};

export default nextConfig;
