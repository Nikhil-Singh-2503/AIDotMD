import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Layers, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold tracking-tighter text-lg text-foreground select-none">
          AIDotMd
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/docs" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Docs
            </Button>
          </Link>
          <Link to="/admin" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Admin
            </Button>
          </Link>
          <ThemeToggle />
          <Link to="/docs" className="ml-1">
            <Button size="sm" className="gap-1.5">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden w-full">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-60" />
      {/* Radial fade: background bleeds in from edges, center is clear */}
      <div className="absolute inset-0 bg-radial-[ellipse_70%_60%_at_50%_50%] from-background via-background/80 to-transparent" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center pt-20">
        {/* Eyebrow */}
        <div className="animate-fade-up inline-flex items-center gap-2 font-mono text-[10px] sm:text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block shrink-0" />
          AI-native · MCP ready · Self-hosted
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter leading-[1.05] mb-8">
          Research disappears.
          <br />
          <span className="gradient-text">Capture it</span>
          <br />
          <span className="gradient-text">with AI or yourself.</span>
        </h1>

        {/* Subtext */}
        <p className="animate-fade-up-delay-2 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10">
"Self-hosted knowledge base that your AI agents write to via MCP. Or author it manually. Either way — organized, searchable, shareable. Zero vendor lock-in."        </p>

        {/* CTAs */}
        <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link to="/docs">
            <Button size="lg" className="gap-2 h-11 px-6">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/admin">
            <Button variant="outline" size="lg" className="h-11 px-6">
              Open Admin
            </Button>
          </Link>
        </div>

        {/* Mock visual */}
        <div className="animate-fade-in-delay-2 mx-auto max-w-2xl text-left rounded-2xl border border-border bg-muted/40 backdrop-blur-sm overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">redis-complete-guide.md</span>
          </div>
          <pre className="font-mono text-sm text-foreground p-6 leading-relaxed overflow-x-auto">
            <code>{`> Research Redis and document it in AIDotMd

● Live  redis-complete-guide.md

# Redis — Complete Guide

Redis is an open-source, in-memory data store used
as a database, cache, and message broker...

▌`}</code>
          </pre>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}

// ─── Features grid ─────────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: '⚡',
    iconBg: 'bg-green-500/10',
    title: 'SSE Streaming',
    description: 'Watch docs render live, word by word, as the AI agent writes them in real time.',
    pill: 'server-sent events',
    pillColor: 'bg-green-500/10 border-green-500/20 text-green-500',
    dotColor: 'bg-green-500',
  },
  {
    icon: '🔗',
    iconBg: 'bg-blue-500/10',
    title: 'Public Sharing URL',
    description: 'Set Cloudflare, ngrok, or any domain. Copy Link always copies the right public URL.',
    pill: 'configurable',
    pillColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    icon: '🖨️',
    iconBg: 'bg-pink-500/10',
    title: 'PDF Export',
    description: 'Print any doc to a clean, styled PDF directly from the browser. No plugins needed.',
    pill: 'browser print',
    pillColor: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
    dotColor: 'bg-pink-400',
  },
  {
    icon: '🤖',
    iconBg: 'bg-green-500/10',
    title: 'MCP Integration',
    description: 'Connect Claude or Cursor via MCP — 9 tools to create, stream, and search docs autonomously.',
    pill: 'Claude · Cursor',
    pillColor: 'bg-green-500/10 border-green-500/20 text-green-500',
    dotColor: 'bg-green-500',
  },
  {
    icon: '🐳',
    iconBg: 'bg-cyan-500/10',
    title: 'One-Command Docker',
    description: 'Full stack up in under a minute. No config, no setup — just docker-compose up.',
    pill: 'single command',
    pillColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    dotColor: 'bg-cyan-400',
  },
  {
    icon: '🔏',
    iconBg: 'bg-purple-500/10',
    title: 'Draft / Published',
    description: 'Toggle visibility per doc. Drafts are admin-only; published docs are public instantly.',
    pill: 'access control',
    pillColor: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    dotColor: 'bg-purple-400',
  },
] as const

function FeaturesGrid() {
  return (
    <div className="border-y border-border py-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <div className="mb-10 text-center">
          <p className="font-mono text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Everything you need
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground mb-2">
            Packed with features
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            From AI-native streaming to one-click PDF export — every feature built for real use.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              className="group flex flex-col rounded-xl border border-border bg-muted/30 p-5 hover:bg-muted/50 transition-colors"
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-4 ${card.iconBg}`}>
                {card.icon}
              </div>

              {/* Text */}
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{card.description}</p>

              {/* Pill */}
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full border ${card.pillColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.dotColor}`} />
                  {card.pill}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Features bento ────────────────────────────────────────────────────────────

function Features() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="font-mono text-xs text-muted-foreground mb-3 tracking-widest uppercase">Features</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter text-foreground">
            Everything you need.
            <br />
            <span className="text-muted-foreground font-normal">Nothing you don't.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card A — tall left, spans 2 rows */}
          <div className="md:row-span-2 group rounded-2xl border border-border bg-card p-8 flex flex-col hover:bg-accent/30 transition-colors duration-300">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center mb-6 group-hover:border-foreground/20 transition-colors">
              <FileText className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-3">AI Writes. You Watch.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Connect any MCP-compatible AI agent — Claude, Cursor, or your own — and let it author documentation for you. Chunks stream directly into the reader, live, as the agent writes.
            </p>
            <div className="mt-auto rounded-xl border border-border bg-muted/50 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
              <pre className="font-mono text-xs text-muted-foreground p-4 leading-relaxed">
                <code>{`> Research Redis and document it in AIDotMd

● Live  redis-complete-guide.md

# Redis — Complete Guide

Redis is an open-source, in-memory
data store and message broker...

▌`}</code>
              </pre>
            </div>
          </div>

          {/* Card B — top right */}
          <div className="group rounded-2xl border border-border bg-card p-8 hover:bg-accent/30 transition-colors duration-300">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center mb-6 group-hover:border-foreground/20 transition-colors">
              <Layers className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-3">Write It Yourself</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Full Markdown editor with GFM support — tables, task lists, code blocks with syntax highlighting, and more. Import existing <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.md</code> files or paste content directly.
            </p>
            <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
              </div>
              <pre className="font-mono text-xs text-muted-foreground p-4 leading-relaxed">
                <code>{`## Introduction

Hello **world**! This is a \`code\` block.

\`\`\`python
def hello():
    return "AIDotMd"
\`\`\``}</code>
              </pre>
            </div>
          </div>

          {/* Card C — bottom right */}
          <div className="group rounded-2xl border border-border bg-card p-8 hover:bg-accent/30 transition-colors duration-300">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center mb-6 group-hover:border-foreground/20 transition-colors">
              <Eye className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-3">Self-hosted & Yours</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              One command to launch. Your data stays on your machine — SQLite by default, Postgres or S3/R2 when you need scale. No vendor lock-in, no subscriptions.
            </p>
            <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
                <span className="w-2 h-2 rounded-full bg-border" />
              </div>
              <pre className="font-mono text-xs text-muted-foreground p-4 leading-relaxed">
                <code>{`$ docker-compose up --build

✓ backend   healthy
✓ frontend  ready

→ http://localhost:3000`}</code>
              </pre>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Launch with one command',
      description: "Run one Docker command, open your browser, and you're ready. Connect your AI agent via MCP or open the Admin and start writing yourself.",
    },
    {
      number: '02',
      title: 'Create your docs',
      description: 'Ask your AI agent to research a topic and watch it stream content live — or author Markdown yourself in the built-in editor. Either way, no build step.',
    },
    {
      number: '03',
      title: 'Share instantly',
      description: "Documents appear in the reader the moment they're saved. Full-text search, sidebar navigation, and a clean reading experience included out of the box.",
    },
  ]

  return (
    <section className="py-32 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="font-mono text-xs text-muted-foreground mb-3 tracking-widest uppercase">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter">
            Built for humans
            <br />
            <span className="text-muted-foreground font-normal">and AI agents alike.</span>
          </h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {steps.map(({ number, title, description }) => (
            <div key={number} className="bg-background p-8 hover:bg-muted/30 transition-colors duration-200">
              <span className="font-mono text-5xl font-bold text-muted-foreground/20 block mb-6 leading-none">
                {number}
              </span>
              <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ────────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-32 px-6 border-t border-border">
      <div className="relative max-w-5xl mx-auto rounded-2xl border border-border bg-muted/20 overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative z-10 text-center py-20 px-8">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-6">
            Let AI write your docs — or do it yourself.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-sm mx-auto">
            AIDotMd is free, open-source, and runs with a single command. Your docs, your data, your way.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/admin">
              <Button size="lg" className="gap-2 h-11 px-6">
                Open Admin <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="lg" className="h-11 px-6">
                View Docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="sm:col-span-1">
            <Link to="/" className="font-bold tracking-tighter text-lg text-foreground">
              AIDotMd
            </Link>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs">
              The AI-native documentation platform. Your agents write, your team reads.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Admin Panel
                </Link>
              </li>
            </ul>
          </div>

          {/* Theme */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-4">Preferences</p>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Toggle theme</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">AIDotMd &copy; {new Date().getFullYear()}</span>
          <span className="text-xs text-muted-foreground">Built with ♥ and Markdown</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <FeaturesGrid />
      <Features />
      <HowItWorks />
      <CTABanner />
      <Footer />
    </div>
  )
}
