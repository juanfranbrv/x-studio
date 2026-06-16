import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  extractContentAssetsFromSessions,
  mergeContentAssetAnnotations,
  parseContentAssetKey,
} from '../contentLibrary.shared'

const schemaSource = fs.readFileSync(
  path.resolve(__dirname, '../schema.ts'),
  'utf8'
)
const contentLibrarySource = fs.readFileSync(
  path.resolve(__dirname, '../contentLibrary.ts'),
  'utf8'
)

describe('content library contract', () => {
  it('declara una tabla de anotaciones editoriales por activo', () => {
    expect(schemaSource).toContain('content_asset_annotations: defineTable({')
    expect(schemaSource).toContain('asset_key: v.string()')
    expect(schemaSource).toContain('.index("by_user_asset", ["user_id", "asset_key"])')
    expect(schemaSource).toContain('.index("by_user_status", ["user_id", "status"])')
    expect(schemaSource).toContain('.index("by_user_planned", ["user_id", "planned_at"])')
  })

  it('soporta clasificacion por campaña (campo + indice)', () => {
    expect(schemaSource).toContain('campaign: v.optional(v.string())')
    expect(schemaSource).toContain('.index("by_user_campaign", ["user_id", "campaign"])')
  })

  it('declara campañas como entidad de primera clase con CRUD', () => {
    expect(schemaSource).toContain('content_campaigns: defineTable({')
    expect(schemaSource).toContain('.index("by_user_name", ["user_id", "name"])')
    expect(contentLibrarySource).toContain('export const listCampaigns = query({')
    expect(contentLibrarySource).toContain('export const createCampaign = mutation({')
    expect(contentLibrarySource).toContain('export const renameCampaign = mutation({')
    expect(contentLibrarySource).toContain('export const deleteCampaign = mutation({')
  })

  it('expone mutaciones bulk para estado, campaña y eliminacion editorial', () => {
    expect(contentLibrarySource).toContain('export const bulkUpdateAnnotations = mutation({')
    expect(contentLibrarySource).toContain('export const bulkSetCampaign = mutation({')
    expect(contentLibrarySource).toContain('export const bulkDeleteAssets = mutation({')
    expect(contentLibrarySource).toContain('asset_keys: v.array(v.string())')
    expect(contentLibrarySource).toContain('sessionGenerations')
    expect(contentLibrarySource).toContain('ctx.db.delete')
  })

  it('extrae imagenes simples desde snapshots de image', () => {
    const assets = extractContentAssetsFromSessions([
      {
        _id: 'session-image-1',
        user_id: 'user-1',
        module: 'image',
        title: 'Oferta junio',
        created_at: '2026-06-10T10:00:00.000Z',
        updated_at: '2026-06-10T11:00:00.000Z',
        active: true,
        snapshot: {
          module: 'image',
          creationFlowState: {
            caption: 'Copy de la campaña',
            selectedPlatform: 'instagram',
            selectedFormat: 'post_4_5',
          },
          sessionGenerations: [
            {
              id: 'gen-1',
              image_url: 'https://cdn.test/full.png',
              preview_image_url: 'https://cdn.test/preview.webp',
              original_image_url: 'https://cdn.test/original.png',
              created_at: '2026-06-10T10:30:00.000Z',
              prompt_used: 'Prompt visual',
              headline: 'Titular',
              cta: 'Reserva',
              caption: 'Copy propio de la imagen',
              platform: 'instagram',
              format: 'post_4_5',
            },
          ],
        },
      },
    ])

    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({
      asset_key: 'image:session-image-1:gen-1',
      type: 'image',
      module: 'image',
      session_id: 'session-image-1',
      session_title: 'Oferta junio',
      preview_url: 'https://cdn.test/preview.webp',
      original_url: 'https://cdn.test/original.png',
      copy: 'Copy propio de la imagen',
      platform: 'instagram',
      format: 'post_4_5',
      status: 'draft',
    })
  })

  it('extrae un carrusel como pieza unica con sus slides', () => {
    const assets = extractContentAssetsFromSessions([
      {
        _id: 'session-carousel-1',
        user_id: 'user-1',
        module: 'carousel',
        title: 'Carrusel ventas',
        created_at: '2026-06-11T10:00:00.000Z',
        updated_at: '2026-06-11T11:00:00.000Z',
        active: true,
        snapshot: {
          module: 'carousel',
          selectedPlatform: 'linkedin',
          aspectRatio: '4:5',
          previewState: {
            caption: 'Caption del carrusel',
            slides: [
              {
                index: 0,
                title: 'Slide 1',
                description: 'Descripción 1',
                imageUrl: 'https://cdn.test/slide-1.png',
                imagePreviewUrl: 'https://cdn.test/slide-1-preview.webp',
              },
              {
                index: 1,
                title: 'Slide 2',
                description: 'Descripción 2',
                imageUrl: 'https://cdn.test/slide-2.png',
              },
            ],
          },
        },
      },
    ])

    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({
      asset_key: 'carousel:session-carousel-1:current',
      type: 'carousel',
      module: 'carousel',
      copy: 'Caption del carrusel',
      slide_count: 2,
      preview_url: 'https://cdn.test/slide-1-preview.webp',
      original_url: 'https://cdn.test/slide-1.png',
    })
    expect(assets[0].slides).toHaveLength(2)
  })

  it('mezcla anotaciones existentes sin duplicar activos', () => {
    const [asset] = extractContentAssetsFromSessions([
      {
        _id: 'session-image-1',
        user_id: 'user-1',
        module: 'image',
        created_at: '2026-06-10T10:00:00.000Z',
        updated_at: '2026-06-10T11:00:00.000Z',
        active: true,
        snapshot: {
          module: 'image',
          sessionGenerations: [
            {
              id: 'gen-1',
              image_url: 'https://cdn.test/full.png',
              created_at: '2026-06-10T10:30:00.000Z',
            },
          ],
        },
      },
    ])

    const merged = mergeContentAssetAnnotations([asset], [
      {
        user_id: 'user-1',
        asset_key: asset.asset_key,
        status: 'ready',
        planned_at: '2026-06-20',
        platform: 'instagram',
        format: 'story_9_16',
        notes: 'Publicar por la mañana',
        created_at: '2026-06-12T10:00:00.000Z',
        updated_at: '2026-06-12T10:00:00.000Z',
      },
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      asset_key: asset.asset_key,
      status: 'ready',
      planned_at: '2026-06-20',
      platform: 'instagram',
      format: 'story_9_16',
      notes: 'Publicar por la mañana',
    })
  })

  it('parsea claves de activo para poder borrar desde work_sessions', () => {
    expect(parseContentAssetKey('image:session-image-1:gen-1')).toEqual({
      module: 'image',
      sessionId: 'session-image-1',
      generationId: 'gen-1',
    })
    expect(parseContentAssetKey('carousel:session-carousel-1:current')).toEqual({
      module: 'carousel',
      sessionId: 'session-carousel-1',
      generationId: 'current',
    })
    expect(parseContentAssetKey('invalid')).toBeNull()
  })
})
