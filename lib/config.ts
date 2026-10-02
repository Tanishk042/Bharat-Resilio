/**
 * Central service configuration for the Resilio frontend.
 *
 * Two deployment modes:
 *   1. Single-origin (default): client calls relative rewrite paths
 *      (/backend, /ml, /mesh, /chain) that next.config.mjs proxies to the
 *      backend services. Zero CORS, works behind any hostname/port.
 *   2. External hosts: set NEXT_PUBLIC_* env vars to absolute service URLs
 *      and the client talks to them directly (must enable CORS there).
 */

const strip = (value: string | undefined, fallback: string) =>
  (value ?? fallback).replace(/\/+$/, "")

export const API_BASE = strip(process.env.NEXT_PUBLIC_API_URL, "/backend")
export const ML_BASE = strip(process.env.NEXT_PUBLIC_ML_URL, "/ml")
export const MESH_A_BASE = strip(process.env.NEXT_PUBLIC_MESH_URL, "/mesh")
export const MESH_B_BASE = strip(process.env.NEXT_PUBLIC_MESH_B_URL, "/mesh-b")
export const MESH_C_BASE = strip(process.env.NEXT_PUBLIC_MESH_C_URL, "/mesh-c")
export const CHAIN_BASE = strip(process.env.NEXT_PUBLIC_CHAIN_URL, "/chain")

export interface MeshNodeRef {
  url: string
  label: string
  port: number
}

export const DEFAULT_MESH_NODES: MeshNodeRef[] = [
  { url: MESH_A_BASE, label: "This device", port: 8101 },
  { url: MESH_B_BASE, label: "Peer device", port: 8102 },
  { url: MESH_C_BASE, label: "Peer device", port: 8103 },
]