# OpenClaw 第三方 API 配置生成器（插件版）

OpenClaw 插件，提供 Web UI 将第三方 API 设置安全地合并到 `openclaw.json` 配置中。

## 安装

### 方式一：从 npm 安装（推荐）

```bash
openclaw plugins install openclaw-config-generator
```

安装后重启 Gateway 即可使用：

```bash
openclaw gateway restart
```

### 方式二：从 GitHub 安装

```bash
# 克隆到 OpenClaw 扩展目录
git clone https://github.com/BaoxingZhang/openclaw-config-generator.git ~/.openclaw/extensions/openclaw-config-generator

# 启用插件
openclaw plugins enable openclaw-config-generator

# 信任插件（首次需要）
openclaw plugins allow openclaw-config-generator

# 重启 Gateway
openclaw gateway restart
```

### 方式三：手动放置

将本项目复制到全局扩展目录：

```bash
cp -r openclaw-config-generator ~/.openclaw/extensions/openclaw-config-generator
openclaw plugins enable openclaw-config-generator
openclaw plugins allow openclaw-config-generator
```

安装后重启 Gateway。

## 使用

启动 Gateway 后，在浏览器中访问：

```
http://127.0.0.1:18789/plugins/openclaw-config-generator
```

### 功能

- **预设供应商** — 选择预设后自动填充供应商信息、API 端点、模型列表等字段
- **自定义配置** — 所有字段均可手动输入，支持完全自定义的供应商
- **动态模型列表** — 可添加多个模型，每个模型支持展开高级配置（推理模式、上下文窗口、Token 限制、费用等）
- **导入配置** — 一键读取服务器上的 `~/.openclaw/openclaw.json`
- **应用配置** — 验证必填项后，将合并结果直接写入服务器配置文件（自动备份原文件）
- **配置合并** — 将第三方 API 设置安全合并到现有的 `openclaw.json`，不会破坏原有配置

## 本地开发

```bash
# 直接用浏览器打开即可，无需服务器
open public/index.html

# 或使用 Live Server / 本地 HTTP 服务
npx serve public
# 然后浏览器访问 http://localhost:3000/
```

预设供应商数据维护在 `public/presets.json` 中，修改后刷新页面即可生效。

## 配置（可选）

可在 `openclaw.json` 中自定义路由路径：

```json
{
  "plugins": {
    "entries": {
      "openclaw-config-generator": {
        "enabled": true,
        "config": {
          "routePath": "/plugins/openclaw-config-generator"
        }
      }
    }
  }
}
```

> 注意：自定义路径必须以 `/plugins/` 或 `/api/` 开头，否则会被 Gateway SPA fallback 拦截。
> 插件 ID 为 `openclaw-config-generator`，扩展目录为 `~/.openclaw/extensions/openclaw-config-generator/`。

## 核心原理

### 配置合并流程

1. **选择供应商** — 从预设中选择或手动配置供应商信息
2. **配置模型** — 设置模型 ID、名称，可选配置推理模式、上下文窗口、费用等高级参数
3. **粘贴原始配置** — 粘贴现有的 `openclaw.json` 内容
4. **生成合并结果** — 保留原有字段，只覆盖 `models` 和 `agents`

### 为什么不会破坏原配置？

| 机制 | 说明 |
|------|------|
| **展开运算符 `...userConfig`** | 保留所有原始字段（`permissions`、`webSearch`、`mcpServers` 等） |
| **只覆盖 `models` 和 `agents`** | 其他字段完全不动 |
| **`"mode": "merge"`** | OpenClaw 运行时将新 provider 合并到已有 providers |

## 文件结构

```
├── index.ts               # 插件入口（注册 Gateway HTTP handler，内联所有资源）
├── package.json            # npm 包配置
├── openclaw.plugin.json    # 插件清单
├── public/                 # 静态 Web 页面
│   ├── index.html          # 页面结构
│   ├── style.css           # 样式
│   ├── app.js              # 交互逻辑
│   └── presets.json         # 预设供应商数据（修改此文件管理供应商列表）
└── README.md
```

## License

MIT
