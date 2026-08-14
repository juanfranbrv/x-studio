import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    requireCampaignAdmin: vi.fn(),
    authedFetchQuery: vi.fn(),
}))

vi.mock('@/lib/campaign-admin-guard', () => ({
    requireCampaignAdmin: mocks.requireCampaignAdmin,
}))

vi.mock('@/lib/convex-server', () => ({
    authedFetchQuery: mocks.authedFetchQuery,
}))

import { NextRequest } from 'next/server'
import { getFunctionName } from 'convex/server'
import { api } from '@/../convex/_generated/api'
import { GET, POST } from '../route'

const brand = {
    _id: 'brand-1',
    slug: 'marca-prueba',
    brand_name: 'Marca Prueba',
    url: 'https://marca-prueba.example',
    logos: [],
}

const baseBody = {
    brand_id: 'brand-1',
    brief: { objective: 'Preparar una campaña de prueba.' },
}

let activeContextDocument: unknown
let activeContextError: Error | null

function postRequest(body: Record<string, unknown> = baseBody) {
    return new NextRequest('http://localhost/api/v1/campaign-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

describe('campaign-guide context document route', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        activeContextDocument = null
        activeContextError = null
        mocks.requireCampaignAdmin.mockResolvedValue({ ok: true, userId: 'user-1' })
        mocks.authedFetchQuery.mockImplementation(async (query) => {
            const queryName = getFunctionName(query)
            if (queryName === getFunctionName(api.brands.getBrandDNAById)) return brand
            if (queryName === getFunctionName(api.stylePresets.listCatalog)) return []
            if (queryName === getFunctionName(api.brands.listSummariesByClerkId)) return []
            if (queryName === getFunctionName(api.contextDocuments.getActiveForBrand)) {
                if (activeContextError) throw activeContextError
                return activeContextDocument
            }
            throw new Error('Query inesperada en la prueba.')
        })
    })

    it('usa exclusivamente el documento activo del servidor después de resolver la marca', async () => {
        activeContextDocument = {
            _id: 'context-server-1',
            title: 'Contexto del servidor',
            content: 'Contenido autorizado por el servidor.',
        }

        const response = await POST(postRequest({
            ...baseBody,
            contextDocument: {
                id: 'context-client-1',
                title: 'Contexto del cliente',
                content: 'Contenido inyectado por el cliente.',
            },
        }))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.prompt).toContain('Contexto del servidor')
        expect(payload.prompt).toContain('Contenido autorizado por el servidor.')
        expect(payload.prompt).not.toContain('Contexto del cliente')
        expect(payload.prompt).not.toContain('Contenido inyectado por el cliente.')
        const brandCallIndex = mocks.authedFetchQuery.mock.calls.findIndex(
            ([query]) => getFunctionName(query) === getFunctionName(api.brands.getBrandDNAById),
        )
        const contextCallIndex = mocks.authedFetchQuery.mock.calls.findIndex(
            ([query]) => getFunctionName(query) === getFunctionName(api.contextDocuments.getActiveForBrand),
        )
        expect(brandCallIndex).toBeGreaterThanOrEqual(0)
        expect(contextCallIndex).toBeGreaterThan(brandCallIndex)
        expect(mocks.authedFetchQuery.mock.calls[contextCallIndex]?.[1]).toEqual({
            brand_id: 'brand-1',
            clerk_user_id: 'user-1',
        })
    })

    it('omite limpiamente el bloque cuando no hay documento activo', async () => {
        const response = await POST(postRequest())
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.prompt).toContain('## Encargo al agente externo')
        expect(payload.prompt).not.toContain('<context_document>')
        expect(payload.prompt).not.toContain('\n\n\n')
    })

    it('devuelve un error interno sin prompt si falla la consulta de contexto', async () => {
        activeContextError = new Error('Fallo controlado al cargar contexto.')

        const response = await POST(postRequest())
        const payload = await response.json()

        expect(response.status).toBe(500)
        expect(payload.error.code).toBe('internal_error')
        expect(payload).not.toHaveProperty('prompt')
    })

    it('mantiene GET independiente del documento de contexto activo', async () => {
        const response = await GET(new NextRequest('http://localhost/api/v1/campaign-guide'))

        expect(response.status).toBe(200)
        expect(mocks.authedFetchQuery.mock.calls.some(
            ([query]) => getFunctionName(query) === getFunctionName(api.contextDocuments.getActiveForBrand),
        )).toBe(false)
    })
})
