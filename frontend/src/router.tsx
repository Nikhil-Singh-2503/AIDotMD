import { createBrowserRouter } from 'react-router-dom'
import AdminDocuments from './pages/admin/Documents'
import AdminDocumentEdit from './pages/admin/DocumentEdit'
import AdminSections from './pages/admin/Sections'
import DocsLayout from './pages/reader/DocsLayout'
import DocPage from './pages/reader/DocPage'
import DocsIndex from './pages/reader/DocsIndex'
import HomePage from './pages/HomePage'
import Settings from './pages/Settings'
import { AdminGuard } from './components/AdminGuard'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/settings', element: <Settings /> },
  { path: '/admin', element: <AdminGuard><AdminDocuments /></AdminGuard> },
  { path: '/admin/sections', element: <AdminGuard><AdminSections /></AdminGuard> },
  { path: '/admin/documents/new', element: <AdminGuard><AdminDocumentEdit /></AdminGuard> },
  { path: '/admin/documents/:id', element: <AdminGuard><AdminDocumentEdit /></AdminGuard> },
  {
    path: '/docs',
    element: <DocsLayout />,
    children: [
      { index: true, element: <DocsIndex /> },
      { path: ':section/:slug', element: <DocPage /> },
    ],
  },
])
