import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Document } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableRow({
  doc,
  sectionName,
  onDelete,
}: {
  doc: Document
  sectionName: string
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-t hover:bg-muted/30 transition-colors"
    >
      <td className="p-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="p-3 font-medium">{doc.title}</td>
      <td className="p-3">
        {doc.is_published
          ? <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">Published</Badge>
          : <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
        }
      </td>
      <td className="p-3">
        <Badge variant="secondary">{sectionName}</Badge>
      </td>
      <td className="p-3 text-muted-foreground font-mono text-xs">{doc.slug}</td>
      <td className="p-3">
        <div className="flex justify-center gap-1">
          <Link to={`/admin/documents/${doc.id}`}>
            <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onDelete(doc.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminDocuments() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  useQuery({ queryKey: ['settings'], queryFn: api.settings.get })
  useQuery({ queryKey: ['meta'], queryFn: api.meta.get, staleTime: Infinity })
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: api.sections.list })
  const { data: docs = [] } = useQuery({
    queryKey: ['documents', sectionFilter],
    queryFn: () => sectionFilter === 'all' ? api.documents.list() : api.documents.list(sectionFilter),
  })

  const sortedDocs = [...docs].sort((a, b) => a.order - b.order)

  const remove = useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const reorder = useMutation({
    mutationFn: ({ section_id, ids }: { section_id: string; ids: string[] }) =>
      api.documents.reorder(section_id, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedDocs.findIndex(d => d.id === active.id)
    const newIndex = sortedDocs.findIndex(d => d.id === over.id)
    const reordered = arrayMove(sortedDocs, oldIndex, newIndex)
    reorder.mutate({
      section_id: reordered[0].section_id,
      ids: reordered.map(d => d.id),
    })
  }

  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s]))
  const isDraggable = sectionFilter !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage your documents</p>
        </div>
        <Button onClick={() => navigate('/admin/documents/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isDraggable && (
          <p className="text-xs text-muted-foreground">Filter by a section to drag and reorder docs.</p>
        )}
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 w-8" />
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Section</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="p-3 w-24 font-medium text-center">Actions</th>
            </tr>
          </thead>
          {isDraggable ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedDocs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {sortedDocs.map(doc => (
                    <SortableRow
                      key={doc.id}
                      doc={doc}
                      sectionName={sectionMap[doc.section_id]?.title ?? '-'}
                      onDelete={id => remove.mutate(id)}
                    />
                  ))}
                  {sortedDocs.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No documents in this section yet.</td></tr>
                  )}
                </tbody>
              </SortableContext>
            </DndContext>
          ) : (
            <tbody>
              {sortedDocs.map(doc => (
                <tr key={doc.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 w-8" />
                  <td className="p-3 font-medium">{doc.title}</td>
                  <td className="p-3">
                    {doc.is_published
                      ? <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">Published</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                    }
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{sectionMap[doc.section_id]?.title ?? '-'}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{doc.slug}</td>
                  <td className="p-3">
                    <div className="flex justify-center gap-1">
                      <Link to={`/admin/documents/${doc.id}`}>
                        <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(doc.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedDocs.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No documents yet. Create one to get started.</td></tr>
              )}
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}
