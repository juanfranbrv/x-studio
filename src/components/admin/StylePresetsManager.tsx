'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import type { VisionAnalysis } from '@/lib/creation-flow-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { IconGripVertical, IconEdit, IconPlus, IconRefresh, IconSearch, IconDelete } from '@/components/ui/icons'
import { useToast } from '@/hooks/use-toast'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { revalidateStylePresets } from '@/app/actions/revalidate-style-presets'

type PresetRow = {
  _id: Id<'style_presets'>
  name: string
  image_url: string
  full_image_url?: string
  thumbnail_url?: string
  is_active: boolean
  sort_order: number
}

type PresetDetail = {
  _id: Id<'style_presets'>
  name: string
  image_url: string
  full_image_url?: string
  thumbnail_url?: string
  style_prompt?: string
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface StylePresetsManagerProps {
  adminEmail: string
}

const LOCAL_STORAGE_STYLE_MODEL_KEY = 'x-studio-admin-style-analysis-model'
const FALLBACK_INTELLIGENCE_MODEL = 'wisdom/gemini-3-flash-preview'
const BASE_INTELLIGENCE_MODELS = [
  'wisdom/gemini-3-flash-preview',
  'wisdom/gemini-3.1-flash-lite-preview',
  'wisdom/gemini-3.1-pro-preview',
  'wisdom/gemini-2.5-flash',
]

const STYLE_NAME_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcommercial\b|\badvertising\b/, label: 'Comercial' },
  { pattern: /\beditorial\b/, label: 'Editorial' },
  { pattern: /\bproduct\b|\bpackshot\b/, label: 'Producto' },
  { pattern: /\banime\b|\bmanga\b|\bghibli\b/, label: 'Anime' },
  { pattern: /\bcomic\b|\bpop art\b|\bhalftone\b/, label: 'Comic' },
  { pattern: /\billustrat/i, label: 'Ilustracion' },
  { pattern: /\bvector\b|\bflat design\b/, label: 'Vectorial' },
  { pattern: /\bwatercolor\b|\bacuarela\b/, label: 'Acuarela' },
  { pattern: /\boil painting\b|\bpainterly\b/, label: 'Pictorico' },
  { pattern: /\b3d\b|\bcgi\b|\brender\b/, label: 'Render' },
  { pattern: /\bphotoreal\b|\bphoto\b|\bphotograph/i, label: 'Fotografico' },
  { pattern: /\bcinematic\b|\bfilm\b|\bmovie\b/, label: 'Cinematico' },
  { pattern: /\bminimal\b/, label: 'Minimalista' },
  { pattern: /\bvintage\b|\bretro\b/, label: 'Retro' },
  { pattern: /\bnoir\b/, label: 'Noir' },
  { pattern: /\bhigh contrast\b|\bdramatic contrast\b/, label: 'Contraste' },
  { pattern: /\bpastel\b/, label: 'Pastel' },
]

const NAME_STOPWORDS = new Set([
  'this', 'visual', 'style', 'is', 'with', 'and', 'the', 'for', 'that', 'from', 'into', 'while',
  'una', 'uno', 'unas', 'unos', 'con', 'para', 'como', 'desde', 'hacia', 'entre', 'sobre', 'estilo',
  'look', 'mood', 'image', 'images', 'render', 'rendered', 'quality',
])

function sentenceCase(input: string): string {
  const cleaned = input.trim()
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

function synthesizeLabelFromKeywords(paragraph: string): string {
  const cleaned = paragraph
    .toLowerCase()
    .replace(/\bthis visual style is\b/g, ' ')
    .replace(/\bvisual style\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return ''

  const tokens = cleaned
    .split(' ')
    .filter((token) => token.length >= 4)
    .filter((token) => !NAME_STOPWORDS.has(token))

  const unique = Array.from(new Set(tokens)).slice(0, 2)
  if (unique.length === 0) return ''
  return unique.map(sentenceCase).join(' · ')
}

function normalizeSingleWordName(input: string): string {
  const cleaned = input
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  const first = cleaned.split(' ')[0] || ''
  return sentenceCase(first)
}

function buildPresetNameFromAnalysis(analysis: VisionAnalysis | null, fallback = 'Estilo'): string {
  if (!analysis) return fallback

  const paragraph = (analysis.keywords?.[0] || '').trim()
  const normalized = paragraph.toLowerCase()

  for (const rule of STYLE_NAME_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.label
    }
  }

  const subject = (analysis.subjectLabel || '').trim()
  if (subject && subject.toUpperCase() !== 'N/A') {
    const normalizedSubject = normalizeSingleWordName(subject)
    if (normalizedSubject) return normalizedSubject
  }

  const synthesized = synthesizeLabelFromKeywords(paragraph)
  if (synthesized) {
    const normalizedSynthesized = normalizeSingleWordName(synthesized)
    if (normalizedSynthesized) return normalizedSynthesized
  }

  return normalizeSingleWordName(fallback) || 'Estilo'
}

function extractStylePrompt(analysis: VisionAnalysis | null): string {
  const firstKeyword = analysis?.keywords?.[0]
  return typeof firstKeyword === 'string' ? firstKeyword.trim() : ''
}

function buildAnalysisPreviewPayload(analysis: VisionAnalysis | null) {
  if (!analysis) {
    return {
      subject: 'unknown',
      subjectLabel: 'N/A',
      lighting: 'unknown',
      colorPalette: [] as string[],
      keywords: [] as string[],
      confidence: 0,
    }
  }

  const keywords = Array.isArray(analysis.keywords)
    ? analysis.keywords
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 8)
      .map((item) => item.slice(0, 500))
    : []

  const colorPalette = Array.isArray(analysis.colorPalette)
    ? analysis.colorPalette
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 12)
      .map((item) => item.slice(0, 24))
    : []

  return {
    subject: typeof analysis.subject === 'string' ? analysis.subject : 'unknown',
    subjectLabel: typeof analysis.subjectLabel === 'string' ? analysis.subjectLabel.slice(0, 120) : 'N/A',
    lighting: typeof analysis.lighting === 'string' ? analysis.lighting : 'unknown',
    colorPalette,
    keywords,
    confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0,
  }
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' })
}

function hasRenderableImage(url?: string): boolean {
  return typeof url === 'string' && url.trim().length > 0
}

export function StylePresetsManager({ adminEmail }: StylePresetsManagerProps) {
  const { toast } = useToast()
  const listPresets = useQuery(api.stylePresets.listAllForAdmin, { admin_email: adminEmail })
  const presets = useMemo(
    () => (listPresets || []) as PresetRow[],
    [listPresets]
  )
  const modelCosts = useQuery(api.economic.listModelCosts, { admin_email: adminEmail }) as Array<{
    _id: Id<'model_costs'>
    model: string
    kind: 'intelligence' | 'image'
    active: boolean
  }> | undefined
  const aiConfig = useQuery(api.settings.getAIConfig, {})
  const createPreset = useMutation(api.stylePresets.create)
  const updatePreset = useMutation(api.stylePresets.update)
  const updatePresetPrompt = useMutation(api.stylePresets.updatePrompt)
  const reorderPresets = useMutation(api.stylePresets.reorder)
  const removePreset = useMutation(api.stylePresets.remove)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newActive, setNewActive] = useState(true)
  const [newSortOrder, setNewSortOrder] = useState(0)
  const [newImageDataUrl, setNewImageDataUrl] = useState('')
  const [newAnalysis, setNewAnalysis] = useState<VisionAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [styleAnalysisModel, setStyleAnalysisModel] = useState<string>('')
  const [failedImagePresetIds, setFailedImagePresetIds] = useState<Set<string>>(new Set())
  const [promptEditorOpen, setPromptEditorOpen] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<Id<'style_presets'> | null>(null)
  const [promptDraft, setPromptDraft] = useState('')
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [listFilter, setListFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [listSearch, setListSearch] = useState('')
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const editingPreset = useQuery(
    api.stylePresets.getByIdForAdmin,
    editingPresetId
      ? { admin_email: adminEmail, id: editingPresetId }
      : 'skip'
  ) as PresetDetail | null | undefined

  const intelligenceModelOptions = useMemo(() => {
    const modelsFromCosts = (modelCosts || [])
      .filter((row) => row.kind === 'intelligence' && row.active !== false)
      .map((row) => row.model?.trim())
      .filter((value): value is string => Boolean(value))

    const fallbackFromConfig = String(aiConfig?.intelligenceModel || '').trim()
    const uniqueModels = Array.from(new Set([
      ...BASE_INTELLIGENCE_MODELS,
      ...modelsFromCosts,
      ...(fallbackFromConfig ? [fallbackFromConfig] : []),
    ]))
    if (uniqueModels.length > 0) return uniqueModels

    return [FALLBACK_INTELLIGENCE_MODEL]
  }, [aiConfig?.intelligenceModel, modelCosts])

  useEffect(() => {
    if (styleAnalysisModel) return
    if (typeof window === 'undefined') return
    const persisted = window.localStorage.getItem(LOCAL_STORAGE_STYLE_MODEL_KEY)?.trim()
    if (persisted && intelligenceModelOptions.includes(persisted)) {
      setStyleAnalysisModel(persisted)
      return
    }
    setStyleAnalysisModel(intelligenceModelOptions[0] || FALLBACK_INTELLIGENCE_MODEL)
  }, [intelligenceModelOptions, styleAnalysisModel])

  useEffect(() => {
    if (!styleAnalysisModel) return
    if (intelligenceModelOptions.includes(styleAnalysisModel)) return
    const next = intelligenceModelOptions[0] || FALLBACK_INTELLIGENCE_MODEL
    setStyleAnalysisModel(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_STYLE_MODEL_KEY, next)
    }
  }, [intelligenceModelOptions, styleAnalysisModel])

  const updateStyleAnalysisModel = (nextModel: string) => {
    setStyleAnalysisModel(nextModel)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_STYLE_MODEL_KEY, nextModel)
    }
  }

  const dataUrlToPayload = (dataUrl: string) => {
    const match = /^data:([^;]+);base64,/.exec(dataUrl)
    const mimeType = match?.[1] || 'image/jpeg'
    const base64 = dataUrl.split(',')[1] || ''
    return { mimeType, base64 }
  }

  const urlToPayload = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo descargar la imagen para analizar')
    }
    const buffer = await response.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    return { mimeType, base64 }
  }

  const resolveImagePayload = async (imageValue: string) => {
    if (imageValue.startsWith('data:')) return dataUrlToPayload(imageValue)
    return await urlToPayload(imageValue)
  }

  const nextSortOrder = useMemo(() => {
    const maxOrder = (presets || []).reduce((max, item) => Math.max(max, item.sort_order || 0), 0)
    return maxOrder + 1
  }, [presets])
  const totalCount = presets.length
  const activeCount = useMemo(
    () => presets.filter((preset) => preset.is_active).length,
    [presets]
  )
  const filteredPresets = useMemo(() => {
    const search = listSearch.trim().toLowerCase()
    return presets.filter((preset) => {
      const matchesFilter = listFilter === 'all'
        ? true
        : listFilter === 'active'
          ? preset.is_active
          : !preset.is_active
      if (!matchesFilter) return false

      if (!search) return true
      const haystack = `${preset.name} ${preset.sort_order}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [listFilter, listSearch, presets])

  const analyzeNewImage = async () => {
    if (!newImageDataUrl) {
      toast({ title: 'Falta imagen', description: 'Sube una imagen de estilo primero.', variant: 'destructive' })
      return
    }

    setIsAnalyzing(true)
    try {
      const match = /^data:([^;]+);base64,/.exec(newImageDataUrl)
      const mimeType = match?.[1] || 'image/jpeg'
      const base64 = newImageDataUrl.split(',')[1]

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          intelligenceModel: styleAnalysisModel || undefined,
        }),
      })

      const result = await response.json()
      if (!result?.success || !result?.data) {
        throw new Error(result?.error || 'No se pudo analizar la imagen')
      }

      const parsed = result.data as VisionAnalysis
      setNewAnalysis(parsed)
      setNewName((prev) => (prev.trim() ? prev : buildPresetNameFromAnalysis(parsed)))
      toast({ title: 'Analisis completado', description: 'Texto de estilo listo para guardar.' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error al analizar', description: message, variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reanalyzePreset = async (preset: PresetRow) => {
    setReanalyzingId(String(preset._id))
    setSavingId(String(preset._id))
    try {
      const { mimeType, base64 } = await resolveImagePayload(preset.full_image_url || preset.image_url)
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          intelligenceModel: styleAnalysisModel || undefined,
        }),
      })

      const result = await response.json()
      if (!result?.success || !result?.data) {
        throw new Error(result?.error || 'No se pudo reanalizar la imagen')
      }

      const parsed = result.data as VisionAnalysis
      const normalizedName = buildPresetNameFromAnalysis(parsed)
      await updatePreset({
        admin_email: adminEmail,
        id: preset._id,
        name: normalizedName,
        style_prompt: extractStylePrompt(parsed),
        analysis_preview: buildAnalysisPreviewPayload(parsed),
      })
      toast({ title: 'Estilo reanalizado', description: `Análisis y nombre actualizados: ${normalizedName}` })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error al reanalizar', description: message, variant: 'destructive' })
    } finally {
      setSavingId(null)
      setReanalyzingId(null)
    }
  }

  const createNewPreset = async () => {
    if (!newImageDataUrl || !newAnalysis) {
      toast({ title: 'Faltan datos', description: 'Sube una imagen y analizala antes de guardar.', variant: 'destructive' })
      return
    }

    const finalName = normalizeSingleWordName(newName) || buildPresetNameFromAnalysis(newAnalysis)

    setIsCreating(true)
    try {
      const uploadFile = await dataUrlToFile(newImageDataUrl, `${finalName || 'style'}.jpg`)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('assetKind', 'style_preset')
      formData.append('generateThumbnail', 'true')
      const uploaded = await uploadBrandImage(formData)
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || 'No se pudo optimizar/subir la imagen del estilo.')
      }

      await createPreset({
        admin_email: adminEmail,
        name: finalName,
        image_url: uploaded.url,
        thumbnail_url: uploaded.thumbnailUrl || uploaded.url,
        style_prompt: extractStylePrompt(newAnalysis),
        analysis_preview: buildAnalysisPreviewPayload(newAnalysis),
        is_active: newActive,
        sort_order: newSortOrder || nextSortOrder,
      })

      await revalidateStylePresets()

      setNewName('')
      setNewImageDataUrl('')
      setNewAnalysis(null)
      setNewActive(true)
      setNewSortOrder(nextSortOrder + 1)
      toast({ title: 'Estilo creado' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error al crear', description: message, variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const canRenderPresetImage = (preset: PresetRow) => {
    if (!hasRenderableImage(preset.image_url)) return false
    return !failedImagePresetIds.has(String(preset._id))
  }
  const canReorderByDrag = listFilter === 'all' && !listSearch.trim() && presets.length > 1 && !isReordering

  const handleDropReorder = async (targetId: string) => {
    if (!canReorderByDrag || !draggedPresetId || draggedPresetId === targetId) return

    const ordered = [...presets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((preset) => String(preset._id))

    const fromIndex = ordered.indexOf(draggedPresetId)
    const toIndex = ordered.indexOf(targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...ordered]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)

    setIsReordering(true)
    try {
      await reorderPresets({
        admin_email: adminEmail,
        ordered_ids: next as Id<'style_presets'>[],
      })
      await revalidateStylePresets()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'No se pudo reordenar', description: message, variant: 'destructive' })
    } finally {
      setIsReordering(false)
      setDraggedPresetId(null)
      setDropTargetId(null)
    }
  }

  useEffect(() => {
    if (!editingPreset) return
    setPromptDraft(editingPreset.style_prompt || '')
  }, [editingPreset?._id, editingPreset?.style_prompt])

  const openPromptEditor = (presetId: Id<'style_presets'>) => {
    setEditingPresetId(presetId)
    setPromptEditorOpen(true)
  }

  const closePromptEditor = () => {
    setPromptEditorOpen(false)
    setEditingPresetId(null)
    setPromptDraft('')
    setIsSavingPrompt(false)
  }

  const savePromptDraft = async () => {
    if (!editingPresetId) return
    setIsSavingPrompt(true)
    try {
      await updatePresetPrompt({
        admin_email: adminEmail,
        id: editingPresetId,
        prompt: promptDraft,
      })
      toast({ title: 'Prompt actualizado' })
      closePromptEditor()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'No se pudo guardar', description: message, variant: 'destructive' })
    } finally {
      setIsSavingPrompt(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo estilo predefinido</CardTitle>
          <CardDescription>Sube una imagen, analizala y guarda el texto de estilo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Se autocompleta tras analizar"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo de análisis (solo Estilos)</Label>
              <Select
                value={styleAnalysisModel || intelligenceModelOptions[0] || FALLBACK_INTELLIGENCE_MODEL}
                onValueChange={updateStyleAnalysisModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona modelo para analizar estilos" />
                </SelectTrigger>
                <SelectContent>
                  {intelligenceModelOptions.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={newSortOrder || nextSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label>Activo</Label>
            <Switch checked={newActive} onCheckedChange={setNewActive} />
          </div>

          <div className="space-y-2">
            <Label>Imagen</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const dataUrl = await fileToDataUrl(file)
                setNewImageDataUrl(dataUrl)
                setNewAnalysis(null)
              }}
            />
          </div>

          {newImageDataUrl ? (
            <img src={newImageDataUrl} alt="Preview estilo" className="w-32 aspect-[2/3] rounded-lg object-cover border" />
          ) : null}

          {newAnalysis ? (
            <div className="space-y-2">
              <Label>Texto de estilo (se inyecta en el prompt)</Label>
              <div className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-auto">
                {extractStylePrompt(newAnalysis) || 'Sin texto de estilo generado.'}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={analyzeNewImage} disabled={!newImageDataUrl || isAnalyzing}>
              {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2" /> : null}
              Analizar estilo
            </Button>
            <Button type="button" onClick={createNewPreset} disabled={isCreating || !newAnalysis}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-2" /> : <IconPlus className="w-4 h-4 mr-2" />}
              Guardar estilo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Gestión visual de estilos predefinidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 font-medium">
                  Total: {totalCount}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 font-medium">
                  Activos: {activeCount}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 font-medium">
                  Mostrando: {filteredPresets.length}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 font-medium">
                  {canReorderByDrag ? 'Arrastra para ordenar' : 'Para arrastrar: sin búsqueda ni filtros'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <IconSearch className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Buscar por nombre u orden..."
                    className="pl-8 h-9 bg-background"
                  />
                </div>
                <Select value={listFilter} onValueChange={(value) => setListFilter(value as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="w-full sm:w-40 h-9 bg-background">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filteredPresets.map((preset) => (
              <div
                key={preset._id}
                draggable={canReorderByDrag}
                onDragStart={(event) => {
                  if (!canReorderByDrag) return
                  const id = String(preset._id)
                  setDraggedPresetId(id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDraggedPresetId(null)
                  setDropTargetId(null)
                }}
                onDragOver={(event) => {
                  if (!canReorderByDrag) return
                  event.preventDefault()
                  const id = String(preset._id)
                  if (dropTargetId !== id) setDropTargetId(id)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  void handleDropReorder(String(preset._id))
                }}
                className={`group rounded-2xl border bg-card/90 p-3 space-y-3 transition-all duration-200 hover:border-primary/40 hover:shadow-sm ${
                  dropTargetId === String(preset._id) && draggedPresetId !== String(preset._id)
                    ? 'border-primary/70 ring-1 ring-primary/30'
                    : 'border-border/70'
                } ${canReorderByDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {canRenderPresetImage(preset) ? (
                    <button
                      type="button"
                      onClick={() => openPromptEditor(preset._id)}
                      className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <img
                        src={preset.image_url}
                        alt={preset.name}
                        className="w-24 md:w-28 aspect-[2/3] rounded-lg object-cover border border-border/70 transition-transform duration-200 group-hover:scale-[1.01]"
                        onError={() => {
                          setFailedImagePresetIds((prev) => {
                            const id = String(preset._id)
                            if (prev.has(id)) return prev
                            const next = new Set(prev)
                            next.add(id)
                            return next
                          })
                        }}
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPromptEditor(preset._id)}
                      className="w-24 md:w-28 aspect-[2/3] rounded-lg border border-border/70 shrink-0 bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground text-center px-1"
                    >
                      Sin imagen
                    </button>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        key={`${String(preset._id)}-${preset.name}`}
                        defaultValue={preset.name}
                        className="h-9 bg-background"
                        onBlur={async (e) => {
                          const value = e.target.value.trim()
                          if (!value || value === preset.name) return
                          setSavingId(String(preset._id))
                          try {
                            await updatePreset({ admin_email: adminEmail, id: preset._id, name: value })
                          } finally {
                            setSavingId(null)
                          }
                        }}
                      />
                      <Input
                        type="number"
                        defaultValue={preset.sort_order}
                        className="h-9 w-20 bg-background"
                        onBlur={async (e) => {
                          const value = Number(e.target.value || preset.sort_order)
                          if (value === preset.sort_order) return
                          setSavingId(String(preset._id))
                          try {
                            await updatePreset({ admin_email: adminEmail, id: preset._id, sort_order: value })
                            await revalidateStylePresets()
                          } finally {
                            setSavingId(null)
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <IconGripVertical className="w-3.5 h-3.5" />
                        Arrastrar
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-white px-2.5 py-2">
                      <span className="text-xs text-muted-foreground">Activo</span>
                      <Switch
                        checked={preset.is_active}
                        onCheckedChange={async (checked) => {
                          setSavingId(String(preset._id))
                          try {
                            await updatePreset({ admin_email: adminEmail, id: preset._id, is_active: checked })
                            await revalidateStylePresets()
                          } finally {
                            setSavingId(null)
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-[11px]"
                        onClick={() => openPromptEditor(preset._id)}
                        disabled={Boolean(reanalyzingId)}
                      >
                        <IconEdit className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-[11px]"
                        onClick={() => void reanalyzePreset(preset)}
                        disabled={Boolean(reanalyzingId)}
                      >
                        {reanalyzingId === String(preset._id)
                          ? <Loader2 className="w-3.5 h-3.5 mr-1" />
                          : <IconRefresh className="w-3.5 h-3.5 mr-1" />
                        }
                        Reanalizar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 px-2 text-[11px]"
                        disabled={Boolean(reanalyzingId)}
                        onClick={async () => {
                          await removePreset({ admin_email: adminEmail, id: preset._id })
                          await revalidateStylePresets()
                        }}
                      >
                        <IconDelete className="w-3.5 h-3.5 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                    {savingId === String(preset._id) ? (
                      <div className="flex justify-end">
                        <Loader2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPresets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No hay estilos que coincidan con el filtro actual.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={promptEditorOpen} onOpenChange={(open) => (open ? setPromptEditorOpen(true) : closePromptEditor())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar prompt de estilo</DialogTitle>
            <DialogDescription>
              El prompt que guardes aquí será el texto de estilo principal inyectado en generación.
            </DialogDescription>
          </DialogHeader>

          {!editingPreset ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4" />
              Cargando estilo...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {hasRenderableImage(editingPreset.image_url) ? (
                  <img
                    src={editingPreset.image_url}
                    alt={editingPreset.name}
                    className="w-20 aspect-[2/3] rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="w-20 aspect-[2/3] rounded-lg border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                    Sin imagen
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{editingPreset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {String(editingPreset._id)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style-prompt-editor">Prompt de estilo</Label>
                <Textarea
                  id="style-prompt-editor"
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  placeholder="Describe el estilo visual que quieres inyectar..."
                  className="min-h-44 resize-y"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePromptEditor} disabled={isSavingPrompt}>
              Cancelar
            </Button>
            <Button type="button" onClick={savePromptDraft} disabled={!editingPreset || isSavingPrompt}>
              {isSavingPrompt ? <Loader2 className="w-4 h-4 mr-2" /> : null}
              Guardar prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


