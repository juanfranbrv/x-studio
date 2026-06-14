// Consenso de paleta y asignacion de roles de color.
// Helpers puros extraidos de analyze-brand-dna.ts (troceo Fase 2).
import { clusterColors, deltaE, hexToHsl, hexToRgb } from '@/lib/color-utils'

/**
 * Create final consolidated palette from multiple sources using Advanced Consensus
 */
export function createFinalPalette(
    visualPalette: string[],
    codePalette: string[],
    logoPalette: string[],
    weightedPalette: string[] = [],
    svgPalette: string[] = [],
    designPalette: string[] = []
): { color: string; sources: string[]; score: number; role?: string }[] {

    // 1. Prepare raw voting data
    const rawVotes: { hex: string, source: string, weight: number }[] = [];

    const addVotes = (palette: string[], sourceName: string, systemWeight: number) => {
        if (!Array.isArray(palette)) return;
        palette.forEach(hex => {
            if (typeof hex === 'string' && hex.startsWith('#')) {
                rawVotes.push({ hex, source: sourceName, weight: systemWeight });
            }
        });
    };

    // Base weights tuned for stronger visual + logo influence.
    // Remaining sources scaled proportionally.
    addVotes(visualPalette, 'visual', 0.60);      // 60% Visual Grid
    addVotes(logoPalette, 'logo', 0.20);          // 20% Logo Audit
    addVotes(weightedPalette, 'weighted', 0.0857); // 8.57% Weighted DOM
    addVotes(designPalette, 'design', 0.0571);     // 5.71% Design Intent
    addVotes(svgPalette, 'svg', 0.0286);           // 2.86% SVG Palette
    addVotes(codePalette, 'code', 0.0286);         // 2.86% Code Palette

    // 2. Hierarchical Clustering (Delta E < 10)
    // We group colors into "Consensus Clusters"
    const clusters = clusterColors(rawVotes.map(v => ({ hex: v.hex, weight: v.weight })), 10);

    // 3. Score & Cross-Source Bonus
    const finalScored = clusters.map(cluster => {
        const sources = new Set<string>();
        rawVotes.forEach(v => {
            if (cluster.originalColors.includes(v.hex)) sources.add(v.source);
        });

        const sourcesArray = Array.from(sources);
        let finalScore = cluster.score;

        // Redundancy Boost: Multiplying the collective weight by source variety
        const varietyCount = sourcesArray.length;
        if (varietyCount === 2) finalScore *= 1.5;
        if (varietyCount === 3) finalScore *= 2.5;
        if (varietyCount >= 4) finalScore *= 5.0;

        return {
            color: cluster.representative,
            sources: sourcesArray,
            score: finalScore
        };
    });

    // 4. Consolidate very similar colors to avoid near-duplicates in final palette
    const consolidated = mergeCloseConsensusColors(finalScored).slice(0, 10);
    const shortlist = consolidated.slice(0, 6);

    // Assign studio-compatible roles: one Fondo, one Texto, rest Acento.
    const paletteWithRoles = assignStudioColorRoles(shortlist);

    return paletteWithRoles;
}

function relativeLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const normalize = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const r = normalize(rgb.r);
    const g = normalize(rgb.g);
    const b = normalize(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function assignStudioColorRoles(
    colors: { color: string; sources: string[]; score: number }[]
): { color: string; sources: string[]; score: number; role: 'Fondo' | 'Texto' | 'Acento' }[] {
    if (!colors.length) return [];

    // Regla de producto: el primer color siempre es Fondo.
    const ordered = [...colors].sort((a, b) => b.score - a.score);
    const backgroundIdx = 0;

    // Regla de producto: Texto = el color mas oscuro entre los restantes.
    let textIdx = ordered.length > 1 ? 1 : 0;
    let lowestLuminance = Number.POSITIVE_INFINITY;
    for (let i = 1; i < ordered.length; i++) {
        const lum = relativeLuminance(ordered[i].color);
        if (lum < lowestLuminance) {
            lowestLuminance = lum;
            textIdx = i;
        }
    }

    return ordered.map((item, i) => ({
        ...item,
        role: i === backgroundIdx ? 'Fondo' : i === textIdx ? 'Texto' : 'Acento',
    }));
}

function hueDistance(a: number, b: number): number {
    const diff = Math.abs(a - b);
    return Math.min(diff, 360 - diff);
}

function isSimilarForConsensus(hexA: string, hexB: string): boolean {
    // Fast exact-ish match in RGB distance.
    if (deltaE(hexA, hexB) <= 30) return true;

    const hslA = hexToHsl(hexA);
    const hslB = hexToHsl(hexB);
    if (!hslA || !hslB) return false;

    const bothNearNeutral = hslA.s < 25 && hslB.s < 25;
    if (bothNearNeutral) {
        return Math.abs(hslA.l - hslB.l) <= 12;
    }

    // Same hue-family collapse (e.g. multiple yellows with different lightness).
    return (
        hueDistance(hslA.h, hslB.h) <= 14 &&
        Math.abs(hslA.s - hslB.s) <= 25 &&
        Math.abs(hslA.l - hslB.l) <= 35
    );
}

function weightedAverageHex(items: { color: string; score: number }[]): string {
    let rAcc = 0;
    let gAcc = 0;
    let bAcc = 0;
    let total = 0;

    for (const item of items) {
        const rgb = hexToRgb(item.color);
        if (!rgb) continue;
        const w = Math.max(item.score, 0.0001);
        rAcc += rgb.r * w;
        gAcc += rgb.g * w;
        bAcc += rgb.b * w;
        total += w;
    }

    if (total <= 0) return '#000000';
    const r = Math.round(rAcc / total);
    const g = Math.round(gAcc / total);
    const b = Math.round(bAcc / total);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function mergeCloseConsensusColors(
    colors: { color: string; sources: string[]; score: number }[]
): { color: string; sources: string[]; score: number }[] {
    const sorted = [...colors].sort((a, b) => b.score - a.score);
    const merged: { color: string; sources: string[]; score: number }[] = [];

    for (const current of sorted) {
        const target = merged.find((m) => isSimilarForConsensus(current.color, m.color));
        if (!target) {
            merged.push({
                color: current.color,
                sources: [...new Set(current.sources)],
                score: current.score,
            });
            continue;
        }

        const newScore = target.score + current.score;
        const averagedColor = weightedAverageHex([
            { color: target.color, score: target.score },
            { color: current.color, score: current.score },
        ]);

        target.color = averagedColor;
        target.score = newScore;
        target.sources = [...new Set([...target.sources, ...current.sources])];
    }

    return merged.sort((a, b) => b.score - a.score);
}
