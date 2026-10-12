import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
  // Explicit alias: the tsconfig "@/*" mapping does not resolve inside folders named like [id].
  webpack: (config) => { config.resolve.alias["@"] = root; return config; },
};
export default nextConfig;
