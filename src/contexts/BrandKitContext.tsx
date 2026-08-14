'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getAllUserBrandKits, getUserBrandKitById } from '@/app/actions/get-user-brand-kit'
import { deleteBrandKit } from '@/app/actions/delete-brand-kit'
import { updateUserBrandKit } from '@/app/actions/update-user-brand-kit'
import type { BrandKitSummary, BrandDNA } from '@/lib/brand-types'
import { getCanonicalBrandId } from '@/lib/brand-kit-identity'

interface BrandKitContextType {
    activeBrandKit: BrandDNA | null
    brandKits: BrandKitSummary[]
    loading: boolean
    /** True while background recovery retries are still pending after initial load found no kits */
    isRecovering: boolean
    /** True when load failed due to a server error (as opposed to success but empty kits) */
    loadError: boolean
    /**
     * True SOLO cuando una lectura satisfactoria confirmó que el usuario no tiene
     * kits (data:[]) y se agotaron los reintentos de recuperación. Es la única
     * señal con la que se puede redirigir al hub de Brand Kit. Un vacío
     * transitorio (token/identidad no lista) NUNCA pone esto a true.
     */
    confirmedEmpty: boolean
    setActiveBrandKit: (id: string, shouldPersist?: boolean, allowFallback?: boolean) => Promise<boolean>
    reloadBrandKits: (isSilent?: boolean) => Promise<void>
    deleteBrandKitById: (id: string) => Promise<void>
    updateActiveBrandKit: (data: Partial<BrandDNA>) => Promise<boolean>
    syncActiveBrandKit: (data: BrandDNA) => void
}

const BrandKitContext = createContext<BrandKitContextType | undefined>(undefined)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const EMPTY_BRANDKIT_RECOVERY_DELAYS_MS = [1200, 2500, 4500, 7000, 10000]
/**
 * Nº de reintentos de fondo antes de CONFIRMAR "sin kits" cuando la lectura
 * tuvo éxito pero devolvió 0 (caso usuario nuevo real). Tras el blindaje del
 * token (Eje 1) un éxito-vacío es fiable, así que basta con pocas confirmaciones
 * para no hacer esperar de más a un usuario realmente sin kits. Un FALLO
 * (transitorio/servidor) NO usa este umbral: sigue reintentando toda la tanda
 * sin confirmar vacío jamás.
 */
const EMPTY_CONFIRM_AFTER_ATTEMPTS = 2

export function BrandKitProvider({ children }: { children: ReactNode }) {
    const { user, isLoaded } = useUser()
    const [activeBrandKit, setActiveBrandKitState] = useState<BrandDNA | null>(null)
    const [brandKits, setBrandKits] = useState<BrandKitSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [isRecovering, setIsRecovering] = useState(false)
    /** True when the last load attempt failed with a server error (vs. success but no kits) */
    const [loadError, setLoadError] = useState(false)
    /** Ver doc en BrandKitContextType.confirmedEmpty */
    const [confirmedEmpty, setConfirmedEmpty] = useState(false)

    const userRecord = useQuery(api.users.getUser, user?.id ? { clerk_id: user.id } : 'skip')
    const updateLastBrand = useMutation(api.users.setCurrentBrand)
    const upsertUser = useMutation(api.users.upsertUser)

    const initialLoadAttempted = useRef(false)
    const activeSelectionHealing = useRef(false)
    const initializedUserIdRef = useRef<string | null>(null)
    const loadRequestIdRef = useRef(0)
    const loadInFlightRef = useRef(false)
    const pendingPersistedBrandIdRef = useRef<string | null>(null)
    const backgroundRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const emptyRecoveryAttemptRef = useRef(0)
    /** Resultado de la última lectura: 'empty' (éxito sin kits) vs 'fail' (error/transitorio). */
    const lastLoadOutcomeRef = useRef<'empty' | 'fail'>('empty')
    const loadBrandKitsRef = useRef<(isSilent?: boolean) => Promise<void>>(async () => { })
    const setActiveBrandKitRef = useRef<BrandKitContextType['setActiveBrandKit']>(async () => false)

    const clearBackgroundRetry = useCallback(() => {
        if (backgroundRetryTimeoutRef.current) {
            clearTimeout(backgroundRetryTimeoutRef.current)
            backgroundRetryTimeoutRef.current = null
        }
        setIsRecovering(false)
    }, [])

    const scheduleBackgroundRecovery = useCallback(() => {
        if (!user?.id) return
        if (backgroundRetryTimeoutRef.current) return

        const attemptIndex = emptyRecoveryAttemptRef.current

        // Éxito-vacío confirmado pronto: el usuario no tiene kits de verdad.
        if (lastLoadOutcomeRef.current === 'empty' && attemptIndex >= EMPTY_CONFIRM_AFTER_ATTEMPTS) {
            console.log('%c[BrandKitCtx:recovery]', 'color:#f59e0b;font-weight:bold', 'empty confirmed after retries')
            setIsRecovering(false)
            setConfirmedEmpty(true)
            return
        }

        const delay = EMPTY_BRANDKIT_RECOVERY_DELAYS_MS[attemptIndex]
        if (typeof delay !== 'number') {
            // Tanda agotada con la última lectura en FALLO: nunca confirmamos
            // vacío (no redirigimos); dejamos loadError visible con reintento.
            console.warn('%c[BrandKitCtx:recovery]', 'color:#f59e0b;font-weight:bold', 'all background retries exhausted (load kept failing)')
            setIsRecovering(false)
            return
        }

        console.log('%c[BrandKitCtx:recovery]', 'color:#f59e0b;font-weight:bold', `scheduling attempt ${attemptIndex + 1} in ${delay}ms`)
        setIsRecovering(true)
        backgroundRetryTimeoutRef.current = setTimeout(() => {
            backgroundRetryTimeoutRef.current = null
            emptyRecoveryAttemptRef.current += 1
            void loadBrandKitsRef.current(true)
        }, delay)
    }, [user?.id])

    const ensureConvexUser = useCallback(async () => {
        if (!user?.id) return false
        if (userRecord) return true

        const userEmail = user.emailAddresses[0]?.emailAddress
        if (!userEmail) return false

        try {
            await upsertUser({
                clerk_id: user.id,
                email: userEmail,
            })
            return true
        } catch (error) {
            console.warn('[CONTEXT] Could not create user before persisting brand:', error)
            return false
        }
    }, [upsertUser, user?.emailAddresses, user?.id, userRecord])

    const persistCurrentBrandSelection = useCallback(async (brandId: string) => {
        if (!user?.id) return false
        pendingPersistedBrandIdRef.current = brandId

        const canPersist = userRecord ? true : await ensureConvexUser()
        if (!canPersist) {
            if (pendingPersistedBrandIdRef.current === brandId) {
                pendingPersistedBrandIdRef.current = null
            }
            return false
        }

        try {
            const result = await updateLastBrand({ clerk_id: user.id, brandId })
            if (!result?.success) {
                if (pendingPersistedBrandIdRef.current === brandId) {
                    pendingPersistedBrandIdRef.current = null
                }
                console.warn('[CONTEXT] Failed to persist current brand selection:', result)
                return false
            }
            return true
        } catch (error) {
            if (pendingPersistedBrandIdRef.current === brandId) {
                pendingPersistedBrandIdRef.current = null
            }
            console.error('[CONTEXT] Failed to persist last brand:', error)
            return false
        }
    }, [ensureConvexUser, updateLastBrand, user?.id, userRecord])

    const loadBrandKits = useCallback(async (isSilent = false) => {
        const tag = isSilent ? '[BrandKitCtx:bgLoad]' : '[BrandKitCtx:load]'
        const style = 'color:#0ea5e9;font-weight:bold'

        if (!user?.id) {
            console.log(`%c${tag}`, style, 'skip — no user')
            if (!isSilent) setLoading(false)
            return
        }

        if (loadInFlightRef.current) {
            console.log(`%c${tag}`, style, 'skip — already in flight')
            return
        }
        loadInFlightRef.current = true
        const requestId = ++loadRequestIdRef.current

        if (!isSilent) setLoading(true)
        try {
            let result: Awaited<ReturnType<typeof getAllUserBrandKits>> = { success: false, error: 'No data' }
            const retryDelaysMs = [0, 350, 900]
            for (let i = 0; i < retryDelaysMs.length; i++) {
                if (retryDelaysMs[i] > 0) {
                    await wait(retryDelaysMs[i])
                }

                console.log(`%c${tag}`, style, `attempt ${i + 1}/${retryDelaysMs.length} userId=${user.id}`)
                result = await getAllUserBrandKits(user.id)

                if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                    break
                }

                if (i === retryDelaysMs.length - 1) {
                    break
                }
            }

            if (requestId !== loadRequestIdRef.current) {
                console.log(`%c${tag}`, style, 'stale request, bailing out')
                return
            }

            if (result.success && result.data) {
                setLoadError(false)
                setBrandKits(result.data)
                console.log(`%c${tag}`, style, `✓ loaded ${result.data.length} kits`)

                if (result.data.length > 0) {
                    emptyRecoveryAttemptRef.current = 0
                    lastLoadOutcomeRef.current = 'empty'
                    setConfirmedEmpty(false)
                    clearBackgroundRetry()
                } else {
                    console.warn(`%c${tag}`, style, 'success but 0 kits — scheduling background recovery')
                    lastLoadOutcomeRef.current = 'empty'
                    scheduleBackgroundRecovery()
                }

                if (result.data.length > 0 && !activeBrandKit) {
                    if (typeof userRecord === 'undefined') {
                        return
                    }

                    const lastBrandId = pendingPersistedBrandIdRef.current ?? userRecord?.current_brand_id
                    const hasPersistedBrand = Boolean(lastBrandId && result.data.find((b) => b.id === lastBrandId))
                    const brandToSelect = hasPersistedBrand
                        ? (lastBrandId as string)
                        : result.data[0].id

                    const selected = await setActiveBrandKitRef.current(brandToSelect, !hasPersistedBrand)
                    if (!selected && result.data[0]?.id && result.data[0].id !== brandToSelect) {
                        await setActiveBrandKitRef.current(result.data[0].id, true, true)
                    }
                }
            } else {
                const isTransient = result.transient === true
                lastLoadOutcomeRef.current = 'fail'
                // Un fallo transitorio (token/identidad no lista) NO debe pintar la
                // pantalla de error: solo reintentar en silencio. Mantenemos los
                // kits que ya tuviéramos en memoria para no parpadear a vacío.
                setLoadError(!isTransient)
                setConfirmedEmpty(false)
                console.warn(`%c${tag}`, style, `✗ load failed (${isTransient ? 'transient' : 'server-error'}) — scheduling background recovery`, result.error)
                scheduleBackgroundRecovery()
            }
        } catch (error) {
            console.error(`%c${tag}`, style, '✗ exception thrown:', error)
            lastLoadOutcomeRef.current = 'fail'
            setLoadError(true)
            setConfirmedEmpty(false)
            scheduleBackgroundRecovery()
        } finally {
            loadInFlightRef.current = false
            if (!isSilent) setLoading(false)
        }
    }, [user?.id, activeBrandKit, userRecord?.current_brand_id, clearBackgroundRetry, scheduleBackgroundRecovery])

    const setActiveBrandKit = useCallback(async (
        id: string,
        shouldPersist = true,
        allowFallback = true
    ): Promise<boolean> => {
        console.log(`[CONTEXT] Setting active brand kit: ${id} (persist: ${shouldPersist}, fallback: ${allowFallback})`)
        try {
            const result = await getUserBrandKitById(id)
            if (result.success && result.data) {
                setActiveBrandKitState(result.data)

                if (shouldPersist && user?.id) {
                    await persistCurrentBrandSelection(id)
                }

                return true
            }

            if (!allowFallback) return false

            if (brandKits.length > 0) {
                const fallbackId = brandKits[0].id
                if (fallbackId && fallbackId !== id) {
                    const fallback = await getUserBrandKitById(fallbackId)
                    if (fallback.success && fallback.data) {
                        setActiveBrandKitState(fallback.data)
                        if (user?.id) {
                            await persistCurrentBrandSelection(fallbackId)
                        }
                    }
                }
            }

            return false
        } catch (error) {
            console.error('Error loading brand kit:', error)
            return false
        }
    }, [brandKits, persistCurrentBrandSelection, user?.id])

    useEffect(() => {
        loadBrandKitsRef.current = loadBrandKits
    }, [loadBrandKits])

    useEffect(() => {
        setActiveBrandKitRef.current = setActiveBrandKit
    }, [setActiveBrandKit])

    const reloadBrandKits = useCallback(async (isSilent = true) => {
        clearBackgroundRetry()
        emptyRecoveryAttemptRef.current = 0
        setConfirmedEmpty(false)
        await loadBrandKits(isSilent)
    }, [clearBackgroundRetry, loadBrandKits])

    const deleteBrandKitById = async (id: string) => {
        try {
            const result = await deleteBrandKit(id)
            if (result.success) {
                await loadBrandKits()

                if (activeBrandKit?.id === id) {
                    setActiveBrandKitState(null)
                }
            }
        } catch (error) {
            console.error('Error deleting brand kit:', error)
        }
    }

    const updateActiveBrandKit = async (data: Partial<BrandDNA>) => {
        if (!activeBrandKit || !activeBrandKit.id) return false

        const updated = { ...activeBrandKit, ...data }

        try {
            const result = await updateUserBrandKit(activeBrandKit.id, updated)
            if (result.success) {
                setActiveBrandKitState(updated)
                await loadBrandKits(true)
                return true
            }
            return false
        } catch (error) {
            console.error('Error updating active brand kit:', error)
            return false
        }
    }

    const syncActiveBrandKit = (data: BrandDNA) => {
        const id = getCanonicalBrandId(data)
        setActiveBrandKitState(id ? { ...data, id } : data)
    }

    useEffect(() => {
        const nextUserId = user?.id ?? null
        if (initializedUserIdRef.current === nextUserId) return

        initializedUserIdRef.current = nextUserId
        initialLoadAttempted.current = false
        activeSelectionHealing.current = false
        clearBackgroundRetry()
        loadInFlightRef.current = false
        emptyRecoveryAttemptRef.current = 0
        lastLoadOutcomeRef.current = 'empty'
        setActiveBrandKitState(null)
        setBrandKits([])
        setLoadError(false)
        setConfirmedEmpty(false)
        setLoading(Boolean(nextUserId))
    }, [clearBackgroundRetry, user?.id])

    useEffect(() => {
        if (isLoaded && user && !initialLoadAttempted.current) {
            initialLoadAttempted.current = true
            void loadBrandKits()
        }
        if (isLoaded && !user) {
            setLoading(false)
        }
    }, [isLoaded, loadBrandKits, user])

    useEffect(() => {
        if (loading) return
        if (!user?.id) return
        if (!Array.isArray(brandKits) || brandKits.length === 0) return
        if (activeSelectionHealing.current) return

        const lastBrandId = userRecord?.current_brand_id
        const activeId = activeBrandKit?.id
        const resolvedPersistedBrandId = pendingPersistedBrandIdRef.current ?? lastBrandId
        const persistedPreferredId = (resolvedPersistedBrandId && brandKits.some((kit) => kit.id === resolvedPersistedBrandId))
            ? (resolvedPersistedBrandId as string)
            : null
        const hasValidActive = Boolean(activeId && brandKits.some((kit) => kit.id === activeId))
        const hasPersistedMismatch = Boolean(persistedPreferredId && activeId && activeId !== persistedPreferredId)
        if (hasValidActive && !hasPersistedMismatch) return

        const preferredId = persistedPreferredId || brandKits[0].id

        if (!preferredId) return

        activeSelectionHealing.current = true
        void setActiveBrandKit(preferredId, true, true).finally(() => {
            activeSelectionHealing.current = false
        })
    }, [loading, user?.id, brandKits, activeBrandKit?.id, setActiveBrandKit, userRecord?.current_brand_id])

    useEffect(() => {
        if (!user?.id) return

        const shouldHeal = () => {
            if (document.visibilityState !== 'visible') return
            if (loadInFlightRef.current) return
            if (loading) return
            if (brandKits.length > 0) return
            void loadBrandKits(true)
        }

        const handleVisibilityChange = () => shouldHeal()
        const handleFocus = () => shouldHeal()

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
        }
    }, [brandKits.length, loadBrandKits, loading, user?.id])

    useEffect(() => {
        if (!pendingPersistedBrandIdRef.current) return
        if (userRecord?.current_brand_id === pendingPersistedBrandIdRef.current) {
            pendingPersistedBrandIdRef.current = null
        }
    }, [userRecord?.current_brand_id])

    useEffect(() => {
        return () => {
            clearBackgroundRetry()
        }
    }, [clearBackgroundRetry])

    const value: BrandKitContextType = {
        activeBrandKit,
        brandKits,
        loading,
        isRecovering,
        loadError,
        confirmedEmpty,
        setActiveBrandKit,
        reloadBrandKits,
        deleteBrandKitById,
        updateActiveBrandKit,
        syncActiveBrandKit,
    }

    return (
        <BrandKitContext.Provider value={value}>
            {children}
        </BrandKitContext.Provider>
    )
}

export function useBrandKit() {
    const context = useContext(BrandKitContext)
    if (context === undefined) {
        throw new Error('useBrandKit must be used within a BrandKitProvider')
    }
    return context
}
