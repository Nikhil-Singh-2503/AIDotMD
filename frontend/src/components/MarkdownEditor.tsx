import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownRenderer } from './MarkdownRenderer'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, placeholder }: Props) {
  return (
    <Tabs defaultValue="edit" className="flex flex-col h-full">
      <TabsList className="w-fit">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="split">Split</TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="flex-1 mt-2">
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Write your documentation in Markdown...'}
          className="h-full min-h-[400px] font-mono text-sm resize-none"
        />
      </TabsContent>

      <TabsContent value="preview" className="flex-1 mt-2 border rounded-md p-4 overflow-auto min-h-[400px]">
        <MarkdownRenderer content={value} />
      </TabsContent>

      <TabsContent value="split" className="flex-1 mt-2">
        <div className="grid grid-cols-2 gap-4 h-full">
          <Textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-full min-h-[400px] font-mono text-sm resize-none"
          />
          <div className="border rounded-md p-4 overflow-auto min-h-[400px]">
            <MarkdownRenderer content={value} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
