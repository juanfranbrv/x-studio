import { repairJsonString } from '@/lib/json-repair'

export type NamingCandidate = {
    name: string
}

/**
 * Un nombre es "generico" cuando no distingue al estilo de sus hermanos: o se
 * repite en el catalogo, o esta vacio. Devuelve el conjunto de nombres (en
 * minusculas) que merecen rebautizo.
 */
export function findGenericNames(rows: NamingCandidate[]): Set<string> {
    const counts = new Map<string, number>()
    for (const row of rows) {
        const key = (row.name || '').trim().toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
    }

    const generic = new Set<string>()
    for (const [key, count] of counts) {
        if (!key || count > 1) generic.add(key)
    }
    return generic
}

/**
 * Aisla el primer array JSON de un texto, tolerando bloques de codigo y prosa
 * alrededor. No se usa `extractJson` de json-repair porque ese busca objetos
 * (`{`...`}`) y de un array devolveria solo su primer elemento.
 */
export function extractJsonArray(text: string): string {
    const cleaned = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()

    const start = cleaned.indexOf('[')
    if (start === -1) return cleaned

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < cleaned.length; i += 1) {
        const char = cleaned[i]

        if (escaped) {
            escaped = false
            continue
        }
        if (char === '\\') {
            escaped = true
            continue
        }
        if (char === '"') {
            inString = !inString
            continue
        }
        if (inString) continue

        if (char === '[') depth += 1
        else if (char === ']') {
            depth -= 1
            if (depth === 0) return cleaned.substring(start, i + 1)
        }
    }

    return cleaned.substring(start)
}

/**
 * Extrae las parejas {id, name} de la respuesta del modelo, tolerando que
 * venga envuelta en texto o con JSON ligeramente malformado (que es lo
 * habitual). Reutiliza el reparador ya existente del proyecto.
 */
export function parseNameProposals(raw: string): Array<{ id: string; name: string }> {
    const extracted = extractJsonArray(raw || '')
    const candidates = [raw, extracted, repairJsonString(extracted)]

    for (const candidate of candidates) {
        if (!candidate?.trim()) continue
        try {
            const parsed = JSON.parse(candidate)
            if (!Array.isArray(parsed)) continue

            const items = parsed
                .map((item) => ({
                    id: typeof item?.id === 'string' ? item.id.trim() : '',
                    name: typeof item?.name === 'string' ? item.name.trim() : '',
                }))
                .filter((item) => item.id && item.name)

            if (items.length > 0) return items
        } catch {
            // Se prueba con la siguiente estrategia de recuperacion.
        }
    }

    return []
}
