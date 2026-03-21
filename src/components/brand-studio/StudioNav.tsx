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
