import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Folder,
  Trash2,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/documents', label: 'Documents', icon: FileText },
  { path: '/admin/sections', label: 'Sections', icon: Folder },
  { path: '/admin/trash', label: 'Trash', icon: Trash2 },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/admin/updates', label: 'Updates', icon: RefreshCw },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { data: versionData } = useQuery({
    queryKey: ['version'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/version')
        if (!res.ok) throw new Error('Failed')
        return res.json()
      } catch {
        return { version: '' }
      }
    },
    staleTime: Infinity
  })

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          'hidden lg:flex flex-col'
        )}
      >
        <div className="flex h-14 items-center border-b px-4" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 font-semibold hover:opacity-80">
              <BookOpen className="h-5 w-5" />
              <span>AIDotMD</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 hover:bg-muted"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="border-t p-2">
          {!collapsed && versionData?.version && (
            <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground">
              v{versionData.version}
            </div>
          )}
          <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'px-2')}>
            <ThemeToggle />
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/docs')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Site
              </Button>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/docs')}
                title="View Site"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 hover:bg-muted rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>AIDotMD</span>
          </Link>
          {versionData?.version && (
            <span className="ml-auto text-sm text-muted-foreground">v{versionData.version}</span>
          )}
        </div>

        <div
          className={cn(
            'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            'fixed left-0 top-0 h-screen w-72 max-w-[80vw] bg-card border-r transition-transform duration-300 z-50',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileOpen(false)}>
              <BookOpen className="h-5 w-5" />
              <span>AIDotMD</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 hover:bg-muted rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t p-2">
            <div className="flex items-center gap-2 px-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start"
                onClick={() => navigate('/docs')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Site
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main
        className={cn(
          'min-h-screen transition-all duration-300 pt-14 lg:pt-0',
          'lg:pl-16 xl:pl-60'
        )}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}