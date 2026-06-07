import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { ProfileModal } from '@/components/ProfileModal'
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
  Users,
  LogOut,
  Shield,
  User,
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { path: '/admin/documents', label: 'Documents', icon: FileText, adminOnly: false },
  { path: '/admin/sections', label: 'Sections', icon: Folder, adminOnly: false },
  { path: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/admin/permissions', label: 'Permissions', icon: Shield, adminOnly: true },
  { path: '/admin/trash', label: 'Trash', icon: Trash2, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  { path: '/admin/updates', label: 'Updates', icon: RefreshCw, adminOnly: true },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

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

  const visibleNavItems = navItems.filter(
    item => !item.adminOnly || user?.role === 'admin'
  )

  const sidebarContent = (
    <>
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
        {visibleNavItems.map((item) => {
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

      <div className="border-t p-3 space-y-2">{(user && !collapsed) && (
          <button
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.display_name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
            <User className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
        )}
        {!collapsed && versionData?.version && (
          <div className="px-2 py-1 text-xs text-muted-foreground">
            v{versionData.version}
          </div>
        )}
        <div className={cn(!collapsed ? 'space-y-2' : 'flex flex-col items-center gap-2')}>
          <div className={cn(!collapsed ? '' : 'flex flex-col items-center gap-2')}>
            <div className={cn(!collapsed ? 'flex items-center gap-2' : '')}>
              <ThemeToggle />
            </div>
            {!collapsed ? (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => navigate('/docs')}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  View Site
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => { logout(); navigate('/login') }}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign out
                  </Button>
                )}
              </div>
            ) : (
              <>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowProfile(true)}
                    title="Profile"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/docs')}
                  title="View Site"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { logout(); navigate('/login') }}
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          'hidden lg:flex flex-col'
        )}
      >
        {sidebarContent}
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
          {user && <span className="ml-auto text-sm text-muted-foreground">{user.display_name}</span>}
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
            {visibleNavItems.map((item) => {
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

          <div className="border-t p-3 space-y-2">
            {user && (
              <button
                onClick={() => { setShowProfile(true); setMobileOpen(false) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{user.display_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                </div>
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            )}
            <div className="flex items-center gap-2 px-2">
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-1 px-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => { navigate('/docs'); setMobileOpen(false) }}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                View Site
              </Button>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => { logout(); navigate('/login'); setMobileOpen(false) }}
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </Button>
              )}
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
