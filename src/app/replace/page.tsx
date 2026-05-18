'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'

import type { Id } from '@/../convex/_generated/dataModel'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ReplaceCanvasPanel } from '@/components/studio/replace/ReplaceCanvasPanel'
import { ReplaceControlsPanel } from '@/components/studio/replace/ReplaceControlsPanel'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { log } from '@/lib/logger'
import { api } from '../../../convex/_generated/api'

type ReplaceTemplateRecord = {
    _id: Id<'replace_templates'>
    title: string
    image_url: string
}

export default function ReplacePage() {
    const router = useRouter()
    const { activeBrandKit, brandKits, setActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const replaceModuleFlags = useQuery(api.settings.getReplaceModuleFlags, {})
    const replaceTemplatesResult = useQuery(api.replaceTemplates.listActive, {})

    const replaceTemplates = useMemo(
        () => ((replaceTemplatesResult || []) as ReplaceTemplateRecord[]).map((template) => ({
            id: String(template._id),
            name: template.title,
            imageUrl: template.image_url,
        })),
        [replaceTemplatesResult]
    )

    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
    const [selectedImageLabel, setSelectedImageLabel] = useState('Imagen de producto del usuario')
    const [isUploading, setIsUploading] = useState(false)
    const [userRefinement, setUserRefinement] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
    const [generationError, setGenerationError] = useState<string | null>(null)

    useEffect(() => {
        if (replaceModuleFlags?.showReplaceModule === false) {
            router.replace('/image')
        }
    }, [replaceModuleFlags?.showReplaceModule, router])

    useEffect(() => {
        if (!replaceTemplates.length) {
            if (selectedTemplateId !== null) {
                setSelectedTemplateId(null)
            }
            return
        }

        const currentExists = replaceTemplates.some((template) => template.id === selectedTemplateId)
        if (!currentExists) {
            setSelectedTemplateId(replaceTemplates[0]?.id || null)
        }
    }, [replaceTemplates, selectedTemplateId])

    const brandKitImages = useMemo(() => {
        return (activeBrandKit?.images || []).map((image, index) => ({
            id: image.url || `brand-kit-image-${index}`,
            url: image.url,
            name: `Imagen ${index + 1}`,
        })).filter((image) => Boolean(image.url))
    }, [activeBrandKit?.images])

    const selectedTemplateName = useMemo(
        () => replaceTemplates.find((template) => template.id === selectedTemplateId)?.name || 'Sin plantilla seleccionada',
        [replaceTemplates, selectedTemplateId]
    )
    const selectedTemplateImageUrl = useMemo(
        () => replaceTemplates.find((template) => template.id === selectedTemplateId)?.imageUrl || null,
        [replaceTemplates, selectedTemplateId]
    )

    const handleFileSelected = async (file: File) => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('assetKind', 'image')
            const result = await uploadBrandImage(formData)
            if (result.success && result.url) {
                setSelectedImageUrl(result.url)
                setSelectedImageLabel(file.name || 'Contenido subido')
            }
        } finally {
            setIsUploading(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedImageUrl || !selectedTemplateId || !selectedTemplateImageUrl) return

        setIsGenerating(true)
        setGenerationError(null)

        try {
            const response = await fetch('/api/replace', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productImageUrl: selectedImageUrl,
                    templateImageUrl: selectedTemplateImageUrl,
                    templateId: selectedTemplateId,
                    templateName: selectedTemplateName,
                    brandName: activeBrandKit?.brand_name || '',
                    userRefinement,
                }),
            })

            const data = await response.json()
            if (!response.ok || !data?.success || !data?.imageUrl) {
                throw new Error(data?.error || 'No se pudo generar la imagen de Replace.')
            }

            setResultImageUrl(String(data.imageUrl))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo generar la imagen de Replace.'
            log.error('REPLACE', 'Replace page generation failed', error)
            setGenerationError(message)
        } finally {
            setIsGenerating(false)
        }
    }

    if (replaceModuleFlags?.showReplaceModule === false) {
        return null
    }

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={(brandId) => { void setActiveBrandKit(brandId) }}
            onBrandDelete={(brandId) => { void deleteBrandKitById(brandId) }}
            isFixed
        >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <ReplaceCanvasPanel
                        selectedTemplateName={selectedTemplateName}
                        resultImageUrl={resultImageUrl}
                        isGenerating={isGenerating}
                        generationError={generationError}
                    />
                </div>
                <ReplaceControlsPanel
                    selectedImageUrl={selectedImageUrl}
                    selectedImageLabel={selectedImageLabel}
                    templates={replaceTemplates}
                    selectedTemplateId={selectedTemplateId}
                    brandKitImages={brandKitImages}
                    isUploading={isUploading}
                    isGenerating={isGenerating}
                    userRefinement={userRefinement}
                    onFileSelected={handleFileSelected}
                    onUserRefinementChange={setUserRefinement}
                    onSelectBrandKitImage={(image) => {
                        setSelectedImageUrl(image.url)
                        setSelectedImageLabel(image.name || 'Imagen del Kit de marca')
                    }}
                    onSelectTemplate={setSelectedTemplateId}
                    onGenerate={handleGenerate}
                />
            </div>
        </DashboardLayout>
    )
}
