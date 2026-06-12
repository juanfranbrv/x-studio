import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/authz";
import { BASIC_CAROUSEL_TEMPLATES, NARRATIVE_CONTEXTS } from "../src/lib/carousel-structures";
import { PROBLEMA_SOLUCION_COMPOSITIONS } from "../src/lib/prompts/carousel/problema-solucion";
import { ANTES_DESPUES_COMPOSITIONS } from "../src/lib/prompts/carousel/antes-despues";
import { PASO_A_PASO_COMPOSITIONS } from "../src/lib/prompts/carousel/paso-a-paso";
import { LISTA_TIPS_COMPOSITIONS } from "../src/lib/prompts/carousel/lista-tips";
import { TOP_RANKING_COMPOSITIONS } from "../src/lib/prompts/carousel/top-ranking";
import { MITOS_VS_REALIDAD_COMPOSITIONS } from "../src/lib/prompts/carousel/mitos-vs-realidad";
import { ERRORES_COMUNES_COMPOSITIONS } from "../src/lib/prompts/carousel/errores-comunes";
import { FRAMEWORK_PAS_COMPOSITIONS } from "../src/lib/prompts/carousel/framework-pas";
import { COMPARATIVA_PRODUCTOS_COMPOSITIONS } from "../src/lib/prompts/carousel/comparativa-productos";
import { CRONOLOGIA_HISTORIA_COMPOSITIONS } from "../src/lib/prompts/carousel/cronologia-historia";
import { ESTUDIO_CASO_COMPOSITIONS } from "../src/lib/prompts/carousel/estudio-caso";
import { TUTORIAL_HOW_TO_COMPOSITIONS } from "../src/lib/prompts/carousel/tutorial-how-to";
import { CIFRAS_DATO_COMPOSITIONS } from "../src/lib/prompts/carousel/cifras-dato";
import { FRASE_CELEBRE_COMPOSITIONS } from "../src/lib/prompts/carousel/frase-celebre";
import { MEME_HUMOR_COMPOSITIONS } from "../src/lib/prompts/carousel/meme-humor";
import { PROMOCION_OFERTA_COMPOSITIONS } from "../src/lib/prompts/carousel/promocion-oferta";
import { CHECKLIST_DIAGNOSTICO_COMPOSITIONS } from "../src/lib/prompts/carousel/checklist-diagnostico";
import { PREGUNTAS_RESPUESTAS_COMPOSITIONS } from "../src/lib/prompts/carousel/preguntas-respuestas";
import { COMUNICADO_OPERATIVO_COMPOSITIONS } from "../src/lib/prompts/carousel/comunicado-operativo";
import { getCarouselCompositionRecommendation } from "../src/lib/carousel-composition-governance";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

const NARRATIVE_COMPOSITIONS: Record<string, { id: string; name: string; description: string; layoutPrompt: string; iconPrompt: string }[]> = {
    'problema-solucion': PROBLEMA_SOLUCION_COMPOSITIONS,
    'antes-despues': ANTES_DESPUES_COMPOSITIONS,
    'paso-a-paso': PASO_A_PASO_COMPOSITIONS,
    'lista-tips': LISTA_TIPS_COMPOSITIONS,
    'top-ranking': TOP_RANKING_COMPOSITIONS,
    'mitos-vs-realidad': MITOS_VS_REALIDAD_COMPOSITIONS,
    'errores-comunes': ERRORES_COMUNES_COMPOSITIONS,
    'framework-pas': FRAMEWORK_PAS_COMPOSITIONS,
    'comparativa-productos': COMPARATIVA_PRODUCTOS_COMPOSITIONS,
    'cronologia-historia': CRONOLOGIA_HISTORIA_COMPOSITIONS,
    'estudio-caso': ESTUDIO_CASO_COMPOSITIONS,
    'tutorial-how-to': TUTORIAL_HOW_TO_COMPOSITIONS,
    'cifras-dato': CIFRAS_DATO_COMPOSITIONS,
    'frase-celebre': FRASE_CELEBRE_COMPOSITIONS,
    'meme-humor': MEME_HUMOR_COMPOSITIONS,
    'promocion-oferta': PROMOCION_OFERTA_COMPOSITIONS,
    'checklist-diagnostico': CHECKLIST_DIAGNOSTICO_COMPOSITIONS,
    'preguntas-respuestas': PREGUNTAS_RESPUESTAS_COMPOSITIONS,
    'comunicado-operativo': COMUNICADO_OPERATIVO_COMPOSITIONS
};

export const seedDefaults = mutation({
    args: { admin_email: v.string(), force: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const force = args.force ?? false;

        const existingStructures = await ctx.db.query("carousel_structures").collect();
        const existingCompositions = await ctx.db.query("carousel_compositions").collect();
        const structureIds = new Set(existingStructures.map((s) => s.structure_id));
        const compositionIds = new Set(existingCompositions.map((c) => c.composition_id));

        if (!force && (existingStructures.length > 0 || existingCompositions.length > 0)) {
            return { skipped: true, reason: "already-seeded" };
        }

        for (let i = 0; i < NARRATIVE_CONTEXTS.length; i += 1) {
            const ctxItem = NARRATIVE_CONTEXTS[i];
            if (!force && structureIds.has(ctxItem.id)) continue;
            await ctx.db.insert("carousel_structures", {
                structure_id: ctxItem.id,
                name: ctxItem.name,
                summary: ctxItem.summary,
                tension: ctxItem.tension,
                flow: ctxItem.flow,
                proof: ctxItem.proof,
                cta: ctxItem.cta,
                order: i,
                isActive: true,
                created_at: new Date().toISOString()
            });
        }

        for (let i = 0; i < BASIC_CAROUSEL_TEMPLATES.length; i += 1) {
            const item = BASIC_CAROUSEL_TEMPLATES[i];
            if (!force && compositionIds.has(item.baseId)) continue;
            const recommendation = getCarouselCompositionRecommendation({
                composition_id: item.baseId,
                name: item.name,
                description: item.description,
                layoutPrompt: item.layoutPrompt,
                scope: "global",
                mode: "basic",
            });
            await ctx.db.insert("carousel_compositions", {
                composition_id: item.baseId,
                scope: recommendation.suggestedScope,
                mode: recommendation.suggestedMode,
                name: item.name,
                description: item.description,
                layoutPrompt: item.layoutPrompt,
                iconPrompt: item.iconPrompt,
                order: i,
                isActive: true,
                created_at: new Date().toISOString()
            });
        }

        const narrativeIds = Object.keys(NARRATIVE_COMPOSITIONS);
        for (const narrativeId of narrativeIds) {
            const list = NARRATIVE_COMPOSITIONS[narrativeId] || [];
            for (let i = 0; i < list.length; i += 1) {
                const comp = list[i];
                if (!force && compositionIds.has(comp.id)) continue;
                const recommendation = getCarouselCompositionRecommendation({
                    composition_id: comp.id,
                    structure_id: narrativeId,
                    name: comp.name,
                    description: comp.description,
                    layoutPrompt: comp.layoutPrompt,
                    scope: "narrative",
                    mode: "basic",
                });
                await ctx.db.insert("carousel_compositions", {
                    composition_id: comp.id,
                    structure_id: recommendation.suggestedScope === "global" ? undefined : narrativeId,
                    scope: recommendation.suggestedScope,
                    mode: recommendation.suggestedMode,
                    name: comp.name,
                    description: comp.description,
                    layoutPrompt: comp.layoutPrompt,
                    iconPrompt: comp.iconPrompt,
                    order: i,
                    isActive: true,
                    created_at: new Date().toISOString()
                });
            }
        }

        return { success: true };
    }
});

export const ensureDefaultsIfEmpty = mutation({
    args: {},
    handler: async (ctx) => {
        const existingStructures = await ctx.db.query("carousel_structures").collect();
        if (existingStructures.length > 0) {
            return { seeded: false, reason: "already-present" as const };
        }

        for (let i = 0; i < NARRATIVE_CONTEXTS.length; i += 1) {
            const ctxItem = NARRATIVE_CONTEXTS[i];
            await ctx.db.insert("carousel_structures", {
                structure_id: ctxItem.id,
                name: ctxItem.name,
                summary: ctxItem.summary,
                tension: ctxItem.tension,
                flow: ctxItem.flow,
                proof: ctxItem.proof,
                cta: ctxItem.cta,
                order: i,
                isActive: true,
                created_at: new Date().toISOString()
            });
        }

        for (let i = 0; i < BASIC_CAROUSEL_TEMPLATES.length; i += 1) {
            const item = BASIC_CAROUSEL_TEMPLATES[i];
            const recommendation = getCarouselCompositionRecommendation({
                composition_id: item.baseId,
                name: item.name,
                description: item.description,
                layoutPrompt: item.layoutPrompt,
                scope: "global",
                mode: "basic",
            });
            await ctx.db.insert("carousel_compositions", {
                composition_id: item.baseId,
                scope: recommendation.suggestedScope,
                mode: recommendation.suggestedMode,
                name: item.name,
                description: item.description,
                layoutPrompt: item.layoutPrompt,
                iconPrompt: item.iconPrompt,
                order: i,
                isActive: true,
                created_at: new Date().toISOString()
            });
        }

        const narrativeIds = Object.keys(NARRATIVE_COMPOSITIONS);
        let narrativeCompositionCount = 0;
        for (const narrativeId of narrativeIds) {
            const list = NARRATIVE_COMPOSITIONS[narrativeId] || [];
            for (let i = 0; i < list.length; i += 1) {
                const comp = list[i];
                const recommendation = getCarouselCompositionRecommendation({
                    composition_id: comp.id,
                    structure_id: narrativeId,
                    name: comp.name,
                    description: comp.description,
                    layoutPrompt: comp.layoutPrompt,
                    scope: "narrative",
                    mode: "basic",
                });
                await ctx.db.insert("carousel_compositions", {
                    composition_id: comp.id,
                    structure_id: recommendation.suggestedScope === "global" ? undefined : narrativeId,
                    scope: recommendation.suggestedScope,
                    mode: recommendation.suggestedMode,
                    name: comp.name,
                    description: comp.description,
                    layoutPrompt: comp.layoutPrompt,
                    iconPrompt: comp.iconPrompt,
                    order: i,
                    isActive: true,
                    created_at: new Date().toISOString()
                });
                narrativeCompositionCount += 1;
            }
        }

        return {
            seeded: true,
            structures: NARRATIVE_CONTEXTS.length,
            compositions: BASIC_CAROUSEL_TEMPLATES.length + narrativeCompositionCount,
        };
    }
});
