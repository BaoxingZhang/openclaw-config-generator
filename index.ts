const { readFileSync } = require("fs");
const { join } = require("path");

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
