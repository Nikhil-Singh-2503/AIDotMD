import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Document, type Section } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  FileText,
  Folder,
  Trash2,
  Settings,
  RefreshCw,
  Plus,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { UpdateWidget } from '@/components/admin/UpdateWidget'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ title, value, icon, subtitle, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('rounded-lg p-2.5 bg-muted', variantClasses[variant])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn('text-2xl font-bold', variantClasses[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  to: string
  variant?: 'default' | 'primary'
}

function QuickAction({ title, description, icon, to, variant = 'default' }: QuickActionProps) {
  return (
    <Link to={to}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn(
            'rounded-lg p-2.5 bg-muted group-hover:bg-primary/10 transition-colors',
            variant === 'primary' && 'bg-primary/10'
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: versionData } = useQuery({
    queryKey: ['version'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/version')
        if (!res.ok) throw new Error('Failed')
        return res.json()
      } catch {
        return { version: 'N/A' }
      }
    },
    staleTime: Infinity
  })
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: api.sections.list })
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() })
  const { data: trashData } = useQuery({ queryKey: ['trash'], queryFn: api.trash.list })

  const version = versionData?.version || 'N/A'

  const publishedDocs = documents.filter((d: Document) => d.is_published).length
  const draftDocs = documents.filter((d: Document) => !d.is_published).length
  const trashDocs = trashData?.documents || []
  const trashSections = trashData?.sections || []
  const totalTrash = trashDocs.length + trashSections.length
  const recentDocs = [...documents]
    .sort((a: Document, b: Document) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const sectionMap = Object.fromEntries(sections.map((s: Section) => [s.id, s.title]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to AIDotMD Admin</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/documents/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={documents.length}
          icon={<FileText className="h-5 w-5" />}
          subtitle={`${publishedDocs} published, ${draftDocs} drafts`}
        />
        <StatCard
          title="Sections"
          value={sections.length}
          icon={<Folder className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="In Trash"
          value={totalTrash}
          icon={<Trash2 className="h-5 w-5" />}
          variant={totalTrash > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Version"
          value={version}
          icon={<Settings className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              title="Create Document"
              description="Add a new document to your site"
              icon={<Plus className="h-5 w-5" />}
              to="/admin/documents/new"
              variant="primary"
            />
            <QuickAction
              title="Manage Sections"
              description="Organize your content into sections"
              icon={<Folder className="h-5 w-5" />}
              to="/admin/sections"
            />
            <QuickAction
              title="View Trash"
              description={`${totalTrash} items pending deletion`}
              icon={<Trash2 className="h-5 w-5" />}
              to="/admin/trash"
            />
            <QuickAction
              title="Check Updates"
              description="View system version and updates"
              icon={<RefreshCw className="h-5 w-5" />}
              to="/admin/updates"
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Recent Documents</h2>
              <Link to="/admin/documents">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-0">
                {recentDocs.length > 0 ? (
                  <div className="divide-y">
                    {recentDocs.map((doc: Document) => (
                      <Link
                        key={doc.id}
                        to={`/admin/documents/${doc.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{sectionMap[doc.section_id] || 'Uncategorized'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.is_published ? (
                            <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">Published</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                          )}
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No documents yet</p>
                    <Link to="/admin/documents/new">
                      <Button variant="link" size="sm">Create your first document</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">System Status</h2>
          <UpdateWidget />
        </div>
      </div>
    </div>
  )
}