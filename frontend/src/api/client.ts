const BASE = '/api/v1'

// ── Share token store ─────────────────────────────────────────────────────────
// Populated from settings on load (admin) or extracted from ?share_token= URL param (recipient).

let _shareToken: string | null = null

export function setShareToken(token: string | null) {
  _shareToken = token
}

export function getShareToken(): string | null {
  return _shareToken
}

// ── Request helper ────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const extraHeaders: Record<string, string> = {}
  if (_shareToken) extraHeaders['X-Share-Token'] = _shareToken

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders, ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// ---- Types ----
export interface Section {
  id: string; title: string; slug: string; description?: string;
  parent_id?: string | null; order: number; version: string; created_at: string; updated_at: string;
  deleted_at?: string | null;
}
export interface Document {
  id: string; title: string; description?: string; section_id: string; slug: string;
  content: string; order: number; version: string; is_published: boolean; created_at: string; updated_at: string;
  deleted_at?: string | null;
}
export interface DocumentVersion {
  id: string; document_id: string; version: string; title: string; description?: string;
  section_id: string; slug: string; content: string; order: number; is_published: boolean; created_at: string;
}
export interface SectionVersion {
  id: string; section_id: string; version: string; title: string; slug: string;
  description?: string; parent_id?: string | null; order: number; created_at: string;
}
export interface NavNode {
  id: string; title: string; slug: string; order: number;
  documents: { id: string; title: string; slug: string; order: number }[];
  children: NavNode[];
}
export type NavTree = NavNode[]

export interface AppSettings {
  database_url: string
  storage_backend: string
  s3_bucket: string
  s3_region: string
  s3_endpoint_url: string
  s3_access_key_id: string
  s3_secret_access_key_set: boolean
  mcp_api_key: string
  share_edit_token: string
  data_dir: string
  base_url: string
  use_public_url: boolean
}

export interface SearchResult {
  doc_id: string
  title: string
  section_title: string
  section_slug: string
  doc_slug: string
  snippet: string
  match_field: 'title' | 'description' | 'content'
}

// ---- API ----
export const api = {
  sections: {
    list: () => request<Section[]>('/sections'),
    get: (id: string) => request<Section>(`/sections/${id}`),
    create: (data: Partial<Section>) => request<Section>('/sections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Section>) => request<Section>(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/sections/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) => request<void>('/sections/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
    getVersions: (id: string) => request<SectionVersion[]>(`/sections/${id}/versions`),
    restoreVersion: (sectionId: string, versionId: string) => request<Section>(`/sections/${sectionId}/versions/${versionId}/restore`, { method: 'POST' }),
  },
  documents: {
    list: (section_id?: string) => request<Document[]>(`/documents${section_id ? `?section_id=${section_id}` : ''}`),
    get: (id: string) => request<Document>(`/documents/${id}`),
    getBySlug: (section: string, slug: string) => request<Document>(`/documents/by-slug/${section}/${slug}`),
    create: (data: Partial<Document>) => request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Document>) => request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
    reorder: (section_id: string, ids: string[]) => request<void>('/documents/reorder', { method: 'POST', body: JSON.stringify({ section_id, ids }) }),
    getVersions: (id: string) => request<DocumentVersion[]>(`/documents/${id}/versions`),
    restoreVersion: (docId: string, versionId: string) => request<Document>(`/documents/${docId}/versions/${versionId}/restore`, { method: 'POST' }),
  },
  nav: {
    tree: () => request<NavTree>('/nav/tree'),
  },
  search: {
    query: (q: string) => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  },
  trash: {
    list: () => request<{sections: Section[], documents: Document[]}>('/trash'),
    restore: (id: string, type: 'section' | 'document') => request<{status: string}>('/trash/restore', { method: 'POST', body: JSON.stringify({ id, type }) }),
    hardDelete: (id: string, type: 'section' | 'document') => request<{status: string}>(`/trash/permanent?id=${id}&type=${type}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request<AppSettings>('/settings').then(data => {
      // Admin browser: auto-inject edit token for all subsequent write requests
      if (data.share_edit_token) setShareToken(data.share_edit_token)
      return data
    }),
    update: (data: Partial<Omit<AppSettings, 'mcp_api_key' | 'data_dir' | 's3_secret_access_key_set'> & { s3_secret_access_key?: string }>) =>
      request<{ status: string; restart_required: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    regenerateKey: () => request<{ mcp_api_key: string }>('/settings/regenerate-key', { method: 'POST' }),
    testStorage: (data: object) =>
      request<{ success: boolean; message: string }>('/settings/test-storage', { method: 'POST', body: JSON.stringify(data) }),
  },
  meta: {
    get: () => request<{ is_local_access: boolean }>('/meta'),
  },
  upload: {
    markdown: (section_id: string, file: File) => {
      const form = new FormData(); form.append('file', file)
      return request<Document>(`/upload/markdown?section_id=${section_id}`, { method: 'POST', headers: {}, body: form })
    },
    image: (file: File) => {
      const form = new FormData(); form.append('file', file)
      return request<{ url: string; filename: string }>('/upload/image', { method: 'POST', headers: {}, body: form })
    },
  },
}
