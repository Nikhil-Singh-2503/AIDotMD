import { createBrowserRouter, Outlet } from 'react-router-dom'
import AdminDocuments from './pages/admin/Documents'
import AdminDocumentEdit from './pages/admin/DocumentEdit'
import AdminSections from './pages/admin/Sections'
import AdminTrash from './pages/admin/Trash'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminPermissions from './pages/admin/Permissions'
import AdminUpdates from './pages/admin/Updates'
import DocsLayout from './pages/reader/DocsLayout'
import DocPage from './pages/reader/DocPage'
import DocsIndex from './pages/reader/DocsIndex'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyDashboard from './pages/MyDashboard'
import Settings from './pages/Settings'
import { AuthGuard } from './components/AuthGuard'
import { AdminRoute } from './components/AdminRoute'
import { AdminOnlyGuard } from './components/AdminOnlyGuard'
import { AdminGuard } from './components/AdminGuard'
import { DocsGuard } from './components/DocsGuard'
import { AdminLayout } from './components/admin/AdminLayout'

function AdminPages() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard><AdminGuard><AdminRoute><AdminPages /></AdminRoute></AdminGuard></AuthGuard>,
    children: [
      { path: '/admin', element: <AdminDashboard /> },
      { path: '/admin/documents', element: <AdminDocuments /> },
      { path: '/admin/sections', element: <AdminSections /> },
      { path: '/admin/documents/new', element: <AdminDocumentEdit /> },
      { path: '/admin/documents/:id', element: <AdminDocumentEdit /> },
      {
        element: <AdminOnlyGuard><Outlet /></AdminOnlyGuard>,
        children: [
          { path: '/admin/trash', element: <AdminTrash /> },
          { path: '/admin/users', element: <AdminUsers /> },
          { path: '/admin/permissions', element: <AdminPermissions /> },
          { path: '/admin/updates', element: <AdminUpdates /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
  {
    // Non-admin dashboard — editors and viewers land here
    element: <AuthGuard><MyDashboard /></AuthGuard>,
    path: '/my-dashboard',
  },
  {
    path: '/docs',
    element: <DocsGuard><DocsLayout /></DocsGuard>,
    children: [
      { index: true, element: <DocsIndex /> },
      { path: ':section/:slug', element: <DocPage /> },
    ],
  },
])
