import type { ContextAnalysisSignature } from '@/lib/context-documents'

export function signaturesMatch(
    left: ContextAnalysisSignature | null | undefined,
    right: ContextAnalysisSignature | null | undefined,
): boolean {
    if (!left || !right) return false
    return left.brandId === right.brandId && left.contextDocumentId === right.contextDocumentId
}

export function resolveLegacySignature({
    persisted,
    current,
}: {
    persisted: ContextAnalysisSignature | null | undefined
    current: ContextAnalysisSignature
}): { effectiveSignature: ContextAnalysisSignature; requiresReanalysis: boolean } {
    if (persisted) {
        return {
            effectiveSignature: persisted,
            requiresReanalysis: !signaturesMatch(persisted, current),
        }
    }

    return {
        effectiveSignature: current,
        requiresReanalysis: current.contextDocumentId !== null,
    }
}

export function markContextChanged(
    latched: boolean,
    analyzed: ContextAnalysisSignature | null | undefined,
    current: ContextAnalysisSignature,
): boolean {
    return latched || (!!analyzed && !signaturesMatch(analyzed, current))
}

export function completeContextAnalysisLatch({
    latched,
    requested,
    used,
    current,
    succeeded,
}: {
    latched: boolean
    requested: ContextAnalysisSignature
    used: ContextAnalysisSignature | null | undefined
    current: ContextAnalysisSignature
    succeeded: boolean
}): boolean {
    if (!succeeded) return latched
    if (!signaturesMatch(requested, used) || !signaturesMatch(used, current)) return true
    return false
}
