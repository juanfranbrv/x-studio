'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useWizardState, type WizardStep } from './hooks/useWizardState'
import { StudioProgress } from './StudioProgress'
import { StudioNav } from './StudioNav'
import { SourceStep } from './steps/SourceStep'
import { NameStep } from './steps/NameStep'
import { BrandBoardStep } from './steps/BrandBoardStep'

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

export function BrandStudio() {
  const router = useRouter()
  const {
    state,
    dispatch,
    canGoBack,
    canGoNext,
    currentStepIndex,
    totalSteps,
    goNext,
    goBack,
    goToStep,
  } = useWizardState()

  const handleExit = useCallback(() => {
    router.push('/brand-kit')
  }, [router])

  const handleSave = useCallback(() => {
    // TODO: Phase 2 — save draft to Convex and redirect
    router.push('/brand-kit')
  }, [router])

  const isNextDisabled = (() => {
    switch (state.currentStep) {
      case 'source':
        if (!state.sourceType) return true
        if (state.sourceType === 'scratch') return false
        return state.sourceValue.length < 3
      case 'name':
        return !state.draft.brand_name || state.draft.brand_name.length < 1
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
            sourceValue={state.sourceValue}
            dispatch={dispatch}
            onNext={goNext}
          />
        )
      case 'name':
        return <NameStep draft={state.draft} dispatch={dispatch} />
      case 'brandBoard':
        return (
          <BrandBoardStep
            draft={state.draft}
            onSave={handleSave}
            onEditStep={goToStep}
          />
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

  const showNav = state.currentStep !== 'brandBoard'

  return (
    <div className="relative min-h-dvh bg-background overflow-hidden">
      <StudioProgress
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
      />

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

      {showNav && (
        <StudioNav
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          onBack={goBack}
          onNext={goNext}
          onExit={handleExit}
          nextDisabled={isNextDisabled}
        />
      )}
    </div>
  )
}
