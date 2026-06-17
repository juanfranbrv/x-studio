import { Button } from '@/components/ui/button'
import { IconClose } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface PreviewEditableTextBlockProps {
    value: string
    placeholder: string
    fontSize: string
    lineHeight: string
    textClassName: string
    frameClassName: string
    actionClassName: string
    removeButtonClassName: string
    touchVisibleActionClass: string
    minWidthCh: number
    maxWidthCh: number
    textWrap?: 'pretty' | 'balance'
    onChange: (value: string) => void
    onDelete: () => void
}

export function PreviewEditableTextBlock({
    value,
    placeholder,
    fontSize,
    lineHeight,
    textClassName,
    frameClassName,
    actionClassName,
    removeButtonClassName,
    touchVisibleActionClass,
    minWidthCh,
    maxWidthCh,
    textWrap = 'pretty',
    onChange,
    onDelete,
}: PreviewEditableTextBlockProps) {
    const measuredValue = value || placeholder || ' '

    return (
        <div className="mx-auto w-fit max-w-full">
            <div className={actionClassName}>
                <div className={frameClassName}>
                    <div
                        aria-hidden="true"
                        className={cn(
                            'invisible pointer-events-none block max-w-full whitespace-pre-wrap break-words text-center align-top',
                            textWrap === 'balance' ? '[text-wrap:balance]' : '[text-wrap:pretty]',
                            textClassName
                        )}
                        style={{
                            fontSize,
                            lineHeight,
                            minWidth: `${minWidthCh}ch`,
                            maxWidth: `min(${maxWidthCh}ch, 100%)`,
                            width: 'fit-content',
                            margin: 0,
                        }}
                    >
                        {measuredValue}
                    </div>
                    <textarea
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder={placeholder}
                        rows={1}
                        className={cn(
                            'absolute inset-0 block h-full w-full bg-transparent border-none p-0 text-center align-top focus:ring-0 resize-none overflow-hidden',
                            textWrap === 'balance' ? '[text-wrap:balance]' : '[text-wrap:pretty]',
                            textClassName
                        )}
                        style={{
                            fontSize,
                            lineHeight,
                            minWidth: `${minWidthCh}ch`,
                            maxWidth: `min(${maxWidthCh}ch, 100%)`,
                        }}
                    />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    aria-label="Eliminar bloque de texto"
                    className={cn(removeButtonClassName, touchVisibleActionClass)}
                >
                    <IconClose className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}
