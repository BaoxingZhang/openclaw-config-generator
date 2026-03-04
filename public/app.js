// Provider to Base URL mapping
const providerBaseUrlMap = {
  "milocode": "https://api.joyzhi.com",
  "ollama": "http://localhost:11434",
  "duckcodingJP": "https://jp.duckcoding.com",
  "FastRouter": "https://api-key.info",
  "i7Relay": "https://i7dc.com/api"
};

// DOM elements
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");
const providerSelect = document.getElementById("provider");
const baseurlSelect = document.getElementById("baseurl");
const baseurlCustom = document.getElementById("baseurl_custom");

// Dynamically populate provider select
Object.keys(providerBaseUrlMap).forEach(provider => {
  const option = document.createElement("option");
  option.value = provider;
  option.textContent = provider;
  providerSelect.appendChild(option);
});
providerSelect.appendChild(createCustomOption());

// Dynamically populate baseurl select
const uniqueUrls = [...new Set(Object.values(providerBaseUrlMap))];
uniqueUrls.forEach(url => {
  const option = document.createElement("option");
  option.value = url;
  option.textContent = url;
  baseurlSelect.appendChild(option);
});
baseurlSelect.appendChild(createCustomOption());

function createCustomOption() {
  const option = document.createElement("option");
  option.value = "custom";
  option.textContent = "自定义";
  return option;
}

// Handle custom input visibility for all select fields
const fields = ["baseurl", "provider", "apimode", "model_id"];
fields.forEach(field => {
  const select = document.getElementById(field);
  const customInput = document.getElementById(`${field}_custom`);

  select.addEventListener("change", () => {
    if (select.value === "custom") {
      customInput.classList.add("show");
    } else {
      customInput.classList.remove("show");
    }
  });
});

// Bind provider change to auto-select baseurl
providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value;
  if (provider === "custom") return;

  if (providerBaseUrlMap[provider]) {
    baseurlSelect.value = providerBaseUrlMap[provider];
    baseurlCustom.classList.remove("show");
  }
});

// Copy button
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

// Get value from select or custom input
function getValue(field) {
  const select = document.getElementById(field);
  if (select.value === "custom") {
    return document.getElementById(`${field}_custom`).value.trim();
  }
  return select.value;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// Process config: merge user config with new provider settings
function processConfig(payload) {
  const agents = {
    "defaults": {
      "model": {
        "primary": `${payload.provider}/${payload.model_id}`
      }
    }
  };

  const models = {
    "mode": "merge",
    "providers": {
      [payload.provider]: {
        "baseUrl": payload.baseurl,
        "apiKey": payload.apikey,
        "api": payload.apimode,
        "models": [
          {
            "id": payload.model_id,
            "name": payload.model_id
          }
        ]
      }
    }
  };

  let userConfig;
  try {
    userConfig = JSON.parse(payload.config);
  } catch (e) {
    throw new Error("配置 JSON 格式错误: " + e.message);
  }

  // Merge: keep all original fields, only override models and agents
  // NOTE: unlike the original version, we do NOT delete auth,
  // because auth (official API) and third-party API can coexist.
  const result = {
    ...userConfig,
    models: models,
    agents: agents
  };

  return result;
}

// Send button click handler
sendBtn.addEventListener("click", async () => {
  const payload = {
    config: document.getElementById("config").value.trim(),
    baseurl: getValue("baseurl"),
    apikey: document.getElementById("apikey").value.trim(),
    apimode: getValue("apimode"),
    provider: getValue("provider"),
    model_id: getValue("model_id")
  };

  if (!payload.config) {
    outputEl.textContent = "错误: 请输入 Config JSON";
    setStatus("失败");
    return;
  }
  if (!payload.baseurl) {
    outputEl.textContent = "错误: 请选择或输入 Base URL";
    setStatus("失败");
    return;
  }
  if (!payload.apikey) {
    outputEl.textContent = "错误: 请输入 API Key";
    setStatus("失败");
    return;
  }

  setStatus("处理中...");
  sendBtn.disabled = true;
  outputEl.textContent = "";

  try {
    const result = processConfig(payload);
    outputEl.textContent = JSON.stringify(result, null, 2);
    setStatus("完成");
  } catch (err) {
    outputEl.textContent = "错误: " + String(err.message || err);
    setStatus("失败");
  } finally {
    sendBtn.disabled = false;
  }
});
