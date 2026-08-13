import { describe, expect, it } from 'vitest'
import {
    completeContextAnalysisLatch,
    markContextChanged,
    resolveLegacySignature,
    signaturesMatch,
} from '@/lib/context-analysis-signature'

const noneA = { brandId: 'A', contextDocumentId: null }
const docA = { brandId: 'A', contextDocumentId: 'doc-a' }
const docB = { brandId: 'A', contextDocumentId: 'doc-b' }

describe('context analysis signatures', () => {
    it('compara el Brand Kit aunque ambos documentos sean nulos', () => {
        expect(signaturesMatch(noneA, { brandId: 'B', contextDocumentId: null })).toBe(false)
        expect(signaturesMatch(noneA, { ...noneA })).toBe(true)
    })

    it('adapta snapshots heredados sin documento activo', () => {
        expect(resolveLegacySignature({ persisted: null, current: noneA })).toEqual({
            effectiveSignature: noneA,
            requiresReanalysis: false,
        })
    })

    it('exige reanalizar snapshots heredados si ahora existe documento activo', () => {
        expect(resolveLegacySignature({ persisted: null, current: docA }).requiresReanalysis).toBe(true)
    })

    it('mantiene el latch al volver de B a A hasta un analisis correcto', () => {
        const changedToB = markContextChanged(false, docA, docB)
        const returnedToA = markContextChanged(changedToB, docA, docA)

        expect(changedToB).toBe(true)
        expect(returnedToA).toBe(true)
        expect(completeContextAnalysisLatch({
            latched: returnedToA,
            requested: docA,
            used: docA,
            current: docA,
            succeeded: true,
        })).toBe(false)
    })

    it('marca como obsoleto un documento eliminado', () => {
        expect(markContextChanged(false, docA, noneA)).toBe(true)
    })

    it('no limpia el latch si cambia el contexto durante la respuesta', () => {
        expect(completeContextAnalysisLatch({
            latched: true,
            requested: docA,
            used: docA,
            current: docB,
            succeeded: true,
        })).toBe(true)
    })

    it('no limpia el latch tras un fallo ni con una firma usada distinta', () => {
        expect(completeContextAnalysisLatch({
            latched: true,
            requested: docA,
            used: docB,
            current: docA,
            succeeded: true,
        })).toBe(true)
        expect(completeContextAnalysisLatch({
            latched: true,
            requested: docA,
            used: docA,
            current: docA,
            succeeded: false,
        })).toBe(true)
    })
})
