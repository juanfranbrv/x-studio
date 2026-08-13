export const MAX_CHARACTERS = 12_000
export const MAX_TITLE = 100
export const MAX_SOURCE_FILENAME = 255
export const MAX_FILE_BYTES = 65_536
export const MAX_PER_BRAND = 20

export const CONTEXT_DOCUMENT_MAX_CHARACTERS = MAX_CHARACTERS
export const CONTEXT_DOCUMENT_MAX_TITLE_CHARACTERS = MAX_TITLE
export const CONTEXT_DOCUMENT_MAX_SOURCE_FILENAME_CHARACTERS = MAX_SOURCE_FILENAME
export const CONTEXT_DOCUMENT_MAX_FILE_BYTES = MAX_FILE_BYTES
export const CONTEXT_DOCUMENT_MAX_PER_BRAND = MAX_PER_BRAND

export type ContextDocumentMetadata = {
    id: string
    brandId: string
    title: string
    sourceFilename?: string
    characterCount: number
    isActive: boolean
    createdAt: string
}

export type ContextAnalysisSignature = {
    brandId: string
    contextDocumentId: string | null
}

export type ValidationResult =
    | { ok: true }
    | {
          ok: false
          error: 'title_required' | 'title_too_long' | 'content_required' | 'content_too_long' | 'source_filename_too_long'
      }

export function countContextCharacters(value: string): number {
    return Array.from(value).length
}

export function validateContextDocument(input: {
    title: string
    content: string
    sourceFilename?: string
}): ValidationResult {
    if (!input.title.trim()) {
        return { ok: false, error: 'title_required' }
    }

    if (countContextCharacters(input.title) > MAX_TITLE) {
        return { ok: false, error: 'title_too_long' }
    }

    if (!input.content.trim()) {
        return { ok: false, error: 'content_required' }
    }

    if (countContextCharacters(input.content) > MAX_CHARACTERS) {
        return { ok: false, error: 'content_too_long' }
    }

    if (input.sourceFilename && countContextCharacters(input.sourceFilename) > MAX_SOURCE_FILENAME) {
        return { ok: false, error: 'source_filename_too_long' }
    }

    return { ok: true }
}

export function isSupportedContextFile(name: string): boolean {
    return /\.(?:md|txt)$/i.test(name)
}

export async function readContextTextFile(
    file: File,
): Promise<{ title: string; content: string; sourceFilename: string }> {
    if (!isSupportedContextFile(file.name)) {
        throw new Error('unsupported_context_file')
    }

    if (file.size > MAX_FILE_BYTES) {
        throw new Error('context_file_too_large')
    }

    const bytes = await file.arrayBuffer()
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const content = decoded.replace(/^\uFEFF/, '')

    return {
        title: file.name.replace(/\.(?:md|txt)$/i, ''),
        content,
        sourceFilename: file.name,
    }
}
