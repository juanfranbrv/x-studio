export function getCopyPromptButtonPresentation(copied: boolean): { label: string; disabled: boolean } {
    return copied
        ? { label: 'Copiado', disabled: true }
        : { label: 'Copiar mega prompt', disabled: false }
}
