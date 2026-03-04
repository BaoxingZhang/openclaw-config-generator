import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join, extname } from "path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

export default function register(api: any) {
  const pluginConfig =
    api.config?.plugins?.entries?.["config-generator"]?.config;
  const port = pluginConfig?.port ?? 18800;
  const host = pluginConfig?.host ?? "127.0.0.1";
  const publicDir = join(__dirname, "public");

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = (req.url || "/").split("?")[0];
    const filePath =
      url === "/" || url === "" ? "index.html" : url.replace(/^\//, "");
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || MIME_TYPES[".html"];

    try {
      const content = readFileSync(join(publicDir, filePath), "utf-8");
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      // Fallback to index.html for SPA-like behavior
      try {
        const html = readFileSync(join(publicDir, "index.html"), "utf-8");
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(html);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
    }
  });

  server.listen(port, host, () => {
    api.logger.info(
      `[config-generator] UI available at http://${host}:${port}/`
    );
  });

  // Register a background service so Gateway can manage the lifecycle
  api.registerService({
    id: "config-generator-server",
    start: () =>
      api.logger.info(`[config-generator] Server running on port ${port}`),
    stop: () => {
      server.close();
      api.logger.info("[config-generator] Server stopped");
    },
  });
}
