# OpenClaw 第三方 API 配置生成器（插件版）

OpenClaw 插件，提供 Web UI 将第三方 API 设置安全地合并到 `openclaw.json` 配置中。

## 安装

### 方式一：从本地路径安装

```bash
openclaw plugins install /path/to/openclaw-config
```

### 方式二：链接安装（开发模式）

```bash
openclaw plugins install -l /path/to/openclaw-config
```

### 方式三：手动放置

将本项目复制到全局扩展目录：

```bash
cp -r openclaw-config ~/.openclaw/extensions/config-generator
```

安装后重启 Gateway。

## 使用

启动 Gateway 后，插件会自动在独立端口启动 Web 服务器。在浏览器中访问：

```
http://127.0.0.1:18800/
```

## 配置（可选）

可在 `openclaw.json` 中自定义端口和绑定地址：

```json
{
  "plugins": {
    "entries": {
      "config-generator": {
        "enabled": true,
        "config": {
          "port": 18800,
          "host": "127.0.0.1"
        }
      }
    }
  }
}
```

## 核心原理

### 配置合并流程

1. **构建 `agents` 对象** — 用提供商名称和模型 ID 拼接默认模型路径
2. **构建 `models` 对象** — 包含 `"mode": "merge"` 确保合并而非替换
3. **解析用户原始配置** — 解析粘贴的 `openclaw.json` 内容
4. **合并输出** — 保留原有字段，只覆盖 `models` 和 `agents`

### 为什么不会破坏原配置？

| 机制 | 说明 |
|------|------|
| **展开运算符 `...userConfig`** | 保留所有原始字段（`permissions`、`webSearch`、`mcpServers` 等） |
| **只覆盖 `models` 和 `agents`** | 其他字段完全不动 |
| **`"mode": "merge"`** | OpenClaw 运行时将新 provider 合并到已有 providers |

## 文件结构

```
├── index.ts               # 插件入口（启动独立 HTTP 服务器）
├── package.json            # npm 包配置
├── openclaw.plugin.json    # 插件清单
├── public/                 # 静态 Web 页面
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```
