import { describe, expect, it } from 'vitest'
import {
    buildCampaignCsv,
    buildCampaignJson,
    buildExportEntries,
    escapeCsv,
    fileNameFor,
    selectExportable,
    zipFileName,
    type ExportItem,
} from '../export'

const items: ExportItem[] = [
    {
        ref: 'BAU-01',
        status: 'done',
        asset_key: 'https://cdn/uno.png',
        scheduled_at: '2026-08-11T09:30:00+02:00',
        payload: { platform: 'instagram', headline: 'Titular uno', cta: 'Visita la web', hashtags: ['#A', '#B'] },
    },
    { ref: 'BAU-02', status: 'pending', asset_key: null, payload: {} },
    { ref: 'BAU-03', status: 'failed', asset_key: null, payload: {} },
    { ref: 'BAU-04', status: 'done', asset_key: 'https://cdn/cuatro.png', payload: { body: 'Cuerpo' } },
]

describe('selectExportable', () => {
    it('solo incluye las generadas con imagen', () => {
        expect(selectExportable(items).map((i) => i.ref)).toEqual(['BAU-01', 'BAU-04'])
    })

    it('permite descargar un lote a medias', () => {
        const enCurso = items.filter((i) => i.ref !== 'BAU-04')
        expect(selectExportable(enCurso)).toHaveLength(1)
    })
})

describe('fileNameFor', () => {
    it('usa la referencia como nombre', () => {
        expect(fileNameFor('BAU-01')).toBe('BAU-01.png')
    })

    it('sanea caracteres que no valen en un nombre de fichero', () => {
        expect(fileNameFor('BAU 01/raro')).toBe('BAU-01-raro.png')
    })
})

describe('buildExportEntries', () => {
    const entries = buildExportEntries(items)

    it('empareja cada imagen con su referencia y fecha', () => {
        expect(entries[0]).toMatchObject({
            ref: 'BAU-01',
            file: 'BAU-01.png',
            scheduled_at: '2026-08-11T09:30:00+02:00',
            optimized_for: 'instagram',
            headline: 'Titular uno',
            hashtags: ['#A', '#B'],
        })
    })

    it('publica en Facebook e Instagram cuando el lote no lo especifica', () => {
        // Los lotes generados antes de que existiera publish_to no deben
        // exportarse como si fueran de una sola red.
        expect(entries[0].publish_to).toEqual(['facebook', 'instagram'])
    })

    it('respeta las redes indicadas por la campana', () => {
        const result = buildExportEntries([
            { ref: 'X', status: 'done', asset_key: 'u', payload: { publish_to: ['linkedin'] } },
        ])
        expect(result[0].publish_to).toEqual(['linkedin'])
    })

    it('distingue donde se publica de para que red se optimizo', () => {
        const result = buildExportEntries([
            {
                ref: 'X',
                status: 'done',
                asset_key: 'u',
                payload: { platform: 'instagram', publish_to: ['facebook', 'instagram'] },
            },
        ])
        expect(result[0].optimized_for).toBe('instagram')
        expect(result[0].publish_to).toEqual(['facebook', 'instagram'])
    })

    it('deja en null lo que no exista, sin inventar', () => {
        expect(entries[1].headline).toBeNull()
        expect(entries[1].scheduled_at).toBeNull()
        expect(entries[1].hashtags).toEqual([])
    })
})

describe('escapeCsv', () => {
    it('deja pasar lo que no necesita escape', () => {
        expect(escapeCsv('hola')).toBe('hola')
    })

    it('entrecomilla comas y saltos de linea', () => {
        expect(escapeCsv('uno, dos')).toBe('"uno, dos"')
        expect(escapeCsv('linea1\nlinea2')).toBe('"linea1\nlinea2"')
    })

    it('dobla las comillas internas', () => {
        expect(escapeCsv('dijo "hola"')).toBe('"dijo ""hola"""')
    })

    it('convierte vacios en cadena vacia', () => {
        expect(escapeCsv(null)).toBe('')
        expect(escapeCsv(undefined)).toBe('')
    })
})

describe('buildCampaignCsv', () => {
    const csv = buildCampaignCsv(buildExportEntries(items))

    it('empieza con el BOM de UTF-8 para que Excel no rompa los acentos', () => {
        expect(csv.charCodeAt(0)).toBe(0xfeff)
    })

    it('conserva los acentos intactos', () => {
        const conAcentos = buildCampaignCsv(
            buildExportEntries([
                { ref: 'X', status: 'done', asset_key: 'u', payload: { headline: 'Mañana la cuenta atrás' } },
            ]),
        )
        expect(conAcentos).toContain('Mañana la cuenta atrás')
        expect(conAcentos).not.toContain('MaÃ±ana')
    })

    it('empieza por la cabecera', () => {
        expect(csv.replace('﻿', '').split('\r\n')[0]).toBe(
            'ref,file,scheduled_at,publish_to,optimized_for,headline,body,cta,hashtags',
        )
    })

    it('lista las redes de publicacion en su columna', () => {
        expect(csv).toContain('"facebook, instagram"')
    })

    it('incluye una fila por publicacion exportable', () => {
        expect(csv.split('\r\n')).toHaveLength(3)
    })

    it('une los hashtags en una sola celda', () => {
        expect(csv).toContain('#A #B')
    })

    it('escapa un titular con comas sin romper columnas', () => {
        const conComa = buildCampaignCsv(
            buildExportEntries([
                { ref: 'X', status: 'done', asset_key: 'u', payload: { headline: 'Uno, dos y tres' } },
            ]),
        )
        expect(conComa).toContain('"Uno, dos y tres"')
        expect(conComa.split('\r\n')[1].split('","').length).toBeLessThanOrEqual(8)
    })
})

describe('buildCampaignJson', () => {
    it('incluye nombre, total y publicaciones', () => {
        const parsed = JSON.parse(buildCampaignJson('Bauset agosto', buildExportEntries(items)))
        expect(parsed.campaign).toBe('Bauset agosto')
        expect(parsed.total).toBe(2)
        expect(parsed.posts[0].ref).toBe('BAU-01')
    })
})

describe('zipFileName', () => {
    it('deriva un nombre limpio del de campana', () => {
        expect(zipFileName('Bauset · Matrículas agosto 2026')).toBe('bauset-matriculas-agosto-2026.zip')
    })

    it('aguanta nombres vacios o imposibles', () => {
        expect(zipFileName('')).toBe('campana.zip')
        expect(zipFileName('***')).toBe('campana.zip')
    })
})
