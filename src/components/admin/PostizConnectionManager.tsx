'use client'

import { useEffect, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'

import { api } from '@/../convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/spinner'
import { IconCheckCircle, IconLink, IconSave } from '@/components/ui/icons'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/utils'

interface PostizConnectionManagerProps {
    clerkUserId: string
}

type TestResult =
    | { ok: true; count: number }
    | { ok: false; error: string }

export function PostizConnectionManager({ clerkUserId }: PostizConnectionManagerProps) {
    const { toast } = useToast()
    const status = useQuery(api.postizAccounts.getStatus, { clerk_user_id: clerkUserId })
    const saveConnection = useMutation(api.postizAccounts.save)
    const listChannels = useAction(api.postiz.listChannels)

    const [baseUrl, setBaseUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<TestResult | null>(null)

    // Precarga la direccion guardada en cuanto llega la consulta. La clave
    // nunca llega del servidor (getStatus no la devuelve), asi que el campo
    // de clave siempre arranca vacio.
    useEffect(() => {
        if (status?.base_url !== undefined) {
            setBaseUrl(status.base_url)
        }
    }, [status?.base_url])

    const isConfigured = Boolean(status?.configured)

    const handleSave = async () => {
        const trimmedBaseUrl = baseUrl.trim()
        if (!trimmedBaseUrl) {
            setSaveError('Indica la direccion de tu instancia de Postiz.')
            return
        }
        if (!isConfigured && !apiKey.trim()) {
            setSaveError('La clave de API es obligatoria para la primera conexion.')
            return
        }

        setSaving(true)
        setSaveError(null)
        setSaveSuccess(false)
        try {
            await saveConnection({
                clerk_user_id: clerkUserId,
                base_url: trimmedBaseUrl,
                api_key: apiKey.trim() || undefined,
            })
            setApiKey('')
            setSaveSuccess(true)
            setTestResult(null)
            toast({ title: 'Conexion a Postiz guardada' })
        } catch (error) {
            setSaveError(getErrorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const result = await listChannels({})
            if (result.ok) {
                setTestResult({ ok: true, count: result.channels.length })
            } else {
                setTestResult({ ok: false, error: result.error })
            }
        } catch (error) {
            setTestResult({ ok: false, error: getErrorMessage(error) })
        } finally {
            setTesting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <IconLink className="h-4 w-4" />
                            Conexion con Postiz
                        </CardTitle>
                        <CardDescription>
                            Credenciales para programar publicaciones desde el lienzo. La clave de API nunca se muestra una vez guardada.
                        </CardDescription>
                    </div>
                    {status === undefined ? (
                        <Loader2 className="h-4 w-4" />
                    ) : (
                        <Badge variant={isConfigured ? 'default' : 'secondary'}>
                            {isConfigured ? 'Conectado' : 'Sin configurar'}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isConfigured && status?.base_url && (
                    <p className="text-sm text-muted-foreground">
                        Instancia guardada actualmente: <span className="font-medium text-foreground">{status.base_url}</span>
                    </p>
                )}

                <div className="space-y-2">
                    <Label htmlFor="postiz-base-url">Direccion de la instancia</Label>
                    <Input
                        id="postiz-base-url"
                        value={baseUrl}
                        onChange={(event) => setBaseUrl(event.target.value)}
                        placeholder="https://postiz.tudominio.com"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="postiz-api-key">Clave de API</Label>
                    <Input
                        id="postiz-api-key"
                        type="password"
                        value={apiKey}
                        onChange={(event) => setApiKey(event.target.value)}
                        placeholder={isConfigured ? 'Dejar en blanco para no cambiarla' : 'Clave de API de Postiz'}
                        autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                        {isConfigured
                            ? 'Si escribes una clave nueva, sustituira a la guardada en cuanto pulses Guardar.'
                            : 'Se guarda cifrada en Convex y nunca se vuelve a mostrar en pantalla.'}
                    </p>
                </div>

                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                {saveSuccess && !saveError && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <IconCheckCircle className="h-4 w-4" />
                        Guardado correctamente.
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => void handleSave()} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4" /> : <IconSave className="h-4 w-4" />}
                        {saving ? 'Guardando...' : 'Guardar conexion'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleTest()} disabled={testing} className="gap-2">
                        {testing ? <Loader2 className="h-4 w-4" /> : <IconLink className="h-4 w-4" />}
                        {testing ? 'Probando...' : 'Probar conexion'}
                    </Button>
                </div>

                {testResult && (
                    testResult.ok ? (
                        <p className="text-sm text-muted-foreground">
                            Conexion correcta: se encontraron {testResult.count} canal{testResult.count === 1 ? '' : 'es'} disponible{testResult.count === 1 ? '' : 's'}.
                        </p>
                    ) : (
                        <p className="text-sm text-destructive">{testResult.error}</p>
                    )
                )}
            </CardContent>
        </Card>
    )
}
