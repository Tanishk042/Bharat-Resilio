/** @type {import('next').NextConfig} */
const webUrl = (env, fallback) => (process.env[env] || fallback).replace(/\/+$/, "")

const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const api = webUrl("SERVICE_API_URL", "http://127.0.0.1:8080")
    const ml = webUrl("SERVICE_ML_URL", "http://127.0.0.1:8000")
    const meshA = webUrl("SERVICE_MESH_A_URL", "http://127.0.0.1:8101")
    const meshB = webUrl("SERVICE_MESH_B_URL", "http://127.0.0.1:8102")
    const meshC = webUrl("SERVICE_MESH_C_URL", "http://127.0.0.1:8103")
    const chain = webUrl("SERVICE_CHAIN_URL", "http://127.0.0.1:8201")
    return [
      { source: "/backend/:path*", destination: `${api}/:path*` },
      { source: "/ml/:path*", destination: `${ml}/:path*` },
      { source: "/mesh/:path*", destination: `${meshA}/:path*` },
      { source: "/mesh-b/:path*", destination: `${meshB}/:path*` },
      { source: "/mesh-c/:path*", destination: `${meshC}/:path*` },
      { source: "/chain/:path*", destination: `${chain}/:path*` },
    ]
  },
}

export default nextConfig