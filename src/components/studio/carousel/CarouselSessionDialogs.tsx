'use client'

import { useTranslation } from 'react-i18next'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IndeterminateProgressBar } from '@/components/studio/shared/IndeterminateProgressBar'
import {
    STUDIO_DECISION_BUTTON_CLASS,
    STUDIO_DECISION_DIALOG_CLASS,
    STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS,
    STUDIO_DECISION_DIALOG_FOOTER_CLASS,
    STUDIO_DECISION_DIALOG_HEADER_CLASS,
    STUDIO_DECISION_DIALOG_TITLE_CLASS,
} from '@/components/studio/shared/dialogStyles'
import type { SessionDecisionModalState } from './CarouselControlsPanel.types'

export function UnsavedNavigationDialog({
    open,
    isResolving,
    onCancel,
    onDiscard,
    onSave,
}: {
    open: boolean
    isResolving: boolean
    onCancel: () => void
    onDiscard: () => void
    onSave: () => void | Promise<void>
}) {
    const { t } = useTranslation('carousel')

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !isResolving) {
                    onCancel()
                }
            }}
        >
            <DialogContent
                className={STUDIO_DECISION_DIALOG_CLASS}
                showCloseButton={!isResolving}
                onEscapeKeyDown={(event) => {
                    if (isResolving) event.preventDefault()
                }}
                onPointerDownOutside={(event) => {
                    if (isResolving) event.preventDefault()
                }}
                onInteractOutside={(event) => {
                    if (isResolving) event.preventDefault()
                }}
            >
                <DialogHeader className={STUDIO_DECISION_DIALOG_HEADER_CLASS}>
                    <DialogTitle className={STUDIO_DECISION_DIALOG_TITLE_CLASS}>{t('ui.unsavedDialogTitle')}</DialogTitle>
                    <DialogDescription className={STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS}>
                        {t('ui.unsavedDialogDescription')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className={STUDIO_DECISION_DIALOG_FOOTER_CLASS}>
                    <Button
                        variant="outline"
                        className={STUDIO_DECISION_BUTTON_CLASS}
                        onClick={onCancel}
                        disabled={isResolving}
                    >
                        {t('ui.cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        className={STUDIO_DECISION_BUTTON_CLASS}
                        onClick={onDiscard}
                        disabled={isResolving}
                    >
                        {t('ui.discardLeave')}
                    </Button>
                    <Button
                        className={STUDIO_DECISION_BUTTON_CLASS}
                        onClick={() => void onSave()}
                        disabled={isResolving}
                    >
                        {t('ui.saveLeave')}
                    </Button>
                </DialogFooter>
                {isResolving ? <IndeterminateProgressBar className="mx-6 mb-6 mt-1" /> : null}
            </DialogContent>
        </Dialog>
    )
}

export function SessionDecisionDialog({
    state,
    onClose,
}: {
    state: SessionDecisionModalState
    onClose: (decision: string | null) => void
}) {
    return (
        <Dialog
            open={state.open}
            onOpenChange={(open) => {
                if (!open) {
                    onClose(null)
                }
            }}
        >
            <DialogContent className={STUDIO_DECISION_DIALOG_CLASS}>
                <DialogHeader className={STUDIO_DECISION_DIALOG_HEADER_CLASS}>
                    <DialogTitle className={STUDIO_DECISION_DIALOG_TITLE_CLASS}>{state.title}</DialogTitle>
                    <DialogDescription className={STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS}>{state.description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className={STUDIO_DECISION_DIALOG_FOOTER_CLASS}>
                    {state.buttons.map((button) => (
                        <Button
                            key={button.id}
                            variant={button.variant || 'default'}
                            className={STUDIO_DECISION_BUTTON_CLASS}
                            onClick={() => onClose(button.id)}
                        >
                            {button.label}
                        </Button>
                    ))}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
