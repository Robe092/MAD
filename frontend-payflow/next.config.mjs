/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.PAYFLOW_BUILD_DIR || ".next",
};

export default nextConfig;
