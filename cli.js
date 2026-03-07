#!/usr/bin/env node

const { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } = require("fs");
const { join, dirname } = require("path");
const { homedir } = require("os");
const { parseArgs } = require("util");

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const DEFAULT_CONFIG_PATH = join(homedir(), ".openclaw", "openclaw.json");

function loadPresets() {
  const presetsPath = join(__dirname, "public", "presets.json");
  return JSON.parse(readFileSync(presetsPath, "utf-8"));
}

function readConfig(configPath) {
  if (!existsSync(configPath)) {
    return null;
  }
  return readFileSync(configPath, "utf-8");
}

function backupConfig(configPath) {
  if (!existsSync(configPath)) return null;
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "_" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const backupPath = configPath + "." + ts;
  copyFileSync(configPath, backupPath);
  return backupPath;
}

function mergeConfig(userConfig, providerKey, apiEndpoint, baseUrl, apiKey, models, noPrimary) {
  const providerConfig = { baseUrl, apiKey, models };
  if (apiEndpoint) {
    providerConfig.api = apiEndpoint;
  }

  const existingProviders = (userConfig.models && userConfig.models.providers) || {};
  const mergedModels = {
    ...userConfig.models,
    mode: "merge",
    providers: {
      ...existingProviders,
      [providerKey]: providerConfig,
    },
  };

  const result = { ...userConfig, models: mergedModels };

  if (!noPrimary) {
    const firstModelId = models.length > 0 ? models[0].id : "";
    const existingAgents = userConfig.agents || {};
    const existingDefaults = existingAgents.defaults || {};
    result.agents = {
      ...existingAgents,
      defaults: {
        ...existingDefaults,
        model: {
          primary: providerKey + "/" + firstModelId,
        },
      },
    };
  }

  return result;
}

function printHelp() {
  console.log(`
${BOLD}openclaw-config-generator${RESET} — CLI for managing OpenClaw provider configs

${BOLD}Usage:${RESET}
  openclaw-config-generator ${CYAN}<command>${RESET} [options]

${BOLD}Commands:${RESET}
  ${CYAN}list${RESET}                          List all available presets
  ${CYAN}apply${RESET} <preset> --api-key <key> Apply a preset to ~/.openclaw/openclaw.json
  ${CYAN}show${RESET}  [--config <path>]         Show current openclaw.json content

${BOLD}Apply options:${RESET}
  --api-key <key>       ${DIM}(required)${RESET} API key for the provider
  --models <m1,m2>      ${DIM}(optional)${RESET} Comma-separated model IDs to include
  --base-url <url>      ${DIM}(optional)${RESET} Override the preset base URL
  --api-endpoint <type> ${DIM}(optional)${RESET} Override API type (openai-completions / anthropic-messages)
  --provider-key <key>  ${DIM}(optional)${RESET} Use a custom provider key instead of preset default
  --config <path>       ${DIM}(optional)${RESET} Config file path (default: ~/.openclaw/openclaw.json)
  --no-primary          ${DIM}(optional)${RESET} Don't update the default primary model
  --dry-run             ${DIM}(optional)${RESET} Print merged config without writing

${BOLD}Examples:${RESET}
  ${DIM}# List presets${RESET}
  openclaw-config-generator list

  ${DIM}# Apply a preset${RESET}
  openclaw-config-generator apply custom-vibecodingapi-ai --api-key sk-xxx

  ${DIM}# Apply with specific models only${RESET}
  openclaw-config-generator apply custom-bailian-console-aliyun-com --api-key sk-xxx --models qwen3.5-plus,qwen3-coder-plus

  ${DIM}# Override base URL and use custom provider key${RESET}
  openclaw-config-generator apply custom-vibecodingapi-ai --api-key sk-xxx --base-url https://my-proxy.com/v1 --provider-key my-proxy

  ${DIM}# Apply without changing default model${RESET}
  openclaw-config-generator apply custom-open-bigmodel-cn --api-key sk-xxx --no-primary

  ${DIM}# Use a custom config file path${RESET}
  openclaw-config-generator apply custom-vibecodingapi-ai --api-key sk-xxx --config /etc/openclaw/openclaw.json

  ${DIM}# Preview without writing${RESET}
  openclaw-config-generator apply custom-vibecodingapi-ai --api-key sk-xxx --dry-run
`);
}

function cmdList() {
  const presets = loadPresets();
  const keys = Object.keys(presets);

  if (keys.length === 0) {
    console.log(`${YELLOW}No presets available.${RESET}`);
    return;
  }

  console.log(`\n${BOLD}Available presets:${RESET}\n`);

  for (const key of keys) {
    const p = presets[key];
    const modelNames = p.models.map((m) => m.id).join(", ");
    console.log(`  ${CYAN}${key}${RESET}`);
    console.log(`    Name:     ${p.name}`);
    console.log(`    Endpoint: ${p.apiEndpoint}`);
    console.log(`    Base URL: ${p.baseUrl}`);
    console.log(`    Models:   ${modelNames}`);
    console.log();
  }
}

function cmdShow(args) {
  const { values } = parseArgs({
    args,
    options: {
      config: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  });

  const configPath = values.config || DEFAULT_CONFIG_PATH;
  const content = readConfig(configPath);
  if (content === null) {
    console.log(`${YELLOW}Config file not found: ${configPath}${RESET}`);
    process.exit(1);
  }
  console.log(content);
}

function cmdApply(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      models: { type: "string" },
      "base-url": { type: "string" },
      "api-endpoint": { type: "string" },
      "provider-key": { type: "string" },
      config: { type: "string" },
      "no-primary": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  const presetKey = positionals[0];
  if (!presetKey) {
    console.error(`${RED}Error: preset key is required.${RESET}`);
    console.error(`Usage: openclaw-config-generator apply <preset> --api-key <key>`);
    process.exit(1);
  }

  const apiKey = values["api-key"];
  if (!apiKey) {
    console.error(`${RED}Error: --api-key is required.${RESET}`);
    process.exit(1);
  }

  const presets = loadPresets();
  const preset = presets[presetKey];
  if (!preset) {
    console.error(`${RED}Error: unknown preset "${presetKey}".${RESET}`);
    console.error(`Run ${CYAN}openclaw-config-generator list${RESET} to see available presets.`);
    process.exit(1);
  }

  const finalProviderKey = values["provider-key"] || presetKey;
  const finalBaseUrl = values["base-url"] || preset.baseUrl;
  const finalApiEndpoint = values["api-endpoint"] || preset.apiEndpoint;

  let models = preset.models.map((m) => {
    const model = {
      id: m.id,
      name: m.name || m.id,
      reasoning: m.reasoning || false,
      input: m.input || ["text"],
    };
    if (m.contextWindow) model.contextWindow = m.contextWindow;
    if (m.maxTokens) model.maxTokens = m.maxTokens;
    return model;
  });

  if (values.models) {
    const selectedIds = values.models.split(",").map((s) => s.trim()).filter(Boolean);
    const available = new Set(preset.models.map((m) => m.id));
    for (const id of selectedIds) {
      if (!available.has(id)) {
        console.error(`${RED}Error: model "${id}" not found in preset "${presetKey}".${RESET}`);
        console.error(`Available models: ${[...available].join(", ")}`);
        process.exit(1);
      }
    }
    models = models.filter((m) => selectedIds.includes(m.id));
  }

  const configPath = values.config || DEFAULT_CONFIG_PATH;
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  let userConfig = {};
  const existingContent = readConfig(configPath);
  if (existingContent !== null) {
    try {
      userConfig = JSON.parse(existingContent);
    } catch (e) {
      console.error(`${RED}Error: failed to parse existing config: ${e.message}${RESET}`);
      process.exit(1);
    }
  }

  const noPrimary = values["no-primary"];
  const result = mergeConfig(userConfig, finalProviderKey, finalApiEndpoint, finalBaseUrl, apiKey, models, noPrimary);
  const jsonStr = JSON.stringify(result, null, 2);

  if (values["dry-run"]) {
    console.log(`\n${BOLD}Merged config (dry run — not written):${RESET}\n`);
    console.log(jsonStr);
    return;
  }

  const backupPath = backupConfig(configPath);
  if (backupPath) {
    console.log(`${DIM}Backed up to ${backupPath}${RESET}`);
  }

  writeFileSync(configPath, jsonStr, "utf-8");
  console.log(`${GREEN}Config written to ${configPath}${RESET}`);
  console.log(`${DIM}Provider: ${preset.name} (${finalProviderKey})${RESET}`);
  console.log(`${DIM}Models:   ${models.map((m) => m.id).join(", ")}${RESET}`);
  if (!noPrimary) {
    console.log(`${DIM}Primary:  ${finalProviderKey}/${models[0]?.id || ""}${RESET}`);
  }
}

const rawArgs = process.argv.slice(2);
const command = rawArgs[0];

switch (command) {
  case "list":
    cmdList();
    break;
  case "show":
    cmdShow(rawArgs.slice(1));
    break;
  case "apply":
    cmdApply(rawArgs.slice(1));
    break;
  case "--help":
  case "-h":
  case "help":
    printHelp();
    break;
  default:
    if (command) {
      console.error(`${RED}Unknown command: ${command}${RESET}\n`);
    }
    printHelp();
    process.exit(command ? 1 : 0);
}
