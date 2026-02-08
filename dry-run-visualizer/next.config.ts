import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use empty turbopack config to silence the warning
  // Pyodide works with Turbopack if loaded via dynamic import
  output: "standalone",
  turbopack: {},

  // Allow Pyodide CDN for WASM files - headers for SharedArrayBuffer support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
