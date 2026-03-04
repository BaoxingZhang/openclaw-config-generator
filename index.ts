import { readFileSync } from "fs";
import { join } from "path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

export default function register(api: any) {
  const pluginConfig = api.config?.plugins?.entries?.["openclaw-config"]?.config;
  const routePath = pluginConfig?.routePath || "/config-generator";
  const publicDir = join(__dirname, "public");

  // Register HTTP handler to serve the config generator UI
  api.registerGatewayHttpHandler((req: any, res: any, next: any) => {
    const url = req.url || "";

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
      const filename = url.slice(routePath.length + 1).split("?")[0];
      const ext = "." + filename.split(".").pop();
      const mime = MIME_TYPES[ext];

      if (mime) {
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
    `[openclaw-config] Config generator UI available at ${routePath}`
  );
}
