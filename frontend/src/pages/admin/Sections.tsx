import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Section } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, GripVertical, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  s,
  depth,
  isExpanded,
  hasChildren,
  childCount,
  onToggle,
  onDelete,
}: {
  s: Section
  depth: number
  isExpanded?: boolean
  hasChildren: boolean
  childCount: number
  onToggle?: () => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 gap-2',
          depth > 0 && 'border-l-2 bg-muted/30',
        )}
        style={depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : undefined}
      >
        {/* Left: grip + toggle area */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Grip handle — drag only, NOT accordion trigger */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-50 hover:opacity-100 hover:text-foreground shrink-0 touch-none"
            tabIndex={-1}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Accordion toggle area — everything except grip and delete */}
          <button
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
            onClick={onToggle}
            disabled={!hasChildren}
          >
              {depth > 0 && (
              <span className="text-muted-foreground text-xs shrink-0">↳</span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
                  isExpanded && 'rotate-90',
                )}
              />
            )}
            <span className="text-sm font-medium truncate">{s.title}</span>
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {s.slug}
            </Badge>
            {childCount > 0 && (
              <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                {childCount} sub
              </span>
            )}
          </button>
        </div>

        {/* Right: delete */}
        <button
          onClick={() => onDelete(s.id)}
          className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

type FlatSection = { section: Section; depth: number }

export default function AdminSections() {
  const qc = useQueryClient()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('')
  const [newParentId, setNewParentId] = useState<string>('none')
  const [parentIdWasManuallySet, setParentIdWasManuallySet] = useState(false)

  // ── Accordion state ────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ── Data ───────────────────────────────────────────────────────────────────
  // Initialize share token for write operations
  useQuery({ queryKey: ['settings'], queryFn: api.settings.get })
  useQuery({ queryKey: ['meta'], queryFn: api.meta.get, staleTime: Infinity })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: api.sections.list,
  })

  const topLevel = sections
    .filter(s => !s.parent_id)
    .sort((a, b) => a.order - b.order)

  const childrenOf = (id: string) =>
    sections
      .filter(s => s.parent_id === id)
      .sort((a, b) => a.order - b.order)

  const flattenSections = (parentId: string | null = null, depth = 0): FlatSection[] =>
    sections
      .filter(s => (s.parent_id ?? null) === parentId)
      .flatMap(s => [{ section: s, depth }, ...flattenSections(s.id, depth + 1)])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () =>
      api.sections.create({
        title: newTitle,
        parent_id: newParentId === 'none' ? null : newParentId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] })
      setNewTitle('')
      // Keep newParentId as-is (spec: clear title only on success)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.sections.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.sections.reorder(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })

  // ── DnD ────────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeSection = sections.find(s => s.id === active.id)
    if (!activeSection) return

    const parentId = activeSection.parent_id ?? null
    const siblings = parentId === null ? topLevel : childrenOf(parentId)

    const oldIndex = siblings.findIndex(s => s.id === active.id)
    const newIndex = siblings.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(siblings, oldIndex, newIndex)
    reorder.mutate(reordered.map(s => s.id))
  }

  // ── Accordion helpers ──────────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Collapsing: only revert parent dropdown if user hasn't manually changed it
        if (!parentIdWasManuallySet && newParentId === id) {
          setNewParentId('none')
        }
        next.delete(id)
      } else {
        // Expanding: auto-select as parent (last-expanded-wins)
        setNewParentId(id)
        setParentIdWasManuallySet(false)
        next.add(id)
      }
      return next
    })
  }

  // ── Recursive tree renderer ────────────────────────────────────────────────
  const renderLevel = (parentId: string | null, depth: number): ReactNode => {
    const siblings = parentId === null ? topLevel : childrenOf(parentId)
    if (siblings.length === 0) return null
    return (
      <SortableContext
        items={siblings.map(s => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn('space-y-2', depth > 0 && 'space-y-1.5 mt-1.5')}>
          {siblings.map(s => {
            const children = childrenOf(s.id)
            const isExpanded = expandedIds.has(s.id)
            return (
              <div key={s.id}>
                <SortableRow
                  s={s}
                  depth={depth}
                  isExpanded={isExpanded}
                  hasChildren={children.length > 0}
                  childCount={children.length}
                  onToggle={() => toggleExpanded(s.id)}
                  onDelete={id => remove.mutate(id)}
                />
                {isExpanded && children.length > 0 && renderLevel(s.id, depth + 1)}
              </div>
            )
          })}
        </div>
      </SortableContext>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sections</h1>
          <p className="text-sm text-muted-foreground">
            {sections.length} section{sections.length !== 1 ? 's' : ''} · drag to reorder
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Right panel (form) — stacks above tree on mobile via lg:order */}
        <div className="lg:order-2 lg:w-80 shrink-0">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-foreground mb-4">Add Section</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Title
                  </label>
                  <Input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Section title"
                    onKeyDown={e => e.key === 'Enter' && newTitle.trim() && create.mutate()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Parent
                  </label>
                  <Select
                    value={newParentId}
                    onValueChange={val => {
                      setNewParentId(val)
                      setParentIdWasManuallySet(true)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Top-level section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Top-level (no parent)</SelectItem>
                      {flattenSections().map(({ section, depth }) => (
                        <SelectItem key={section.id} value={section.id}>
                          {'\u00a0\u00a0'.repeat(depth)}
                          {depth > 0 ? '↳ ' : ''}
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full gap-1.5"
                  onClick={() => create.mutate()}
                  disabled={!newTitle.trim() || create.isPending}
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Left panel (tree) */}
        <div className="lg:order-1 flex-1">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground">Sections</p>
                <Badge variant="secondary" className="font-mono text-xs">
                  {sections.length}
                </Badge>
              </div>

              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No sections yet. Add one using the form →
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  {renderLevel(null, 0)}
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
