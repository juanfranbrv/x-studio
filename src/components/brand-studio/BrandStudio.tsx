'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { useToast } from '@/hooks/use-toast'
import { useWizardState, type WizardStep } from './hooks/useWizardState'
import { StudioProgress } from './StudioProgress'
import { StudioNav } from './StudioNav'
import { SourceStep } from './steps/SourceStep'
import { NameStep } from './steps/NameStep'
import { LoadingStep } from './steps/LoadingStep'
import { LogoStep } from './steps/LogoStep'
import { PaletteStep } from './steps/PaletteStep'
import { TypographyStep } from './steps/TypographyStep'
import { LanguageStep } from './steps/LanguageStep'
import { PersonalityStep } from './steps/PersonalityStep'
import { useUser } from '@clerk/nextjs'
import { VoiceStep } from './steps/VoiceStep'
import { BrandContextStep } from './steps/BrandContextStep'
import { ContactStep } from './steps/ContactStep'
import { ImagesStep } from './steps/ImagesStep'
import { BrandBoardStep } from './steps/BrandBoardStep'
import { BrandPreviewCard } from './BrandPreviewCard'
import { analyzeBrandDNA } from '@/app/actions/analyze-brand-dna'
import { analyzeBrandInstagram } from '@/app/actions/analyze-brand-instagram'
import { generateBrandFromScratch } from '@/app/actions/generate-brand-from-scratch'
import { generateBrandProposals } from '@/app/actions/generate-brand-proposals'
import {
  WIZARD_STEP_CONTENT,
  WIZARD_STEP_CONTENT_WIDE,
  WIZARD_TITLE,
} from './brandStudioStyles'

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

interface BrandStudioProps {
  userId: string
}

export function BrandStudio({ userId }: BrandStudioProps) {
  const { user } = useUser()
  const router = useRouter()
  const { i18n, t } = useTranslation('brandStudio')
  const { toast } = useToast()
  const {
    state,
    dispatch,
    canGoBack,
    canGoNext,
    currentStepIndex,
    totalSteps,
    visibleSteps,
    goNext,
    goBack,
    goToStep,
  } = useWizardState()

  const abortRef = useRef<AbortController | null>(null)
  const analysisStartedRef = useRef(false)
  const upsertDNA = useMutation(api.brands.upsertBrandDNA)

  // Reset ref guard when leaving loading step
  useEffect(() => {
    if (state.currentStep !== 'loading') {
      analysisStartedRef.current = false
    }
  }, [state.currentStep])

  // Run analysis when entering loading step
  useEffect(() => {
    if (state.currentStep !== 'loading') return
    if (state.analysisStatus !== 'idle') return
    if (analysisStartedRef.current) return

    analysisStartedRef.current = true
    // Clear stale screenshot from previous analysis
    dispatch({ type: 'UPDATE_DRAFT', data: { screenshot_url: undefined } })
    dispatch({ type: 'SET_ANALYSIS_STATUS', status: 'running' })

    const controller = new AbortController()
    abortRef.current = controller

    const preferredLang = state.brandLanguage || i18n.language?.split('-')[0] || 'es'

    const runAnalysis = async () => {
      try {
        let result: { success: boolean; data?: any; error?: string }

        switch (state.sourceType) {
          case 'web':
            result = await analyzeBrandDNA(state.webUrl, false, userId)
            break
          case 'instagram':
            result = await analyzeBrandInstagram(state.instagramHandle, userId, preferredLang)
            break
          case 'both': {
            const [webResult, instaResult] = await Promise.all([
              analyzeBrandDNA(state.webUrl, false, userId),
              analyzeBrandInstagram(state.instagramHandle, userId, preferredLang),
            ])

            if (webResult.success && webResult.data) {
              const instaData = instaResult.success ? instaResult.data : null
              result = {
                success: true,
                data: {
                  ...webResult.data,
                  brand_values: webResult.data.brand_values?.length
                    ? webResult.data.brand_values
                    : instaData?.brand_values ?? [],
                  tone_of_voice: webResult.data.tone_of_voice?.length
                    ? webResult.data.tone_of_voice
                    : instaData?.tone_of_voice ?? [],
                  visual_aesthetic: webResult.data.visual_aesthetic?.length
                    ? webResult.data.visual_aesthetic
                    : instaData?.visual_aesthetic ?? [],
                  images: [
                    ...(webResult.data.images ?? []),
                    ...(instaData?.images ?? []).filter(
                      (img) => !webResult.data!.images?.some((w) => w.url === img.url)
                    ),
                  ],
                  tagline: webResult.data.tagline || instaData?.tagline || '',
                  business_overview:
                    webResult.data.business_overview || instaData?.business_overview || '',
                },
              }
            } else if (instaResult.success && instaResult.data) {
              result = instaResult
            } else {
              result = webResult
            }
            break
          }
          case 'scratch':
            result = await generateBrandFromScratch(
              state.draft.brand_name || '',
              state.draft.business_overview || '',
              preferredLang
            )
            break
          default:
            throw new Error('Unknown source type')
        }

        if (controller.signal.aborted) return

        if (result.success && result.data) {
          // 1. Update draft — screenshot appears in browser mockup while scan animation keeps running
          dispatch({ type: 'UPDATE_DRAFT', data: result.data })

          // Generate proposals in parallel (non-blocking)
          dispatch({ type: 'SET_PROPOSALS_STATUS', status: 'running' })
          const existingColors = result.data.colors?.map((c: any) => c.color).filter(Boolean)
          generateBrandProposals({
            brandName: result.data.brand_name || state.draft.brand_name || '',
            businessOverview: result.data.business_overview || state.draft.business_overview || '',
            existingColors,
            preferredLanguage: preferredLang,
          })
            .then((proposals) => {
              if (!controller.signal.aborted) {
                dispatch({ type: 'SET_PROPOSALS', proposals })
              }
            })
            .catch(() => {
              if (!controller.signal.aborted) {
                dispatch({ type: 'SET_PROPOSALS_STATUS', status: 'error' })
              }
            })

          // 2. Let scan animation play over the real screenshot for 2s (the "illusion")
          setTimeout(() => {
            if (controller.signal.aborted) return
            // 3. Mark success — user advances manually via "Next" button
            dispatch({ type: 'SET_ANALYSIS_STATUS', status: 'success' })
          }, 2000)
        } else {
          dispatch({
            type: 'SET_ANALYSIS_STATUS',
            status: 'error',
            error: result.error || 'Analysis failed',
          })
        }
      } catch (err: any) {
        if (controller.signal.aborted) return
        dispatch({
          type: 'SET_ANALYSIS_STATUS',
          status: 'error',
          error: err.message || 'Unexpected error',
        })
      }
    }

    runAnalysis()

    // NO cleanup abort here — the ref guard prevents double-runs
    // Cancel is handled explicitly by handleCancel via abortRef
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on step entry
  }, [state.currentStep, state.analysisStatus])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ type: 'CANCEL_ANALYSIS' })
  }, [dispatch])

  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_ANALYSIS_STATUS', status: 'idle' })
  }, [dispatch])

  const handleExit = useCallback(() => {
    router.push('/brand-kit')
  }, [router])

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const url = state.sourceType === 'scratch' ? `scratch-${Date.now()}` : (state.webUrl || state.draft.url || 'pending')
      
      const id = await upsertDNA({
        url,
        clerk_user_id: user?.id || 'anonymous',
        updated_at: new Date().toISOString(),
        brand_name: state.draft.brand_name || 'My Brand',
        tagline: state.draft.tagline || '',
        business_overview: state.draft.business_overview || '',
        brand_values: state.draft.brand_values || [],
        tone_of_voice: state.draft.tone_of_voice || [],
        visual_aesthetic: state.draft.visual_aesthetic || [],
        colors: state.draft.colors || [],
        fonts: state.draft.fonts || [],
        text_assets: state.draft.text_assets || {
          brand_context: '',
          marketing_hooks: [],
          visual_keywords: [],
          ctas: [],
          slogans: [],
          headlines: [],
        },
        logo_url: state.draft.logo_url || '',
        logos: state.draft.logos || [],
        favicon_url: state.draft.favicon_url || '',
        screenshot_url: state.draft.screenshot_url || '',
        images: state.draft.images || [],
        target_audience: state.draft.target_audience || [],
        social_links: state.draft.social_links || [],
        emails: state.draft.emails || [],
        phones: state.draft.phones || [],
        addresses: state.draft.addresses || [],
        preferred_language: state.draft.preferred_language || 'es',
        debug: state.draft.debug || {},
      })

      if (id) {
        toast({
          title: t('common.success') || '¡Éxito!',
          description: t('brandBoard.saveSuccess') || 'Marca creada correctamente.',
        })
        router.push(`/brand-kit?id=${id}`)
      }
    } catch (err) {
      console.error('Error saving brand DNA:', err)
      toast({
        variant: 'destructive',
        title: t('common.error') || 'Error',
        description: t('brandBoard.saveError') || 'No se pudo crear el kit de marca.',
      })
    } finally {
      setIsSaving(false)
    }
  }, [state, upsertDNA, router, t, toast, isSaving])

  const handleRegenerateProposals = useCallback(() => {
    const preferredLang = state.brandLanguage || i18n.language?.split('-')[0] || 'es'
    dispatch({ type: 'SET_PROPOSALS_STATUS', status: 'running' })
    const existingColors = state.draft.colors?.map((c) => c.color).filter(Boolean)
    generateBrandProposals({
      brandName: state.draft.brand_name || '',
      businessOverview: state.draft.business_overview || '',
      existingColors,
      preferredLanguage: preferredLang,
    })
      .then((proposals) => {
        dispatch({ type: 'SET_PROPOSALS', proposals })
      })
      .catch(() => {
        dispatch({ type: 'SET_PROPOSALS_STATUS', status: 'error' })
      })
  }, [state.draft, state.brandLanguage, i18n.language, dispatch])

  const isNextDisabled = (() => {
    switch (state.currentStep) {
      case 'source':
        if (!state.sourceType) return true
        if (state.sourceType === 'scratch') return false
        if (state.sourceType === 'both') return state.webUrl.length < 6 || state.instagramHandle.length < 2
        if (state.sourceType === 'web') return state.webUrl.length < 6
        if (state.sourceType === 'instagram') return state.instagramHandle.length < 2
        return true
      case 'name':
        return !state.draft.brand_name || state.draft.brand_name.length < 1
      case 'palette':
        return !state.draft.colors || state.draft.colors.length === 0
      case 'typography':
        return !state.draft.fonts || state.draft.fonts.length < 2
      case 'language':
        return !state.brandLanguage
      case 'personality':
        return (
          (!state.draft.visual_aesthetic || state.draft.visual_aesthetic.length === 0) &&
          (!state.draft.tone_of_voice || state.draft.tone_of_voice.length === 0) &&
          (!state.draft.brand_values || state.draft.brand_values.length === 0)
        )
      case 'voice':
        return !state.draft.tagline || state.draft.tagline.length === 0
      case 'brandContext':
        return false // optional step
      case 'contact':
        return false // optional step
      default:
        return false
    }
  })()

  const direction = 1

  const renderStep = () => {
    switch (state.currentStep) {
      case 'source':
        return (
          <SourceStep
            sourceType={state.sourceType}
            webUrl={state.webUrl}
            instagramHandle={state.instagramHandle}
            uploadedImages={state.uploadedImages}
            dispatch={dispatch}
            onNext={goNext}
          />
        )
      case 'name':
        return <NameStep draft={state.draft} dispatch={dispatch} />
      case 'loading':
        return (
          <LoadingStep
            sourceType={state.sourceType || 'web'}
            status={state.analysisStatus}
            error={state.analysisError}
            targetUrl={state.webUrl}
            screenshotUrl={state.draft.screenshot_url}
            profilePicUrl={state.draft.favicon_url || state.draft.logo_url}
            extractedColors={state.draft.colors?.slice(0, 5).map(c => c.color).filter(Boolean) as string[] | undefined}
            onCancel={handleCancel}
            onRetry={handleRetry}
            onNext={goNext}
            onUrlChange={(url) => dispatch({ type: 'SET_WEB_URL', url })}
          />
        )
      case 'logo':
        return <LogoStep draft={state.draft} dispatch={dispatch} userId={userId} />
      case 'palette':
        return (
          <PaletteStep
            draft={state.draft}
            dispatch={dispatch}
          />
        )
      case 'typography':
        return (
          <TypographyStep
            draft={state.draft}
            proposals={state.proposals}
            dispatch={dispatch}
            onRegenerate={handleRegenerateProposals}
            isRegenerating={state.proposalsStatus === 'running'}
          />
        )
      case 'language':
        return (
          <LanguageStep
            brandLanguage={state.brandLanguage}
            dispatch={dispatch}
          />
        )
      case 'personality':
        return (
          <PersonalityStep
            draft={state.draft}
            proposals={state.proposals}
            dispatch={dispatch}
            onRegenerate={handleRegenerateProposals}
            isRegenerating={state.proposalsStatus === 'running'}
          />
        )
      case 'voice':
        return (
          <VoiceStep
            draft={state.draft}
            proposals={state.proposals}
            dispatch={dispatch}
            onRegenerate={handleRegenerateProposals}
            isRegenerating={state.proposalsStatus === 'running'}
          />
        )
      case 'brandContext':
        return (
          <BrandContextStep
            draft={state.draft}
            dispatch={dispatch}
          />
        )
      case 'contact':
        return (
          <ContactStep
            draft={state.draft}
            dispatch={dispatch}
          />
        )
      case 'images':
        return (
          <ImagesStep
            draft={state.draft}
            dispatch={dispatch}
          />
        )
      case 'brandBoard':
        return (
          <div className="flex min-h-dvh flex-col items-center justify-center px-[clamp(1rem,4vw,3rem)] pt-[clamp(4rem,8vh,6rem)] pb-[clamp(12rem,24vh,20rem)]">
            <div className={WIZARD_STEP_CONTENT_WIDE}>
              <BrandBoardStep
                draft={state.draft}
                proposals={state.proposals}
                dispatch={dispatch}
                onSave={handleSave}
                onEditStep={goToStep}
              />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex min-h-dvh items-center justify-center">
            <p className="text-muted-foreground">
              Step: {state.currentStep} (coming soon)
            </p>
          </div>
        )
    }
  }

  const showNav = state.currentStep !== 'loading'
  const showSidebar = [
    'logo', 'palette', 'typography', 'language',
    'personality', 'voice', 'brandContext', 'contact', 'images',
  ].includes(state.currentStep)

  return (
    <div className="relative min-h-dvh bg-background overflow-hidden">
      {/* Mobile progress bar (hidden on lg when sidebar is visible) */}
      <StudioProgress
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
      />

      <div className={showSidebar ? 'flex min-h-dvh' : ''}>
        {/* ── Left sidebar (desktop only) ──────────────────── */}
        {showSidebar && (
          <aside className="hidden lg:flex w-[340px] xl:w-[380px] shrink-0 flex-col border-r border-border/30 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.4,hsl(var(--background)))]">
            <div className="flex flex-1 flex-col justify-between p-6 xl:p-8">
              {/* Preview card — builds up as user makes decisions */}
              <div className="space-y-8">
                <BrandPreviewCard draft={state.draft} className="w-full" />

                {/* Vertical stepper */}
                <StudioProgress
                  currentIndex={currentStepIndex}
                  totalSteps={totalSteps}
                  visibleSteps={visibleSteps}
                  onStepClick={goToStep}
                />
              </div>
            </div>
          </aside>
        )}

        {/* ── Right main area ──────────────────────────────── */}
        <div className={showSidebar ? 'flex-1 overflow-y-auto overflow-x-visible' : ''}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={state.currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile preview (floating above nav) */}
      {showSidebar && (
        <div className="fixed bottom-[60px] right-3 z-40 w-[180px] lg:hidden">
          <BrandPreviewCard draft={state.draft} className="scale-90 origin-bottom-right" />
        </div>
      )}

      {showNav && (
        <StudioNav
          canGoBack={canGoBack}
          canGoNext={canGoNext || state.currentStep === 'brandBoard'}
          onBack={goBack}
          onNext={state.currentStep === 'brandBoard' ? handleSave : goNext}
          onExit={handleExit}
          nextDisabled={isNextDisabled || (state.currentStep === 'brandBoard' && isSaving)}
          nextLabel={state.currentStep === 'brandBoard' ? (t('brandBoard.save') || 'Guardar y empezar a crear') : undefined}
          showSidebar={showSidebar}
        />
      )}
    </div>
  )
}
