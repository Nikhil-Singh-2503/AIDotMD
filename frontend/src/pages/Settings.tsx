import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Database, HardDrive, Cpu, Copy, Check, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, ArrowLeft, Settings2, Share2, ChevronDown,
} from 'lucide-react'
import { api, type AppSettings } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

// ── tiny helpers ─────────────────────────────────────────────────────────────

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const { copied, copy } = useCopy(text)
  return (
    <Button variant="ghost" size="sm" onClick={copy} className={cn('gap-1.5', className)}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

function SectionHeading({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="mt-0.5 w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-xs font-medium text-foreground">{children}</label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6', className)}>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border my-6" />
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = 'database' | 'storage' | 'mcp' | 'sharing'

// ── Database Tab ─────────────────────────────────────────────────────────────

function DatabaseTab({ settings }: { settings: AppSettings }) {
  const qc = useQueryClient()
  const [dbUrl, setDbUrl] = useState(settings.database_url)
  const [saved, setSaved] = useState(false)
  const [restartNeeded, setRestartNeeded] = useState(false)

  const save = useMutation({
    mutationFn: () => api.settings.update({ database_url: dbUrl }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setRestartNeeded(res.restart_required)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const isDirty = dbUrl !== settings.database_url

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Database}
        title="Database"
        description="Where AIDotMd stores sections, documents and metadata."
      />

      <Card>
        <Label hint="SQLite for local use. PostgreSQL for shared / hosted setups.">
          Database URL
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={dbUrl}
            onChange={e => setDbUrl(e.target.value)}
            placeholder="sqlite+aiosqlite:////app/data/aidotmd.db"
            className="font-mono text-xs"
          />
          <Button
            onClick={() => save.mutate()}
            disabled={!isDirty || save.isPending}
            size="sm"
            className="sm:shrink-0"
          >
            {save.isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </Button>
        </div>

        {restartNeeded && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Database URL changed. Restart required for the change to take effect.{' '}
              <code className="font-mono">docker-compose restart backend</code>
            </p>
          </div>
        )}

        <Divider />

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground mb-3">Examples</p>
          {[
            ['SQLite (local)', 'sqlite+aiosqlite:////app/data/aidotmd.db'],
            ['PostgreSQL', 'postgresql+asyncpg://user:pass@host:5432/aidotmd'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5 break-all">{val}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 shrink-0"
                onClick={() => setDbUrl(val)}
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Storage Tab ───────────────────────────────────────────────────────────────

function StorageTab({ settings }: { settings: AppSettings }) {
  const qc = useQueryClient()
  const [backend, setBackend] = useState(settings.storage_backend)
  const [bucket, setBucket] = useState(settings.s3_bucket)
  const [region, setRegion] = useState(settings.s3_region)
  const [endpoint, setEndpoint] = useState(settings.s3_endpoint_url)
  const [accessKey, setAccessKey] = useState(settings.s3_access_key_id)
  const [secretKey, setSecretKey] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const save = useMutation({
    mutationFn: () => api.settings.update({
      storage_backend: backend,
      s3_bucket: bucket,
      s3_region: region,
      s3_endpoint_url: endpoint,
      s3_access_key_id: accessKey,
      ...(secretKey ? { s3_secret_access_key: secretKey } : {}),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const testStorage = useMutation({
    mutationFn: () => api.settings.testStorage({
      s3_bucket: bucket, s3_region: region,
      s3_endpoint_url: endpoint, s3_access_key_id: accessKey,
      ...(secretKey ? { s3_secret_access_key: secretKey } : {}),
    }),
    onSuccess: (res) => setTestResult(res),
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={HardDrive}
        title="File Storage"
        description="Where uploaded images and markdown files are stored."
      />

      <Card>
        {/* Backend selector */}
        <div className="flex gap-3 mb-6">
          {(['filesystem', 's3'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setBackend(opt)}
              className={cn(
                'flex-1 rounded-lg border px-4 py-3 text-left transition-colors',
                backend === opt
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border hover:border-foreground/40',
              )}
            >
              <p className="text-xs font-semibold text-foreground">
                {opt === 'filesystem' ? 'Local Filesystem' : 'S3 / R2'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {opt === 'filesystem'
                  ? 'Files stored on disk inside the volume'
                  : 'AWS S3, Cloudflare R2, or any S3-compatible API'}
              </p>
            </button>
          ))}
        </div>

        {backend === 'filesystem' && (
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Files are stored at <code className="font-mono">{settings.data_dir}</code> inside
              the Docker volume. No additional configuration needed.
            </p>
          </div>
        )}

        {backend === 's3' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Bucket Name</Label>
                <Input value={bucket} onChange={e => setBucket(e.target.value)} placeholder="my-aidotmd-bucket" className="text-xs" />
              </div>
              <div>
                <Label>Region</Label>
                <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="us-east-1" className="text-xs" />
              </div>
            </div>
            <div>
              <Label hint="Leave blank for AWS. Required for R2, MinIO, or other S3-compatible services.">
                Custom Endpoint URL
              </Label>
              <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://xxxx.r2.cloudflarestorage.com" className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Access Key ID</Label>
                <Input value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" className="font-mono text-xs" />
              </div>
              <div>
                <Label hint={settings.s3_secret_access_key_set ? 'A key is already saved. Enter a new one to replace it.' : undefined}>
                  Secret Access Key
                </Label>
                <Input
                  type="password"
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  placeholder={settings.s3_secret_access_key_set ? '••••••••  (saved)' : 'Enter secret key'}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Test connection result */}
            {testResult && (
              <div className={cn(
                'flex items-start gap-2.5 rounded-lg border px-4 py-3',
                testResult.success
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-red-500/30 bg-red-500/10',
              )}>
                {testResult.success
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <p className={cn('text-xs', testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                  {testResult.message}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {backend === 's3' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => testStorage.mutate()}
              disabled={testStorage.isPending}
              className="gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testStorage.isPending && 'animate-spin')} />
              {testStorage.isPending ? 'Testing…' : 'Test Connection'}
            </Button>
          )}
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : save.isSuccess ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── MCP Tab ───────────────────────────────────────────────────────────────────

/** Collapsible integration config block — collapsed by default */
function IntegrationBlock({
  title,
  hint,
  config,
  footer,
}: {
  title: string
  hint: React.ReactNode
  config: string
  footer?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="p-0 overflow-hidden">
      {/* Header row — always visible, clicking expands/collapses */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 break-all">{hint}</p>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground shrink-0 ml-3 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex items-center justify-end pt-3 pb-2">
            <CopyButton text={config} className="h-7 text-xs" />
          </div>
          <pre className="rounded-lg bg-muted/60 p-4 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed">
            {config}
          </pre>
          {footer && <p className="text-[11px] text-muted-foreground mt-3">{footer}</p>}
        </div>
      )}
    </Card>
  )
}

function McpTab({ settings }: { settings: AppSettings }) {
  const qc = useQueryClient()
  const [key, setKey] = useState(settings.mcp_api_key)
  const [showKey, setShowKey] = useState(false)

  const regen = useMutation({
    mutationFn: api.settings.regenerateKey,
    onSuccess: (res) => {
      setKey(res.mcp_api_key)
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const maskedKey = key ? `${key.slice(0, 12)}${'•'.repeat(20)}` : '—'

  // MCP endpoint URL — always use the explicit origin so port 3000 is included
  const mcpUrl = `${window.location.origin}/mcp/`

  // Claude Desktop: uses type="http" and Authorization header
  const claudeDesktopConfig = JSON.stringify({
    mcpServers: {
      aidotmd: {
        type: 'http',
        url: mcpUrl,
        headers: { Authorization: `Bearer ${key}` },
      },
    },
  }, null, 2)

  // Claude Code: same HTTP transport as Claude Desktop
  const claudeCodeConfig = `claude mcp add --transport http aidotmd ${mcpUrl} \\\n  --header "Authorization: Bearer ${key}"`

  // Cursor: embed key in URL as query param (Cursor may not forward custom headers)
  const cursorConfig = JSON.stringify({
    mcpServers: {
      aidotmd: {
        url: `${mcpUrl}?api_key=${key}`,
      },
    },
  }, null, 2)

  // Windsurf: uses serverUrl field with key in query param
  const windsurfConfig = JSON.stringify({
    mcpServers: {
      aidotmd: {
        serverUrl: `${mcpUrl}?api_key=${key}`,
      },
    },
  }, null, 2)

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Cpu}
        title="MCP Integration"
        description="Connect AI agents to your AIDotMd workspace. Click any tool below to expand its config."
      />

      {/* Connection URL */}
      <Card>
        <p className="text-xs font-semibold text-foreground mb-2">MCP Endpoint</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-foreground truncate">{mcpUrl}</code>
          <CopyButton text={mcpUrl} className="h-7 text-xs shrink-0" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          ⚠️ The port number (<code className="font-mono">:3000</code>) is required — use the full URL above.
        </p>
      </Card>

      {/* API Key */}
      <Card>
        <p className="text-xs font-semibold text-foreground mb-4">API Key</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-foreground truncate">
            {showKey ? key : maskedKey}
          </code>
          <button
            onClick={() => setShowKey(v => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {showKey ? 'Hide' : 'Reveal'}
          </button>
          <CopyButton text={key} className="h-7 text-xs" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn('w-3 h-3', regen.isPending && 'animate-spin')} />
            Regenerate
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Regenerating will invalidate the current key immediately.
          </p>
        </div>
      </Card>

      {/* Collapsible integration blocks */}
      <IntegrationBlock
        title="Claude Desktop"
        hint={<>Add to <code className="font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</code></>}
        config={claudeDesktopConfig}
      />

      <IntegrationBlock
        title="Claude Code"
        hint="Run this command in your terminal — Claude Code will register the MCP server automatically."
        config={claudeCodeConfig}
        footer="After running, verify with: claude mcp list (Restart Claude Code if the new server doesn't appear immediately)"
      />

      <IntegrationBlock
        title="Cursor"
        hint={<>Add to <code className="font-mono">.cursor/mcp.json</code> in your project root, or via <strong>Cursor Settings → MCP</strong></>}
        config={cursorConfig}
        footer={<>API key is embedded in the URL (<code className="font-mono">?api_key=…</code>) for Cursor compatibility.</>}
      />

      <IntegrationBlock
        title="Windsurf"
        hint={<>Add to <code className="font-mono">~/.codeium/windsurf/mcp_config.json</code>, then restart Windsurf.</>}
        config={windsurfConfig}
        footer={<>API key is embedded in the URL (<code className="font-mono">?api_key=…</code>) for Windsurf compatibility.</>}
      />

      {/* How it works */}
      <Card className="border-dashed">
        <p className="text-xs font-semibold text-foreground mb-3">How it works</p>
        <ol className="space-y-2">
          {[
            'Expand your AI tool above, copy the config and follow the hint',
            'Restart your AI tool — it should show "aidotmd" as a connected MCP server',
            'Ask the agent to research a topic and save findings to AIDotMd',
            'Watch the document appear live in your docs reader',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <span className="font-mono text-foreground/40 shrink-0 w-4">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
        <Divider />
        <p className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">Available tools:</strong>{' '}
          list_sections · create_section · list_documents · get_document · create_document · update_document · stream_write · commit_stream · search_docs
        </p>
      </Card>
    </div>
  )
}

// ── Sharing Tab ───────────────────────────────────────────────────────────────

function SharingTab({ settings }: { settings: AppSettings }) {
  const qc = useQueryClient()
  const [baseUrl, setBaseUrl] = useState(settings.base_url)
  const [usePublic, setUsePublic] = useState(settings.use_public_url)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => api.settings.update({ base_url: baseUrl, use_public_url: usePublic }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const isDirty = baseUrl !== settings.base_url || usePublic !== settings.use_public_url

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Share2}
        title="Sharing"
        description="Configure the public URL used when copying doc links."
      />

      <Card>
        {/* Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <label className="text-xs font-medium text-foreground">Use public URL for sharing</label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              When enabled, Copy Link uses the public URL below instead of localhost.
            </p>
          </div>
          <Switch
            checked={usePublic}
            onCheckedChange={v => setUsePublic(v)}
          />
        </div>

        {/* URL input */}
        <Label hint="Works with Cloudflare Tunnel, ngrok, or any public URL.">
          Public Site URL
        </Label>
        <Input
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://abc123.trycloudflare.com"
          disabled={!usePublic}
          className="font-mono text-xs mb-3"
        />

        {/* Hint */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            To get your Cloudflare Tunnel URL, run:
          </p>
          <pre className="text-[11px] font-mono text-foreground select-all overflow-x-auto">
            docker-compose logs cloudflared | grep trycloudflare.com
          </pre>
        </div>

        <div className="mt-6">
          <Button
            onClick={() => save.mutate()}
            disabled={!isDirty || save.isPending}
            size="sm"
          >
            {save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── Main Settings page ────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'database', label: 'Database', icon: Database },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'mcp', label: 'MCP', icon: Cpu },
  { id: 'sharing', label: 'Sharing', icon: Share2 },
]

export default function Settings() {
  const [tab, setTab] = useState<Tab>('database')

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/">
              <span className="font-bold tracking-tighter text-lg text-foreground">AIDotMd</span>
            </Link>
            <span className="text-border text-lg select-none">/</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              Settings
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AIDotMd instance. Settings are saved to{' '}
            <code className="font-mono text-xs">data/aidotmd.config.json</code>.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Tabs — horizontal scrollable on mobile, vertical sidebar on md+ */}
          <nav className="md:w-44 md:shrink-0">
            <ul className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  <button
                    onClick={() => setTab(id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left whitespace-nowrap',
                      tab === id
                        ? 'bg-foreground/10 text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {isLoading && (
              <div className="text-sm text-muted-foreground">Loading settings…</div>
            )}
            {error && (
              <div className="text-sm text-red-500">Failed to load settings.</div>
            )}
            {settings && (
              <>
                {tab === 'database' && <DatabaseTab settings={settings} />}
                {tab === 'storage' && <StorageTab settings={settings} />}
                {tab === 'mcp' && <McpTab settings={settings} />}
                {tab === 'sharing' && <SharingTab settings={settings} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
