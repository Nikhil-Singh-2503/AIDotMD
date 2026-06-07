import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { X, ArrowLeftRight } from 'lucide-react'
import { diffLines } from 'diff'

interface Props {
  docId: string
  v1Id: string
  v2Id: string
  v1Label: string
  v2Label: string
  onClose: () => void
}

interface DiffRow {
  leftLine: number | null
  rightLine: number | null
  text: string
  type: 'same' | 'added' | 'removed'
}

function computeDiff(oldText: string, newText: string): DiffRow[] {
  const changes = diffLines(oldText, newText)
  const rows: DiffRow[] = []
  let leftLine = 1
  let rightLine = 1

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    for (const text of lines) {
      if (change.added) {
        rows.push({ leftLine: null, rightLine: rightLine++, text, type: 'added' })
      } else if (change.removed) {
        rows.push({ leftLine: leftLine++, rightLine: null, text, type: 'removed' })
      } else {
        rows.push({ leftLine: leftLine++, rightLine: rightLine++, text, type: 'same' })
      }
    }
  }

  return rows
}

export function DiffModal({ docId, v1Id, v2Id, v1Label, v2Label, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['diff', docId, v1Id, v2Id],
    queryFn: () => api.documents.diffVersions(docId, v1Id, v2Id),
    enabled: !!docId && !!v1Id && !!v2Id,
  })

  const rows = useMemo(
    () => (data ? computeDiff(data.v1.content || '', data.v2.content || '') : []),
    [data],
  )

  const added = rows.filter(r => r.type === 'added').length
  const removed = rows.filter(r => r.type === 'removed').length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[4vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-background rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Compare Versions</h2>
            {rows.length > 0 && (
              <div className="flex items-center gap-2 ml-2 text-[11px] font-mono">
                <span className="text-green-600 dark:text-green-400">+{added}</span>
                <span className="text-red-600 dark:text-red-400">-{removed}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
            Computing diff...
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Failed to load versions
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Column headers */}
            <div className="flex shrink-0 border-b bg-muted/20 text-[11px] text-muted-foreground font-medium">
              <div className="w-1/2 flex items-center gap-2 px-4 py-2 border-r border-border">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {v1Label}
              </div>
              <div className="w-1/2 flex items-center gap-2 px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                {v2Label}
              </div>
            </div>

            {/* Scrollable diff grid */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse font-mono text-[12px] leading-relaxed">
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        row.type === 'removed'
                          ? 'bg-red-50 dark:bg-red-950/40'
                          : row.type === 'added'
                            ? 'bg-green-50 dark:bg-green-950/40'
                            : 'hover:bg-muted/20'
                      }
                    >
                      {/* Left cell */}
                      <td className="w-1/2 align-top border-r border-border">
                        <div className="flex">
                          <span className="w-12 min-w-[3rem] select-none text-right pr-3 py-0.5 text-muted-foreground/40 shrink-0">
                            {row.leftLine ?? ''}
                          </span>
                          <span className="px-3 py-0.5 whitespace-pre-wrap break-all flex-1">
                            {row.type === 'added' ? (
                              <span className="text-muted-foreground/30 italic">...</span>
                            ) : (
                              row.text || ' '
                            )}
                          </span>
                        </div>
                      </td>
                      {/* Right cell */}
                      <td className="w-1/2 align-top">
                        <div className="flex">
                          <span className="w-12 min-w-[3rem] select-none text-right pr-3 py-0.5 text-muted-foreground/40 shrink-0">
                            {row.rightLine ?? ''}
                          </span>
                          <span className="px-3 py-0.5 whitespace-pre-wrap break-all flex-1">
                            {row.type === 'removed' ? (
                              <span className="text-muted-foreground/30 italic">...</span>
                            ) : (
                              row.text || ' '
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
