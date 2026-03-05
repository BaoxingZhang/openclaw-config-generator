const { readFileSync, writeFileSync, copyFileSync, existsSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

module.exports = {
  id: "config-generator",
  name: "OpenClaw Config Generator",

  register(api) {
    api.logger.info("[config-generator] Plugin register() called");

    const routePath =
      api.pluginConfig?.routePath || "/plugins/config-generator";
    const publicDir = join(__dirname, "public");

    // Read and inline CSS + JS + presets JSON into HTML at registration time
    let pageHtml;
    try {
      const html = readFileSync(join(publicDir, "index.html"), "utf-8");
      const css = readFileSync(join(publicDir, "style.css"), "utf-8");
      const js = readFileSync(join(publicDir, "app.js"), "utf-8");
      const presets = readFileSync(join(publicDir, "presets.json"), "utf-8");

      // Inject presets as a global variable before app.js runs
      const presetsScript = `<script>window.__PRESETS__ = ${presets};</script>`;

      // Replace external <link> with inline <style>
      pageHtml = html
        .replace(
          '<link rel="stylesheet" href="style.css">',
          `<style>\n${css}\n</style>`
        )
        .replace(
          '<script src="app.js"></script>',
          `${presetsScript}\n<script>\n${js}\n</script>`
        );

      api.logger.info("[config-generator] HTML with inlined CSS/JS/presets built successfully");
    } catch (err) {
      api.logger.error(`[config-generator] Failed to build page: ${err}`);
      pageHtml = "<h1>Plugin load error</h1><p>Could not read public assets.</p>";
    }

    api.registerHttpRoute({
      path: routePath,
      auth: "plugin",
      match: "prefix",
      handler(req, res) {
        const urlPath = (req.url || "").split("?")[0].replace(/\/+$/, "");
        const subPath = urlPath.slice(routePath.length);

        const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

        if (subPath === "/api/read-config") {
          const configPath = join(homedir(), ".openclaw", "openclaw.json");
          try {
            const content = readFileSync(configPath, "utf-8");
            res.writeHead(200, jsonHeaders);
            res.end(JSON.stringify({ success: true, content }));
          } catch (err) {
            res.writeHead(200, jsonHeaders);
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return true;
        }

        if (subPath === "/api/write-config" && req.method === "POST") {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const configPath = join(homedir(), ".openclaw", "openclaw.json");

              if (existsSync(configPath)) {
                const now = new Date();
                const ts = now.getFullYear().toString()
                  + String(now.getMonth() + 1).padStart(2, "0")
                  + String(now.getDate()).padStart(2, "0")
                  + "_"
                  + String(now.getHours()).padStart(2, "0")
                  + String(now.getMinutes()).padStart(2, "0")
                  + String(now.getSeconds()).padStart(2, "0");
                const backupPath = configPath + "." + ts;
                copyFileSync(configPath, backupPath);
                api.logger.info(`[config-generator] Backed up config to ${backupPath}`);
              }

              writeFileSync(configPath, body.content, "utf-8");
              res.writeHead(200, jsonHeaders);
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(200, jsonHeaders);
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return true;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(pageHtml);
        return true;
      },
    });

    api.logger.info(
      `[config-generator] UI available at ${routePath}`
    );
  },
};
