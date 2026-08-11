'use server';

import { SchemaType } from '@google/generative-ai';
import { getGoogleTextGenerativeModel } from '@/lib/gemini';
import { findGenericNames, parseNameProposals } from '@/lib/style-presets/naming';
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import { ensureUniqueSlug, slugify } from '../../../convex/lib/slug';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { log } from '@/lib/logger';

// Modelo de texto oficial del proyecto (AGENTS.md, regla 14).
const TEXT_MODEL = 'gemini-flash-latest';
// Lotes pequenos: el modelo mantiene mejor la coherencia y un fallo solo
// invalida su propio lote en vez de toda la pasada.
const BATCH_SIZE = 12;

export type StylePresetNameProposal = {
    id: string;
    currentName: string;
    name: string;
    slug: string;
};

type NamingRow = {
    _id: Id<'style_presets'>;
    name: string;
    slug?: string;
    is_active: boolean;
    style_prompt?: string;
    keywords?: string[];
    subject_label?: string;
    lighting?: string;
};

function describePreset(row: NamingRow): string {
    const parts = [
        `id: ${String(row._id)}`,
        `nombre_actual: ${row.name}`,
        row.style_prompt ? `descripcion_estilo: ${row.style_prompt.slice(0, 400)}` : '',
        row.keywords?.length ? `palabras_clave: ${row.keywords.slice(0, 6).join(', ')}` : '',
        row.subject_label && row.subject_label !== 'N/A' ? `sujeto: ${row.subject_label}` : '',
        row.lighting && row.lighting !== 'unknown' ? `iluminacion: ${row.lighting}` : '',
    ].filter(Boolean);

    return parts.join('\n');
}

function buildPrompt(batch: NamingRow[], forbiddenNames: string[]): string {
    return `Eres un director de arte que bautiza estilos visuales para una herramienta de diseno.

Recibes ${batch.length} estilos. Para cada uno, propon un NOMBRE nuevo, corto y distintivo.

Reglas del nombre:
- En castellano, de 2 a 4 palabras (maximo 32 caracteres).
- Debe describir el ACABADO VISUAL concreto, no la categoria generica.
- Nada de nombres vagos como "Comic", "Ilustracion", "Editorial" o "Comercial" a secas: son justo los que estamos sustituyendo. Si el estilo es un comic, concreta que tipo ("Comic tinta gruesa", "Comic pastel suave").
- Cada nombre debe ser UNICO entre los de esta respuesta.
- No repitas ninguno de estos nombres ya usados: ${forbiddenNames.slice(0, 60).join(' | ') || '(ninguno)'}.
- Sin comillas, sin numeracion, sin emojis.

Estilos:
${batch.map((row) => describePreset(row)).join('\n---\n')}

Responde SOLO con un array JSON valido, sin texto alrededor, con esta forma exacta:
[{"id":"<id tal cual>","name":"<nombre propuesto>"}]`;
}

/**
 * Propone (y opcionalmente aplica) nombres descriptivos generados con IA a
 * partir del `style_prompt` que cada preset ya tiene guardado.
 *
 * Por defecto trabaja en modo propuesta y solo sobre los nombres genericos o
 * duplicados: aplicar es una decision explicita de quien revisa.
 */
export async function generateStylePresetNames(
    adminEmail: string,
    options: { apply?: boolean; onlyGeneric?: boolean; limit?: number } = {},
): Promise<{ success: boolean; proposals: StylePresetNameProposal[]; applied: number; error?: string }> {
    const { apply = false, onlyGeneric = true, limit } = options;

    try {
        if (!adminEmail?.trim()) {
            return { success: false, proposals: [], applied: 0, error: 'Admin email requerido.' };
        }

        const rows = (await authedFetchQuery(api.stylePresets.listForNamingForAdmin, {
            admin_email: adminEmail,
        })) as NamingRow[];

        const generic = findGenericNames(rows);
        const targets = rows
            .filter((row) => (onlyGeneric ? generic.has(row.name.trim().toLowerCase()) : true))
            .slice(0, limit && limit > 0 ? limit : undefined);

        if (targets.length === 0) {
            return { success: true, proposals: [], applied: 0 };
        }

        log.info('STYLE PRESET', `Naming IA | objetivos=${targets.length} apply=${apply}`);

        const model = await getGoogleTextGenerativeModel(TEXT_MODEL);

        // Nombres ya validos del catalogo: no queremos que la IA los duplique.
        const usedNames = rows
            .filter((row) => !generic.has(row.name.trim().toLowerCase()))
            .map((row) => row.name);
        const takenSlugs = rows
            .map((row) => row.slug)
            .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);

        const proposals: StylePresetNameProposal[] = [];
        const byId = new Map(targets.map((row) => [String(row._id), row]));

        for (let index = 0; index < targets.length; index += BATCH_SIZE) {
            const batch = targets.slice(index, index + BATCH_SIZE);
            const prompt = buildPrompt(batch, [...usedNames, ...proposals.map((p) => p.name)]);

            let text = '';
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        // Generoso a proposito: el modelo gasta ~2.900 tokens
                        // de este mismo presupuesto en razonamiento interno
                        // (thoughtsTokenCount). Con 4096 algunos lotes salian
                        // truncados y se perdian propuestas en silencio.
                        maxOutputTokens: 8192,
                        // Sin salida estructurada el modelo responde prosa
                        // parafraseando los estilos en vez del array pedido:
                        // comprobado contra datos reales antes de fijarlo asi.
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    id: { type: SchemaType.STRING },
                                    name: { type: SchemaType.STRING },
                                },
                                required: ['id', 'name'],
                            },
                        },
                    },
                });
                text = result.response.text()?.trim() || '';

                // Un lote truncado no lanza excepcion: devuelve JSON a medias y
                // se perderian propuestas sin dejar rastro.
                const finishReason = result.response.candidates?.[0]?.finishReason;
                if (finishReason && finishReason !== 'STOP') {
                    log.warn(
                        'STYLE PRESET',
                        `Naming IA | lote ${index / BATCH_SIZE + 1} terminado por ${finishReason} (respuesta posiblemente incompleta)`,
                    );
                }
            } catch (batchError) {
                log.warn('STYLE PRESET', `Naming IA | lote ${index / BATCH_SIZE + 1} fallido`, batchError);
                continue;
            }

            for (const item of parseNameProposals(text)) {
                const row = byId.get(item.id);
                if (!row) continue;
                if (proposals.some((p) => p.id === item.id)) continue;

                const name = item.name.slice(0, 32);
                const slug = ensureUniqueSlug(slugify(name), [
                    ...takenSlugs.filter((slug) => slug !== row.slug),
                    ...proposals.map((p) => p.slug),
                ]);

                proposals.push({ id: item.id, currentName: row.name, name, slug });
            }
        }

        let applied = 0;
        if (apply) {
            for (const proposal of proposals) {
                await authedFetchMutation(api.stylePresets.update, {
                    admin_email: adminEmail,
                    id: proposal.id as Id<'style_presets'>,
                    name: proposal.name,
                    slug: proposal.slug,
                });
                applied += 1;
            }
            log.success('STYLE PRESET', `Naming IA | aplicados=${applied}`);
        }

        if (proposals.length < targets.length) {
            log.warn(
                'STYLE PRESET',
                `Naming IA | cobertura parcial: ${proposals.length}/${targets.length} propuestas. Vuelve a lanzarlo para completar el resto.`,
            );
        } else {
            log.success('STYLE PRESET', `Naming IA | ${proposals.length}/${targets.length} propuestas generadas`);
        }

        return { success: true, proposals, applied };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido generando nombres.';
        log.error('STYLE PRESET', 'generateStylePresetNames error', error);
        return { success: false, proposals: [], applied: 0, error: message };
    }
}

/**
 * Aplica propuestas ya revisadas. Separado de la generacion para que revisar y
 * aplicar no obligue a volver a llamar al modelo (ni a pagarlo dos veces, ni a
 * arriesgarse a que la segunda tanda proponga otra cosa).
 */
export async function applyStylePresetNames(
    adminEmail: string,
    proposals: StylePresetNameProposal[],
): Promise<{ success: boolean; applied: number; error?: string }> {
    try {
        if (!adminEmail?.trim()) {
            return { success: false, applied: 0, error: 'Admin email requerido.' };
        }

        let applied = 0;
        for (const proposal of proposals) {
            const name = proposal.name?.trim();
            if (!proposal.id || !name) continue;

            await authedFetchMutation(api.stylePresets.update, {
                admin_email: adminEmail,
                id: proposal.id as Id<'style_presets'>,
                name,
                slug: proposal.slug?.trim() || slugify(name),
            });
            applied += 1;
        }

        log.success('STYLE PRESET', `Naming IA | aplicados=${applied}`);
        return { success: true, applied };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido aplicando nombres.';
        log.error('STYLE PRESET', 'applyStylePresetNames error', error);
        return { success: false, applied: 0, error: message };
    }
}
