import { describe, expect, it } from 'vitest'
import { getCopyPromptButtonPresentation } from '../copy-feedback'

describe('getCopyPromptButtonPresentation', () => {
    it('muestra el estado normal antes de copiar', () => {
        expect(getCopyPromptButtonPresentation(false)).toEqual({ label: 'Copiar mega prompt', disabled: false })
    })

    it('confirma la copia y bloquea temporalmente el botón', () => {
        expect(getCopyPromptButtonPresentation(true)).toEqual({ label: 'Copiado', disabled: true })
    })
})
