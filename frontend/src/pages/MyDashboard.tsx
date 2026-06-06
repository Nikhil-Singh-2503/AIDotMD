import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, FileText, ArrowRight, Shield, ExternalLink, LogOut,
  Folder, Plus,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

function roleDisplay(role: string) {
  switch (role) {
    case 'admin': return <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800">Admin</Badge>
    case 'editor': return <Badge variant="secondary">Editor</Badge>
    case 'viewer': return <Badge variant="outline">Viewer</Badge>
    default: return <Badge variant="outline">{role}</Badge>
  }
}

function roleDescription(role: string) {
  switch (role) {
    case 'editor':
      return 'You can create, edit, and delete documents and sections.'
    case 'viewer':
      return 'You can read documents but cannot make changes.'
    default:
      return ''
  }
}

function EditorActions() {
  const actions = [
    { to: '/admin/documents', icon: FileText, label: 'Documents', desc: 'Create, edit, and manage documents' },
    { to: '/admin/sections', icon: Folder, label: 'Sections', desc: 'Organize content into sections' },
    { to: '/admin/documents/new', icon: Plus, label: 'New Document', desc: 'Write a new document' },
  ]

  return (
    <>
      <h2 className="text-lg font-semibold">Content Management</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50 h-full">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg p-2.5 bg-muted group-hover:bg-primary/10 transition-colors">
                  <a.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

export default function MyDashboard() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold hover:opacity-80">
            <BookOpen className="h-5 w-5" />
            <span>AIDotMD</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500"
              onClick={() => { logout() }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
              Welcome, {user.display_name}
              {roleDisplay(user.role)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{roleDescription(user.role)}</p>
          </div>
        </div>

        {user.role === 'editor' && <EditorActions />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/docs">
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg p-2.5 bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Browse Docs</p>
                  <p className="text-sm text-muted-foreground">Read and explore the knowledge base</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/docs">
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg p-2.5 bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Documents</p>
                  <p className="text-sm text-muted-foreground">View all published documents</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Your Permissions</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You have the <strong>{user.role}</strong> role.
              {user.role === 'editor' && ' You can create, edit, and delete documents and manage sections.'}
              {user.role === 'viewer' && ' You can read documents but cannot create, edit, or delete content.'}
              {user.role === 'admin' && ' You have full access to all features.'}
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Link to="/docs">
                <Button size="sm" className="gap-1.5">
                  Go to Docs <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              {user.role === 'editor' && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
