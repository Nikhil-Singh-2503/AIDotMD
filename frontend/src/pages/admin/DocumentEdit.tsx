import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { ArrowLeft, Upload } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VersionHistoryModal } from '@/components/VersionHistoryModal'

export default function AdminDocumentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id
  const fileRef = useRef<HTMLInputElement>(null)
  const mdFileRef = useRef<HTMLInputElement>(null)

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: api.sections.list })
  const { data: doc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.documents.get(id!),
    enabled: !isNew,
  })

  const [form, setForm] = useState({ title: '', description: '', section_id: '', slug: '', content: '', is_published: true })
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (doc) {
      setForm({
        title: doc.title,
        description: doc.description ?? '',
        section_id: doc.section_id,
        slug: doc.slug,
        content: doc.content,
        is_published: doc.is_published,
      })
    }
  }, [doc])

  const save = useMutation({
    mutationFn: () => isNew ? api.documents.create(form) : api.documents.update(id!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); navigate('/admin') },
  })

  const uploadImg = useMutation({
    mutationFn: (file: File) => api.upload.image(file),
    onSuccess: (data) => {
      setUploadedImageUrl(data.url)
      setForm(f => ({ ...f, content: f.content + `\n![image](${data.url})` }))
    },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isNew ? 'New Document' : 'Edit Document'}</h1>
        <div className="ml-auto flex items-center gap-1">
          {!isNew && id && (
            <VersionHistoryModal
              id={id}
              mode="document"
              onRestored={() => {
                qc.invalidateQueries({ queryKey: ['document', id] })
              }}
            />
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Document title"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Section</Label>
            <Select value={form.section_id} onValueChange={v => setForm(f => ({ ...f, section_id: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Slug <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generated from title"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Visibility</Label>
            <div className="flex items-center gap-3 mt-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))}
                id="is_published"
              />
              <label htmlFor="is_published" className="text-sm cursor-pointer select-none">
                {form.is_published
                  ? <span className="text-foreground font-medium">Published</span>
                  : <span className="text-muted-foreground">Draft</span>
                }
              </label>
            </div>
          </div>
          <div>
            <Label>Import Markdown File</Label>
            <input
              ref={mdFileRef}
              type="file"
              accept=".md,.markdown,text/markdown"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                  const text = ev.target?.result as string
                  setForm(f => ({ ...f, content: text }))
                  if (!form.title && file.name) {
                    const name = file.name.replace(/\.(md|markdown)$/i, '').replace(/[-_]/g, ' ')
                    setForm(f => ({ ...f, content: text, title: f.title || name }))
                  }
                }
                reader.readAsText(file)
                e.target.value = ''
              }}
            />
            <Button variant="outline" className="w-full mt-1" onClick={() => mdFileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import .md File
            </Button>
          </div>
          <div>
            <Label>Upload Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadImg.mutate(e.target.files[0])}
            />
            <Button variant="outline" className="w-full mt-1" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {uploadImg.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
            {uploadedImageUrl && (
              <p className="text-xs text-muted-foreground mt-1 break-all">Inserted: {uploadedImageUrl}</p>
            )}
          </div>
          <Button
            className="w-full"
            onClick={() => save.mutate()}
            disabled={!form.title || !form.section_id || save.isPending}
          >
            {save.isPending ? 'Saving...' : isNew ? 'Create Document' : 'Save Changes'}
          </Button>
        </div>

        <div className="md:col-span-2 flex flex-col">
          <Label>Content</Label>
          <div className="mt-1 flex-1">
            <MarkdownEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
          </div>
        </div>
      </div>
    </div>
  )
}
