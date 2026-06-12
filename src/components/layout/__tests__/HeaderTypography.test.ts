import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const headerSource = fs.readFileSync(path.resolve(__dirname, '../Header.tsx'), 'utf8')
const creditsBadgeSource = fs.readFileSync(path.resolve(__dirname, '../CreditsBadge.tsx'), 'utf8')
const languageSwitcherSource = fs.readFileSync(path.resolve(__dirname, '../LanguageSwitcher.tsx'), 'utf8')
const headerDropdownStylesSource = fs.readFileSync(path.resolve(__dirname, '../headerDropdownStyles.ts'), 'utf8')
const settingsManagementSource = fs.readFileSync(path.resolve(__dirname, '../../settings/SettingsManagementSection.tsx'), 'utf8')

describe('Header typography scale', () => {
    it('usa una jerarquía más fluida y evita labels visibles demasiado pequeños', () => {
        expect(headerSource).toContain("text-[clamp(1.26rem,1.08rem+0.62vw,1.72rem)]")
        expect(headerSource).toContain("text-[clamp(1rem,0.96rem+0.2vw,1.08rem)]")
        expect(headerSource).not.toContain("block truncate text-left text-sm font-medium leading-tight md:text-[0.95rem]")

        expect(creditsBadgeSource).toContain("const creditsShortLabel = i18n.language.startsWith('es') ? 'créditos' : 'credits'")
        expect(creditsBadgeSource).toContain("font-mono text-[clamp(1.02rem,0.97rem+0.18vw,1.12rem)]")
        expect(creditsBadgeSource).toContain("rounded-full bg-destructive/12 px-3 py-1.5 text-destructive ring-1 ring-destructive/20")
        // El rediseño canva-style reintrodujo deliberadamente el icono de créditos (IconCoins01).
        expect(creditsBadgeSource).toContain("<IconCoins01")
        expect(headerDropdownStylesSource).toContain("text-[clamp(1rem,0.96rem+0.2vw,1.08rem)]")
        expect(headerDropdownStylesSource).toContain("text-[0.84rem] font-semibold")
        expect(headerSource).toContain("HEADER_DROPDOWN_ITEM_CLASS")
        expect(headerSource).not.toContain("LanguageSwitcher")
        expect(settingsManagementSource).toContain("LanguageSwitcher")
        expect(languageSwitcherSource).toContain("HEADER_DROPDOWN_CONTENT_CLASS")
        expect(languageSwitcherSource).toContain("text-[1rem] font-semibold uppercase tracking-[0.12em]")
        expect(languageSwitcherSource).not.toContain("text-xs font-semibold uppercase tracking-[0.16em]")
    })
})
