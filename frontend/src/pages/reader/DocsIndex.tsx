import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type NavNode } from '@/api/client'
import { BookOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

function findFirstDoc(nodes: NavNode[]): { section: string; slug: string } | null {
  for (const node of nodes) {
    if (node.documents.length > 0) {
      return { section: node.slug, slug: node.documents[0].slug }
    }
    const found = findFirstDoc(node.children)
    if (found) return found
  }
  return null
}

export default function DocsIndex() {
  const navigate = useNavigate()
  const { data: tree, isLoading } = useQuery({ queryKey: ['nav-tree'], queryFn: api.nav.tree })

  useEffect(() => {
    if (!tree) return
    const first = findFirstDoc(tree)
    if (first) {
      navigate(`/docs/${first.section}/${first.slug}`, { replace: true })
    }
  }, [tree, navigate])

  if (isLoading) {
    return <div className="p-10 text-muted-foreground text-sm">Loading...</div>
  }

  // No documents exist
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
      <div className="w-14 h-14 rounded-2xl border border-border bg-muted/30 flex items-center justify-center mb-6">
        <BookOpen className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">No docs yet</h2>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-8">
        Head over to Admin to create your first section and document — it only takes a minute.
      </p>
      <Link to="/admin">
        <Button>
          <Settings className="w-4 h-4 mr-2" />
          Open Admin
        </Button>
      </Link>
    </div>
  )
}
