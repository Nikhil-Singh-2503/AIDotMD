import { createBrowserRouter, Outlet } from 'react-router-dom'
import AdminDocuments from './pages/admin/Documents'
import AdminDocumentEdit from './pages/admin/DocumentEdit'
import AdminSections from './pages/admin/Sections'
import AdminTrash from './pages/admin/Trash'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUpdates from './pages/admin/Updates'
import DocsLayout from './pages/reader/DocsLayout'
import DocPage from './pages/reader/DocPage'
import DocsIndex from './pages/reader/DocsIndex'
import HomePage from './pages/HomePage'
import Settings from './pages/Settings'
import { AdminGuard } from './components/AdminGuard'
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
  {
    element: <AdminGuard><AdminPages /></AdminGuard>,
    children: [
      { path: '/admin', element: <AdminDashboard /> },
      { path: '/admin/documents', element: <AdminDocuments /> },
      { path: '/admin/sections', element: <AdminSections /> },
      { path: '/admin/trash', element: <AdminTrash /> },
      { path: '/admin/updates', element: <AdminUpdates /> },
      { path: '/admin/documents/new', element: <AdminDocumentEdit /> },
      { path: '/admin/documents/:id', element: <AdminDocumentEdit /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  {
    path: '/docs',
    element: <DocsLayout />,
    children: [
      { index: true, element: <DocsIndex /> },
      { path: ':section/:slug', element: <DocPage /> },
    ],
  },
])