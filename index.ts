const { readFileSync, writeFileSync, copyFileSync, existsSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const REMOTE_PRESETS_URL =
  "https://cdn.jsdelivr.net/gh/BaoxingZhang/openclaw-config-generator@main/public/presets.json";

function buildPageHtml(html, css, js, presetsJson) {
  const presetsScript = `<script>window.__PRESETS__ = ${presetsJson};</script>`;
  return html
    .replace(
      '<link rel="stylesheet" href="style.css">',
      `<style>\n${css}\n</style>`
    )
    .replace(
      '<script src="app.js"></script>',
      `${presetsScript}\n<script>\n${js}\n</script>`
    );
}

module.exports = {
  id: "openclaw-config-generator",
  name: "OpenClaw Config Generator",

  register(api) {
    api.logger.info("[openclaw-config-generator] Plugin register() called");

    const routePath =
      api.pluginConfig?.routePath || "/plugins/openclaw-config-generator";
    const publicDir = join(__dirname, "public");

    let pageHtml;
    let html, css, js;
    try {
      html = readFileSync(join(publicDir, "index.html"), "utf-8");
      css = readFileSync(join(publicDir, "style.css"), "utf-8");
      js = readFileSync(join(publicDir, "app.js"), "utf-8");
      const localPresets = readFileSync(join(publicDir, "presets.json"), "utf-8");

      pageHtml = buildPageHtml(html, css, js, localPresets);
      api.logger.info("[openclaw-config-generator] HTML with inlined CSS/JS/presets built successfully");
    } catch (err) {
      api.logger.error(`[openclaw-config-generator] Failed to build page: ${err}`);
      pageHtml = "<h1>Plugin load error</h1><p>Could not read public assets.</p>";
    }

    if (html && css && js) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      fetch(REMOTE_PRESETS_URL, { signal: ctrl.signal })
        .then((res) => res.text())
        .then((remotePresets) => {
          clearTimeout(timer);
          JSON.parse(remotePresets);
          pageHtml = buildPageHtml(html, css, js, remotePresets);
          api.logger.info("[openclaw-config-generator] Presets updated from remote");
        })
        .catch((err) => {
          clearTimeout(timer);
          api.logger.info(`[openclaw-config-generator] Remote presets fetch skipped: ${err.message || err}`);
        });
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
                api.logger.info(`[openclaw-config-generator] Backed up config to ${backupPath}`);
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
      `[openclaw-config-generator] UI available at ${routePath}`
    );
  },
};
