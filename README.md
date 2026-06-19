# 零宽隐形链接生成器

使用 UTF-8 零宽字符在 URL 路径中编码完整链接，生成视觉上完全不可见的隐形短链接。所有生成的链接看起来都与 `/` 一模一样，但暗藏目标 URL，访问时自动解码跳转。

## 工作原理

```
目标 URL → UTF-8 字节 → Base-4 零宽编码 → URL 路径（不可见）
                                                    |
访问者打开链接 → 前端检测零宽字符 → 解码 → 跳转到目标地址
```

使用 4 种零宽字符作为 Base-4 字母表（每个字符携带 2 bit）：

| 字符 | Unicode | 编码 |
|------|---------|------|
| 零宽空格 | U+200B | 00 |
| 零宽非连接符 | U+200C | 01 |
| 零宽连接符 | U+200D | 10 |
| 零宽无断行空格 | U+FEFF | 11 |

传输格式：`[2 字节大端长度] [URL 的 UTF-8 字节]` → Base-4 零宽字符串。

## 技术栈

- Next.js 16（App Router，catch-all 路由）
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- next-themes（明暗模式切换）
- framer-motion（动画）
- 客户端 i18n（按时区自动检测语言）

## 国际化

页面根据访问者的浏览器时区自动切换语言，无需手动选择：

| 时区 | 语言 |
|------|------|
| `Asia/Shanghai`（大陆东部：北京、上海、重庆、哈尔滨等） | 简体中文 |
| `Asia/Urumqi`（新疆：乌鲁木齐、喀什等） | 简体中文 |
| `Asia/Hong_Kong`、`Asia/Macau`、`Asia/Taipei`（港澳台） | 繁体中文 |
| 其他所有地区 | English |

---

## 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器（端口 3000）
bun run dev

# 代码检查
bun run lint
```

---

## 部署到 Vercel

项目在 `next.config.ts` 中使用 `output: "standalone"`。Vercel 原生支持 Next.js，部署非常简单。

### 方式一：Git 集成（推荐）

1. 将项目推送到 GitHub / GitLab / Bitbucket。
2. 访问 [vercel.com](https://vercel.com)，点击 **"New Project"**。
3. 导入你的仓库。
4. Vercel 会自动识别 Next.js，无需修改构建配置。
5. 点击 **Deploy**。

### 方式二：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署（跟随交互式提示）
vercel

# 部署到生产环境
vercel --prod
```

### 注意事项

- Vercel 自动处理 `[[...slug]]` catch-all 路由，无需额外配置。
- 浏览器会将零宽字符 percent-encode（例如 `%E2%80%8B`），应用通过 `decodeURIComponent()` 处理，解码正常工作。
- 如果使用自定义域名，确保 DNS 已配置指向 Vercel。

---

## 部署到 Netlify

Netlify 通过 **Essential Next.js 插件** 支持 Next.js。

### 方式一：Git 集成（推荐）

1. 将项目推送到 GitHub / GitLab。
2. 访问 [app.netlify.com](https://app.netlify.com)，点击 **"Add new site" > "Import an existing project"**。
3. 连接 Git 仓库。
4. 构建设置：

| 设置项 | 值 |
|--------|-----|
| Build command | `npx @netlify/plugin-nextjs@experimental` then `npx next build` |
| Publish directory | `.next` |

   也可以让 Netlify 自动识别 Next.js（会提示安装 Essential Next.js 插件）。

5. 点击 **Deploy site**。

### 方式二：Netlify CLI

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 登录
netlify login

# 部署（跟随交互式提示）
netlify deploy

# 部署到生产环境
netlify deploy --prod
```

### 注意事项

- **必须安装 Netlify Essential Next.js 插件**（`@netlify/plugin-nextjs`），否则 catch-all 路由和 SSR 无法正常工作，`[[...slug]]` 路由会返回 404。
- 如果使用 `netlify.toml`，添加以下配置：

```toml
[build]
  command = "npx @netlify/plugin-nextjs@experimental && npx next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- 零宽解码完全在客户端完成（React `useMemo`），不需要 Netlify Functions。

---

## 部署到 Cloudflare Workers

本项目是 Next.js 应用，可通过 **@opennextjs/cloudflare**（`@cloudflare/next-on-pages` 的后续替代方案）部署到 Cloudflare。

### 前置条件

- Node.js 18+
- Cloudflare 账户，已安装 `wrangler`
- 项目已推送到 Git 仓库（可选但推荐）

### 步骤

1. 安装 Cloudflare 适配器：

```bash
npm install -g wrangler
bun add -d @opennextjs/cloudflare
```

2. 在项目根目录创建 `wrangler.toml`：

```toml
name = "zwc-link-generator"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
  directory = ".open-next/assets"
  binding = "ASSETS"
```

3. 更新 `package.json` 的 scripts：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npx @opennextjs/cloudflare build",
    "preview": "wrangler dev",
    "deploy": "wrangler deploy"
  }
}
```

4. 构建和部署：

```bash
# 为 Cloudflare 构建
bun run build

# 本地预览
bun run preview

# 部署到 Cloudflare Workers
bun run deploy
```

### 注意事项

- `[[...slug]]` catch-all 路由在 `@opennextjs/cloudflare` 下开箱即用。
- Cloudflare Workers 有请求体大小限制（约 100 KB）和执行时间限制。本应用的解码逻辑完全在客户端运行，不受此限制。
- 浏览器会将零宽字符 percent-encode，应用在客户端解码，无需额外处理。
- 在 `wrangler.toml` 中设置 `compatibility_flags = ["nodejs_compat"]` 以确保构建步骤中 Node.js API 可用。
- 如果静态资源有问题，检查 `wrangler.toml` 中的 `ASSETS` binding 是否指向 `.open-next/assets`。

---

## 环境变量

本项目不需要任何环境变量。所有逻辑均在客户端运行。

---

## 项目结构

```
src/
  app/
    [[...slug]]/page.tsx    # Catch-all 路由：生成器 UI + 自动解码跳转
    layout.tsx               # 根布局，集成 ThemeProvider
    globals.css              # 明/暗主题 CSS 变量
  lib/
    zero-width.ts             # 核心编码/解码库
    i18n.ts                   # 国际化字典和语言检测 hook
  components/
    theme-provider.tsx         # next-themes 封装
    theme-toggle.tsx          # 明暗模式切换按钮
    ui/                       # shadcn/ui 组件
```

---

## License

MIT
