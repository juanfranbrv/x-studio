export const INCOMING_PROMPT_STORAGE_KEY = 'x-studio:incoming-prompt'
export const INCOMING_PROMPT_FLAG_STORAGE_KEY = 'x-studio:incoming-prompt-flag'

type StorageLike = Pick<Storage, 'getItem' | 'removeItem'>

export function initializeIncomingPromptTransfer(storage?: StorageLike | null) {
    if (!storage) {
        return {
            prompt: '',
            pendingPrompt: '',
            hasIncomingFlag: false,
        }
    }

    const prompt = storage.getItem(INCOMING_PROMPT_STORAGE_KEY) ?? ''
    const hasIncomingFlag = Boolean(storage.getItem(INCOMING_PROMPT_FLAG_STORAGE_KEY))

    if (prompt) {
        storage.removeItem(INCOMING_PROMPT_STORAGE_KEY)
    }

    return {
        prompt,
        pendingPrompt: prompt,
        hasIncomingFlag,
    }
}

export function resolveDraftPromptAfterBrandReset(pendingPrompt?: string | null) {
    return pendingPrompt ?? ''
}

export function resolvePendingIncomingPrompt(pendingPrompt: string, nextPrompt: string) {
    return pendingPrompt === nextPrompt ? pendingPrompt : ''
}
