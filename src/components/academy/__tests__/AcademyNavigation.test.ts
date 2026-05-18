import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sidebarSource = fs.readFileSync(path.resolve(__dirname, '../../layout/Sidebar.tsx'), 'utf8')
const mobileMenuSource = fs.readFileSync(path.resolve(__dirname, '../../layout/MobileMenu.tsx'), 'utf8')
const mobileNavSource = fs.readFileSync(path.resolve(__dirname, '../../layout/MobileNav.tsx'), 'utf8')
const landingSource = fs.readFileSync(path.resolve(__dirname, '../../../app/page.tsx'), 'utf8')
const commonEsSource = fs.readFileSync(path.resolve(__dirname, '../../../locales/es-ES/common.json'), 'utf8')
const homeEsSource = fs.readFileSync(path.resolve(__dirname, '../../../locales/es-ES/home.json'), 'utf8')

describe('academy navigation integration', () => {
    it('engancha Academy en navegacion interna y landing', () => {
        expect(sidebarSource).toContain("{ icon: IconFileText, label: t('nav.academy'), href: '/academy' }")
        expect(mobileMenuSource).toContain("{ icon: IconFileText, label: 'nav.academy', href: '/academy' }")
        expect(mobileNavSource).toContain("{ icon: IconFileText, label: 'nav.academy', href: '/academy' }")
        expect(landingSource).toContain("{ href: '/academy', label: t('footer.academy') }")
        expect(commonEsSource).toContain('"academy": "Academy"')
        expect(homeEsSource).toContain('"academy": "Academy"')
        expect(homeEsSource).toContain('"academy": "Academy"')
    })
})
