import http from "node:http";
import { pathToFileURL } from "node:url";

const TARGET_PORT = Number(process.env.MESH_LINK_TARGET_PORT ?? 3000);
const PORT = Number(process.env.PORT ?? 3001);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  let pathname = url.pathname;
  const accept = String(req.headers.accept ?? "");

  let originallyMesh = false;
  const isPage = accept.includes("text/html") && (pathname === "/mesh" || pathname === "/mesh/" || pathname === "/mesh-b" || pathname === "/mesh-b/");
  if (!isPage) {
    if (pathname === "/mesh" || pathname.startsWith("/mesh/")) {
      pathname = pathname.replace(/^\/mesh/, "/mesh-b");
      originallyMesh = true;
    } else if (pathname === "/mesh-b" || pathname.startsWith("/mesh-b/")) {
      pathname = pathname.replace(/^\/mesh-b/, "/mesh");
      originallyMesh = true;
    }
  }

  const targetPath = `${pathname}${url.search}`;
  const targetHeaders = { ...req.headers };
  delete targetHeaders.host;

  const proxyReq = http.request(
    {
      host: "127.0.0.1",
      port: TARGET_PORT,
      method: req.method,
      path: targetPath,
      headers: targetHeaders,
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers };
      if (originallyMesh) {
        headers["x-mesh-link"] = "link-b";
      }
      res.writeHead(proxyRes.statusCode ?? 502, headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`mesh-link-b proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`mesh-link-b listening on http://localhost:${PORT} -> http://127.0.0.1:${TARGET_PORT} (primary = mesh-b)`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);