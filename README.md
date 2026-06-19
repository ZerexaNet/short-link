# Zero-Width Link Generator

Encode URLs into visually invisible short links using UTF-8 zero-width characters. All generated links look identical to `/` but carry encoded target URLs that are automatically decoded and redirected on visit.

## How It Works

```
Target URL ──► UTF-8 bytes ──► Base-4 zero-width encoding ──► URL path (invisible)
                                                                          │
Visitor opens link ──► Frontend detects ZWCs ──► Decode ──► Redirect to target
```

Four zero-width characters are used as a Base-4 alphabet (2 bits each):

| Character | Unicode | Bits |
|-----------|---------|------|
| Zero Width Space | U+200B | 00 |
| Zero Width Non-Joiner | U+200C | 01 |
| Zero Width Joiner | U+200D | 10 |
| Zero Width No-Break Space | U+FEFF | 11 |

Wire format: `[2-byte big-endian length] [URL UTF-8 bytes]` -> Base-4 ZWC string.

## Tech Stack

- Next.js 16 (App Router, catch-all routes)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- next-themes (light/dark mode)
- framer-motion (animations)

---

## Local Development

```bash
# Install dependencies
bun install

# Start dev server (port 3000)
bun run dev

# Lint
bun run lint
```

---

## Deploy to Vercel

The project uses `output: "standalone"` in `next.config.ts`. Vercel handles Next.js natively, so deployment is straightforward.

### Method 1: Git Integration (Recommended)

1. Push your project to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com](https://vercel.com) and click **"New Project"**.
3. Import your repository.
4. Vercel auto-detects Next.js. No build settings to change.
5. Click **Deploy**.

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follows interactive prompts)
vercel

# Deploy to production
vercel --prod
```

### Important Notes for Vercel

- Vercel auto-handles the `[[...slug]]` catch-all route. No extra configuration needed.
- Zero-width characters in URLs are percent-encoded by the browser (e.g., `%E2%80%8B`). The app handles this with `decodeURIComponent()` on the server route param, so decoding works correctly.
- If you have a custom domain, make sure your DNS is configured to point to Vercel.

---

## Deploy to Netlify

Netlify supports Next.js via the **Essential Next.js plugin**.

### Method 1: Git Integration (Recommended)

1. Push your project to GitHub / GitLab.
2. Go to [app.netlify.com](https://app.netlify.com) and click **"Add new site" > "Import an existing project"**.
3. Connect your Git provider and select the repository.
4. Set the build settings:

| Setting | Value |
|---------|-------|
| Build command | `npx @netlify/plugin-nextjs@experimental` then `npx next build` |
| Publish directory | `.next` |

   Or simply let Netlify auto-detect Next.js (it should prompt you to install the Essential Next.js plugin).

5. Click **Deploy site**.

### Method 2: Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy (follows interactive prompts)
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Important Notes for Netlify

- The **Netlify Essential Next.js plugin** (`@netlify/plugin-nextjs`) is required for catch-all routes and SSR to work properly. Without it, the `[[...slug]]` route will return 404.
- If you use `netlify.toml`, add:

```toml
[build]
  command = "npx @netlify/plugin-nextjs@experimental && npx next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- Netlify Functions are not needed. The zero-width decoding happens entirely in the client (React `useMemo`), so there is no server-side logic requirement.

---

## Deploy to Cloudflare Workers

This is a static + SSR Next.js app, so it deploys to Cloudflare via **@opennextjs/cloudflare** (the successor to the deprecated `@cloudflare/next-on-pages`).

### Prerequisites

- Node.js 18+
- A Cloudflare account with `wrangler` installed
- Your project pushed to a Git repo (optional but recommended)

### Steps

1. Install the Cloudflare adapter:

```bash
npm install -g wrangler
bun add -d @opennextjs/cloudflare
```

2. Create `wrangler.toml` in your project root:

```toml
name = "zwc-link-generator"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
  directory = ".open-next/assets"
  binding = "ASSETS"
```

3. Update your `package.json` scripts:

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

4. Build and deploy:

```bash
# Build the project for Cloudflare
bun run build

# Preview locally with wrangler
bun run preview

# Deploy to Cloudflare Workers
bun run deploy
```

### Important Notes for Cloudflare Workers

- The `[[...slug]]` catch-all route works out of the box with `@opennextjs/cloudflare`.
- Cloudflare Workers have a **request body size limit of ~100 KB** and execution time limits depending on your plan. This app is purely client-side rendering for the decode logic, so limits are not a concern.
- Zero-width characters will be percent-encoded by the browser before reaching the worker. The app decodes them client-side, so this is handled correctly.
- Set `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` to ensure Node.js APIs are available during the build step.
- If you encounter issues with static assets, verify the `ASSETS` binding in `wrangler.toml` points to `.open-next/assets`.

---

## Environment Variables

This project does not require any environment variables. All logic is client-side.

---

## Project Structure

```
src/
  app/
    [[...slug]]/page.tsx    # Catch-all route: generator UI + auto-redirect
    layout.tsx               # Root layout with ThemeProvider
    globals.css              # Light/dark theme CSS variables
  lib/
    zero-width.ts             # Core encode/decode library
  components/
    theme-provider.tsx         # next-themes wrapper
    theme-toggle.tsx          # Light/dark toggle button
    ui/                       # shadcn/ui components
```

---

## License

MIT
