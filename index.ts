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
  // /plugins/* is excluded from Gateway SPA fallback by design
  // (see src/gateway/control-ui-routing.ts classifyControlUiRequest)
  const routePath = pluginConfig?.routePath || "/plugins/config-generator";
  const publicDir = join(__dirname, "public");

  api.registerGatewayHttpHandler((req: any, res: any, next: any) => {
    const url = (req.url || "").split("?")[0];

    // Exact match: serve index.html
    if (url === routePath || url === routePath + "/") {
      try {
        const html = readFileSync(join(publicDir, "index.html"), "utf-8");
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(html);
      } catch {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Failed to load config generator page");
      }
      return;
    }

    // Serve static assets under the route path (style.css, app.js)
    if (url.startsWith(routePath + "/")) {
      const filename = url.slice(routePath.length + 1);
      const ext = extname(filename);
      const mime = MIME_TYPES[ext];

      if (mime && filename && !filename.includes("..")) {
        try {
          const content = readFileSync(join(publicDir, filename), "utf-8");
          res.writeHead(200, { "Content-Type": mime });
          res.end(content);
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
        }
        return;
      }
    }

    // Not our route, pass to next handler
    next();
  });

  api.logger.info(
    `[config-generator] UI available at ${routePath}`
  );
}
