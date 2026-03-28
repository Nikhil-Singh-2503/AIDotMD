import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useEffect, useRef } from 'react'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  className?: string
}

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'default' })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      mermaid.render(id, code).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      }).catch(e => console.warn('Mermaid render error:', e))
    })
  }, [code])

  return <div ref={ref} className="my-4 flex justify-center not-prose" />
}

const components: Components = {
  pre({ children, className, ...props }) {
    // Detect mermaid block before passing to rehype-highlight
    const child = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>
    const childClass = child?.props?.className ?? ''
    if (childClass.includes('language-mermaid')) {
      const code = String(child.props.children ?? '').trim()
      return <MermaidBlock code={code} />
    }
    return (
      <pre
        {...props}
        className={cn(
          'not-prose rounded-lg overflow-x-auto my-4 border border-border bg-muted/50 dark:bg-muted/20',
          className
        )}
      >
        {children}
      </pre>
    )
  },
  code({ className, children, ...props }) {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={cn('block p-4 text-sm leading-relaxed', className)} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    )
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-4">
        <table {...props}>{children}</table>
      </div>
    )
  },
}

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div
      className={cn(
        // Base text color — everything inherits this unless prose overrides it
        'text-foreground',
        'prose max-w-none dark:prose-invert',
        // Cover all text-bearing prose elements explicitly
        'prose-p:text-foreground prose-li:text-foreground',
        'prose-strong:text-foreground prose-em:text-foreground',
        'prose-td:text-foreground prose-th:text-foreground',
        'prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-a:text-blue-600 dark:prose-a:text-blue-400',
        'prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:text-muted-foreground',
        'prose-code:text-foreground',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
