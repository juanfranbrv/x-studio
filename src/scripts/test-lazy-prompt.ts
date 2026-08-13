
// Load environment variables FIRST (Node.js 20+)
try {
    process.loadEnvFile('.env.local')
    console.log('✅ Loaded .env.local')
} catch (e) {
    console.warn('⚠️ Could not load .env.local file. Ensure environment variables are set.')
}

const TEST_CASES = [
    {
        text: "Oferta de verano 50% en zapatillas running",
        intentId: 'oferta',
        expected: { headline: 'OFERTA DE VERANO', cta: 'COMPRAR' }
    },
    {
        text: "Webinar sobre Inteligencia Artificial este Jueves a las 19h con Juan Pérez",
        intentId: 'evento',
        expected: { headline: 'WEBINAR SOBRE IA', custom: { fecha: 'Jueves 19h' } }
    },
    {
        text: "La creatividad es la inteligencia divirtiéndose - Albert Einstein",
        intentId: 'cita',
        expected: { headline: 'LA CREATIVIDAD ES...', custom: { autor: 'Albert Einstein' } }
    },
    {
        text: "Aviso importante: Nuestras oficinas cerrarán por vacaciones en Agosto",
        intentId: 'comunicado',
        expected: { headline: 'AVISO IMPORTANTE' }
    }
]

async function runTests() {
    console.log('🧪 Starting Lazy Prompt Tests...\n')

    try {
        // Dynamic imports to ensure env vars are available to valid module side-effects
        const { parseLazyIntentAction } = await import('@/app/actions/parse-intent')
        const { INTENT_CATALOG } = await import('@/lib/creation-flow-types')

        for (const test of TEST_CASES) {
            const intent = INTENT_CATALOG.find((i: any) => i.id === test.intentId)
            if (!intent) {
                console.error(`❌ Intent not found: ${test.intentId}`)
                continue
            }

            console.log(`📝 Testing Intent: ${intent.name}`)
            console.log(`   Input: "${test.text}"`)

            try {
                const result = await parseLazyIntentAction({
                    userText: test.text,
                    brandId: process.env.TEST_BRAND_ID || 'test-brand-id',
                    brandDNA: { brand_name: "Acme Corp" } as any,
                    intentId: intent.id,
                })

                if (result.error) {
                    console.error(`   ❌ Error: ${result.error}`)
                } else {
                    console.log(`   ✅ Success!`)
                    console.log(`      Headline: "${result.headline}"`)
                    console.log(`      CTA: "${result.cta}"`)
                    if (result.customTexts) {
                        console.log(`      Custom: ${JSON.stringify(result.customTexts)}`)
                    }
                }
            } catch (e) {
                console.error(`   ❌ System Error:`, e)
            }
            console.log('\n-----------------------------------\n')
        }
    } catch (err) {
        console.error('Failed to import modules or run tests:', err)
    }
}

// Run the tests
runTests()
