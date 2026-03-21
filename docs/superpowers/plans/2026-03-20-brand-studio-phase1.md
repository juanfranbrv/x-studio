# Brand Studio — Phase 1: Infrastructure & Base Flow

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the full-screen Brand Studio wizard infrastructure with working navigation between steps, state management, i18n, and skeleton screens for Source, Name, and Brand Board.

**Architecture:** Full-screen route at `/brand-kit/new` bypassing DashboardLayout. State managed via `useReducer` with a `BrandStudioState` type tracking current step, draft BrandDNA, and AI proposals. Each step is a standalone component receiving state + dispatch. framer-motion handles slide transitions between steps. All strings via i18next `brandStudio` namespace.

**Tech Stack:** Next.js App Router, React 19, framer-motion (already installed), i18next/react-i18next (existing), Clerk auth (existing), Convex (existing), Tailwind CSS, shadcn/ui components.

**Design spec:** `docs/BRAND_KIT_WIZARD_V2.md`

---

## File Structure

```
src/app/brand-kit/new/
  layout.tsx              — Metadata only, returns children (no DashboardLayout)
  page.tsx                — Auth check + renders BrandStudio

src/components/brand-studio/
  BrandStudio.tsx         — Orchestrator: step routing, transitions, state provider
  StudioProgress.tsx      — Thin progress bar at top
  StudioNav.tsx           — Back/Next buttons + exit
  steps/
    SourceStep.tsx        — "Where do we start?" (web/ig/scratch)
    NameStep.tsx          — Brand name + description (only if "scratch")
    BrandBoardStep.tsx    — Review card + save (skeleton)

src/components/brand-studio/hooks/
  useWizardState.ts       — useReducer with BrandStudioState + actions

src/locales/es-ES/brandStudio.json  — Spanish translations
src/locales/en-US/brandStudio.json  — English translations

src/lib/i18n.ts           — MODIFY: add brandStudio namespace
```

---

## Chunk 1: i18n Namespace + Route + Shell

### Task 1: Create i18n locale files and register namespace

**Files:**
- Create: `src/locales/es-ES/brandStudio.json`
- Create: `src/locales/en-US/brandStudio.json`
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Create Spanish locale file**

```json
{
  "meta": {
    "title": "Brand Studio | Post laboratory",
    "description": "Crea el kit de marca perfecto para tu negocio"
  },
  "progress": {
    "step": "{{current}} de {{total}}"
  },
  "nav": {
    "back": "Atrás",
    "next": "Siguiente",
    "exit": "Salir",
    "exitConfirm": "¿Seguro que quieres salir? Tu progreso se perderá.",
    "exitYes": "Sí, salir",
    "exitNo": "Continuar"
  },
  "source": {
    "title": "¿De dónde partimos?",
    "subtitle": "Cuanta más información tengamos, mejor será el resultado",
    "web": {
      "title": "Tengo una web",
      "subtitle": "Analizaremos tu sitio web para extraer colores, tipografías y estilo",
      "placeholder": "https://tu-web.com"
    },
    "instagram": {
      "title": "Tengo Instagram",
      "subtitle": "Analizaremos tu perfil para extraer tu estilo visual",
      "placeholder": "@tu_cuenta"
    },
    "scratch": {
      "title": "Empiezo de cero",
      "subtitle": "Te guiaremos paso a paso para crear tu identidad de marca"
    }
  },
  "name": {
    "title": "¿Cómo se llama tu marca?",
    "placeholder": "Nombre de tu marca",
    "descriptionLabel": "¿A qué te dedicas?",
    "descriptionPlaceholder": "Describe brevemente tu negocio en 1-2 frases...",
    "descriptionHint": "Esto nos ayuda a generar mejores propuestas para tu marca"
  },
  "brandBoard": {
    "title": "Tu marca está lista",
    "subtitle": "Este es el resumen de tu identidad de marca",
    "save": "Guardar y empezar a crear",
    "editStep": "Editar",
    "sections": {
      "logo": "Logo",
      "colors": "Colores",
      "typography": "Tipografía",
      "personality": "Personalidad",
      "voice": "Voz y eslogan"
    },
    "empty": {
      "logo": "Sin logo configurado",
      "colors": "Sin paleta de colores",
      "typography": "Sin tipografía seleccionada",
      "personality": "Sin personalidad definida",
      "voice": "Sin eslogan definido"
    }
  }
}
```

- [ ] **Step 2: Create English locale file**

```json
{
  "meta": {
    "title": "Brand Studio | Post laboratory",
    "description": "Create the perfect brand kit for your business"
  },
  "progress": {
    "step": "{{current}} of {{total}}"
  },
  "nav": {
    "back": "Back",
    "next": "Next",
    "exit": "Exit",
    "exitConfirm": "Are you sure you want to exit? Your progress will be lost.",
    "exitYes": "Yes, exit",
    "exitNo": "Continue"
  },
  "source": {
    "title": "Where do we start?",
    "subtitle": "The more information we have, the better the result",
    "web": {
      "title": "I have a website",
      "subtitle": "We'll analyze your site to extract colors, fonts, and style",
      "placeholder": "https://your-site.com"
    },
    "instagram": {
      "title": "I have Instagram",
      "subtitle": "We'll analyze your profile to extract your visual style",
      "placeholder": "@your_account"
    },
    "scratch": {
      "title": "Start from scratch",
      "subtitle": "We'll guide you step by step to create your brand identity"
    }
  },
  "name": {
    "title": "What's your brand name?",
    "placeholder": "Your brand name",
    "descriptionLabel": "What do you do?",
    "descriptionPlaceholder": "Briefly describe your business in 1-2 sentences...",
    "descriptionHint": "This helps us generate better proposals for your brand"
  },
  "brandBoard": {
    "title": "Your brand is ready",
    "subtitle": "Here's your brand identity summary",
    "save": "Save and start creating",
    "editStep": "Edit",
    "sections": {
      "logo": "Logo",
      "colors": "Colors",
      "typography": "Typography",
      "personality": "Personality",
      "voice": "Voice & tagline"
    },
    "empty": {
      "logo": "No logo configured",
      "colors": "No color palette",
      "typography": "No typography selected",
      "personality": "No personality defined",
      "voice": "No tagline defined"
    }
  }
}
```

- [ ] **Step 3: Register namespace in i18n.ts**

Add imports and register in the resources object and namespaces array.

In `src/lib/i18n.ts`, add after the billing imports:
```typescript
import brandStudioEs from '@/locales/es-ES/brandStudio.json'
import brandStudioEn from '@/locales/en-US/brandStudio.json'
```

Add `brandStudio: brandStudioEs` to the `'es-ES'` resources object.
Add `brandStudio: brandStudioEn` to the `'en-US'` resources object.
Add `'brandStudio'` to the `I18N_NAMESPACES` array.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to i18n imports.

- [ ] **Step 5: Commit**

```bash
git add src/locales/es-ES/brandStudio.json src/locales/en-US/brandStudio.json src/lib/i18n.ts
git commit -m "feat(brand-studio): add i18n namespace with es-ES and en-US translations"
```

---

### Task 2: Create the route (layout + page)

**Files:**
- Create: `src/app/brand-kit/new/layout.tsx`
- Create: `src/app/brand-kit/new/page.tsx`

- [ ] **Step 1: Create layout.tsx (metadata only, no DashboardLayout)**

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Brand Studio | Post laboratory',
  description: 'Crea el kit de marca perfecto para tu negocio con asistencia de IA.',
}

export default function BrandStudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

- [ ] **Step 2: Create page.tsx (auth + shell)**

```typescript
'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from '@/components/ui/spinner'
import { BrandStudio } from '@/components/brand-studio/BrandStudio'

export default function BrandStudioPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace('/sign-in')
    }
  }, [isLoaded, user, router])

  if (!isLoaded || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <BrandStudio />
}
```

- [ ] **Step 3: Verify route resolves**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Error about missing `BrandStudio` component (expected — we create it next).

- [ ] **Step 4: Commit**

```bash
git add src/app/brand-kit/new/layout.tsx src/app/brand-kit/new/page.tsx
git commit -m "feat(brand-studio): add full-screen route at /brand-kit/new"
```

---

### Task 3: Create useWizardState hook

**Files:**
- Create: `src/components/brand-studio/hooks/useWizardState.ts`

- [ ] **Step 1: Define types and create reducer**

```typescript
import { useReducer, useCallback } from 'react'
import type { BrandDNA } from '@/lib/brand-types'

// ─── Steps ─────────────────────────────────────────────
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

// ─── Source type ────────────────────────────────────────
export type SourceType = 'web' | 'instagram' | 'scratch'

// ─── State ─────────────────────────────────────────────
export interface BrandStudioState {
  currentStep: WizardStep
  sourceType: SourceType | null
  sourceValue: string            // URL or @handle
  draft: Partial<BrandDNA>
  stepHistory: WizardStep[]      // for back navigation
}

// ─── Actions ───────────────────────────────────────────
export type WizardAction =
  | { type: 'SET_SOURCE'; sourceType: SourceType; value: string }
  | { type: 'SET_NAME'; name: string; description: string }
  | { type: 'UPDATE_DRAFT'; data: Partial<BrandDNA> }
  | { type: 'GO_TO_STEP'; step: WizardStep }
  | { type: 'NEXT' }
  | { type: 'BACK' }

// ─── Step navigation logic ─────────────────────────────
function getNextStep(current: WizardStep, state: BrandStudioState): WizardStep | null {
  switch (current) {
    case 'source':
      // If scratch → name, otherwise → loading
      return state.sourceType === 'scratch' ? 'name' : 'loading'
    case 'name':
      return 'logo'          // skip loading for scratch
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
      return null             // final step
    default:
      return null
  }
}

// ─── Initial state ─────────────────────────────────────
export const initialState: BrandStudioState = {
  currentStep: 'source',
  sourceType: null,
  sourceValue: '',
  draft: {},
  stepHistory: [],
}

// ─── Reducer ───────────────────────────────────────────
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

// ─── Hook ──────────────────────────────────────────────
export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const canGoBack = state.stepHistory.length > 0
  const canGoNext = getNextStep(state.currentStep, state) !== null

  // Visible steps count (exclude loading, exclude name if not scratch)
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors in useWizardState.ts.

- [ ] **Step 3: Commit**

```bash
git add src/components/brand-studio/hooks/useWizardState.ts
git commit -m "feat(brand-studio): add useWizardState reducer with step navigation"
```

---

### Task 4: Create StudioProgress component

**Files:**
- Create: `src/components/brand-studio/StudioProgress.tsx`

- [ ] **Step 1: Create progress bar component**

```typescript
'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

interface StudioProgressProps {
  currentIndex: number
  totalSteps: number
}

export function StudioProgress({ currentIndex, totalSteps }: StudioProgressProps) {
  const { t } = useTranslation('brandStudio')
  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>
      {/* Step counter */}
      <div className="absolute top-2 right-4">
        <span className="text-xs text-muted-foreground">
          {t('progress.step', { current: currentIndex + 1, total: totalSteps })}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/brand-studio/StudioProgress.tsx
git commit -m "feat(brand-studio): add StudioProgress bar component"
```

---

### Task 5: Create StudioNav component

**Files:**
- Create: `src/components/brand-studio/StudioNav.tsx`

- [ ] **Step 1: Create navigation component**

```typescript
'use client'

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface StudioNavProps {
  canGoBack: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  onExit: () => void
  nextDisabled?: boolean
  nextLabel?: string
}

export function StudioNav({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onExit,
  nextDisabled = false,
  nextLabel,
}: StudioNavProps) {
  const { t } = useTranslation('brandStudio')

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4 bg-background/80 backdrop-blur-sm border-t">
      {/* Left: Back or Exit */}
      <div>
        {canGoBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.back')}</span>
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.exit')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('nav.exit')}</AlertDialogTitle>
                <AlertDialogDescription>{t('nav.exitConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('nav.exitNo')}</AlertDialogCancel>
                <AlertDialogAction onClick={onExit}>{t('nav.exitYes')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Right: Next */}
      {canGoNext && (
        <Button
          size="sm"
          onClick={onNext}
          disabled={nextDisabled}
          className="gap-2"
        >
          <span>{nextLabel ?? t('nav.next')}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/brand-studio/StudioNav.tsx
git commit -m "feat(brand-studio): add StudioNav with back/next/exit"
```

---

## Chunk 2: Step Components + Orchestrator

### Task 6: Create SourceStep component

**Files:**
- Create: `src/components/brand-studio/steps/SourceStep.tsx`

- [ ] **Step 1: Create the Source step**

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe, Instagram, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { SourceType, WizardAction } from '../hooks/useWizardState'

interface SourceStepProps {
  sourceType: SourceType | null
  sourceValue: string
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const SOURCE_OPTIONS: { type: SourceType; icon: typeof Globe; colorClass: string }[] = [
  { type: 'web', icon: Globe, colorClass: 'text-blue-500' },
  { type: 'instagram', icon: Instagram, colorClass: 'text-pink-500' },
  { type: 'scratch', icon: Sparkles, colorClass: 'text-amber-500' },
]

export function SourceStep({ sourceType, sourceValue, dispatch, onNext }: SourceStepProps) {
  const { t } = useTranslation('brandStudio')
  const [selected, setSelected] = useState<SourceType | null>(sourceType)
  const [inputValue, setInputValue] = useState(sourceValue)

  const handleSelect = (type: SourceType) => {
    setSelected(type)
    if (type === 'scratch') {
      dispatch({ type: 'SET_SOURCE', sourceType: type, value: '' })
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (selected) {
      dispatch({ type: 'SET_SOURCE', sourceType: selected, value })
    }
  }

  const canProceed =
    selected === 'scratch' ||
    (selected === 'web' && inputValue.length > 5) ||
    (selected === 'instagram' && inputValue.length > 1)

  const handleSubmit = () => {
    if (canProceed) onNext()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8 text-center"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('source.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('source.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SOURCE_OPTIONS.map(({ type, icon: Icon, colorClass }, i) => (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1), duration: 0.4 }}
              onClick={() => handleSelect(type)}
              className={`
                group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 sm:p-8
                transition-all duration-200
                ${selected === type
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
                }
              `}
            >
              <div className={`rounded-xl bg-muted p-4 transition-colors group-hover:bg-muted/80 ${selected === type ? 'bg-primary/10' : ''}`}>
                <Icon className={`h-8 w-8 ${colorClass}`} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{t(`source.${type}.title`)}</p>
                <p className="text-sm text-muted-foreground">{t(`source.${type}.subtitle`)}</p>
              </div>

              {/* Inline input for web/instagram */}
              {selected === type && type !== 'scratch' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={t(`source.${type}.placeholder`)}
                    className="mt-2 text-center"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/brand-studio/steps/SourceStep.tsx
git commit -m "feat(brand-studio): add SourceStep with web/instagram/scratch cards"
```

---

### Task 7: Create NameStep component

**Files:**
- Create: `src/components/brand-studio/steps/NameStep.tsx`

- [ ] **Step 1: Create the Name step (only shown for "scratch")**

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import type { WizardAction, BrandStudioState } from '../hooks/useWizardState'

interface NameStepProps {
  draft: BrandStudioState['draft']
  dispatch: React.Dispatch<WizardAction>
}

export function NameStep({ draft, dispatch }: NameStepProps) {
  const { t } = useTranslation('brandStudio')
  const [name, setName] = useState(draft.brand_name ?? '')
  const [description, setDescription] = useState(draft.business_overview ?? '')

  const handleNameChange = (value: string) => {
    setName(value)
    dispatch({ type: 'SET_NAME', name: value, description })
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    dispatch({ type: 'SET_NAME', name, description: value })
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-8 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('name.title')}
        </h1>

        <div className="space-y-6">
          <Input
            autoFocus
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('name.placeholder')}
            className="text-center text-2xl font-semibold h-14 border-2"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: name.length > 0 ? 1 : 0.3 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-muted-foreground">
              {t('name.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={t('name.descriptionPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('name.descriptionHint')}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/brand-studio/steps/NameStep.tsx
git commit -m "feat(brand-studio): add NameStep with name and description inputs"
```

---

### Task 8: Create BrandBoardStep skeleton

**Files:**
- Create: `src/components/brand-studio/steps/BrandBoardStep.tsx`

- [ ] **Step 1: Create the Brand Board review skeleton**

```typescript
'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Rocket } from 'lucide-react'
import type { BrandStudioState, WizardStep } from '../hooks/useWizardState'

interface BrandBoardStepProps {
  draft: BrandStudioState['draft']
  onSave: () => void
  onEditStep: (step: WizardStep) => void
}

const SECTIONS: { key: string; step: WizardStep }[] = [
  { key: 'logo', step: 'logo' },
  { key: 'colors', step: 'palette' },
  { key: 'typography', step: 'typography' },
  { key: 'personality', step: 'personality' },
  { key: 'voice', step: 'voice' },
]

export function BrandBoardStep({ draft, onSave, onEditStep }: BrandBoardStepProps) {
  const { t } = useTranslation('brandStudio')

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('brandBoard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('brandBoard.subtitle')}
          </p>
        </div>

        {/* Brand name header */}
        {draft.brand_name && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">{draft.brand_name}</h2>
            {draft.tagline && (
              <p className="text-muted-foreground mt-1">{draft.tagline}</p>
            )}
          </div>
        )}

        {/* Section cards — skeleton placeholders for now */}
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ key, step }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="group relative rounded-2xl border-2 border-border p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  {t(`brandBoard.sections.${key}`)}
                </h3>
                <button
                  onClick={() => onEditStep(step)}
                  className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t('brandBoard.editStep')}
                </button>
              </div>

              {/* Placeholder — will be filled by future phases */}
              <div className="h-16 rounded-xl bg-muted/50 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  {t(`brandBoard.empty.${key}`)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Save button */}
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={onSave} className="gap-2 text-base px-8">
            <Rocket className="h-5 w-5" />
            {t('brandBoard.save')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/brand-studio/steps/BrandBoardStep.tsx
git commit -m "feat(brand-studio): add BrandBoardStep skeleton with section cards"
```

---

### Task 9: Create BrandStudio orchestrator

**Files:**
- Create: `src/components/brand-studio/BrandStudio.tsx`

- [ ] **Step 1: Create the orchestrator component**

This is the main component that wires everything together: state, step routing, transitions, progress bar, and navigation.

```typescript
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

  // Determine if Next button should be disabled
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

  // Direction for slide animation
  const direction = 1 // positive = forward, will be tracked properly later

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
      // Placeholder for future steps
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

  // Hide nav on brand board (has its own save button)
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
```

- [ ] **Step 2: Verify full build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/brand-studio/BrandStudio.tsx
git commit -m "feat(brand-studio): add BrandStudio orchestrator with step routing and transitions"
```

---

### Task 10: Smoke test in browser

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to /brand-kit/new**

Verify:
- Full-screen page loads (no header, no sidebar)
- Progress bar visible at top ("1 de 7")
- Three source cards visible ("Tengo una web", "Tengo Instagram", "Empiezo de cero")
- Bottom nav shows Exit button (left) and disabled Next button (right)
- Selecting "Empiezo de cero" enables Next
- Clicking Next → slides to Name step
- Back button works
- Selecting "Tengo una web" → typing URL → Next → shows placeholder for Loading step
- Exit button shows confirmation dialog
- Mobile viewport (375px): cards stack vertically, everything fits

- [ ] **Step 3: Fix any issues found during smoke test**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(brand-studio): smoke test fixes for Phase 1"
```

---

## Summary

Phase 1 delivers:
- **9 files created**, **1 file modified** (i18n.ts)
- Full-screen route at `/brand-kit/new`
- State management with useReducer (step navigation, source type, draft BrandDNA)
- Animated transitions between steps (framer-motion slide)
- Progress bar + back/next/exit navigation
- 3 functional screens: Source (3 cards), Name (input), Brand Board (skeleton)
- Placeholder screens for future steps (logo, palette, typography, personality, voice)
- Full i18n (es-ES + en-US)
- Mobile-first responsive layout
- ~10 focused commits
