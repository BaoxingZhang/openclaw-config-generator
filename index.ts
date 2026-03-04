import { readFileSync } from "fs";
import { join, extname } from "path";
import type { IncomingMessage, ServerResponse } from "http";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

export default function register(api: any) {
  const routePath =
    api.pluginConfig?.routePath || "/plugins/config-generator";
  const publicDir = join(__dirname, "public");

  api.registerHttpRoute({
    path: routePath,
    auth: "plugin",
    match: "prefix",
    handler: (req: IncomingMessage, res: ServerResponse) => {
      const url = (req.url || "").split("?")[0];

      // Determine which file to serve
      let filename: string;
      if (url === routePath || url === routePath + "/") {
        filename = "index.html";
      } else if (url.startsWith(routePath + "/")) {
        filename = url.slice(routePath.length + 1);
      } else {
        return false;
      }

      // Security: block path traversal
      if (!filename || filename.includes("..")) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad request");
        return true;
      }

      const ext = extname(filename);
      const mime = MIME_TYPES[ext] || MIME_TYPES[".html"];

      try {
        const content = readFileSync(join(publicDir, filename), "utf-8");
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
      } catch {
        // Fallback to index.html
        try {
          const html = readFileSync(join(publicDir, "index.html"), "utf-8");
          res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
          res.end(html);
        } catch {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Failed to load config generator page");
        }
      }
      return true;
    },
  });

  api.logger.info(
    `[config-generator] UI available at ${routePath}`
  );
}
