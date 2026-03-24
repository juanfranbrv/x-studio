'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { IconHold } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import type { SourceType, AnalysisStatus } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_INPUT,
  WIZARD_SECONDARY_BUTTON,
  WIZARD_GHOST_BUTTON,
} from '../brandStudioStyles'

interface LoadingStepProps {
  sourceType: SourceType
  status: AnalysisStatus
  error: string | null
  targetUrl?: string
  instagramHandle?: string
  screenshotUrl?: string
  profilePicUrl?: string
  extractedColors?: string[]
  usedFallback?: boolean
  onCancel: () => void
  onRetry: () => void
  onNext: () => void
  onUrlChange?: (url: string) => void
  onHandleChange?: (handle: string) => void
}

// ── Scan line that sweeps over the browser mockup ───────────
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] z-10"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary)) 80%, transparent 100%)',
        boxShadow: '0 0 16px 4px hsl(var(--primary) / 0.4), 0 0 40px 8px hsl(var(--primary) / 0.15)',
      }}
      animate={{ top: ['8%', '92%', '8%'] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ── Extracted data particles floating out ───────────────────
function DataParticles() {
  const particles = Array.from({ length: 8 })
  return (
    <>
      {particles.map((_, i) => {
        const isLeft = i % 2 === 0
        const size = 4 + Math.random() * 4
        const yStart = 15 + (i / particles.length) * 70
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: `hsl(var(--primary) / ${0.3 + Math.random() * 0.5})`,
              top: `${yStart}%`,
              [isLeft ? 'left' : 'right']: '-2px',
            }}
            animate={{
              x: isLeft ? [-5, -30, -45] : [5, 30, 45],
              y: [0, -15 - Math.random() * 20, -30 - Math.random() * 15],
              opacity: [0, 0.8, 0],
              scale: [0.3, 1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              repeat: Infinity,
              delay: i * 0.4 + Math.random() * 0.5,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </>
  )
}

// ── Browser mockup with scanning animation ──────────────────
function BrowserScanVisual({
  targetUrl,
  screenshotUrl,
  isSuccess,
}: {
  targetUrl?: string
  screenshotUrl?: string
  isSuccess: boolean
}) {
  const displayDomain = targetUrl
    ? targetUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    : ''

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[320px]"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Browser chrome */}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
          </div>
          {displayDomain && (
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1.5 rounded-md bg-background/80 px-3 py-0.5 text-[11px] text-muted-foreground/70">
                <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="8" height="6" rx="1" />
                  <path d="M4 4V3a2 2 0 0 1 4 0v1" />
                </svg>
                <span className="truncate max-w-[160px]">{displayDomain}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content area with scan */}
        <div className="relative" style={{ aspectRatio: '16/10' }}>
          {/* Screenshot or placeholder */}
          {screenshotUrl ? (
            <motion.img
              src={screenshotUrl}
              alt=""
              className="h-full w-full object-cover object-top"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8 }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-muted/20 to-muted/40">
              {/* Skeleton lines */}
              <div className="flex flex-col gap-2.5 p-4">
                <motion.div
                  className="h-3 w-3/4 rounded bg-muted/50"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="h-2 w-full rounded bg-muted/40"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="h-2 w-5/6 rounded bg-muted/40"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
                <div className="mt-2 flex gap-2">
                  <motion.div
                    className="h-12 flex-1 rounded-lg bg-muted/30"
                    animate={{ opacity: [0.15, 0.4, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  />
                  <motion.div
                    className="h-12 flex-1 rounded-lg bg-muted/30"
                    animate={{ opacity: [0.15, 0.4, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
                <motion.div
                  className="h-2 w-2/3 rounded bg-muted/40"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
                />
              </div>
            </div>
          )}

          {/* Scan line overlay */}
          {!isSuccess && <ScanLine />}

          {/* Scan overlay tint */}
          {!isSuccess && (
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--primary) / 0.03) 0%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0.03) 100%)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Subtle green border glow on success — no overlay blocking the screenshot */}
          {isSuccess && (
            <motion.div
              className="absolute inset-0 rounded-b-xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 2px hsl(var(--primary) / 0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </div>
      </div>

      {/* Data particles floating out of the browser */}
      {!isSuccess && <DataParticles />}

      {/* Glow under browser */}
      {!isSuccess && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-8 w-3/4 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  )
}

// ── Instagram visual variant ────────────────────────────────
function InstagramScanVisual({
  isSuccess,
  profilePicUrl,
  extractedColors,
}: {
  isSuccess: boolean
  profilePicUrl?: string
  extractedColors?: string[]
}) {
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[460px]"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-background shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] p-6">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-6">
          {isSuccess && profilePicUrl ? (
            <motion.img
              src={profilePicUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover flex-shrink-0 ring-2 ring-border/40"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-muted/50 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-3.5 w-32 rounded bg-muted/50"
              animate={{ opacity: isSuccess ? 1 : [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: isSuccess ? 0 : Infinity, delay: 0.1 }}
            />
            <motion.div
              className="h-2.5 w-20 rounded bg-muted/40"
              animate={{ opacity: isSuccess ? 1 : [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: isSuccess ? 0 : Infinity, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Color swatches on success, grid skeleton while loading */}
        {isSuccess ? (
          extractedColors && extractedColors.length > 0 ? (
            <motion.div
              className="flex gap-2.5 mt-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {extractedColors.map((color, i) => (
                <motion.div
                  key={i}
                  className="h-16 flex-1 rounded-xl"
                  style={{ backgroundColor: color }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.07 }}
                />
              ))}
            </motion.div>
          ) : (
            <div className="flex gap-2.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 flex-1 rounded-xl bg-muted/30 border border-border/30" />
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div
                key={i}
                className="aspect-square rounded-md bg-muted/60"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        {/* Scan line */}
        {!isSuccess && <ScanLine />}
      </div>

      {!isSuccess && <DataParticles />}
    </motion.div>
  )
}

// ── Scratch visual (creative generation) ────────────────────
function ScratchScanVisual({ isSuccess }: { isSuccess: boolean }) {
  return (
    <motion.div
      className="relative flex h-40 w-40 items-center justify-center mx-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Rotating ring */}
      <motion.svg
        className="absolute inset-0"
        viewBox="0 0 160 160"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <linearGradient id="scratchArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="80" cy="80" r="70"
          fill="none"
          stroke="url(#scratchArc)"
          strokeWidth="2"
          strokeDasharray="110 330"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Counter ring */}
      <motion.svg
        className="absolute inset-0"
        viewBox="0 0 160 160"
        animate={{ rotate: -360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          cx="80" cy="80" r="58"
          fill="none"
          stroke="hsl(var(--primary) / 0.2)"
          strokeWidth="1.5"
          strokeDasharray="60 305"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Center icon */}
      <motion.div
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)]"
        animate={isSuccess ? {} : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isSuccess ? (
          <motion.svg viewBox="0 0 24 24" className="h-7 w-7 text-primary">
            <motion.path
              d="M5 13l4 4L19 7"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          </motion.svg>
        ) : (
          <motion.svg viewBox="0 0 24 24" className="h-7 w-7 text-primary"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path
              d="M12 3L14.5 8.5L21 9.5L16.5 14L17.5 21L12 18L6.5 21L7.5 14L3 9.5L9.5 8.5L12 3Z"
              fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.div>

      {/* Particles */}
      {!isSuccess && <DataParticles />}
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────────────

export function LoadingStep({
  sourceType,
  status,
  error,
  targetUrl,
  instagramHandle,
  screenshotUrl,
  profilePicUrl,
  extractedColors,
  usedFallback,
  onCancel,
  onRetry,
  onNext,
  onUrlChange,
  onHandleChange,
}: LoadingStepProps) {
  const { t } = useTranslation('brandStudio')
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const messages = Array.from({ length: 5 }, (_, i) =>
    t(`loading.messages.${sourceType}.${i + 1}`)
  )

  useEffect(() => {
    if (status !== 'running') return
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [status, messages.length])

  useEffect(() => {
    if (status !== 'running') return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev
        const increment = Math.max(0.3, (92 - prev) * 0.035)
        return Math.min(92, prev + increment)
      })
    }, 200)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    if (status === 'success') setProgress(100)
  }, [status])

  const isError = status === 'error'
  const isSuccess = status === 'success'
  const isWeb = sourceType === 'web' || sourceType === 'both'
  const isInsta = sourceType === 'instagram'

  return (
    <div className={WIZARD_STEP_CONTAINER}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-md flex-col items-center gap-7 text-center"
      >
        {/* ── Visual ─────────────────────────────────────── */}
        {isError ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-32 w-32 items-center justify-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </motion.div>
        ) : isWeb ? (
          <BrowserScanVisual
            targetUrl={targetUrl}
            screenshotUrl={screenshotUrl}
            isSuccess={isSuccess}
          />
        ) : isInsta ? (
          <InstagramScanVisual isSuccess={isSuccess} profilePicUrl={profilePicUrl} extractedColors={extractedColors} />
        ) : (
          <ScratchScanVisual isSuccess={isSuccess} />
        )}

        {/* ── Title + messages ───────────────────────────── */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isError
              ? t('loading.error')
              : isSuccess
                ? t('loading.done')
                : t('loading.title')}
          </h1>

          {!isError && !isSuccess && (
            <div className="h-7">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4 }}
                  className="text-base text-muted-foreground"
                >
                  {messages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <p className="text-base text-muted-foreground">
                {t('loading.doneSubtitle')}
              </p>
              {usedFallback && (
                <p className="text-xs text-muted-foreground/60">
                  {t('loading.fallbackNotice')}
                </p>
              )}
            </motion.div>
          )}

          {isError && (
            <div className="space-y-2">
              {isInsta ? (
                <>
                  {instagramHandle !== undefined && onHandleChange && (
                    <input
                      value={instagramHandle}
                      onChange={(e) => onHandleChange(e.target.value)}
                      placeholder="@tu_cuenta"
                      className={`${WIZARD_INPUT} text-center`}
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {error === 'INSTAGRAM_ACCOUNT_NOT_FOUND'
                      ? t('loading.errorHandleNotFound')
                      : t('loading.errorCheckHandle')}
                  </p>
                </>
              ) : (
                <>
                  {targetUrl !== undefined && onUrlChange && (
                    <input
                      value={targetUrl}
                      onChange={(e) => onUrlChange(e.target.value)}
                      className={`${WIZARD_INPUT} text-center`}
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t('loading.errorCheckUrl')}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Progress bar (only while running) ──────────── */}
        {!isError && !isSuccess && (
          <div className="relative h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.08), transparent)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="relative h-full rounded-full bg-primary"
              style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.4)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* ── Actions ────────────────────────────────────── */}
        <div className="flex justify-center gap-3">
          {isError ? (
            <>
              <Button variant="outline" onClick={onCancel} className={WIZARD_SECONDARY_BUTTON}>
                {t('nav.back')}
              </Button>
              <Button onClick={onRetry} className={WIZARD_SECONDARY_BUTTON}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('loading.retry')}
              </Button>
            </>
          ) : isSuccess ? (
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Button variant="outline" onClick={onCancel} className={WIZARD_SECONDARY_BUTTON}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('nav.back')}
              </Button>
              <Button onClick={onNext} className={WIZARD_SECONDARY_BUTTON}>
                {t('nav.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onCancel} className={WIZARD_GHOST_BUTTON}>
              <IconHold className="mr-2 h-5 w-5 text-current" />
              {t('loading.stop')}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
