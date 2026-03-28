import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api, type NavNode } from '@/api/client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionNodeProps {
  node: NavNode
  depth?: number
}

function SectionNode({ node, depth = 0 }: SectionNodeProps) {
  const { section: activeSection, slug: activeSlug } = useParams()
  const [open, setOpen] = useState(true)

  const hasContent = node.documents.length > 0 || node.children.length > 0

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between w-full rounded transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          depth === 0
            ? 'px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'
            : 'px-2 py-1.5 text-sm font-medium text-foreground/80'
        )}
        style={depth > 0 ? { paddingLeft: `${depth * 12 + 8}px` } : undefined}
      >
        <span>{node.title}</span>
        {hasContent && (
          open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </button>

      {open && (
        <div>
          {node.documents.map(doc => (
            <Link
              key={doc.id}
              to={`/docs/${node.slug}/${doc.slug}`}
              className={cn(
                'block rounded text-sm transition-colors py-1.5',
                activeSection === node.slug && activeSlug === doc.slug
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px`, paddingRight: '8px' }}
            >
              {doc.title}
            </Link>
          ))}
          {node.children.map(child => (
            <SectionNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface DocsSidebarProps {
  open?: boolean
  onClose?: () => void
}

export function DocsSidebar({ open, onClose }: DocsSidebarProps) {
  const { data: tree = [] } = useQuery({ queryKey: ['nav-tree'], queryFn: api.nav.tree })

  return (
    <aside className={cn(
      'w-60 shrink-0 border-r h-full overflow-y-auto flex flex-col bg-background',
      // Mobile: fixed drawer, slides in from left
      'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
      'md:relative md:translate-x-0 md:z-auto',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-base" onClick={onClose}>
          <BookOpen className="w-4 h-4" />
          AIDotMd
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded hover:bg-accent text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {tree.map(node => (
          <SectionNode key={node.id} node={node} />
        ))}
        {tree.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center py-8">No content yet.</p>
        )}
      </nav>
    </aside>
  )
}
