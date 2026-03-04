# OpenClaw 第三方 API 配置生成器 - 原理说明

## 概述

本工具用于在 OpenClaw 的原始配置文件（`~/.openclaw/openclaw.json`）中**安全地添加第三方 API 配置**，而不会破坏原有配置。

## 核心原理

### 配置合并流程（共 4 步）

#### 第 1 步：构建 `agents` 对象

用提供商名称和模型 ID 拼接出默认模型路径：

```json
{
  "defaults": {
    "model": {
      "primary": "milocode/claude-sonnet-4-5-20250929"
    }
  }
}
```

#### 第 2 步：构建 `models` 对象

```json
{
  "mode": "merge",
  "providers": {
    "milocode": {
      "baseUrl": "https://api.joyzhi.com",
      "apiKey": "your-api-key",
      "api": "anthropic-messages",
      "models": [
        { "id": "claude-sonnet-4-5-20250929", "name": "claude-sonnet-4-5-20250929" }
      ]
    }
  }
}
```

> `"mode": "merge"` 是关键，它告诉 OpenClaw 在运行时将新 provider **合并**到已有 providers 中，而非替换全部。

#### 第 3 步：解析用户的原始配置

将用户粘贴的 `openclaw.json` 内容解析为 JSON 对象。

#### 第 4 步：合并输出

```javascript
const result = {
  ...userConfig,      // 先展开用户原始配置的所有字段
  models: models,     // 用新的 models 覆盖
  agents: agents      // 用新的 agents 覆盖
};
```

### 为什么不会破坏原配置？

| 机制 | 说明 |
|------|------|
| **展开运算符 `...userConfig`** | 先把用户原配置的所有字段原样保留（如 `permissions`、`webSearch`、`mcpServers` 等） |
| **只覆盖 `models` 和 `agents`** | 只替换这两个与第三方 API 相关的字段，其他字段完全不动 |
| **`"mode": "merge"`** | models 中设置了 merge 模式，OpenClaw 运行时会将新 provider 合并到已有 providers，而非替换 |

### 与原版的区别

原版工具会执行 `delete result.auth`，移除用户的 `auth` 字段。但实际上 `auth`（官方 API 认证）和第三方 API 可以共存，用户可能同时需要两者。**本版本保留了 `auth` 字段**，不做删除。

## 文件结构

```
├── index.html    # 页面结构
├── style.css     # 样式
├── app.js        # 逻辑代码
└── README.md     # 本说明文档
```

## 使用方法

1. 直接用浏览器打开 `index.html`
2. 选择或自定义 Base URL、提供商、API 模式、模型 ID
3. 输入第三方 API Key
4. 粘贴你的 `~/.openclaw/openclaw.json` 原始内容
5. 点击"生成配置"
6. 将输出结果复制并替换回 `openclaw.json`
