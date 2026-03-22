'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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
import { WIZARD_SECONDARY_BUTTON, WIZARD_GHOST_BUTTON, WIZARD_CTA_BUTTON } from './brandStudioStyles'

interface StudioNavProps {
  canGoBack: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  onExit: () => void
  nextDisabled?: boolean
  nextLabel?: string
  showSidebar?: boolean
}

export function StudioNav({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onExit,
  nextDisabled = false,
  nextLabel,
  showSidebar = false,
}: StudioNavProps) {
  const { t } = useTranslation('brandStudio')

  return (
    <div className={cn(
      "fixed bottom-0 right-0 z-50 border-t border-border/30 bg-background/80 backdrop-blur-sm",
      showSidebar ? "left-0 lg:left-[340px] xl:left-[380px]" : "left-0"
    )}>
      <div className={cn(
        "mx-auto flex w-full items-center justify-between px-[clamp(1rem,3vw,2rem)] py-[clamp(0.75rem,1.5vh,1.25rem)]",
        !showSidebar && "max-w-7xl px-[clamp(1rem,4vw,3rem)]",
        showSidebar && "lg:px-[clamp(1rem,4vw,3rem)]"
      )}>
      <div>
        {canGoBack ? (
          <Button variant="ghost" onClick={onBack} className={`${WIZARD_GHOST_BUTTON} gap-2`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.back')}</span>
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className={`${WIZARD_GHOST_BUTTON} gap-2`}>
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.exit')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[1.6rem] border-border/70">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('nav.exit')}</AlertDialogTitle>
                <AlertDialogDescription>{t('nav.exitConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={WIZARD_SECONDARY_BUTTON}>{t('nav.exitNo')}</AlertDialogCancel>
                <AlertDialogAction onClick={onExit} className={WIZARD_SECONDARY_BUTTON}>{t('nav.exitYes')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {canGoNext && (
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className={`${WIZARD_CTA_BUTTON} gap-2`}
        >
          <span>{nextLabel ?? t('nav.next')}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
      </div>
    </div>
  )
}
