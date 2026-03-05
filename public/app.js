// DOM elements
const chipGroup = document.getElementById("preset-chips");
const providerKeyInput = document.getElementById("provider_key");
const providerNameInput = document.getElementById("provider_name");
const websiteInput = document.getElementById("website");
const apiEndpointSelect = document.getElementById("api_endpoint");
const baseurlInput = document.getElementById("baseurl");
const apikeyInput = document.getElementById("apikey");
const modelList = document.getElementById("model-list");
const addModelBtn = document.getElementById("addModelBtn");
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");
const importConfigBtn = document.getElementById("importConfigBtn");
const applyConfigBtn = document.getElementById("applyConfigBtn");
const configTextarea = document.getElementById("config");

// Load presets: use inlined data (Gateway) or fetch JSON (local dev)
let PRESETS = {};

function initPresets(data) {
  PRESETS = data;
  Object.keys(PRESETS).forEach(key => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.preset = key;
    chip.textContent = PRESETS[key].name;
    chipGroup.appendChild(chip);
  });
}

if (window.__PRESETS__) {
  // Inlined by index.ts when running inside OpenClaw Gateway
  initPresets(window.__PRESETS__);
} else {
  // Local development: fetch from file
  fetch("presets.json")
    .then(res => res.json())
    .then(initPresets)
    .catch(err => console.error("Failed to load presets.json:", err));
}

// --- Model row management ---
function addModelRow(id, name, opts) {
  opts = opts || {};
  const row = document.createElement("div");
  row.className = "model-entry";

  const mainRow = document.createElement("div");
  mainRow.className = "model-row";
  mainRow.innerHTML =
    '<input type="text" class="model-id" placeholder="模型 ID" value="' + (id || "") + '">' +
    '<input type="text" class="model-name" placeholder="显示名称" value="' + (name || "") + '">' +
    '<button type="button" class="expand-btn" title="高级选项">&#9660;</button>' +
    '<button type="button" class="remove-btn" title="删除">&times;</button>';

  const advPanel = document.createElement("div");
  advPanel.className = "model-advanced";
  advPanel.innerHTML =
    '<div class="adv-row">' +
      '<label>推理模式 <input type="checkbox" class="adv-reasoning"' + (opts.reasoning ? " checked" : "") + '><span class="toggle-switch"></span></label>' +
      '<label>上下文窗口 <input type="number" class="adv-context" placeholder="如 200000" value="' + (opts.contextWindow || "") + '"></label>' +
      '<label>最大输出 Tokens <input type="number" class="adv-max-tokens" placeholder="如 128000" value="' + (opts.maxTokens || "") + '"></label>' +
    '</div>' +
    '<div class="adv-row">' +
      '<label>输入价格 <input type="number" class="adv-cost-input" placeholder="0" step="any" value="' + (opts.costInput || "") + '"></label>' +
      '<label>输出价格 <input type="number" class="adv-cost-output" placeholder="0" step="any" value="' + (opts.costOutput || "") + '"></label>' +
      '<label>缓存读取 <input type="number" class="adv-cost-cache-read" placeholder="0" step="any" value="' + (opts.costCacheRead || "") + '"></label>' +
      '<label>缓存写入 <input type="number" class="adv-cost-cache-write" placeholder="0" step="any" value="' + (opts.costCacheWrite || "") + '"></label>' +
    '</div>';

  row.appendChild(mainRow);
  row.appendChild(advPanel);

  // Toggle advanced panel
  mainRow.querySelector(".expand-btn").addEventListener("click", function() {
    const isOpen = advPanel.classList.toggle("open");
    this.innerHTML = isOpen ? "&#9650;" : "&#9660;";
  });

  // Remove row (keep at least 1)
  mainRow.querySelector(".remove-btn").addEventListener("click", () => {
    if (modelList.querySelectorAll(".model-entry").length > 1) {
      row.remove();
    }
  });

  modelList.appendChild(row);
}

function clearModelRows() {
  modelList.innerHTML = "";
}

function getModels() {
  const entries = modelList.querySelectorAll(".model-entry");
  const models = [];
  entries.forEach(entry => {
    const id = entry.querySelector(".model-id").value.trim();
    const name = entry.querySelector(".model-name").value.trim();
    if (!id) return;

    const model = { id, name: name || id };

    // Collect advanced fields only if they have values
    const reasoning = entry.querySelector(".adv-reasoning");
    if (reasoning && reasoning.checked) model.reasoning = true;
    else model.reasoning = false;

    model.input = ["text"];

    const contextWindow = entry.querySelector(".adv-context").value.trim();
    if (contextWindow) model.contextWindow = Number(contextWindow);

    const maxTokens = entry.querySelector(".adv-max-tokens").value.trim();
    if (maxTokens) model.maxTokens = Number(maxTokens);

    const ci = entry.querySelector(".adv-cost-input").value.trim();
    const co = entry.querySelector(".adv-cost-output").value.trim();
    const cr = entry.querySelector(".adv-cost-cache-read").value.trim();
    const cw = entry.querySelector(".adv-cost-cache-write").value.trim();
    if (ci || co || cr || cw) {
      model.cost = {
        input: Number(ci) || 0,
        output: Number(co) || 0,
        cacheRead: Number(cr) || 0,
        cacheWrite: Number(cw) || 0
      };
    }

    models.push(model);
  });
  return models;
}

// Add initial empty row
addModelRow();

addModelBtn.addEventListener("click", () => addModelRow());

// --- Preset chip click handler ---
function selectPreset(key) {
  // Update active chip
  chipGroup.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  const activeChip = chipGroup.querySelector('[data-preset="' + key + '"]');
  if (activeChip) activeChip.classList.add("active");

  if (key === "custom") {
    providerKeyInput.value = "";
    providerNameInput.value = "";
    websiteInput.value = "";
    apiEndpointSelect.value = "openai-completions";
    baseurlInput.value = "";
    apikeyInput.value = "";
    clearModelRows();
    addModelRow();
    return;
  }

  const preset = PRESETS[key];
  if (!preset) return;

  providerKeyInput.value = key;
  providerNameInput.value = preset.name;
  websiteInput.value = preset.website;
  apiEndpointSelect.value = preset.apiEndpoint;
  baseurlInput.value = preset.baseUrl;
  // API Key is never preset
  clearModelRows();
  preset.models.forEach(m => addModelRow(m.id, m.name));
}

chipGroup.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  selectPreset(chip.dataset.preset);
});

// --- Copy button ---
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(outputEl.textContent || "");
    copyBtn.textContent = "已复制";
    setTimeout(() => (copyBtn.textContent = "复制"), 1200);
  } catch {
    copyBtn.textContent = "失败";
    setTimeout(() => (copyBtn.textContent = "复制"), 1200);
  }
});

// --- Import config from server (~/.openclaw/openclaw.json) ---
importConfigBtn.addEventListener("click", async () => {
  importConfigBtn.disabled = true;
  importConfigBtn.textContent = "读取中...";
  try {
    const basePath = window.location.pathname.replace(/\/+$/, "");
    const res = await fetch(basePath + "/api/read-config");
    const data = await res.json();
    if (data.success) {
      configTextarea.value = data.content;
      importConfigBtn.textContent = "已导入";
    } else {
      importConfigBtn.textContent = "读取失败";
      console.error("Import config error:", data.error);
    }
  } catch (err) {
    importConfigBtn.textContent = "读取失败";
    console.error("Import config fetch error:", err);
  } finally {
    setTimeout(() => {
      importConfigBtn.textContent = "导入配置";
      importConfigBtn.disabled = false;
    }, 1500);
  }
});

// --- Generate config ---
function setStatus(text) {
  statusEl.textContent = text;
}

function processConfig(payload) {
  const providerConfig = {
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    models: payload.models
  };

  // Only include api field if not "Unknown"
  if (payload.apiEndpoint) {
    providerConfig.api = payload.apiEndpoint;
  }

  const models = {
    mode: "merge",
    providers: {
      [payload.providerKey]: providerConfig
    }
  };

  const firstModelId = payload.models.length > 0 ? payload.models[0].id : "";
  const agents = {
    defaults: {
      model: {
        primary: payload.providerKey + "/" + firstModelId
      }
    }
  };

  let userConfig;
  try {
    userConfig = JSON.parse(payload.config);
  } catch (e) {
    throw new Error("配置 JSON 格式错误: " + e.message);
  }

  return {
    ...userConfig,
    models,
    agents
  };
}

function validateAndGenerate() {
  const providerKey = providerKeyInput.value.trim();
  const baseUrl = baseurlInput.value.trim();
  const apiKey = apikeyInput.value.trim();
  const config = configTextarea.value.trim();
  const apiEndpoint = apiEndpointSelect.value;
  const models = getModels();

  if (!providerKey) { outputEl.textContent = "错误: 请输入供应商标识"; setStatus("失败"); return null; }
  if (!baseUrl) { outputEl.textContent = "错误: 请输入 Base URL"; setStatus("失败"); return null; }
  if (!apiKey) { outputEl.textContent = "错误: 请输入 API Key"; setStatus("失败"); return null; }
  if (!config) { outputEl.textContent = "错误: 请输入 Config JSON"; setStatus("失败"); return null; }
  if (models.length === 0) { outputEl.textContent = "错误: 请至少添加一个模型"; setStatus("失败"); return null; }

  return processConfig({ providerKey, baseUrl, apiKey, apiEndpoint, models, config });
}

sendBtn.addEventListener("click", () => {
  setStatus("处理中...");
  sendBtn.disabled = true;
  outputEl.textContent = "";

  try {
    const result = validateAndGenerate();
    if (!result) { sendBtn.disabled = false; return; }
    outputEl.textContent = JSON.stringify(result, null, 2);
    setStatus("完成");
  } catch (err) {
    outputEl.textContent = "错误: " + String(err.message || err);
    setStatus("失败");
  } finally {
    sendBtn.disabled = false;
  }
});

// --- Apply config: generate + backup + overwrite ~/.openclaw/openclaw.json ---
applyConfigBtn.addEventListener("click", async () => {
  if (!confirm("是否生成配置并应用？将备份原配置文件。")) return;

  setStatus("处理中...");
  applyConfigBtn.disabled = true;
  outputEl.textContent = "";

  try {
    const result = validateAndGenerate();
    if (!result) { applyConfigBtn.disabled = false; return; }

    const jsonStr = JSON.stringify(result, null, 2);
    outputEl.textContent = jsonStr;

    const basePath = window.location.pathname.replace(/\/+$/, "");
    const res = await fetch(basePath + "/api/write-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: jsonStr })
    });
    const data = await res.json();

    if (data.success) {
      setStatus("已应用");
    } else {
      setStatus("写入失败");
      outputEl.textContent = "错误: " + (data.error || "未知错误");
    }
  } catch (err) {
    outputEl.textContent = "错误: " + String(err.message || err);
    setStatus("失败");
  } finally {
    applyConfigBtn.disabled = false;
  }
});
