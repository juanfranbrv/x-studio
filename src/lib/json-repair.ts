// Reparacion best-effort de JSON producido por LLMs.
// Helpers puros y autocontenidos extraidos de parse-intent.ts (troceo Fase 2).

export function extractJson(text: string): string {
    // 1. Remove markdown code blocks if present
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()

    // 2. Find the first '{' and the last matching '}'
    const startIdx = cleaned.indexOf('{')
    if (startIdx === -1) return cleaned // Let JSON.parse fail with original string if no {

    let braceCount = 0
    let endIdx = -1

    for (let i = startIdx; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++
        else if (cleaned[i] === '}') braceCount--

        if (braceCount === 0) {
            endIdx = i + 1
            break
        }
    }

    if (endIdx !== -1) {
        return cleaned.substring(startIdx, endIdx)
    }

    return cleaned
}

export function normalizeSmartQuotes(raw: string): string {
    return raw
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u00A0/g, ' ')
}

function stripTrailingCommas(raw: string): string {
    return raw.replace(/,\s*([}\]])/g, '$1')
}

function normalizeSingleQuotedStrings(raw: string): string {
    let result = ''
    let inDouble = false
    let inSingle = false
    let escape = false

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]

        if (inSingle) {
            if (escape) {
                escape = false
                result += ch
                continue
            }
            if (ch === '\\') {
                escape = true
                result += ch
                continue
            }
            if (ch === "'") {
                inSingle = false
                result += '"'
                continue
            }
            result += ch
            continue
        }

        if (inDouble) {
            result += ch
            if (escape) {
                escape = false
            } else if (ch === '\\') {
                escape = true
            } else if (ch === '"') {
                inDouble = false
            }
            continue
        }

        if (ch === "'") {
            inSingle = true
            result += '"'
            continue
        }

        if (ch === '"') {
            inDouble = true
            result += ch
            continue
        }

        result += ch
    }

    return result
}

function escapeNewlinesInStrings(raw: string): string {
    let result = ''
    let inString = false
    let escape = false

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]

        if (inString) {
            if (ch === '\n') {
                result += '\\n'
                continue
            }
            if (ch === '\r') {
                continue
            }
            result += ch
            if (escape) {
                escape = false
            } else if (ch === '\\') {
                escape = true
            } else if (ch === '"') {
                inString = false
            }
            continue
        }

        if (ch === '"') {
            inString = true
            result += ch
            continue
        }

        result += ch
    }

    return result
}

/**
 * Best-effort JSON repair for common LLM formatting failures.
 * Only quotes plain unquoted values after ":" while preserving valid JSON tokens.
 */
export function repairJsonString(raw: string): string {
    let normalized = normalizeSmartQuotes(raw)
    normalized = normalizeSingleQuotedStrings(normalized)
    normalized = escapeNewlinesInStrings(normalized)
    normalized = stripTrailingCommas(normalized)

    let result = ''
    let inString = false
    let escape = false
    let expectingValue = false

    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i]

        if (inString) {
            result += ch
            if (escape) {
                escape = false
            } else if (ch === '\\') {
                escape = true
            } else if (ch === '"') {
                inString = false
            }
            continue
        }

        if (ch === '"') {
            inString = true
            // Un string entrecomillado ES el valor: dejar de esperar valor para no
            // inyectar comillas vacias espurias tras cerrar la cadena.
            expectingValue = false
            result += ch
            continue
        }

        if (expectingValue) {
            if (/\s/.test(ch)) {
                result += ch
                continue
            }

            if (ch === '{' || ch === '[' || ch === '-' || /[0-9]/.test(ch)) {
                expectingValue = false
                result += ch
                continue
            }

            if (ch === 't' || ch === 'f' || ch === 'n') {
                expectingValue = false
                result += ch
                continue
            }

            const start = i
            let end = i
            for (; end < normalized.length; end++) {
                const current = normalized[end]
                if (current === ',' || current === '}' || current === ']') {
                    break
                }
            }

            const rawValue = normalized.slice(start, end).trim()
            const escaped = rawValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
            result += `"${escaped}"`
            expectingValue = false
            i = end - 1
            continue
        }

        if (ch === ':') {
            expectingValue = true
            result += ch
            continue
        }

        result += ch
    }

    return result
}
