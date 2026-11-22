/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Absolute "/_next/" references are rewritten to relative ones by scripts/relativize.mjs
  // (Next rejects a relative assetPrefix such as "./").
};

export default nextConfig;
