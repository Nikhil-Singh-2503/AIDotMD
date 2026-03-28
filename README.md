<div align="center">

<h1>
  <br/>
  📝 AIDotMd
  <br/>
</h1>

<p align="center">
  <strong>Your AI agents do the research. AIDotMd captures, organizes, and shares it — on your own machine.</strong><br/>
  Self-hosted knowledge base where Claude, Cursor, and Windsurf write your docs automatically via MCP.
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/docker-single%20command-2496ED?logo=docker&logoColor=white" alt="Docker"/></a>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/MCP-compatible-6E40C9?logo=anthropic&logoColor=white" alt="MCP"/>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"/>
  <img src="https://img.shields.io/badge/self--hosted-✓-orange" alt="Self-hosted"/>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-mcp-integration">MCP Integration</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-sharing-your-docs">Sharing</a> ·
  <a href="#%EF%B8%8F-configuration">Configuration</a> ·
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a>
</p>

</div>

---

## The Problem

Every developer using AI tools runs into the same wall:

| Pain | What usually happens |
|------|----------------------|
| 💸 **Vendor lock-in** | Notion, Confluence, GitBook store your data on their servers — paid plans, no control over where your knowledge lives |
| 🧠 **Research evaporates** | You spend hours researching in Cursor, Claude Code, or Claude Desktop — then the session ends and it's gone |
| 📁 **No organized view** | Even if you save `.md` files locally, there's no way to view them together — you open files one by one |
| 🔗 **Sharing is a hassle** | To share a doc you paste it into Google Docs, Drive, or Loop — manually, every single time |

---

## How AIDotMd Solves It

| Problem | How AIDotMd fixes it |
|---------|----------------------|
| 💸 Vendor lock-in | Fully self-hosted — SQLite on your own machine, optional S3/R2. Your data never leaves your infrastructure |
| 🧠 Research evaporates | AI agents (Claude, Cursor, Windsurf) write directly to AIDotMd via MCP — automatically, in real-time, no copy-paste |
| 📁 No organized view | Section-based knowledge base with a clean reader — all your docs organized in one place, with search |
| 🔗 Sharing is a hassle | One-click Copy Link + PDF export. Set a public URL once, share forever — no Drive, no Loop, no pasting |

```
AI Agent (Claude / Cursor / Windsurf)
    │
    ├── stream_write("# Redis Commands\n...")   ← appears live in browser, word by word
    ├── stream_write("Redis supports 5 core data types...\n")
    └── commit_stream()                          ← saved to your local database
```

---

## ✨ Features

Everything you need to capture, organize, and share AI-generated knowledge — with zero cloud dependency.

| | Feature | Description |
|--|---------|-------------|
| 🤖 | **AI-native MCP server** | 9 built-in tools — agents can list, create, search, and stream docs |
| ⚡ | **Live streaming renderer** | Watch markdown render chunk-by-chunk as the agent writes, via SSE |
| 🐳 | **Single command setup** | `docker-compose up --build` — full stack, no config required |
| 🔒 | **Self-hosted** | Your docs, your data, your storage. SQLite by default, S3/R2 optional |
| 🔍 | **Full-text search** | Instant search across all sections and documents |
| 🎨 | **Beautiful reader** | Clean, distraction-free doc reader with dark mode support |
| 📂 | **Sections & slugs** | Organize docs into sections; every document gets a human-readable URL |
| 📸 | **Image uploads** | Drag-and-drop image uploads stored on filesystem or S3 |
| 🔏 | **Draft / Published** | Toggle docs between draft (admin-only) and published (public) |
| 🌐 | **Share anywhere** | Configure a public URL (Cloudflare, ngrok, etc.) and Copy Link always works |
| 🖨️ | **PDF export** | Print any doc to PDF directly from the browser — clean, styled output |
| 🚇 | **Cloudflare Tunnel** | Built-in tunnel service — share your local docs with a public URL instantly |

---

## 🚀 Quick Start

**One command. Full stack. Ready in under a minute.**

```bash
git clone https://github.com/your-username/aidotmd.git
cd aidotmd
docker-compose up --build
```

Open **http://localhost:3000** — that's it.

| URL | What you get |
|-----|-------------|
| `http://localhost:3000` | Homepage |
| `http://localhost:3000/docs` | Public documentation reader |
| `http://localhost:3000/admin` | Document & section management |
| `http://localhost:3000/settings` | Storage, database, MCP & sharing config |

> **Data persists** in `./data/` on your host machine — no data is lost on container restarts.

---

## 🌐 Sharing Your Docs

### Quick Share (Zero Config)

AIDotMd includes a **Cloudflare Tunnel** service that runs automatically inside Docker — no account, no domain, no configuration needed.

When you start the stack, a free public URL is assigned to the container:

```bash
docker-compose up --build

# Once running, get your public URL:
docker-compose logs cloudflared | grep trycloudflare.com
# → https://abc123xyz.trycloudflare.com
```

Share that URL with anyone — they can read your published docs from any device, anywhere.

> **Note:** The URL changes each time Docker restarts. For a permanent URL, see the upgrade guide below.

### Configure the Copy Link Button

By default, the **Copy Link** button on every doc page copies the current browser URL (e.g. `localhost:3000/docs/...`). To make it always copy a public URL:

1. Go to **Settings → Sharing**
2. Paste your public URL (Cloudflare, ngrok, or any custom domain)
3. Toggle **"Use public URL for sharing"** → ON
4. Click **Save**

From now on, Copy Link copies `https://your-public-url.com/docs/...` — even when you're browsing on localhost.

### On Every Doc Page

Each doc has three action buttons in the top-right corner:

| Button | Action |
|--------|--------|
| 🔗 **Copy Link** | Copies the shareable URL (uses public URL if configured) |
| 🖨️ **Print / Save as PDF** | Opens the browser print dialog — choose "Save as PDF" for a clean PDF |
| ✏️ **Edit** | Opens the admin editor for that document |

### Draft vs. Published

Control which docs are visible to the public:

- **Published** — visible to anyone with the URL (default for all docs)
- **Draft** — only visible in the admin panel; direct URLs return 404

Toggle visibility in the doc editor under **Visibility** → Published / Draft.

---

### Permanent Public URL (Optional Upgrade)

For a fixed URL that doesn't change on restart, set up a named Cloudflare Tunnel:

**Prerequisites:** Free [Cloudflare account](https://cloudflare.com) + a domain added to Cloudflare DNS.

```bash
# 1. Install cloudflared and authenticate
brew install cloudflare/cloudflare/cloudflared   # macOS
cloudflared tunnel login                          # opens browser

# 2. Create tunnel and add DNS record
cloudflared tunnel create aidotmd
cloudflared tunnel route dns aidotmd docs.yourdomain.com

# 3. Get the tunnel token
cloudflared tunnel token aidotmd
```

Update your `.env` file:
```env
CLOUDFLARE_TUNNEL_TOKEN=<paste-token-here>
```

Update `docker-compose.yml` — change the `cloudflared` service:
```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: unless-stopped
  command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
  environment:
    CLOUDFLARE_TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on:
    - frontend
  networks:
    - aidotmd_net
```

Also update the backend environment in `docker-compose.yml`:
```yaml
BASE_URL: "https://docs.yourdomain.com"
USE_PUBLIC_URL: "true"
CORS_ORIGINS: "https://docs.yourdomain.com,http://localhost:3000"
```

Restart: `docker-compose up --build` — your docs are permanently available at `https://docs.yourdomain.com`.

---

## 🤖 MCP Integration

AIDotMd ships with a built-in **MCP (Model Context Protocol) server** that any compatible AI agent can connect to.

> Your MCP API key is auto-generated on first launch. Find it at **Settings → MCP** in the UI.

### Connect Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aidotmd": {
      "type": "http",
      "url": "http://localhost:3000/mcp/",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Connect Cursor

Add to `.cursor/mcp.json` in your project root, or via **Cursor Settings → MCP**:

```json
{
  "mcpServers": {
    "aidotmd": {
      "url": "http://localhost:3000/mcp/?api_key=YOUR_API_KEY_HERE"
    }
  }
}
```

> The key is embedded in the URL (`?api_key=…`) for Cursor compatibility.

### Available Tools

```
list_sections      → List all documentation sections
create_section     → Create a new section
list_documents     → List documents (optionally filtered by section)
get_document       → Fetch a document by ID or slug
create_document    → Create a new document with content
update_document    → Update title, content, or append to a document
stream_write       → Stream content chunk-by-chunk (live browser render)
commit_stream      → Finalize stream and save to database
search_docs        → Full-text search across all documents
```

### Live Streaming in Action

When an agent calls `stream_write`, the browser renders markdown **live**, character by character. A green **● Live** indicator pulses in the header. When the agent calls `commit_stream`, it switches to **Saved ✓** and the document is persisted.

```python
# Example: agent researches Redis and writes a doc in real-time
await stream_write(doc_id="abc123", chunk="# Redis Commands & Data Types\n\n")
await stream_write(doc_id="abc123", chunk="Redis supports **5 core data types**...\n")
await commit_stream(doc_id="abc123")
# → Doc is live in the browser and saved to DB
```

---

## ⚙️ Configuration

All config can be set via environment variables in `docker-compose.yml` or through the **Settings UI** at `/settings`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./aidotmd.db` | SQLAlchemy DB connection URL |
| `DOCS_OUTPUT_DIR` | `./data/docs` | Where `.md` files are exported |
| `STATIC_DIR` | `./data/static/img` | Image upload directory |
| `BASE_URL` | `http://localhost:3000` | Public-facing base URL (used for share links) |
| `USE_PUBLIC_URL` | `false` | Use `BASE_URL` for Copy Link instead of `window.location` |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed CORS origins |
| `S3_BUCKET` | _(empty)_ | S3/R2 bucket name (optional) |
| `S3_REGION` | _(empty)_ | S3 region |
| `S3_ACCESS_KEY_ID` | _(empty)_ | S3 access key ID |
| `S3_SECRET_ACCESS_KEY` | _(empty)_ | S3 secret access key |
| `S3_ENDPOINT_URL` | _(empty)_ | Custom endpoint for R2/MinIO |
| `MCP_API_KEY` | _(auto-generated)_ | API key for MCP authentication |

### Storage: Local Filesystem

By default, uploaded images and exported markdown files are stored at `./data/` on your host machine (mounted as a Docker volume). The path inside the container is `/app/data/`.

To use a different host path, change the volume mount in `docker-compose.yml`:

```yaml
volumes:
  - /your/custom/path:/app/data   # ← change left side to any host path
```

### Storage: Cloudflare R2 / S3-Compatible

```env
STORAGE_BACKEND=s3
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
```

### Database: PostgreSQL

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/aidotmd
```

> Changing `DATABASE_URL` requires a container restart: `docker-compose restart backend`

---

## 🛠️ Local Development

Prefer live reloading? Run the services individually:

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
# → API: http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api`, `/mcp`, and `/static` to `localhost:8000`.

---

## 🗂️ Project Structure

```
aidotmd/
├── docker-compose.yml          # Single-command full-stack launch
├── data/                       # Persisted data (gitignored)
│   ├── aidotmd.db              # SQLite database
│   ├── aidotmd.config.json     # Runtime settings (MCP key, storage, etc.)
│   ├── docs/                   # Markdown file exports
│   │   └── {section}/{slug}.md
│   └── static/img/             # Uploaded images
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + lifespan + MCP auth middleware
│   │   ├── config.py           # Pydantic settings (env vars)
│   │   ├── api/                # REST routers
│   │   │   ├── documents.py
│   │   │   ├── sections.py
│   │   │   ├── stream.py       # SSE endpoints (/live, /live/status)
│   │   │   ├── nav.py          # Sidebar tree builder
│   │   │   └── settings.py     # Settings CRUD + storage test
│   │   ├── mcp/
│   │   │   └── server.py       # FastMCP server (9 tools)
│   │   └── services/
│   │       ├── stream_manager.py   # In-memory pub/sub for live streaming
│   │       ├── document_service.py
│   │       └── settings_service.py
│   ├── alembic/                # Database migrations
│   └── requirements.txt
│
└── frontend/
    ├── nginx.conf              # SPA routing + API reverse proxy
    ├── Dockerfile              # Multi-stage: node build → nginx serve
    └── src/
        ├── pages/
        │   ├── HomePage.tsx         # Landing page
        │   ├── reader/DocPage.tsx   # Live SSE rendering + Copy Link + Print
        │   ├── admin/               # Document & section management
        │   └── Settings.tsx         # DB / Storage / MCP / Sharing config
        ├── components/
        │   ├── MarkdownRenderer.tsx
        │   └── DocsSidebar.tsx
        └── api/
            └── client.ts            # Type-safe API client
```

---

## 🏗️ Tech Stack

<table>
<tr>
  <th>Layer</th>
  <th>Technology</th>
  <th>Why</th>
</tr>
<tr>
  <td><strong>Backend</strong></td>
  <td>FastAPI + SQLAlchemy (async)</td>
  <td>Fast, async-first, great OpenAPI docs</td>
</tr>
<tr>
  <td><strong>Database</strong></td>
  <td>SQLite (default) / PostgreSQL</td>
  <td>Zero-config local; scales to Postgres for production</td>
</tr>
<tr>
  <td><strong>MCP Server</strong></td>
  <td>FastMCP (StreamableHTTP)</td>
  <td>Protocol-compliant MCP with session management</td>
</tr>
<tr>
  <td><strong>Streaming</strong></td>
  <td>Server-Sent Events (SSE)</td>
  <td>Native browser support, no WebSocket complexity</td>
</tr>
<tr>
  <td><strong>Frontend</strong></td>
  <td>React 18 + Vite + Tailwind v4</td>
  <td>Fast builds, utility-first styling</td>
</tr>
<tr>
  <td><strong>UI Components</strong></td>
  <td>shadcn/ui + Radix</td>
  <td>Accessible, unstyled primitives</td>
</tr>
<tr>
  <td><strong>Markdown</strong></td>
  <td>react-markdown + remark-gfm + highlight.js</td>
  <td>GFM tables, code highlighting, syntax colors</td>
</tr>
<tr>
  <td><strong>Serving</strong></td>
  <td>nginx (Docker)</td>
  <td>SPA fallback + reverse proxy in one container</td>
</tr>
</table>

---

## 🆚 How AIDotMd is Different

| | AIDotMd | Notion | GitBook | Docusaurus |
|--|-------|--------|---------|------------|
| **Your data, your storage** | ✅ Local / S3 | ❌ Their cloud | ❌ Their cloud | ⚠️ Manual |
| **AI agent writes docs** | ✅ Native MCP | ❌ | ❌ | ❌ |
| **Live streaming render** | ✅ SSE | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ❌ | Paid only | ✅ |
| **Single-command launch** | ✅ Docker | ❌ | ❌ | ⚠️ Manual |
| **Share via link (no copy-paste)** | ✅ Built-in | ✅ | ✅ | ❌ |
| **PDF export** | ✅ | ⚠️ Paid | ⚠️ Paid | ❌ |
| **No build step for content** | ✅ | ✅ | ✅ | ❌ |
| **Open source** | ✅ MIT | ❌ | ❌ | ✅ |

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for the AI-native era of documentation.</sub>
</div>
