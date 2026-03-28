import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, useCallback } from 'react'
import { api, getShareToken } from '@/api/client'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { ShareModal } from '@/components/ShareModal'
import { useShareToken } from '@/hooks/useShareToken'
import { Pencil, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Live indicator pill ───────────────────────────────────────────────────────

type LiveState = 'idle' | 'live' | 'committed'

function LivePill({ state }: { state: LiveState }) {
  if (state === 'idle') return null
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-500',
        state === 'live'
          ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
          : 'bg-muted text-muted-foreground border border-border',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          state === 'live' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50',
        )}
      />
      {state === 'live' ? 'Live' : 'Saved ✓'}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocPage() {
  const { section, slug } = useParams<{ section: string; slug: string }>()
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('q') ?? ''
  const contentRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Extract ?share_token= from URL on mount (for recipients with edit links)
  useShareToken()

  // Live streaming state
  const [liveContent, setLiveContent] = useState<string | null>(null)
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const esRef = useRef<EventSource | null>(null)

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['doc-by-slug', section, slug],
    queryFn: () => api.documents.getBySlug(section!, slug!),
    enabled: !!section && !!slug,
  })

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: api.meta.get,
    staleTime: Infinity,
  })

  // Extract ?share_token= from URL on mount (for recipients with edit links)
  useShareToken()

  const canEdit = meta?.is_local_access || Boolean(getShareToken())

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
    staleTime: Infinity,
    enabled: canEdit,
  })

  // ── Connect to SSE stream ─────────────────────────────────────────────────

  const connectStream = useCallback((docId: string, initialBuffer: string) => {
    // Don't open a second connection if already connected to this doc
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    if (initialBuffer) {
      setLiveContent(initialBuffer)
      setLiveState('live')
    }

    const es = new EventSource(`/api/v1/docs/${docId}/live`)
    esRef.current = es

    es.addEventListener('chunk', (e) => {
      try {
        const { chunk } = JSON.parse(e.data) as { chunk: string }
        setLiveContent(prev => (prev ?? '') + chunk)
        setLiveState('live')
      } catch { /* ignore malformed events */ }
    })

    es.addEventListener('commit', () => {
      setLiveState('committed')
      es.close()
      esRef.current = null
      // Refetch the saved doc from DB after a short delay
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['doc-by-slug', section, slug] })
        // Clear live state after the query resolves
        setTimeout(() => {
          setLiveContent(null)
          setLiveState('idle')
        }, 800)
      }, 400)
    })

    es.onerror = () => {
      // EventSource auto-reconnects on error — no action needed
    }
  }, [qc, section, slug])

  // ── On doc load: check if a stream is active and catch up ─────────────────

  useEffect(() => {
    if (!doc?.id) return

    // Clean up any previous connection from a different doc
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
      setLiveContent(null)
      setLiveState('idle')
    }

    // Check if there's already an active stream (agent started before we arrived)
    fetch(`/api/v1/docs/${doc.id}/live/status`)
      .then(r => r.json())
      .then(({ active, buffer }: { active: boolean; buffer: string }) => {
        if (active) {
          connectStream(doc.id, buffer)
        } else {
          // Still open the connection so we catch a stream that starts later
          connectStream(doc.id, '')
        }
      })
      .catch(() => {
        // If status check fails just open the stream anyway
        connectStream(doc.id, '')
      })

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [doc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search highlight ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!highlight || !doc || !contentRef.current) return
    const el = contentRef.current
    const lower = highlight.toLowerCase()

    const timer = setTimeout(() => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node: Text | null

      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent ?? ''
        const idx = text.toLowerCase().indexOf(lower)
        if (idx === -1) continue
        try {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, idx + highlight.length)
          const mark = document.createElement('mark')
          mark.style.cssText =
            'background:hsl(var(--accent));color:inherit;border-radius:3px;padding:0 2px;'
          range.surroundContents(mark)
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            mark.style.transition = 'background 0.6s'
            mark.style.background = 'transparent'
          }, 2500)
        } catch { /* skip boundary-crossing ranges */ }
        break
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [highlight, doc])

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="p-10 text-muted-foreground text-sm animate-pulse">Loading…</div>
  }

  if (isError || !doc) {
    return (
      <div className="p-10">
        <p className="text-muted-foreground">Document not found.</p>
        <Link to="/docs" className="text-sm text-primary/60 hover:text-primary mt-2 block">
          ← Back to docs
        </Link>
      </div>
    )
  }

  // Show live buffer if streaming, otherwise show saved content
  const renderedContent = liveContent ?? doc.content

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-8 md:px-10 py-8 md:py-10">
      {/* Header row */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
            <span className="print:hidden"><LivePill state={liveState} /></span>
          </div>
          {doc.description && (
            <p className="mt-2 text-muted-foreground">{doc.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 print:hidden">
          <ShareModal docPath={window.location.pathname} settings={settings} />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground/50 hover:text-foreground"
            onClick={() => window.print()}
            title="Print / Save as PDF"
          >
            <Printer className="w-4 h-4" />
          </Button>
          {canEdit && (
            <Link to={`/admin/documents/${doc.id}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground/50 hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="border-t pt-8" ref={contentRef}>
        {renderedContent
          ? <MarkdownRenderer content={renderedContent} />
          : liveState === 'live'
            ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Waiting for content…
              </div>
            )
            : (
              <p className="text-muted-foreground text-sm italic">This document has no content yet.</p>
            )
        }
      </div>
    </article>
  )
}
