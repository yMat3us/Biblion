import { SermonEditor, type SermonEditorInitial } from '@/components/sermoes/SermonEditor'

export function SermonEditClient({ sermao }: { sermao: SermonEditorInitial }) {
  return <SermonEditor mode="edit" initialSermon={sermao} />
}
