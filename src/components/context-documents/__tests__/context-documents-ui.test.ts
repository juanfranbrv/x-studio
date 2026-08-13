import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) => readFileSync(`src/components/context-documents/${name}`, 'utf8')

describe('contrato compartido de UI de documentos de contexto', () => {
    it('usa un control sutil, accesible y compartido', () => {
        const control = read('ContextDocumentAnalysisControl.tsx')
        expect(control).toContain("import { FileText } from 'lucide-react'")
        expect(control).toContain('variant="ghost"')
        expect(control).toContain('<Tooltip>')
        expect(control).toContain('aria-label={label}')
        expect(control).toContain('<span className="sr-only">')
    })

    it('el selector permite activar, dejar de usar y ver', () => {
        const selector = read('ContextDocumentSelectorDialog.tsx')
        expect(selector).toContain('context.activate(documentId)')
        expect(selector).toContain('context.deactivate(documentId)')
        expect(selector).toContain('setViewerDocumentId(document.id)')
        expect(selector).toContain('disabled={Boolean(context.pendingAction)}')
    })

    it('el visor mantiene la función futura desactivada', () => {
        const viewer = read('ContextDocumentViewerDialog.tsx')
        expect(viewer).toContain('variant="outline" disabled')
        expect(viewer).toContain("t('contextDocuments.analyzeFuture')")
        expect(viewer).toContain("t('contextDocuments.comingSoon')")
    })

    it('el gestor cubre alta, importación, cuota, activación y borrado confirmado', () => {
        const manager = read('ContextDocumentsManager.tsx')
        expect(manager).toContain('readContextTextFile(file)')
        expect(manager).toContain('CONTEXT_DOCUMENT_MAX_PER_BRAND')
        expect(manager).toContain('context.create({ title, content, sourceFilename })')
        expect(manager).toContain('context.activate(documentId)')
        expect(manager).toContain('<AlertDialog')
    })

    it('mantiene el editor importado dentro del viewport y el pie siempre accesible', () => {
        const manager = read('ContextDocumentsManager.tsx')
        expect(manager).toContain('max-h-[calc(100dvh-2rem)]')
        expect(manager).toContain('min-h-0 flex-1 overflow-y-auto')
        expect(manager).toContain('field-sizing-fixed')
        expect(manager).toContain('<DialogFooter className="shrink-0">')
    })

    it('se monta en ambos SectionHeader y bajo BrandContextCard', () => {
        const image = readFileSync('src/components/studio/ControlsPanel.tsx', 'utf8')
        const carousel = readFileSync('src/components/studio/carousel/CarouselControlsPanel.tsx', 'utf8')
        const brand = readFileSync('src/components/brand-dna/BrandDNABoard.tsx', 'utf8')
        expect(image).toContain('extra={(')
        expect(image).toContain('<ContextDocumentAnalysisControl')
        expect(carousel).toContain('<ContextDocumentAnalysisControl')
        expect(brand.indexOf('<ContextDocumentsManager')).toBeGreaterThan(brand.indexOf('<BrandContextCard'))
    })
})
