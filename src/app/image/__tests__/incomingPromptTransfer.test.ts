import { describe, expect, it } from 'vitest'

import {
    initializeIncomingPromptTransfer,
    resolveDraftPromptAfterBrandReset,
    resolvePendingIncomingPrompt,
} from '../incomingPromptTransfer'

type StorageLike = {
    getItem: (key: string) => string | null
    removeItem: (key: string) => void
}

const createStorage = (seed: Record<string, string>): StorageLike => {
    const data = new Map(Object.entries(seed))

    return {
        getItem: (key: string) => data.get(key) ?? null,
        removeItem: (key: string) => {
            data.delete(key)
        },
    }
}

describe('incoming prompt transfer', () => {
    it('mantiene el prompt transferido como pendiente tras leerlo del storage', () => {
        const storage = createStorage({
            'x-studio:incoming-prompt': 'Prompt traido desde carrusel',
            'x-studio:incoming-prompt-flag': '1',
        })

        const transfer = initializeIncomingPromptTransfer(storage)

        expect(transfer.prompt).toBe('Prompt traido desde carrusel')
        expect(transfer.pendingPrompt).toBe('Prompt traido desde carrusel')
        expect(transfer.hasIncomingFlag).toBe(true)
        expect(storage.getItem('x-studio:incoming-prompt')).toBeNull()
        expect(storage.getItem('x-studio:incoming-prompt-flag')).toBe('1')
    })

    it('reinyecta el prompt pendiente despues de un reset de brand kit', () => {
        expect(resolveDraftPromptAfterBrandReset('Prompt traido desde carrusel')).toBe('Prompt traido desde carrusel')
        expect(resolveDraftPromptAfterBrandReset('')).toBe('')
    })

    it('solo limpia el prompt pendiente cuando el usuario lo sustituye por otro texto', () => {
        expect(resolvePendingIncomingPrompt('Prompt traido desde carrusel', 'Prompt traido desde carrusel')).toBe('Prompt traido desde carrusel')
        expect(resolvePendingIncomingPrompt('Prompt traido desde carrusel', 'Nuevo prompt manual')).toBe('')
        expect(resolvePendingIncomingPrompt('Prompt traido desde carrusel', '')).toBe('')
    })
})
