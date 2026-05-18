import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import commonEs from '@/locales/es-ES/common.json'
import commonEn from '@/locales/en-US/common.json'
import authEs from '@/locales/es-ES/auth.json'
import authEn from '@/locales/en-US/auth.json'
import homeEs from '@/locales/es-ES/home.json'
import homeEn from '@/locales/en-US/home.json'
import settingsEs from '@/locales/es-ES/settings.json'
import settingsEn from '@/locales/en-US/settings.json'
import videoEs from '@/locales/es-ES/video.json'
import videoEn from '@/locales/en-US/video.json'
import imageEs from '@/locales/es-ES/image.json'
import imageEn from '@/locales/en-US/image.json'
import carouselEs from '@/locales/es-ES/carousel.json'
import carouselEn from '@/locales/en-US/carousel.json'
import brandKitEs from '@/locales/es-ES/brandKit.json'
import brandKitEn from '@/locales/en-US/brandKit.json'
import legalEs from '@/locales/es-ES/legal.json'
import legalEn from '@/locales/en-US/legal.json'
import billingEs from '@/locales/es-ES/billing.json'
import billingEn from '@/locales/en-US/billing.json'
import brandStudioEs from '@/locales/es-ES/brandStudio.json'
import brandStudioEn from '@/locales/en-US/brandStudio.json'
import academyEs from '@/locales/es-ES/academy.json'
import academyEn from '@/locales/en-US/academy.json'
import { AppLocale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, normalizeLocale, SUPPORTED_LOCALES } from '@/locales/config'

export const resources = {
    'es-ES': {
        common: commonEs,
        auth: authEs,
        home: homeEs,
        settings: settingsEs,
        video: videoEs,
        image: imageEs,
        carousel: carouselEs,
        brandKit: brandKitEs,
        legal: legalEs,
        billing: billingEs,
        brandStudio: brandStudioEs,
        academy: academyEs,
    },
    'en-US': {
        common: commonEn,
        auth: authEn,
        home: homeEn,
        settings: settingsEn,
        video: videoEn,
        image: imageEn,
        carousel: carouselEn,
        brandKit: brandKitEn,
        legal: legalEn,
        billing: billingEn,
        brandStudio: brandStudioEn,
        academy: academyEn,
    },
} as const

export const I18N_NAMESPACES = ['common', 'auth', 'home', 'settings', 'video', 'image', 'carousel', 'brandKit', 'legal', 'billing', 'brandStudio', 'academy'] as const

function readNestedValue(source: unknown, dottedKey: string): string | null {
    if (!source || !dottedKey) return null
    const value = dottedKey.split('.').reduce<unknown>((acc, segment) => {
        if (!acc || typeof acc !== 'object' || !(segment in acc)) return null
        return (acc as Record<string, unknown>)[segment]
    }, source)
    return typeof value === 'string' ? value : null
}

function resolveResourceFallback(locale: string, namespace: string, key: string): string | null {
    const normalizedLocale = normalizeLocale(locale)
    const resourceSet = resources[normalizedLocale]
    if (!resourceSet) return null
    const namespaceResource = resourceSet[namespace as keyof typeof resourceSet]
    return readNestedValue(namespaceResource, key)
}

function syncResourceBundles() {
    for (const [locale, namespaces] of Object.entries(resources)) {
        for (const [namespace, bundle] of Object.entries(namespaces)) {
            i18n.addResourceBundle(locale, namespace, bundle, true, true)
        }
    }
}

export function getInitialLocale(): AppLocale {
    if (typeof window === 'undefined') return DEFAULT_LOCALE

    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored) return normalizeLocale(stored)

    return normalizeLocale(window.navigator.language)
}

export async function setAppLocale(locale: string) {
    const normalized = normalizeLocale(locale)
    await i18n.changeLanguage(normalized)

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
        document.documentElement.lang = normalized
        document.documentElement.dir = 'ltr'
    }

    return normalized
}

if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        resources,
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        defaultNS: 'common',
        ns: [...I18N_NAMESPACES],
        interpolation: {
            escapeValue: false,
        },
        parseMissingKeyHandler: (key, defaultValue, options) => {
            const namespace =
                (Array.isArray(options?.ns) ? options?.ns[0] : options?.ns) ||
                (typeof options?.defaultNS === 'string' ? options.defaultNS : undefined) ||
                'common'
            const locale =
                (typeof options?.lng === 'string' && options.lng) ||
                i18n.language ||
                DEFAULT_LOCALE

            const resolved =
                resolveResourceFallback(locale, namespace, key) ||
                resolveResourceFallback(DEFAULT_LOCALE, namespace, key)

            if (resolved) return resolved
            if (typeof defaultValue === 'string' && defaultValue.trim()) return defaultValue
            return key.split('.').pop() || key
        },
    })
} else {
    syncResourceBundles()
}

export default i18n
