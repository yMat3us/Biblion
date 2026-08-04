'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ImageIcon, Plus, Upload } from 'lucide-react'
import { useToast } from '@/components/ui/Feedback'
import { WorkspacePage, DetailHeader, EditorActionBar } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function downscaleImage(file: File, maxWidth = 400, maxHeight = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    const releaseUrl = () => URL.revokeObjectURL(objectUrl)
    image.onload = () => {
      let { width, height } = image
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        releaseUrl()
        reject(new Error('Canvas 2D context unavailable'))
        return
      }

      context.drawImage(image, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      releaseUrl()
      resolve(dataUrl)
    }
    image.onerror = () => {
      releaseUrl()
      reject(new Error('Failed to load image'))
    }
    image.src = objectUrl
  })
}

export default function NovaRevistaPage() {
  const toast = useToast()
  const router = useRouter()
  
  const [novaRevista, setNovaRevista] = useState({ titulo: '', trimestre: '', ano: '', tema: '', capa: '' })
  const [loading, setLoading] = useState(false)
  const [processingCover, setProcessingCover] = useState(false)

  const handleCapaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 8 MB.')
      return
    }

    setProcessingCover(true)
    try {
      const capa = await downscaleImage(file)
      setNovaRevista((current) => ({ ...current, capa }))
    } catch {
      toast.error('Não foi possível processar a capa. Tente outra imagem.')
    } finally {
      setProcessingCover(false)
    }
  }

  const handleCreateRevista = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/ebd/revistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaRevista),
      })
      if (response.ok) {
        const revista = await response.json()
        toast.success('Revista criada com sucesso!')
        router.push(`/ebd/revista/${revista.id}`)
      } else {
        toast.error('Erro ao criar a revista.')
      }
    } catch {
      toast.error('Erro de conexão ao criar a revista.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WorkspacePage size="compact" archetype="library">
      <DetailHeader
        index="Estante editorial"
        title="Nova revista"
        description="Crie a estrutura da revista agora; as lições e PDFs poderão ser adicionados em seguida."
        backHref="/ebd"
        backLabel="Estante"
      />

      <div className="mt-8 bg-surface border border-hairline rounded-3xl p-6 shadow-sm">
        <form id="nova-revista-form" onSubmit={handleCreateRevista} className="space-y-6">
          <div>
            <span className="mb-2 block text-sm font-medium text-muted-foreground">Capa <span className="text-subtle">(opcional)</span></span>
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-hairline bg-elevated text-subtle">
                {novaRevista.capa ? (
                  <Image src={novaRevista.capa} alt="Prévia da capa" fill unoptimized className="object-cover" />
                ) : (
                  <ImageIcon size={22} />
                )}
              </div>
              <label className="group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline-strong bg-surface px-4 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft">
                <input type="file" accept="image/*" onChange={handleCapaUpload} className="sr-only" disabled={processingCover} />
                <Upload size={19} className="mb-2 text-primary" />
                <span className="text-sm font-medium text-foreground">{processingCover ? 'Processando imagem…' : 'Selecionar uma capa'}</span>
                <span className="mt-1 text-xs text-subtle">JPG, PNG ou WebP · até 8 MB</span>
              </label>
            </div>
          </div>

          <Input
            required
            label="Título"
            value={novaRevista.titulo}
            onChange={(event) => setNovaRevista((current) => ({ ...current, titulo: event.target.value }))}
            placeholder="Ex.: Lições Bíblicas Adultos"
          />
          <Input
            label="Tema"
            value={novaRevista.tema}
            onChange={(event) => setNovaRevista((current) => ({ ...current, tema: event.target.value }))}
            placeholder="Ex.: O verdadeiro Pentecostalismo"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Trimestre"
              value={novaRevista.trimestre}
              onChange={(event) => setNovaRevista((current) => ({ ...current, trimestre: event.target.value }))}
              placeholder="3º trimestre"
            />
            <Input
              label="Ano"
              inputMode="numeric"
              value={novaRevista.ano}
              onChange={(event) => setNovaRevista((current) => ({ ...current, ano: event.target.value }))}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>
        </form>
      </div>

      <EditorActionBar>
        <div className="flex w-full items-center justify-between md:justify-end md:gap-3">
          <Button variant="ghost" onClick={() => router.back()} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="nova-revista-form" disabled={loading || !novaRevista.titulo.trim()}>
            {loading ? 'Criando...' : 'Adicionar Revista'} <Plus size={16} />
          </Button>
        </div>
      </EditorActionBar>
    </WorkspacePage>
  )
}
