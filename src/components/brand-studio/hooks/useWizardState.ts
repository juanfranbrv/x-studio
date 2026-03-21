import { useReducer, useCallback } from 'react'
import type { BrandDNA } from '@/lib/brand-types'

export const WIZARD_STEPS = [
  'source',
  'name',
  'loading',
  'logo',
  'palette',
  'typography',
  'personality',
  'voice',
  'brandBoard',
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]
export type SourceType = 'web' | 'instagram' | 'scratch'

export interface BrandStudioState {
  currentStep: WizardStep
  sourceType: SourceType | null
  sourceValue: string
  draft: Partial<BrandDNA>
  stepHistory: WizardStep[]
}

export type WizardAction =
  | { type: 'SET_SOURCE'; sourceType: SourceType; value: string }
  | { type: 'SET_NAME'; name: string; description: string }
  | { type: 'UPDATE_DRAFT'; data: Partial<BrandDNA> }
  | { type: 'GO_TO_STEP'; step: WizardStep }
  | { type: 'NEXT' }
  | { type: 'BACK' }

function getNextStep(current: WizardStep, state: BrandStudioState): WizardStep | null {
  switch (current) {
    case 'source':
      return state.sourceType === 'scratch' ? 'name' : 'loading'
    case 'name':
      return 'logo'
    case 'loading':
      return 'logo'
    case 'logo':
      return 'palette'
    case 'palette':
      return 'typography'
    case 'typography':
      return 'personality'
    case 'personality':
      return 'voice'
    case 'voice':
      return 'brandBoard'
    case 'brandBoard':
      return null
    default:
      return null
  }
}

export const initialState: BrandStudioState = {
  currentStep: 'source',
  sourceType: null,
  sourceValue: '',
  draft: {},
  stepHistory: [],
}

function wizardReducer(state: BrandStudioState, action: WizardAction): BrandStudioState {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        sourceType: action.sourceType,
        sourceValue: action.value,
      }

    case 'SET_NAME':
      return {
        ...state,
        draft: {
          ...state.draft,
          brand_name: action.name,
          business_overview: action.description,
        },
      }

    case 'UPDATE_DRAFT':
      return {
        ...state,
        draft: { ...state.draft, ...action.data },
      }

    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: action.step,
        stepHistory: [...state.stepHistory, state.currentStep],
      }

    case 'NEXT': {
      const next = getNextStep(state.currentStep, state)
      if (!next) return state
      return {
        ...state,
        currentStep: next,
        stepHistory: [...state.stepHistory, state.currentStep],
      }
    }

    case 'BACK': {
      const prev = state.stepHistory[state.stepHistory.length - 1]
      if (!prev) return state
      return {
        ...state,
        currentStep: prev,
        stepHistory: state.stepHistory.slice(0, -1),
      }
    }

    default:
      return state
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const canGoBack = state.stepHistory.length > 0
  const canGoNext = getNextStep(state.currentStep, state) !== null

  const visibleSteps = WIZARD_STEPS.filter((s) => {
    if (s === 'loading') return false
    if (s === 'name' && state.sourceType !== 'scratch') return false
    return true
  })
  const currentStepIndex = visibleSteps.indexOf(state.currentStep)
  const totalSteps = visibleSteps.length

  const goNext = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const goBack = useCallback(() => dispatch({ type: 'BACK' }), [])
  const goToStep = useCallback((step: WizardStep) => dispatch({ type: 'GO_TO_STEP', step }), [])

  return {
    state,
    dispatch,
    canGoBack,
    canGoNext,
    currentStepIndex,
    totalSteps,
    goNext,
    goBack,
    goToStep,
  }
}
