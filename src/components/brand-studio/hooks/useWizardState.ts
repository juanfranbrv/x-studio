import { useReducer, useCallback } from 'react'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals } from '@/app/actions/generate-brand-proposals'

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
export type SourceType = 'web' | 'instagram' | 'both' | 'scratch'

export type AnalysisStatus = 'idle' | 'running' | 'success' | 'error'

export interface BrandStudioState {
  currentStep: WizardStep
  sourceType: SourceType | null
  webUrl: string
  instagramHandle: string
  uploadedImages: string[]
  draft: Partial<BrandDNA>
  stepHistory: WizardStep[]
  analysisStatus: AnalysisStatus
  analysisError: string | null
  proposals: BrandProposals | null
  proposalsStatus: 'idle' | 'running' | 'success' | 'error'
}

export type WizardAction =
  | { type: 'TOGGLE_SOURCE'; source: 'web' | 'instagram' }
  | { type: 'SET_SCRATCH' }
  | { type: 'SET_WEB_URL'; url: string }
  | { type: 'SET_INSTAGRAM_HANDLE'; handle: string }
  | { type: 'ADD_UPLOADED_IMAGES'; urls: string[] }
  | { type: 'REMOVE_UPLOADED_IMAGE'; url: string }
  | { type: 'SET_NAME'; name: string; description: string }
  | { type: 'UPDATE_DRAFT'; data: Partial<BrandDNA> }
  | { type: 'GO_TO_STEP'; step: WizardStep }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SET_ANALYSIS_STATUS'; status: AnalysisStatus; error?: string }
  | { type: 'CANCEL_ANALYSIS' }
  | { type: 'SET_PROPOSALS'; proposals: BrandProposals }
  | { type: 'SET_PROPOSALS_STATUS'; status: 'idle' | 'running' | 'success' | 'error' }

function getNextStep(current: WizardStep, state: BrandStudioState): WizardStep | null {
  switch (current) {
    case 'source':
      return state.sourceType === 'scratch' ? 'name' : 'loading'
    case 'name':
      return 'loading'
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

/** Compute the effective sourceType from toggle state */
function computeSourceType(webUrl: string, instagramHandle: string, toggledWeb: boolean, toggledInstagram: boolean): SourceType | null {
  if (toggledWeb && toggledInstagram) return 'both'
  if (toggledWeb) return 'web'
  if (toggledInstagram) return 'instagram'
  return null
}

export const initialState: BrandStudioState = {
  currentStep: 'source',
  sourceType: null,
  webUrl: '',
  instagramHandle: '',
  uploadedImages: [],
  draft: {},
  stepHistory: [],
  analysisStatus: 'idle',
  analysisError: null,
  proposals: null,
  proposalsStatus: 'idle',
}

function wizardReducer(state: BrandStudioState, action: WizardAction): BrandStudioState {
  switch (action.type) {
    case 'TOGGLE_SOURCE': {
      const isWeb = action.source === 'web'
      const isInsta = action.source === 'instagram'
      // If currently scratch, clear scratch and set the toggled source
      if (state.sourceType === 'scratch') {
        return {
          ...state,
          sourceType: action.source,
        }
      }
      // Toggle: figure out current active sources
      const webActive = state.sourceType === 'web' || state.sourceType === 'both'
      const instaActive = state.sourceType === 'instagram' || state.sourceType === 'both'
      const newWeb = isWeb ? !webActive : webActive
      const newInsta = isInsta ? !instaActive : instaActive
      return {
        ...state,
        sourceType: computeSourceType(state.webUrl, state.instagramHandle, newWeb, newInsta),
      }
    }

    case 'SET_SCRATCH':
      return {
        ...state,
        sourceType: 'scratch',
        webUrl: '',
        instagramHandle: '',
      }

    case 'SET_WEB_URL':
      return {
        ...state,
        webUrl: action.url,
      }

    case 'SET_INSTAGRAM_HANDLE':
      return {
        ...state,
        instagramHandle: action.handle,
      }

    case 'ADD_UPLOADED_IMAGES':
      return {
        ...state,
        uploadedImages: [...state.uploadedImages, ...action.urls],
      }

    case 'REMOVE_UPLOADED_IMAGE':
      return {
        ...state,
        uploadedImages: state.uploadedImages.filter((u) => u !== action.url),
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
      // Skip transient steps (loading) when going back
      let history = [...state.stepHistory]
      let prev: WizardStep | undefined
      while (history.length > 0) {
        prev = history.pop()
        if (prev !== 'loading') break
      }
      if (!prev) return state
      return {
        ...state,
        currentStep: prev,
        stepHistory: history,
        // Reset analysis so it can re-run if user navigates forward again
        analysisStatus: 'idle',
        analysisError: null,
      }
    }

    case 'SET_ANALYSIS_STATUS':
      return {
        ...state,
        analysisStatus: action.status,
        analysisError: action.error ?? (action.status === 'error' ? state.analysisError : null),
      }

    case 'CANCEL_ANALYSIS': {
      const prevStep = state.stepHistory[state.stepHistory.length - 1]
      if (!prevStep) return state
      return {
        ...state,
        currentStep: prevStep,
        stepHistory: state.stepHistory.slice(0, -1),
        analysisStatus: 'idle',
        analysisError: null,
      }
    }

    case 'SET_PROPOSALS':
      return {
        ...state,
        proposals: action.proposals,
        proposalsStatus: 'success',
      }

    case 'SET_PROPOSALS_STATUS':
      return {
        ...state,
        proposalsStatus: action.status,
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
    // logo step is visible in the stepper
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
    visibleSteps,
    goNext,
    goBack,
    goToStep,
  }
}
