'use server';

import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import { model, groqModel } from '@/lib/ai';
import fs from 'fs';
import path from 'path';
import { clusterColors, deltaE, getHarmonyBonus, hexToHsl, hexToRgb } from '@/lib/color-utils';
import { buildBrandAnalysisPrompt } from '@/lib/prompts/actions/brand-analyst';
import { BrandDNASchema } from '@/lib/prompts/schemas/brand-dna-schema';
import { WEIGHTED_DOM_SCRIPT } from '@/lib/prompts/automation/weighted-dom';
import { SYSTEM_FONTS } from '@/lib/prompts/data/system-fonts';
import { detectLanguageWithApi } from '@/lib/language-detection';

function logDebug(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logline = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    console.log(`[DEBUG] ${message}`, data || ''); // Output to terminal too
    try {
        fs.appendFileSync(path.join(process.cwd(), 'public', 'debug_log.txt'), logline);
    } catch (e) {
        console.error('Failed to write debug log', e);
    }
}

// Wrapper para console.log que también escribe en archivo
function logToFile(...args: any[]) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    console.log(...args); // Output to terminal
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            path.join(process.cwd(), 'public', 'debug_log.txt'),
            `[${timestamp}] ${message}\n`
        );
    } catch (e) {
        // Silently fail if can't write to file
    }
}

/**
 * Extrae colores dominantes de una imagen usando un sistema de cuadrícula
 * Es más robusto que el muestreo puntual porque cubre toda la imagen
 */
async function extractVisualPalette(imageUrl: string): Promise<string[]> {
    try {
        console.log(`🎨 Extrayendo paleta visual (Grid) de: ${imageUrl.substring(0, 100)}...`);
        return await extractColorsFromScreenshot(imageUrl);
    } catch (e) {
        console.error('Error en visual palette extraction:', e);
        return [];
    }
}

/**
 * Extract official brand colors from the logo
 * Returns top 5-6 colors by frequency, filtering out backgrounds
 */
export async function extractLogoColors(logoUrl: string): Promise<string[]> {
    try {
        console.log(`🎨 Extrayendo colores del logo: ${logoUrl}`);

        // Download logo
        const response = await fetch(logoUrl, {
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error('Failed to fetch logo');
            return [];
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const image = sharp(buffer);
        const { width, height, channels } = await image.metadata();

        if (!width || !height) {
            console.error('Invalid logo dimensions');
            return [];
        }

        console.log(`📏 Logo dimensions: ${width}x${height}, channels: ${channels}`);

        // Get raw pixel data
        const rawBuffer = await image.raw().toBuffer();
        const colorCounts = new Map<string, number>();
        const totalPixels = width * height;

        // Process every pixel (or step for large logos)
        const step = width * height > 10000 ? 3 : 1; // Sample every 3rd pixel for large logos

        for (let i = 0; i < rawBuffer.length; i += channels! * step) {
            const r = rawBuffer[i];
            const g = rawBuffer[i + 1];
            const b = rawBuffer[i + 2];
            const a = channels === 4 ? rawBuffer[i + 3] : 255;

            // Skip transparent pixels (alpha < 50 for more sensitivity)
            if (a < 50) continue;

            // Calculate lightness
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2 / 255; // Lightness 0-1

            // Filter out backgrounds:
            // - Near white (L > 0.95)
            // - Pure white
            // - Pure black
            if (l > 0.95 || (r > 250 && g > 250 && b > 250) || (r < 5 && g < 5 && b < 5)) {
                continue;
            }

            // Quantize to reduce palette (round to nearest 10)
            const qr = Math.round(r / 10) * 10;
            const qg = Math.round(g / 10) * 10;
            const qb = Math.round(b / 10) * 10;

            const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1).toUpperCase()}`;
            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
        }

        // Sort by frequency and get top 6
        const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([color, count]) => {
                const percentage = ((count / totalPixels) * 100).toFixed(1);
                console.log(`   ${color}: ${percentage}% of logo`);
                return color;
            });

        console.log(`✅ Logo colors extracted: ${sortedColors.length}`);
        return sortedColors;

    } catch (e) {
        console.error('Error en logo palette extraction:', e);
        return [];
    }
}

/** Async wrapper export so Next.js 'use server' accepts it */
export async function assignStudioColorRolesAction(
    colors: { color: string; sources: string[]; score: number }[]
): Promise<{ color: string; sources: string[]; score: number; role: 'Fondo' | 'Texto' | 'Acento' }[]> {
    return assignStudioColorRoles(colors)
}

/**
 * Create final consolidated palette from multiple sources using Advanced Consensus
 */
function createFinalPalette(
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

function assignStudioColorRoles(
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

import type { BrandDNA, AnalyzeBrandDNAResponse } from '@/lib/brand-types';



// Tipos para las respuestas de las APIs externas
interface MicrolinkResponse {
    status: string;
    data: {
        title?: string;
        description?: string;
        logo?: { url: string };
        image?: { url: string };
        screenshot?: { url: string };
        palette?: string[];
        function?: any;
        html?: string;
    };
}

// ============= DATA EXTRACTION & DISCOVERY FUNCTIONS =============

/**
 * High-value pages to look for for deeper brand context
 */
const VALUABLE_PATHS = [
    'about', 'nosotros', 'quienes-somos', 'empresa', 'company',
    'services', 'servicios', 'soluciones', 'what-we-do',
    'team', 'equipo', 'contact', 'contacto'
];

/**
 * Descubre otras páginas valiosas del sitio para dar más contexto a la IA
 */
function discoverValuablePages(html: string, baseUrl: string): string[] {
    try {
        const $ = cheerio.load(html);
        const links = new Set<string>();
        const urlObj = new URL(baseUrl);
        const domain = urlObj.hostname;

        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            try {
                const absoluteUrl = new URL(href, baseUrl);
                // Solo enlaces del mismo dominio
                if (absoluteUrl.hostname !== domain) return;

                const path = absoluteUrl.pathname.toLowerCase();
                if (VALUABLE_PATHS.some(vp => path.includes(vp))) {
                    links.add(absoluteUrl.toString());
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        });

        return Array.from(links).slice(0, 3); // Máximo 3 páginas extra
    } catch (e) {
        console.error('Error discovering valuable pages:', e);
        return [];
    }
}

/**
 * Calcular distancia Euclidiana entre dos colores RGB
 */
function colorDistance(hex1: string, hex2: string): number {
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);

    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);

    return Math.sqrt(
        Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2)
    );
}

/**
 * Agrupar colores similares (elimina duplicados visuales)
 */
function deduplicateSimilarColors(colors: string[], threshold = 30): string[] {
    const unique: string[] = [];

    for (const color of colors) {
        const isSimilar = unique.some(existing =>
            colorDistance(color, existing) < threshold
        );

        if (!isSimilar) {
            unique.push(color);
        }
    }

    return unique;
}

/**
 * Convierte RGB a HEX
 */
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Filtra colores poco saturados (grises, blancos, negros)
 */
function isColorful(hex: string): boolean {
    if (!hex || hex === 'transparent' || hex === 'null') return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Aceptamos casi todo excepto blancos/negros puros y grises perfectos
    // Antes delta < 15, ahora delta < 3 para ser mucho más permisivos con tonos sutiles
    if (max > 252 && delta < 3) return false; // Blancos extremos
    if (max < 8 && delta < 3) return false;   // Negros extremos
    if (delta < 2) return false;              // Grises matemáticamente puros

    return true;
}

/**
 * Extrae colores de zonas estratégicas de un screenshot
 * Muestrea: Header (top), Footer (bottom), y franjas horizontales donde suelen estar botones
 */
async function extractColorsFromScreenshot(imageUrl: string): Promise<string[]> {
    try {
        console.log(`[EXTRACT_COLORS] Starting extraction from: ${imageUrl.substring(0, 80)}...`);
        const response = await fetch(imageUrl, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            console.error(`[EXTRACT_COLORS] Fetch failed with status: ${response.status}`);
            return [];
        }
        console.log(`[EXTRACT_COLORS] Fetch successful, reading buffer...`);

        const buffer = Buffer.from(await response.arrayBuffer());
        console.log(`[EXTRACT_COLORS] Buffer size: ${buffer.length} bytes`);

        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            console.error(`[EXTRACT_COLORS] Invalid metadata: ${JSON.stringify(metadata)}`);
            return [];
        }

        const colors: string[] = [];
        const w = metadata.width;
        const h = metadata.height;

        console.log(`📐 Screenshot: ${w}x${h}`);
        console.log(`[EXTRACT_COLORS] Creating ${5 * 8} grid zones...`);

        // Sistema genérico de muestreo: cuadrícula 5x10 + zonas clave
        // Funciona para cualquier layout de sitio web
        const strategicZones: { name: string; left: number; top: number; width: number; height: number }[] = [];

        // 1. Zonas universales (header y footer siempre existen)
        strategicZones.push(
            { name: 'header', left: 0, top: 0, width: w, height: Math.floor(h * 0.08) },
            { name: 'footer', left: 0, top: Math.floor(h * 0.90), width: w, height: Math.floor(h * 0.10) }
        );

        // 2. Cuadrícula sistemática: 5 columnas x 8 filas = 40 puntos de muestreo
        // Esto captura colores de cualquier layout sin asumir estructura específica
        const cols = 5;
        const rows = 8;
        const cellWidth = Math.floor(w / cols);
        const cellHeight = Math.floor(h / rows);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Muestrear el centro de cada celda (no los bordes)
                const marginX = Math.floor(cellWidth * 0.1);
                const marginY = Math.floor(cellHeight * 0.1);
                strategicZones.push({
                    name: `grid-${row}-${col}`,
                    left: col * cellWidth + marginX,
                    top: row * cellHeight + marginY,
                    width: cellWidth - marginX * 2,
                    height: cellHeight - marginY * 2
                });
            }
        }

        console.log(`[EXTRACT_COLORS] Processing ${strategicZones.length} zones...`);
        let processedZones = 0;
        let skippedZones = 0;

        for (const zone of strategicZones) {
            if (zone.width < 10 || zone.height < 10) {
                skippedZones++;
                continue;
            }
            try {
                // Asegurar que la zona no exceda los límites de la imagen
                const safeZone = {
                    left: Math.max(0, Math.min(zone.left, w - 10)),
                    top: Math.max(0, Math.min(zone.top, h - 10)),
                    width: Math.min(zone.width, w - zone.left),
                    height: Math.min(zone.height, h - zone.top),
                };

                if (safeZone.width < 10 || safeZone.height < 10) {
                    skippedZones++;
                    continue;
                }

                const regionBuffer = await sharp(buffer)
                    .extract(safeZone)
                    .resize(Math.min(50, safeZone.width), Math.min(50, safeZone.height), { fit: 'cover' }) // Get sample pixels, not average
                    .raw()
                    .toBuffer();

                if (regionBuffer.length >= 3) {
                    // Extract multiple colors from this zone (top 3)
                    const zoneColors = new Map<string, number>();
                    const channelsPerPixel = 3;

                    for (let i = 0; i < regionBuffer.length; i += channelsPerPixel) {
                        if (i + 2 >= regionBuffer.length) break;
                        const r = regionBuffer[i];
                        const g = regionBuffer[i + 1];
                        const b = regionBuffer[i + 2];

                        // Calculate saturation to prioritize colorful pixels
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const saturation = max === 0 ? 0 : (max - min) / max;

                        // Skip very desaturated colors (grays/whites) - prefer brand colors
                        if (saturation < 0.15) continue;

                        const hex = rgbToHex(r, g, b).toUpperCase();
                        zoneColors.set(hex, (zoneColors.get(hex) || 0) + 1);
                    }

                    // Get top 3 most frequent vibrant colors from this zone
                    const topZoneColors = Array.from(zoneColors.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([hex]) => hex);

                    // Add unique colors to global palette
                    topZoneColors.forEach(zoneColor => {
                        if (!colors.some(c => colorDistance(c, zoneColor) < 20)) {
                            colors.push(zoneColor);
                            if (colors.length <= 15) { // Log first 15 to see what we're getting
                                console.log(`   🎯 ${zone.name}: ${zoneColor}`);
                            }
                        }
                    });
                }
                processedZones++;
            } catch (e) {
                console.error(`[EXTRACT_COLORS] Error in zone ${zone.name}:`, e);
            }
        }

        console.log(`[EXTRACT_COLORS] Zones processed: ${processedZones}, skipped: ${skippedZones}`);
        console.log(`   First 5: ${colors.slice(0, 5).join(', ')}`);
        return colors.slice(0, 12); // Return top 12 colors
    } catch (error) {
        console.error('[EXTRACT_COLORS] Fatal error:', error);
        return [];
    }
}

/**
 * Extrae colores prominentes de cualquier imagen (buffer)
 */
async function getProminentColors(buffer: Buffer): Promise<string[]> {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) return [];

        // Redimensionar a una cuadrícula pequeña para promediar y reducir ruido
        const smallBuffer = await image
            .resize(20, 20, { fit: 'cover' })
            .raw()
            .toBuffer();

        const colors: string[] = [];
        for (let i = 0; i < smallBuffer.length; i += 3) {
            if (i + 2 >= smallBuffer.length) break;
            const r = smallBuffer[i];
            const g = smallBuffer[i + 1];
            const b = smallBuffer[i + 2];

            const hex = rgbToHex(r, g, b).toUpperCase();
            if (isColorful(hex)) {
                colors.push(hex);
            }
        }

        // Devolver los más frecuentes y variados
        return deduplicateSimilarColors(colors, 35).slice(0, 5);
    } catch (error) {
        console.error('Error in getProminentColors:', error);
        return [];
    }
}

// ============= FONT EXTRACTION FUNCTIONS =============

/**
 * Extract fonts from HTML/CSS content
 * Uses multiple strategies: Google Fonts links, @font-face, font-family declarations
 */
/**
 * Extract fonts from HTML/CSS content
 * Uses multiple strategies: Google Fonts links, @font-face, font-family declarations
 */
function extractFontsFromContent(content: string): string[] {
    const fonts: Set<string> = new Set();

    // Common font names to filter out (system fonts, generic families)
    const systemFonts = SYSTEM_FONTS;

    const cleanFontName = (name: string): string | null => {
        if (!name) return null;
        // Remove quotes, extra spaces, and weight/style suffixes
        let cleaned = name.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
        // Take only the first font if it's a list (e.g. "Open Sans, sans-serif")
        cleaned = cleaned.split(',')[0].trim();
        // Remove common suffixes like :wght@400
        cleaned = cleaned.split(':')[0].split('@')[0].trim();
        // Decode URL encoding
        cleaned = decodeURIComponent(cleaned).replace(/\+/g, ' ');

        if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return null;
        if (systemFonts.has(cleaned.toLowerCase())) return null;
        // Must start with a letter and contain mostly letters/spaces
        if (!/^[A-Za-z]/.test(cleaned)) return null;
        if (/^\d+$/.test(cleaned)) return null;

        return cleaned;
    };

    try {
        // Strategy 1: Google Fonts CSS links (most reliable)
        // Matches: fonts.googleapis.com/css?family=Roboto:400,700|Open+Sans
        // And: fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans
        const googleFontsRegex = /fonts\.googleapis\.com\/css2?\?[^"'\s>]*family=([^"'\&>\s]+)/gi;
        let match;
        while ((match = googleFontsRegex.exec(content)) !== null) {
            const familyParam = match[1];
            // Handle both old format (|) and new format (&family=)
            const families = familyParam.split(/[|&]/).filter(f => f.includes('family=') || !f.includes('='));
            families.forEach(f => {
                const name = f.replace('family=', '').split(':')[0];
                const cleaned = cleanFontName(name);
                if (cleaned) fonts.add(cleaned);
            });
        }

        // Strategy 1b: Generic CSS imports (@import url("..."))
        // Often used for fonts
        const importRegex = /@import\s+url\(['"]?([^'")]*)['"]?\)/gi;
        while ((match = importRegex.exec(content)) !== null) {
            const importUrl = match[1];
            if (importUrl.includes('fonts.googleapis.com')) {
                const familyParam = importUrl.split('family=')[1];
                if (familyParam) {
                    const name = familyParam.split(/[&:]/)[0];
                    const cleaned = cleanFontName(name);
                    if (cleaned) fonts.add(cleaned);
                }
            }
        }

        // Strategy 2: @font-face declarations
        const fontFaceRegex = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?/gi;
        while ((match = fontFaceRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 3: CSS variables with font names
        // Matches: --font-primary: "Open Sans", ... or --base-font: Roboto
        const cssVarFontRegex = /--[\w-]*(?:font|family|typography|main|heading|body)[\w-]*\s*:\s*['"]?([^;}'"]+)['"]?/gi;
        while ((match = cssVarFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 3b: Common class-based font declarations
        // Matches: .font-heading { font-family: 'Open Sans' }
        const classFontRegex = /\.[\w-]*(?:font|family|typography)[\w-]*\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?/gi;
        while ((match = classFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 4: Main font-family declarations (usually body or main headers)
        // We look for capitalized names to avoid generic "sans-serif"
        const inlineFontRegex = /font-family\s*:\s*['"]?([A-Z][a-zA-Z0-s ]+)(?:['"]|,|;)/g;
        while ((match = inlineFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 5: Adobe Fonts / Typekit Detection
        const typekitRegex = /use\.typekit\.net\/([a-z0-9]+)\.css/gi;
        if (typekitRegex.test(content)) {
            console.log('🔤 Adobe Fonts/Typekit detected in content');
        }

        // Strategy 6: data-font or data-family attributes (common in builders)
        const dataFontRegex = /data-(?:font|family)=['"]([^'"]+)['"]/gi;
        while ((match = dataFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

    } catch (error) {
        console.error('Error extracting fonts:', error);
    }

    const result = [...fonts].slice(0, 8); // Allow up to 8 candidates
    return result;
}

// ============= DATA EXTRACTION FUNCTIONS =============

/**
 * Extrae el contenido de una URL usando Jina Reader API
 */
async function fetchJinaContent(url: string): Promise<string> {
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await fetch(jinaUrl, {
        headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Accept': 'text/markdown',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error(`Jina Reader error: ${response.status}`);
    }

    const content = await response.text();
    return content.slice(0, 50000);
}

/**
 * Weighted DOM Analysis script for Microlink
 * Calculates color prominence based on area, position, and element type
 */


/**
 * Extrae metadatos visuales usando Microlink API con sistema de reintentos
 */
async function fetchMicrolinkData(url: string, customFunction?: string, forceRefresh: boolean = false): Promise<MicrolinkResponse['data']> {
    const maxRetries = 3; // Aumentado de 2 a 3
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const microlinkUrl = new URL('https://api.microlink.io');
            microlinkUrl.searchParams.set('url', url);
            microlinkUrl.searchParams.set('screenshot', 'true');
            microlinkUrl.searchParams.set('palette', 'true');
            microlinkUrl.searchParams.set('meta', 'true');
            microlinkUrl.searchParams.set('screenshot.fullPage', 'true');
            // Bypass Microlink cache and force a new render
            if (forceRefresh) {
                microlinkUrl.searchParams.set('ttl', '0');
            }

            // Incrementar tiempo de espera en cada reintento
            const waitFor = attempt === 0 ? '8000' : attempt === 1 ? '12000' : '20000';
            microlinkUrl.searchParams.set('screenshot.waitFor', waitFor);
            microlinkUrl.searchParams.set('html', 'true');

            if (customFunction) {
                microlinkUrl.searchParams.set('function', customFunction);
            }

            console.log(`📡 Microlink Intento ${attempt}/${maxRetries}...`);

            const response = await fetch(microlinkUrl.toString(), {
                signal: AbortSignal.timeout(attempt === 0 ? 60000 : 120000), // Timeout extendido
            });

            if (!response.ok) {
                if (response.status === 429) {
                    console.error('🚫 Microlink Rate Limit Hit (429). Jumping to fallback...');
                    break; // Salir del bucle de reintentos inmediatamente
                }
                throw new Error(`Microlink error: ${response.status}`);
            }

            const result: MicrolinkResponse = await response.json();

            if (result.status !== 'success') {
                throw new Error('Microlink returned non-success status');
            }

            // Validar que tengamos lo básico (screenshot o título)
            if (!result.data.screenshot?.url && attempt < maxRetries) {
                console.warn('⚠️ Microlink success but screenshot missing. Retrying...');
                continue;
            }

            logDebug(`✅ Microlink Success on attempt ${attempt + 1}`);
            return result.data;

        } catch (e) {
            lastError = e;
            console.error(`❌ Microlink attempt ${attempt + 1} failed:`, e);
            if (attempt < maxRetries) {
                const delay = 4000 * (attempt + 1); // Delay aumentado
                console.log(`⏱️ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Max retries reached for Microlink');
}

/**
 * Fallback: ApiFlash (Manejo robusto si Microlink falla)
 */
async function fetchApiFlashScreenshot(url: string): Promise<string | undefined> {
    try {
        console.log(`📸 [FALLBACK] Llamando a ApiFlash para: ${url}...`);
        const accessKey = '08b58bcb02284979b902d15e07439bd3';
        const apiFlashUrl = new URL('https://api.apiflash.com/v1/urltoimage');
        apiFlashUrl.searchParams.set('access_key', accessKey);
        apiFlashUrl.searchParams.set('url', url);
        apiFlashUrl.searchParams.set('wait_until', 'network_idle'); // Esperar a que la red esté inactiva
        apiFlashUrl.searchParams.set('delay', '3'); // Esperar 3 segundos adicionales para animaciones/JS
        apiFlashUrl.searchParams.set('full_page', 'true');
        apiFlashUrl.searchParams.set('format', 'jpeg');
        apiFlashUrl.searchParams.set('quality', '80');
        apiFlashUrl.searchParams.set('width', '1440');
        apiFlashUrl.searchParams.set('no_cookie_banners', 'true');
        apiFlashUrl.searchParams.set('no_ads', 'true');

        console.log(`📡 Solicitando captura a ApiFlash...`);
        const response = await fetch(apiFlashUrl.toString(), {
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            console.error(`❌ ApiFlash error: ${response.status}`);
            return undefined;
        }

        // ApiFlash devuelve la imagen directamente en el cuerpo de la respuesta por defecto
        // Para subirla a Supabase, necesitamos el buffer.
        // Pero el proceso actual espera una URL para processAndUploadImage.
        // Sin embargo, podemos usar la URL de la API de ApiFlash directamente como origen para processAndUploadImage
        // ya que esa función acepta URLs.
        return apiFlashUrl.toString();
    } catch (e) {
        console.error('❌ Error en ApiFlash fallback:', e);
        logDebug('ApiFlash fallback error:', e);
        return undefined;
    }
}

// ScreenshotLayer fallback function (TERCERA OPCIÓN)
async function fetchScreenshotLayerScreenshot(url: string): Promise<string | undefined> {
    try {
        console.log(`📸 [FALLBACK #2] Llamando a ScreenshotLayer para: ${url}...`);
        const accessKey = 'bd4c1e98fec507c04b302f23d5e07dea';
        const screenshotLayerUrl = new URL('http://api.screenshotlayer.com/api/capture');
        screenshotLayerUrl.searchParams.set('access_key', accessKey);
        screenshotLayerUrl.searchParams.set('url', encodeURIComponent(url));
        screenshotLayerUrl.searchParams.set('fullpage', '1'); // Full page screenshot
        screenshotLayerUrl.searchParams.set('viewport', '1440x900'); // Desktop viewport
        screenshotLayerUrl.searchParams.set('delay', '3'); // Wait 3 seconds for page load
        screenshotLayerUrl.searchParams.set('force', '1'); // Force fresh screenshot (no cache)

        console.log(`📡 Solicitando captura a ScreenshotLayer...`);
        const response = await fetch(screenshotLayerUrl.toString(), {
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            console.error(`❌ ScreenshotLayer error: ${response.status}`);
            return undefined;
        }

        // ScreenshotLayer devuelve la imagen directamente, igual que ApiFlash
        console.log(`✅ ScreenshotLayer respondió correctamente`);
        return screenshotLayerUrl.toString();
    } catch (e) {
        console.error('❌ Error en ScreenshotLayer fallback:', e);
        logDebug('ScreenshotLayer fallback error:', e);
        return undefined;
    }
}

/**
 * Análisis Weighted Estático - Reemplazo de Microlink Weighted DOM
 * Asigna pesos a colores y fuentes basándose en posición DOM, semantic classes e inline styles
 */
function analyzeStaticWeightedDOM(html: string, rootColors: Record<string, string>): {
    weightedColors: Array<{ hex: string; weight: number }>;
    weightedFonts: Array<{ font: string; weight: number }>;
} {
    const colorWeights: Record<string, number> = {};
    const fontWeights: Record<string, number> = {};

    const normalizeHex = (color: string): string | null => {
        if (!color) return null;
        if (color.startsWith('#')) {
            const cleaned = color.toUpperCase().substring(0, 7);
            return cleaned.length === 7 ? cleaned : null;
        }
        return null;
    };

    const extractInlineColors = (style: string): string[] => {
        const hexRegex = /#([0-9A-Fa-f]{6})/g;
        const colors: string[] = [];
        let match;
        while ((match = hexRegex.exec(style)) !== null) {
            const normalized = normalizeHex(match[0]);
            if (normalized) colors.push(normalized);
        }
        return colors;
    };

    // Match ALL style attributes (minified HTML safe)
    const styleRegex = /style=["']([^"']+)["']/g;
    const styleMatches = [...html.matchAll(styleRegex)];

    styleMatches.forEach(match => {
        const fullTag = html.substring(Math.max(0, match.index - 200), match.index! + 200).toLowerCase();
        const styleContent = match[1];

        let sectionBonus = 1.0;
        if (fullTag.includes('header') || fullTag.includes('nav')) sectionBonus = 1.5;
        else if (fullTag.includes('hero') || fullTag.includes('masthead')) sectionBonus = 2.0;
        else if (fullTag.includes('footer')) sectionBonus = 0.7;

        let semanticBonus = 1.0;
        if (fullTag.includes('cta') || fullTag.includes('button') || fullTag.includes('btn')) semanticBonus = 1.8;
        else if (fullTag.includes('primary') || fullTag.includes('brand')) semanticBonus = 1.5;
        else if (fullTag.includes('accent')) semanticBonus = 1.3;

        const inlineColors = extractInlineColors(styleContent);
        inlineColors.forEach(color => {
            colorWeights[color] = (colorWeights[color] || 0) + (100 * sectionBonus * semanticBonus);
        });
    });

    // Find all headings (minified HTML safe)
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const headingMatches = [...html.matchAll(headingRegex)];

    headingMatches.forEach(match => {
        const level = parseInt(match[1]);
        const headingWeight = 100 / level;
        const fullTag = match[0].toLowerCase();
        const fontMatch = fullTag.match(/font-family:\s*['"]?([^'";,]+)/);
        if (fontMatch) {
            const font = fontMatch[1].trim();
            fontWeights[font] = (fontWeights[font] || 0) + headingWeight;
        }
    });

    // CSS Variables
    Object.entries(rootColors).forEach(([varName, hex]) => {
        const normalized = normalizeHex(hex);
        if (!normalized) return;
        let varWeight = 80;
        if (varName.includes('primary') || varName.includes('brand')) varWeight *= 1.8;
        else if (varName.includes('accent') || varName.includes('secondary')) varWeight *= 1.4;
        colorWeights[normalized] = (colorWeights[normalized] || 0) + varWeight;
    });

    console.log(`🐛 [STATIC WEIGHTED] Style matches found: ${styleMatches.length}`);
    console.log(`🐛 [STATIC WEIGHTED] Heading matches found: ${headingMatches.length}`);
    console.log(`🐛 [STATIC WEIGHTED] Root colors processed: ${Object.keys(rootColors).length}`);
    console.log(`🐛 [STATIC WEIGHTED] Color weights:`, Object.keys(colorWeights).length, colorWeights);

    const sortedColors = Object.entries(colorWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([hex, weight]) => ({ hex, weight }));

    const sortedFonts = Object.entries(fontWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([font, weight]) => ({ font, weight }));

    return { weightedColors: sortedColors, weightedFonts: sortedFonts };
}

interface LogoCandidate {
    url?: string;
    content?: string; // Para SVGs inline
    score: number;
    type: 'url' | 'inline-svg';
}

/**
 * Extrae el HTML de una URL y analiza CSS externos para colores + busca logos/favicons/imagenes
 */
async function fetchHtmlAndExtractAssets(url: string, providedHtml?: string, forceRefresh: boolean = false): Promise<{
    colors: string[];
    colorFrequency: Record<string, number>;
    logoCandidates: LogoCandidate[];
    faviconUrl: string | null;
    imageCandidates: string[];
    cssLinks: string[];
    rootColors: Record<string, string>;
    codePalette: string[];
    svgPalette: string[];
    designPalette: string[];
    fonts: string[];
    socialLinks: { platform: string; url: string }[];
    emails: string[];
    phones: string[];
    addresses: string[];
    html: string;
}> {
    const hexRegex = /#([0-9A-Fa-f]{3}){1,2}\b/g;
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g;
    const colorCandidates: string[] = [];

    try {
        let html = '';
        if (providedHtml) {
            console.log('📄 Usando HTML ya renderizado para la extracción...');
            html = providedHtml;
        } else {
            console.log(`📡 Fetching HTML directamente (${forceRefresh ? 'NO-CACHE' : 'DEFAULT'})...`);
            const response = await fetch(url, {
                signal: AbortSignal.timeout(8000),
                cache: forceRefresh ? 'no-store' : 'default',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });

            if (!response.ok) {
                return { colors: [], colorFrequency: {}, logoCandidates: [], faviconUrl: null, imageCandidates: [], cssLinks: [], rootColors: {}, codePalette: [], svgPalette: [], designPalette: [], fonts: [], socialLinks: [], emails: [], phones: [], addresses: [], html: '' };
            }
            html = await response.text();
        }

        const $ = cheerio.load(html);
        logToFile(`📄 HTML cargado. Longitud: ${html.length} caracteres.`);

        // DEBUG: Guardar HTML para inspección
        try {
            fs.writeFileSync(path.join(process.cwd(), 'public', 'debug_html.html'), html);
            logToFile(`💾 HTML guardado en public/debug_html.html para inspección`);
        } catch (e) {
            logToFile(`❌ Error guardando HTML: ${e}`);
        }

        // === 6. SQUAD: DESIGN INTENT & META THEME ===
        const designColors: string[] = [];
        const colors: string[] = [];
        const logoCandidatesScored: LogoCandidate[] = [];

        // === FONT EXTRACTION (Robust) ===
        const detectedFonts: string[] = extractFontsFromContent(html);
        logToFile(`🔤 Fuentes iniciales extraídas: ${detectedFonts.length}`, detectedFonts);

        // Meta theme-color
        const themeColor = $('meta[name="theme-color"]').attr('content');
        const msTileColor = $('meta[name="msapplication-TileColor"]').attr('content');
        const appleStatusColor = $('meta[name="apple-mobile-web-app-status-bar-style"]').attr('content');

        [themeColor, msTileColor, appleStatusColor].forEach(color => {
            if (color && color.startsWith('#')) {
                let hex = color.toUpperCase();
                if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                if (isColorful(hex) && !designColors.includes(hex)) designColors.push(hex);
            }
        });

        // Search for manifest
        const manifestUrl = $('link[rel="manifest"]').attr('href');
        if (manifestUrl) {
            try {
                const fullManifestUrl = new URL(manifestUrl, url).toString();
                const manifestRes = await fetch(fullManifestUrl, { signal: AbortSignal.timeout(2000) });
                if (manifestRes.ok) {
                    const manifest = await manifestRes.json();
                    if (manifest.theme_color && manifest.theme_color.startsWith('#')) {
                        let hex = manifest.theme_color.toUpperCase();
                        if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                        if (isColorful(hex) && !designColors.includes(hex)) designColors.push(hex);
                    }
                    if (manifest.background_color && manifest.background_color.startsWith('#')) {
                        let hex = manifest.background_color.toUpperCase();
                        if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                        if (isColorful(hex) && !designColors.includes(hex)) designColors.push(hex);
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not fetch manifest.json');
            }
        }
        let faviconUrl: string | null = null;
        const faviconCandidates: { url: string; size: number }[] = [];

        // Buscar todos los link[rel*="icon"] con sus tamaños
        $('link[rel*="icon"]').each((_, el) => {
            const href = $(el).attr('href');
            const sizes = $(el).attr('sizes') || '';
            if (href) {
                const sizeMatch = sizes.match(/(\d+)x(\d+)/);
                const size = sizeMatch ? parseInt(sizeMatch[1]) : 16;
                try {
                    faviconCandidates.push({
                        url: new URL(href, url).toString(),
                        size,
                    });
                } catch { }
            }
        });

        // Apple touch icon (usualmente alta resolución)
        $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
            const href = $(el).attr('href');
            const sizes = $(el).attr('sizes') || '180x180';
            if (href) {
                const sizeMatch = sizes.match(/(\d+)x(\d+)/);
                const size = sizeMatch ? parseInt(sizeMatch[1]) : 180;
                try {
                    faviconCandidates.push({
                        url: new URL(href, url).toString(),
                        size,
                    });
                } catch { }
            }
        });

        // Ordenar por tamaño (mayor primero) y tomar el más grande
        faviconCandidates.sort((a, b) => b.size - a.size);
        if (faviconCandidates.length > 0) {
            faviconUrl = faviconCandidates[0].url;
        }

        // Fallback a Google Favicon Service (máx 256px)
        if (!faviconUrl) {
            const domain = new URL(url).hostname;
            faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
        }

        logToFile(`🔍 Favicon encontrado: ${faviconUrl} (${faviconCandidates.length} candidatos)`);

        // === SOCIAL LINKS & EMAILS EXTRACTION ===
        const socialLinks: { platform: string; url: string }[] = [];
        const detectedEmails = new Set<string>();
        const detectedPhones = new Set<string>();
        const detectedAddresses = new Set<string>();

        const socialPlatforms = [
            { name: 'facebook', patterns: ['facebook.com', 'fb.me', 'fb.com'] },
            { name: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
            { name: 'tiktok', patterns: ['tiktok.com'] },
            { name: 'twitter', patterns: ['twitter.com', 'x.com'] },
            { name: 'linkedin', patterns: ['linkedin.com/company', 'linkedin.com/in', 'linkedin.com/school'] },
            { name: 'youtube', patterns: ['youtube.com', 'youtu.be'] },
            { name: 'whatsapp', patterns: ['wa.me', 'api.whatsapp.com'] },
            { name: 'telegram', patterns: ['t.me'] }
        ];

        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            // Extract Emails
            if (href.startsWith('mailto:')) {
                const email = href.replace('mailto:', '').split('?')[0].trim();
                if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    detectedEmails.add(email.toLowerCase());
                }
            }

            // Extract Phones from tel:
            if (href.startsWith('tel:')) {
                const phone = href.replace('tel:', '').split('?')[0].trim();
                if (phone && phone.length > 5) {
                    detectedPhones.add(phone);
                }
            }

            // Extract Social Links
            try {
                const fullUrl = new URL(href, url).toString().toLowerCase();
                for (const platform of socialPlatforms) {
                    if (platform.patterns.some(p => fullUrl.includes(p))) {
                        // Avoid duplicates
                        if (!socialLinks.some(s => s.url === fullUrl)) {
                            socialLinks.push({ platform: platform.name, url: fullUrl });
                        }
                    }
                }
            } catch { }

            // Extract Addresses from postal address links (rare but exists)
            const ariaLabel = $(el).attr('aria-label') || '';
            const title = $(el).attr('title') || '';
            const text = $(el).text().trim();
            if (href.includes('google.com/maps') || href.includes('maps.apple.com')) {
                // If it's a maps link, the text or label might be the address
                const possibleAddress = text || ariaLabel || title;
                if (possibleAddress && possibleAddress.length > 10 && possibleAddress.length < 200) {
                    detectedAddresses.add(possibleAddress);
                }
            }
        });

        // Search for emails in text if none found in mailto
        if (detectedEmails.size === 0) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = html.match(emailRegex);
            if (matches) {
                matches.forEach(m => detectedEmails.add(m.toLowerCase()));
            }
        }

        // Search for phones in text (improved regex for Spanish and international formats)
        if (detectedPhones.size < 3) {
            // RegEx mejorada para formatos españoles: 96 149 32 66, +34 961 493 266, 600-000-000, etc.
            const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}?\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;
            const textMatches = html.match(phoneRegex);
            if (textMatches) {
                textMatches.forEach(m => {
                    const cleanPhone = m.trim();
                    // Validar longitud mínima y que no sea una fecha u otro número largo irrelevante
                    if (cleanPhone.replace(/[-.\s()+]/g, '').length >= 9 && detectedPhones.size < 3) {
                        detectedPhones.add(cleanPhone);
                    }
                });
            }
        }

        // Search for physical addresses in text (robust keywords)
        if (detectedAddresses.size < 3) {
            const addressKeywords = ['calle', 'avenida', 'avda', 'pasaje', 'plaza', 'pza', 'carretera', 'ctra', 'c/'];
            const lines = html.replace(/<[^>]*>/g, '\n').split('\n');
            for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 15 && cleanLine.length < 100) {
                    const lowerLine = cleanLine.toLowerCase();
                    if (addressKeywords.some(kw => lowerLine.includes(kw))) {
                        // Verificar si tiene un código postal (5 dígitos)
                        if (/\d{5}/.test(cleanLine)) {
                            detectedAddresses.add(cleanLine);
                        }
                    }
                }
                if (detectedAddresses.size >= 3) break;
            }
        }

        logToFile(`📱 Social links found: ${socialLinks.length}, Emails: ${detectedEmails.size}, Phones: ${detectedPhones.size}`);

        // === EXTRACCIÓN DE CANDIDATOS DE LOGO (MEJORADA) ===

        // 1. JSON-LD EXTRACTION (Critical for CSR sites like Next.js)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const jsonText = $(el).html();
                if (!jsonText) return;
                const data = JSON.parse(jsonText);

                // Recursively find "logo" or "image" in JSON
                const extractLogosFromJson = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return;

                    if (obj.logo) {
                        const logoUrl = typeof obj.logo === 'string' ? obj.logo : obj.logo.url;
                        if (logoUrl) {
                            try {
                                logoCandidatesScored.push({
                                    url: new URL(logoUrl, url).toString(),
                                    score: 250, // High confidence from JSON-LD
                                    type: 'url'
                                });
                                logToFile(`🎯 JSON-LD: Logo encontrado: ${logoUrl}`);
                            } catch { }
                        }
                    }

                    // Also check for "image" if it's an Organization or Brand
                    if ((obj['@type'] === 'Organization' || obj['@type'] === 'Brand') && obj.image) {
                        const imgUrl = typeof obj.image === 'string' ? obj.image : obj.image.url;
                        if (imgUrl) {
                            try {
                                logoCandidatesScored.push({
                                    url: new URL(imgUrl, url).toString(),
                                    score: 180,
                                    type: 'url'
                                });
                                logToFile(`🎯 JSON-LD: Imagen de marca encontrada: ${imgUrl}`);
                            } catch { }
                        }
                    }

                    Object.values(obj).forEach(val => {
                        if (Array.isArray(val)) val.forEach(v => extractLogosFromJson(v));
                        else if (typeof val === 'object') extractLogosFromJson(val);
                    });
                    // SameAs extraction for social links
                    if (obj.sameAs) {
                        const sameAs = Array.isArray(obj.sameAs) ? obj.sameAs : [obj.sameAs];
                        sameAs.forEach((link: any) => {
                            if (typeof link === 'string') {
                                try {
                                    const fullUrl = new URL(link).toString().toLowerCase();
                                    for (const platform of socialPlatforms) {
                                        if (platform.patterns.some(p => fullUrl.includes(p))) {
                                            if (!socialLinks.some(s => s.url === fullUrl)) {
                                                socialLinks.push({ platform: platform.name, url: fullUrl });
                                            }
                                        }
                                    }
                                } catch { }
                            }
                        });
                    }
                };
                extractLogosFromJson(data);
            } catch (e) { }
        });

        // 2. FAVICON ESCALATION (Especialmente si es SVG o tiene "logo")
        if (faviconUrl) {
            const lowFavicon = faviconUrl.toLowerCase();
            if (lowFavicon.endsWith('.svg') || lowFavicon.includes('logo')) {
                logoCandidatesScored.push({
                    url: faviconUrl,
                    score: 220, // Favicon SVG is very likely the logo
                    type: 'url'
                });
                logToFile(`🎯 FAVICON ESCALATION: Favicon SVG tratado como logo candidato (220 puntos)`);
            }
        }

        // 3. MÁXIMA PRIORIDAD: Imágenes con 'logo' en el src e Inline SVGs
        $('img, svg').each((_, el) => {
            const isSvg = el.tagName === 'svg';
            const src = $(el).attr('src') || '';
            const dataSrc = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-lazyload') || '';
            const srcset = $(el).attr('srcset') || '';

            // Priorizar la fuente real (evitar placeholders de lazy-load)
            let actualSrc = src;
            if (dataSrc && (!src || src.startsWith('data:') || src.includes('placeholder'))) {
                actualSrc = dataSrc;
            } else if (srcset && (!src || src.startsWith('data:'))) {
                // Tomar la primera URL del srcset
                actualSrc = srcset.split(',')[0].trim().split(' ')[0];
            }

            const alt = ($(el).attr('alt') || '').toLowerCase();
            const className = ($(el).attr('class') || '').toLowerCase();
            const id = ($(el).attr('id') || '').toLowerCase();
            const width = parseInt($(el).attr('width') || '0');
            const height = parseInt($(el).attr('height') || '0');
            const itemprop = $(el).attr('itemprop') || '';

            // Calcular score basado en atributos
            let score = 0;

            // Site branding classes
            const brandClasses = ['site-logo', 'navbar-brand', 'custom-logo', 'brand-logo', 'header-logo', 'nav-logo', 'wp-custom-logo'];
            if (brandClasses.some(c => className.includes(c) || id.includes(c))) score += 120;

            // Keywords en src o alt
            const logoKeywords = ['logo', 'brand', 'identity', 'corporate'];
            if (actualSrc && logoKeywords.some(k => actualSrc.toLowerCase().includes(k))) score += 100;
            if (alt && logoKeywords.some(k => alt.includes(k))) score += 70;

            if (className.includes('logo')) score += 40;
            if (id.includes('logo')) score += 40;

            // Atributos del padre (común en links de logo)
            const parent = $(el).parent('a');
            if (parent.length > 0) {
                const parentAria = (parent.attr('aria-label') || '').toLowerCase();
                const parentTitle = (parent.attr('title') || '').toLowerCase();
                if (logoKeywords.some(k => parentAria.includes(k) || parentTitle.includes(k))) score += 80;
            }

            // Está en header o nav - ALTA PRIORIDAD
            const inHeader = $(el).closest('header, nav, [class*="header"], [class*="nav"], #header, #nav, .navbar').length > 0;
            if (inHeader) score += 60;

            // CRITICAL: Position-based scoring - Top-left corner boost
            // Los logos casi siempre están en la esquina superior izquierda
            if (inHeader) {
                try {
                    // Obtener posición del elemento relativa al header
                    const headerEl = $(el).closest('header, nav, [class*="header"], [class*="nav"], #header, #nav, .navbar')[0];
                    if (headerEl) {
                        const imgRect = (el as any).getBoundingClientRect?.();
                        const headerRect = (headerEl as any).getBoundingClientRect?.();

                        if (imgRect && headerRect) {
                            // Calcular posición relativa dentro del header
                            const relativeLeft = imgRect.left - headerRect.left;
                            const relativeTop = imgRect.top - headerRect.top;

                            // BOOST MASIVO: Si está en los primeros 20% del ancho del header
                            const leftPercentage = (relativeLeft / headerRect.width) * 100;
                            if (leftPercentage < 20) {
                                score += 120; // GRAN BOOST para posición izquierda
                            }

                            // BOOST ADICIONAL: Si está en los primeros 150px de altura
                            if (relativeTop < 150 && relativeTop >= 0) {
                                score += 80; // BOOST para posición superior
                            }

                            // COMBO BOOST: Esquina superior izquierda (zona típica de logos)
                            if (leftPercentage < 20 && relativeTop < 150 && relativeTop >= 0) {
                                score += 100; // BOOST EXTRA por estar en la zona perfecta
                            }
                        }
                    }
                } catch (e) {
                    // Si falla getBoundingClientRect (entorno servidor), continuar sin error
                }
            }

            // Home link wrapping logo
            const isHomeLink = $(el).closest('a[href="/"], a[rel="home"], a[title*="Home"], a[aria-label*="Home"]').length > 0;
            if (isHomeLink) score += 90;

            // SVG o PNG (formatos típicos de logos)
            if ((actualSrc && actualSrc.includes('.svg')) || isSvg) score += 40;

            // CRITICAL: Path-based scoring - uploads vs plugins
            if (actualSrc) {
                const srcLower = actualSrc.toLowerCase();
                // BOOST: Logos en carpetas de uploads (logos reales del usuario)
                if (srcLower.includes('/uploads/') || srcLower.includes('/media/') || srcLower.includes('/assets/')) {
                    score += 150; // GRAN BOOST para logos subidos por el usuario
                }
                // PENALTY: Logos en carpetas de plugins (casi nunca son el logo principal)
                if (srcLower.includes('/plugins/') || srcLower.includes('/addons/') || srcLower.includes('/extensions/')) {
                    score -= 100; // PENALIZACIÓN para logos de plugins
                }
            }

            // Excluir iconos pequeños (menos de 30px)
            if ((width > 0 && width < 30) || (height > 0 && height < 30)) score -= 100;

            // AJUSTE: Umbral más bajo para SVGs en header (capturar logos sin keywords)
            const minScore = (isSvg && inHeader) ? 20 : 60;

            // Solo añadir si tiene un score decente
            if (score > minScore) {
                if (isSvg) {
                    const svgHtml = $.html(el);
                    // Solo si es un SVG razonable (no un icono de 10 bytes)
                    if (svgHtml.length > 100) {
                        logoCandidatesScored.push({
                            content: svgHtml,
                            score: score + 20, // Extra bonus for inline SVGs as they are usually the real logo
                            type: 'inline-svg'
                        });
                    }
                } else if (actualSrc) {
                    try {
                        logoCandidatesScored.push({
                            url: new URL(actualSrc, url).toString(),
                            score,
                            type: 'url'
                        });
                    } catch { }
                }
            }
        });

        // REFINED SELECTORS: Buscar en cualquier contenedor que huela a cabecera
        const headerSelectors = 'header, nav, [class*="header"], [class*="nav"], #header, #nav, .navbar, .top-bar, .site-header';
        const firstHeaderSvg = $(headerSelectors).find('svg').first();
        const firstHeaderImg = $(headerSelectors).find('img').first();

        logToFile(`🔍 Buscando primer SVG/IMG en header con selectores ampliados...`);
        logToFile(`   - SVGs en header encontrados: ${$(headerSelectors).find('svg').length}`);
        logToFile(`   - IMGs en header encontrados: ${$(headerSelectors).find('img').length}`);
        logToFile(`   - firstHeaderSvg.length: ${firstHeaderSvg.length}`);

        if (firstHeaderSvg.length > 0) {
            const svgHtml = $.html(firstHeaderSvg);
            logToFile(`🎯 CONSTANTE: Primer SVG en header detectado - Longitud: ${svgHtml.length} caracteres`);
            if (svgHtml.length > 80) { // Umbral reducido
                const existingIndex = logoCandidatesScored.findIndex(
                    c => c.type === 'inline-svg' && c.content === svgHtml
                );
                if (existingIndex >= 0) {
                    logoCandidatesScored[existingIndex].score += 300;
                    logToFile(`🎯 BOOST: SVG existente en header potenciado (+300) - Score final: ${logoCandidatesScored[existingIndex].score}`);
                } else {
                    logoCandidatesScored.push({
                        content: svgHtml,
                        score: 350,
                        type: 'inline-svg'
                    });
                    logToFile(`🎯 NUEVO: Primer SVG en header añadido directamente (350 puntos)`);
                }
            } else {
                logToFile(`⚠️ SVG demasiado pequeño (${svgHtml.length} chars), ignorado`);
            }
        } else if (firstHeaderImg.length > 0) {
            logToFile(`🎯 Primera IMG en header detectada`);
            const imgSrc = firstHeaderImg.attr('src') || firstHeaderImg.attr('data-src') || firstHeaderImg.attr('data-lazy-src') || '';
            if (imgSrc) {
                try {
                    const imgUrl = new URL(imgSrc, url).toString();
                    const existingIndex = logoCandidatesScored.findIndex(
                        c => c.type === 'url' && c.url === imgUrl
                    );
                    if (existingIndex >= 0) {
                        logoCandidatesScored[existingIndex].score += 300;
                        logToFile(`🎯 BOOST: IMG existente en header potenciada (+300)`);
                    } else {
                        logoCandidatesScored.push({
                            url: imgUrl,
                            score: 330,
                            type: 'url'
                        });
                        logToFile(`🎯 NUEVA: Primera IMG en header añadida directamente (330 puntos)`);
                    }
                } catch { }
            }
        } else {
            logToFile(`⚠️ No se encontró ningún SVG ni IMG en contenedores de cabecera`);
        }

        // 1.1 NUEVO: Buscar logos en background-image de elementos HTML (Inline Styles)
        $('*[style*="background"]').each((_, el) => {
            const styleAttribute = $(el).attr('style') || '';
            const className = ($(el).attr('class') || '').toLowerCase();
            const id = ($(el).attr('id') || '').toLowerCase();

            const urlMatch = styleAttribute.match(/url\(['"]?([^'"]+)['"]?\)/i);
            if (urlMatch && urlMatch[1]) {
                const bgUrl = urlMatch[1];
                let score = 30; // Score base bajo para backgrounds genéricos

                const logoKeywords = ['logo', 'brand', 'identity', 'corporate'];
                if (className.includes('logo') || id.includes('logo')) score += 100;
                if (bgUrl.toLowerCase().includes('logo')) score += 50;
                if (logoKeywords.some(k => bgUrl.toLowerCase().includes(k))) score += 50;

                const inHeader = $(el).closest('header, nav, [class*="header"], [class*="nav"], #header, #nav, .navbar').length > 0;
                if (inHeader) score += 40;

                // CRITICAL: Path-based scoring - uploads vs plugins
                const bgUrlLower = bgUrl.toLowerCase();
                if (bgUrlLower.includes('/uploads/') || bgUrlLower.includes('/media/') || bgUrlLower.includes('/assets/')) {
                    score += 150; // GRAN BOOST para logos subidos por el usuario
                }
                if (bgUrlLower.includes('/plugins/') || bgUrlLower.includes('/addons/') || bgUrlLower.includes('/extensions/')) {
                    score -= 100; // PENALIZACIÓN para logos de plugins
                }

                if (score > 60) {
                    try {
                        logoCandidatesScored.push({
                            url: new URL(bgUrl, url).toString(),
                            score,
                            type: 'url'
                        });
                    } catch { }
                }
            }
        });

        // 2. OG Image como fallback (baja prioridad)
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
            try {
                logoCandidatesScored.push({
                    url: new URL(ogImage, url).toString(),
                    score: 5,
                    type: 'url'
                });
            } catch { }
        }

        // Twitter Image
        const twitterImage = $('meta[name="twitter:image"]').attr('content');
        if (twitterImage) {
            try {
                logoCandidatesScored.push({
                    url: new URL(twitterImage, url).toString(),
                    score: 5,
                    type: 'url'
                });
            } catch { }
        }

        // Ordenar por score (mayor primero)
        logoCandidatesScored.sort((a, b) => b.score - a.score);

        // Deduplicar candidatos (por URL o por contenido)
        const uniqueLogoCandidates: LogoCandidate[] = [];
        const seenUrls = new Set<string>();
        const seenContent = new Set<string>();

        for (const candidate of logoCandidatesScored) {
            if (candidate.type === 'url' && candidate.url) {
                if (!seenUrls.has(candidate.url)) {
                    seenUrls.add(candidate.url);
                    uniqueLogoCandidates.push(candidate);
                }
            } else if (candidate.type === 'inline-svg' && candidate.content) {
                if (!seenContent.has(candidate.content)) {
                    seenContent.add(candidate.content);
                    uniqueLogoCandidates.push(candidate);
                }
            }
        }

        logToFile(`🖼️ Logo candidates encontrados: ${uniqueLogoCandidates.length} (Top score: ${uniqueLogoCandidates[0]?.score || 0})`);
        logToFile(`📋 CANDIDATOS A LOGO (scored):`);
        uniqueLogoCandidates.slice(0, 5).forEach((c, i) => {
            if (c.type === 'inline-svg') {
                logToFile(`   ${i + 1}. SVG inline - Score: ${c.score} - Length: ${c.content?.length || 0} chars`);
            } else {
                logToFile(`   ${i + 1}. URL: ${c.url} - Score: ${c.score}`);
            }
        });

        // === EXTRACCIÓN DE IMÁGENES DEL SITIO (hasta 10) ===
        const imageCandidates: string[] = [];

        // Imágenes en secciones principales (hero, main, article)
        $('main img, article img, section img, .hero img, [class*="banner"] img').each((_, el) => {
            if (imageCandidates.length >= 10) return;
            const src = $(el).attr('src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
                try {
                    const imgUrl = new URL(src, url).toString();
                    if (!imageCandidates.includes(imgUrl)) {
                        imageCandidates.push(imgUrl);
                    }
                } catch { }
            }
        });

        // Imágenes con srcset (alta resolución)
        if (imageCandidates.length < 10) {
            $('img[srcset]').each((_, el) => {
                if (imageCandidates.length >= 10) return;
                const srcset = $(el).attr('srcset') || '';
                // Tomar la imagen más grande del srcset
                const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
                if (sources.length > 0) {
                    const src = sources[sources.length - 1]; // última es la más grande
                    if (src && !src.includes('logo') && !src.includes('icon')) {
                        try {
                            const imgUrl = new URL(src, url).toString();
                            if (!imageCandidates.includes(imgUrl)) {
                                imageCandidates.push(imgUrl);
                            }
                        } catch { }
                    }
                }
            });
        }

        // Fallback: cualquier imagen mediana/grande
        if (imageCandidates.length < 10) {
            $('img').each((_, el) => {
                if (imageCandidates.length >= 10) return;
                const src = $(el).attr('src');
                const width = $(el).attr('width');
                // Solo imágenes que parezcan medianas o sin especificar
                if (src && (!width || parseInt(width) > 100) && !src.includes('logo') && !src.includes('icon') && !src.includes('pixel') && !src.includes('track')) {
                    try {
                        const imgUrl = new URL(src, url).toString();
                        if (!imageCandidates.includes(imgUrl)) {
                            imageCandidates.push(imgUrl);
                        }
                    } catch { }
                }
            });
        }

        console.log(`🖼️ Imágenes candidatas extraídas: ${imageCandidates.length}`);

        // Track debug info
        const cssLinksProcessed: string[] = [];
        const rootColors: Record<string, string> = {};

        // =======================================================
        // === EXTRACCIÓN DE COLORES (ORDEN DE PRIORIDAD) ===
        // =======================================================
        // 1. Colores inline en HTML (style="...") - MÁS REPRESENTATIVOS
        // 2. Colores en SVG inline (fill, stroke) - ICONOS DE MARCA
        // 3. CSS custom properties (--primary, --brand) - DEFINIDOS POR DISEÑADOR
        // 4. CSS externos - ÚLTIMO (mucho ruido de frameworks)

        // === 1. MÁXIMA PRIORIDAD: Colores hardcodeados en atributos style del HTML ===
        const priorityColors: string[] = []; // Colores de alta prioridad van aquí

        console.log('🎯 Extrayendo colores inline del HTML (máxima prioridad)...');
        $('[style]').each((_, el) => {
            const styleAttr = $(el).attr('style') || '';

            // Extraer HEX
            const hexMatches = styleAttr.match(hexRegex);
            if (hexMatches) {
                hexMatches.forEach(hex => {
                    let normalizedHex = hex.toUpperCase();
                    if (normalizedHex.length === 4) {
                        normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                    }
                    if (isColorful(normalizedHex) && !priorityColors.includes(normalizedHex)) {
                        priorityColors.push(normalizedHex);
                    }
                });
            }

            // Extraer RGB
            let rgbMatch;
            const rgbRegexLocal = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g;
            while ((rgbMatch = rgbRegexLocal.exec(styleAttr)) !== null) {
                const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])).toUpperCase();
                if (isColorful(hex) && !priorityColors.includes(hex)) {
                    priorityColors.push(hex);
                }
            }
        });
        console.log(`✅ Colores inline HTML encontrados: ${priorityColors.length}`);

        // === 2. ALTA PRIORIDAD: Colores en SVG (fill, stroke) ===
        const svgColors: string[] = [];
        $('[fill], [stroke]').slice(0, 100).each((_, el) => {
            const fill = $(el).attr('fill');
            const stroke = $(el).attr('stroke');

            [fill, stroke].forEach(color => {
                if (!color || color === 'none' || color === 'currentColor' || color === 'inherit') return;

                let normalizedHex: string | null = null;

                // Handle HEX
                if (color.startsWith('#')) {
                    normalizedHex = color.toUpperCase();
                    if (normalizedHex.length === 4) {
                        normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                    }
                }
                // Handle RGB/RGBA
                else if (color.startsWith('rgb')) {
                    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
                    if (rgbMatch) {
                        normalizedHex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])).toUpperCase();
                    }
                }

                if (normalizedHex && isColorful(normalizedHex)) {
                    if (!svgColors.includes(normalizedHex)) {
                        svgColors.push(normalizedHex);
                    }
                    if (!priorityColors.includes(normalizedHex)) {
                        priorityColors.push(normalizedHex);
                    }
                }
            });
        });
        console.log(`✅ Colores SVG encontrados: ${svgColors.length} (también añadidos a prioridad)`);


        // === 3. COLORES EN STYLE TAGS INTERNOS (temas como Avada/Fusion) ===
        // Los temas de WordPress generan CSS dinámico con los colores de marca
        console.log('🎨 Extrayendo colores de style tags internos (tema)...');
        $('style').each((_, styleEl) => {
            const cssContent = $(styleEl).text();
            if (!cssContent) return;

            // Buscar background-color con HEX (más representativo de bloques de marca)
            const bgColorRegex = /background-color\s*:\s*(#[0-9A-Fa-f]{3,6})\s*[;!}]/gi;
            let bgMatch;
            while ((bgMatch = bgColorRegex.exec(cssContent)) !== null) {
                let hex = bgMatch[1].toUpperCase();
                if (hex.length === 4) {
                    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                }
                if (isColorful(hex) && !priorityColors.includes(hex)) {
                    priorityColors.push(hex);
                    console.log(`   🎯 Style tag background-color: ${hex}`);
                }
            }

            // Buscar colores de botones específicamente (button, .btn, [class*="button"])
            const buttonColorRegex = /(?:\.btn|\.button|input\[type="?submit"?\]|\.fusion-button)[^{]*\{[^}]*(?:background-color|background)\s*:\s*(#[0-9A-Fa-f]{3,6})/gi;
            let btnMatch;
            while ((btnMatch = buttonColorRegex.exec(cssContent)) !== null) {
                let hex = btnMatch[1].toUpperCase();
                if (hex.length === 4) {
                    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                }
                if (isColorful(hex) && !priorityColors.includes(hex)) {
                    priorityColors.unshift(hex); // Botones al principio
                    console.log(`   🔘 Style tag button color: ${hex}`);
                }
            }
        });
        console.log(`✅ Colores de style tags. Total prioridad: ${priorityColors.length}`);

        // === 3. CSS externos (menor prioridad, mucho ruido de frameworks) ===
        // FILTRADO INTELIGENTE: Ignorar plugins de WordPress, frameworks genéricos, y CDNs
        const CSS_BLACKLIST_PATTERNS = [
            '/wp-content/plugins/', '/wp-includes/', 'woocommerce', 'elementor',
            'yoast', 'contact-form', 'jetpack', 'google-fonts', 'font-awesome',
            'fontawesome', 'bootstrap', 'tailwind', 'jquery', 'slick', 'swiper',
            'cdn.jsdelivr', 'cdnjs.cloudflare', 'unpkg.com', 'googleapis.com',
        ];

        const cssLinks = $('link[rel="stylesheet"]');
        console.log(`📄 Total CSS externos encontrados: ${cssLinks.length}`);

        // Filtrar CSS relevantes (solo temas, no plugins)
        const relevantCssUrls: string[] = [];
        for (let i = 0; i < cssLinks.length; i++) {
            const href = $(cssLinks[i]).attr('href');
            if (href) {
                try {
                    const cssUrl = new URL(href, url).toString();
                    const isBlacklisted = CSS_BLACKLIST_PATTERNS.some(p => cssUrl.toLowerCase().includes(p.toLowerCase()));
                    if (!isBlacklisted) {
                        relevantCssUrls.push(cssUrl);
                    }
                } catch { }
            }
        }
        console.log(`✅ CSS relevantes (post-filtrado): ${relevantCssUrls.length}`);

        // Procesar hasta los primeros 5 CSS relevantes (empezando por los del tema)
        for (let i = 0; i < Math.min(relevantCssUrls.length, 5); i++) {
            const cssUrl = relevantCssUrls[i];
            try {
                const cssRes = await fetch(cssUrl, {
                    signal: AbortSignal.timeout(3000),
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (cssRes.ok) {
                    const cssContent = await cssRes.text();
                    cssLinksProcessed.push(cssUrl);

                    // PRIORITARIO: Extraer CSS custom properties de archivos externos
                    // Modificado para capturar el nombre de la variable y el valor
                    console.log(`🎨 Procesando CSS: ${cssUrl.substring(0, 60)}...`);
                    const cssVarRegex = /(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,6}|rgb[a]?\([^)]+\))/gi;
                    let varMatch;
                    let iterationCount = 0;
                    const MAX_ITERATIONS = 1000; // Prevenir bucles infinitos

                    while ((varMatch = cssVarRegex.exec(cssContent)) !== null) {
                        iterationCount++;
                        if (iterationCount > MAX_ITERATIONS) {
                            console.warn(`⚠️ CSS regex alcanzó límite de iteraciones (${MAX_ITERATIONS}). Abortando procesamiento de ${cssUrl}`);
                            break;
                        }

                        const varName = varMatch[1];
                        const value = varMatch[2];

                        if (value.startsWith('#')) {
                            let normalizedHex = value.toUpperCase();
                            if (normalizedHex.length === 4) {
                                normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                            }
                            colorCandidates.unshift(normalizedHex);
                            rootColors[varName] = normalizedHex;
                        }
                    }
                    console.log(`✅ CSS procesado: ${Object.keys(rootColors).length} variables encontradas`);

                    // 🔤 Deep Font Audit: Extraer fuentes del CSS
                    const cssFonts = extractFontsFromContent(cssContent);
                    cssFonts.forEach(f => {
                        if (!detectedFonts.includes(f)) {
                            detectedFonts.push(f);
                        }
                    });

                    // Extraer HEX
                    const hexMatches = cssContent.match(hexRegex);
                    if (hexMatches) {
                        hexMatches.forEach(hex => {
                            // Normalizar hex cortos a largos
                            let normalizedHex = hex.toUpperCase();
                            if (normalizedHex.length === 4) {
                                normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                            }
                            colorCandidates.push(normalizedHex);
                        });
                    }

                    // Extraer RGB
                    let rgbMatch;
                    let rgbIterationCount = 0;
                    while ((rgbMatch = rgbRegex.exec(cssContent)) !== null) {
                        rgbIterationCount++;
                        if (rgbIterationCount > MAX_ITERATIONS) {
                            console.warn(`⚠️ RGB regex alcanzó límite de iteraciones. Abortando.`);
                            break;
                        }
                        const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
                        colorCandidates.push(hex.toUpperCase());
                    }
                    console.log(`✅ RGB procesado: ${rgbIterationCount} colores encontrados`);

                    // MODO AGRESIVO: Buscar CUALQUIER imagen de fondo que se llame "logo" en el CSS
                    console.log(`🔍 Buscando logos en CSS...`);
                    const genericLogoBgRegex = /url\(['"]?([^'"]*logo[^'"]*)['"]?\)/gi;
                    let genericMatch;
                    let genericLogoIterationCount = 0;
                    while ((genericMatch = genericLogoBgRegex.exec(cssContent)) !== null) {
                        genericLogoIterationCount++;
                        if (genericLogoIterationCount > MAX_ITERATIONS) {
                            console.warn(`⚠️ Logo regex alcanzó límite de iteraciones. Abortando.`);
                            break;
                        }
                        const bgUrl = genericMatch[1];
                        try {
                            logoCandidatesScored.push({
                                url: new URL(bgUrl, url).toString(),
                                score: 110,
                                type: 'url'
                            });
                        } catch { }
                    }
                    console.log(`✅ Logos genéricos encontrados: ${genericLogoIterationCount}`);

                    // MODO SELECTOR: Buscar selectores con "logo" que tengan un background
                    // REGEX SIMPLIFICADO para evitar backtracking catastrófico
                    console.log(`🔍 Buscando logos por selector...`);
                    const logoBgRegex = /\.[\w-]*logo[\w-]*[^{]*\{[^}]*(?:background(?:-image)?)?[^}]*url\(['"]?([^'"]+)['"]?\)/gi;
                    let logoMatch;
                    let selectorLogoIterationCount = 0;
                    const MAX_SELECTOR_ITERATIONS = 100; // Más estricto para regex complejo
                    while ((logoMatch = logoBgRegex.exec(cssContent)) !== null) {
                        selectorLogoIterationCount++;
                        if (selectorLogoIterationCount > MAX_SELECTOR_ITERATIONS) {
                            console.warn(`⚠️ Selector logo regex alcanzó límite de ${MAX_SELECTOR_ITERATIONS} iteraciones. Abortando.`);
                            break;
                        }
                        const bgUrl = logoMatch[1];
                        const score = 100; // Score fijo ya que sabemos que tiene "logo" en el selector

                        try {
                            logoCandidatesScored.push({
                                url: new URL(bgUrl, url).toString(),
                                score,
                                type: 'url'
                            });
                        } catch { }
                    }
                    console.log(`✅ Logos por selector encontrados: ${selectorLogoIterationCount}`);
                }
            } catch (cssError) {
                console.error(`❌ Error procesando CSS ${cssUrl}:`, cssError);
            }
        }

        // Colores en <style> tags inline
        $('style').each((_, el) => {
            const content = $(el).html() || '';

            // PRIORITARIO: Extraer CSS custom properties (--primary, --brand, --accent, etc.)
            // Estas variables típicamente contienen los colores oficiales de la marca
            const cssVarRegex = /(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,6}|rgb[a]?\([^)]+\))/gi;
            let varMatch;
            const varsFound = 0;
            while ((varMatch = cssVarRegex.exec(content)) !== null) {
                const varName = varMatch[1];
                const value = varMatch[2];
                if (value.startsWith('#')) {
                    let normalizedHex = value.toUpperCase();
                    if (normalizedHex.length === 4) {
                        normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                    }
                    // Añadir al principio para darle prioridad
                    colorCandidates.unshift(normalizedHex);
                    rootColors[varName] = normalizedHex;
                }
            }

            const hexMatches = content.match(hexRegex);
            if (hexMatches) {
                hexMatches.forEach(hex => {
                    let normalizedHex = hex.toUpperCase();
                    if (normalizedHex.length === 4) {
                        normalizedHex = '#' + normalizedHex[1] + normalizedHex[1] + normalizedHex[2] + normalizedHex[2] + normalizedHex[3] + normalizedHex[3];
                    }
                    colorCandidates.push(normalizedHex);
                });
            }

            // MODO AGRESIVO: Buscar CUALQUIER imagen de fondo que se llame "logo" en bloques <style>
            const genericLogoBgRegex = /url\(['"]?([^'"]*logo[^'"]*)['"]?\)/gi;
            let genericMatch;
            while ((genericMatch = genericLogoBgRegex.exec(content)) !== null) {
                const bgUrl = genericMatch[1];
                try {
                    logoCandidatesScored.push({
                        url: new URL(bgUrl, url).toString(),
                        score: 120, // Aún más prioridad si está inline
                        type: 'url'
                    });
                } catch { }
            }

            // MODO SELECTOR: Buscar selectores con "logo" que tengan un background
            const logoBgRegex = /([^{}]*logo[^{}]*)[\s\S]*?\{[\s\S]*?background(?:-image)?\s*:[^;]*?url\(['"]?([^'"]+)['"]?\)/gi;
            let logoMatch;
            while ((logoMatch = logoBgRegex.exec(content)) !== null) {
                const selector = logoMatch[1].toLowerCase();
                const bgUrl = logoMatch[2];
                let score = 90;
                if (selector.includes('#logo') || selector.includes('.logo')) score += 60;
                if (bgUrl.toLowerCase().includes('logo')) score += 40;

                try {
                    logoCandidatesScored.push({
                        url: new URL(bgUrl, url).toString(),
                        score,
                        type: 'url'
                    });
                } catch { }
            }
        });

        // Contar frecuencia de colores del CSS
        const colorFrequency: Record<string, number> = {};
        colorCandidates.forEach(color => {
            if (color.length === 7 && isColorful(color)) {
                colorFrequency[color] = (colorFrequency[color] || 0) + 1;
            }
        });

        // Deduplicar colores del CSS y ordenar por frecuencia
        const cssUniqueColors = [...new Set(
            colorCandidates
                .filter(color => color.length === 7)
                .filter(isColorful)
        )];

        const cssSortedColors = cssUniqueColors.sort((a, b) =>
            (colorFrequency[b] || 0) - (colorFrequency[a] || 0)
        );

        // === COMBINAR: priorityColors (HTML inline, SVG) PRIMERO, luego CSS ===
        // Los colores de HTML inline y SVG son los más representativos de la marca
        const allColorsOrdered = [...priorityColors];
        cssSortedColors.forEach(color => {
            if (!allColorsOrdered.some(existing => colorDistance(color, existing) < 30)) {
                allColorsOrdered.push(color);
            }
        });

        const finalColors = deduplicateSimilarColors(allColorsOrdered, 30);

        // === CODE AUDIT PALETTE GENERATION ===
        // Estrategia: 
        // 1. Root Variables (Intención explícita del diseñador)
        // 2. Colores Prioritarios (Botones, Inline Styles - overrides de UI)
        // 3. Resto del CSS (Frecuencia)
        const rawAudit = [
            ...Object.values(rootColors),
            ...priorityColors,
            ...cssSortedColors
        ];

        // Deduplicar y limitar a Top 10
        const codePalette = deduplicateSimilarColors(rawAudit, 15).slice(0, 10);
        console.log(`💻 Code Audit Palette generada: ${codePalette.length} colores`);

        console.log(`🎨 Colores finales: ${finalColors.length} (Prioridad HTML/SVG: ${priorityColors.length}, CSS: ${cssSortedColors.length})`);

        // === 6. DESIGN INTENT PALETTE ===
        // Filter root colors for semantic names
        const semanticKeywords = [
            'primary', 'brand', 'secondary', 'accent', 'theme', 'color-1',
            'action', 'cta', 'link', 'sidebar', 'nav', 'header', 'active',
            'blue', 'red', 'green', 'purple', 'orange', 'pink' // Common Tailwind-ish
        ];

        Object.entries(rootColors).forEach(([name, value]) => {
            const lowerName = name.toLowerCase();
            if (semanticKeywords.some(k => lowerName.includes(k))) {
                if (!designColors.includes(value)) designColors.push(value);
            }
        });

        const designPalette = deduplicateSimilarColors(designColors, 10).slice(0, 10);
        console.log(`🎨 Design Intent Palette generated: ${designPalette.length} colors`);

        return {
            colors: Object.keys(colorFrequency),
            colorFrequency,
            logoCandidates: uniqueLogoCandidates,
            faviconUrl,
            imageCandidates,
            cssLinks: cssLinksProcessed,
            rootColors,
            codePalette,
            svgPalette: deduplicateSimilarColors(svgColors, 15).slice(0, 10),
            designPalette,
            fonts: detectedFonts,
            socialLinks,
            emails: Array.from(detectedEmails),
            phones: Array.from(detectedPhones),
            addresses: Array.from(detectedAddresses),
            html
        };
    } catch (error) {
        console.error('Error en fetchHtmlAndExtractAssets:', error);
        return {
            colors: [],
            colorFrequency: {},
            logoCandidates: [],
            faviconUrl: null,
            imageCandidates: [],
            cssLinks: [],
            rootColors: {},
            codePalette: [],
            svgPalette: [],
            designPalette: [],
            fonts: [],
            socialLinks: [],
            emails: [],
            phones: [],
            addresses: [],
            html: ''
        };
    }
}

/**
 * Procesa una imagen o contenido SVG y la sube a Supabase
 */
async function processAndUploadImage(
    imageSource: string,
    prefix: string,
    maxWidth: number = 800
): Promise<string | null> {
    try {
        let buffer: Buffer;
        let contentType: string;

        if (imageSource.startsWith('<svg') || imageSource.includes('<svg')) {
            // Es un string de SVG inline
            console.log(`🎨 Procesando SVG inline para: ${prefix}`);
            buffer = Buffer.from(imageSource);
            contentType = 'image/svg+xml';
        } else {
            // Es una URL
            console.log(`📥 Descargando imagen desde: ${imageSource.substring(0, 100)}...`);
            const response = await fetch(imageSource, {
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                console.error(`❌ Error al descargar imagen: HTTP ${response.status}`);
                return null;
            }

            contentType = response.headers.get('content-type') || '';
            console.log(`📄 Content-Type recibido: ${contentType}`);

            // VALIDACIÓN ESTRICTA: Rechazar todo lo que NO sea una imagen
            const validImageTypes = ['image/', 'application/octet-stream']; // octet-stream a veces es usado por CDNs
            const isValidImage = validImageTypes.some(type => contentType.includes(type)) || imageSource.endsWith('.svg');

            if (!isValidImage) {
                console.error(`❌ Tipo de contenido inválido: ${contentType}. Se esperaba una imagen.`);
                return null;
            }

            buffer = Buffer.from(await response.arrayBuffer());

            // VALIDACIÓN DE TAMAÑO: Rechazar buffers muy pequeños (probablemente corruptos)
            if (buffer.length < 100) {
                console.error(`❌ Buffer demasiado pequeño (${buffer.length} bytes). Probablemente corrupto.`);
                return null;
            }

            console.log(`✅ Imagen descargada correctamente: ${buffer.length} bytes`);
        }

        // Convertir a WebP con Sharp
        const image = sharp(buffer);

        // VALIDACIÓN DE DIMENSIONES: Verificar que sea una imagen real con tamaño mínimo
        const metadata = await image.metadata();
        console.log(`📐 Dimensiones de la imagen: ${metadata.width}x${metadata.height}`);

        // Rechazar imágenes demasiado pequeñas (probablemente corruptas o placeholders)
        // DIMENSIONES SEGÚN TIPO: screenshots muy estrictos, logos permisivos
        let MIN_WIDTH = 200;
        let MIN_HEIGHT = 200;

        if (prefix === 'screenshots') {
            // Screenshots: Relaxed to allow partial or smaller screenshots for color analysis
            MIN_WIDTH = 200;
            MIN_HEIGHT = 200;
        } else if (prefix === 'logos' || prefix === 'favicons') {
            // Logos y favicons: Permisivos (muchos logos son pequeños)
            MIN_WIDTH = 32;
            MIN_HEIGHT = 32;
        }


        if (!metadata.width || !metadata.height || metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
            console.error(`❌ Imagen rechazada (${prefix}): dimensiones inválidas (${metadata.width}x${metadata.height}). Se requiere mínimo ${MIN_WIDTH}x${MIN_HEIGHT}px`);
            return null;
        }

        // Si es SVG, sharp lo maneja nativamente si el buffer contiene el XML
        console.log(`🔄 Procesando con Sharp (prefix: ${prefix}, maxWidth: ${maxWidth})...`);
        const webpBuffer = await image
            .resize({ width: maxWidth, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();

        console.log(`✅ Conversión a WebP completada: ${webpBuffer.length} bytes`);

        // CONVEX MIGRATION: 1. Generate Upload URL
        const uploadUrl = await fetchMutation(api.assets.generateUploadUrl, {});

        // CONVEX MIGRATION: 2. Upload File via POST
        const result = await fetch(uploadUrl, {
            method: "POST",
            body: new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' }),
            headers: { "Content-Type": "image/webp" },
        });

        if (!result.ok) {
            logDebug('Error uploading to Convex Storage:', result.statusText);
            return null;
        }

        const { storageId } = await result.json();

        // CONVEX MIGRATION: 3. Get public signed URL immediately
        // The /_storage/ URLs are NOT publicly accessible, so we need to get the signed URL
        // using ctx.storage.getUrl() via the getImageUrl query.
        console.log(`🔗 [DEBUG] Convex Storage ID: ${storageId}`);

        const publicUrl = await fetchQuery(api.assets.getImageUrl, { storageId });

        if (!publicUrl) {
            console.error(`❌ Failed to get public URL for storage ID: ${storageId}`);
            return null;
        }

        console.log(`🔗 [DEBUG] Public signed URL: ${publicUrl.substring(0, 100)}...`);
        return publicUrl;

    } catch (error) {
        console.error('❌ [DEBUG] Error processing image:', error);
        return null;
    }
}

// ============= MAIN ACTION =============

/**
 * Acción principal: Analiza el ADN de marca de una URL
 * @param clerkUserId - ID del usuario de Clerk para asociar el Brand Kit
 */
export async function analyzeBrandDNA(url: string, forceRefresh: boolean = false, clerkUserId?: string): Promise<AnalyzeBrandDNAResponse> {
    try {
        if (!clerkUserId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Limpieza de consola y banner visual
        console.clear();
        console.log('\n');
        console.log('═'.repeat(80));
        console.log('🧬 BRAND DNA ANALYSIS - NEW SESSION');
        console.log('═'.repeat(80));
        console.log(`📍 URL: ${url}`);
        console.log(`🔄 Force Refresh: ${forceRefresh ? 'YES' : 'NO'}`);
        console.log(`👤 User ID: ${clerkUserId || 'Anonymous'}`);
        console.log('═'.repeat(80));
        console.log('\n');


        const displayUrl = url.trim();
        // Validacion basica de URL (solo para fetch)
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        // Check if we already have complete data to avoid redundant analysis
        if (!forceRefresh) {
            try {
                // CONVEX MIGRATION: using fetchQuery
                let existingData = await authedFetchQuery(api.brands.getBrandDNA, { url: displayUrl, clerk_user_id: clerkUserId });
                if (!existingData && displayUrl !== url) {
                    existingData = await authedFetchQuery(api.brands.getBrandDNA, { url, clerk_user_id: clerkUserId });
                }

                // Si ya tenemos datos Y tienen text_assets, podemos retornar temprano
                if (existingData && existingData.text_assets) {
                    console.log('Data found in DB with text_assets. Returning cached result.');
                    if (displayUrl && existingData.url !== displayUrl) {
                        try {
                            await authedFetchMutation(api.brands.updateBrandDNADoc, {
                                id: (existingData as any)._id,
                                clerk_user_id: clerkUserId!,
                                updates: { url: displayUrl, updated_at: new Date().toISOString() },
                            });
                        } catch (updateError) {
                            console.warn('[analyzeBrandDNA] Failed to update display url:', updateError);
                        }
                        return { success: true, data: { ...(existingData as any), url: displayUrl } as BrandDNA };
                    }
                    return { success: true, data: existingData as unknown as BrandDNA };
                }

                if (existingData) {
                    console.log('⚠️ Data found but text_assets are missing. Forcing re-analysis.');
                }
            } catch (err) {
                // No hay datos previos, continuamos normal
            }
        }

        // === API TRACE & DATA EXTRACTION ===
        const apiTrace: { action: string; status: 'success' | 'fail' | 'pending' | 'highlight'; timestamp: number; details?: string }[] = [];

        // 0. Cache Lookup - SOLO PARA EL SCREENSHOT (Skip si forceRefresh=true)
        console.log(`🔍 Checking cache for screenshot: ${url}`);
        let cachedScreenshotUrl: string | undefined;

        if (!forceRefresh) {
            try {
                // CONVEX MIGRATION: Reuse getBrandDNA query
                const cachedData = await authedFetchQuery(api.brands.getBrandDNA, { url, clerk_user_id: clerkUserId });

                if (cachedData && cachedData.debug?.screenshot_url) {
                    console.log('✅ Found cached screenshot! Will reuse it but re-analyze everything else.');
                    cachedScreenshotUrl = cachedData.debug.screenshot_url;
                    apiTrace.push({ action: 'Capture: ApiFlash', status: 'success', timestamp: Date.now(), details: 'Screenshot recuperado de caché' });
                }
            } catch (err) {
                console.log('Cache search skipped or failed', err);
            }
        } else {
            console.log('⚡ Skipping cache due to forceRefresh=true');
        }

        const addTrace = (action: string, status: 'success' | 'fail' | 'highlight' | 'pending', details?: string) => {
            apiTrace.push({ action, status, timestamp: Date.now(), details });
        };

        // 1. Fetch paralelo: Jina + HTML extraction
        console.log('📡 Obteniendo datos de Jina y analizando CSS...');
        addTrace('Content: Fetch', 'pending', 'Iniciando fetch de contenido...');

        const [jinaResult, htmlAssets] = await Promise.all([
            fetchJinaContent(url).then(res => {
                addTrace('Content: Jina', res ? 'success' : 'fail', res ? `Jina: ${res.length} chars` : 'Jina falló');
                return res;
            }).catch(err => {
                addTrace('Content: Jina', 'fail', `Jina error: ${err.message}`);
                logDebug('Jina error:', err);
                return '';
            }),
            fetchHtmlAndExtractAssets(url, undefined, forceRefresh).then(res => {
                addTrace('Content: Scraper', 'success', `Assets: ${res.logoCandidates.length} logos, ${res.colors.length} colores`);
                // Logging de extracción para debug
                logToFile(`🔍 Extracción inicial: ${res.socialLinks.length} RRSS, ${res.emails.length} emails, ${res.phones.length} teléfonos, ${res.addresses.length} direcciones`);
                return res;
            }).catch(err => {
                addTrace('Content: Scraper', 'fail', `Scraper error: ${err.message}`);
                logDebug('HTML assets error:', err);
                return {
                    colors: [] as string[],
                    colorFrequency: {},
                    logoCandidates: [] as LogoCandidate[],
                    faviconUrl: null,
                    imageCandidates: [] as string[],
                    cssLinks: [] as string[],
                    rootColors: {} as Record<string, string>,
                    codePalette: [] as string[],
                    svgPalette: [] as string[],
                    designPalette: [] as string[],
                    fonts: [] as string[],
                    socialLinks: [] as { platform: string; url: string }[],
                    emails: [] as string[],
                    phones: [] as string[],
                    addresses: [] as string[],
                    html: ''
                };
            }),
        ]);

        addTrace('Content: Fetch', 'success', 'Contenido descargado correctamente');

        let jinaContent = jinaResult;

        // Fallback: Si Jina falla pero tenemos HTML, extraemos texto básico
        if (!jinaContent && htmlAssets.html) {
            console.log('⚠️ Jina failed, falling back to local HTML text extraction');
            try {
                const $ = cheerio.load(htmlAssets.html);
                // Eliminar ruido
                $('script, style, svg, noscript, iframe, link, meta').remove();
                // Extraer texto limpio
                jinaContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 50000);
                console.log(`✅ Texto extraído de HTML: ${jinaContent.length} caracteres`);
            } catch (e) {
                console.error('Error extracting text from HTML:', e);
            }
        }

        if (!jinaContent && !htmlAssets.html) {
            throw new Error('No se pudo acceder al contenido de la URL. Comprueba que la dirección es correcta e inténtalo de nuevo.');
        }

        // === CONSOLIDAR CANDIDATOS DE LOGO INICIALES ===
        const allLogoCandidatesScored: LogoCandidate[] = [...htmlAssets.logoCandidates];

        // ========== EXTRACCIÓN DE COLORES MEJORADA ==========
        // Fuentes de colores en orden de prioridad:
        // 1. Color dominante de OG image (análisis visual directo de imagen de marca)
        // 2. Paleta de Microlink (análisis visual de la página completa)
        // 3. CSS variables de marca (--primary, --brand, etc.)
        // 4. CSS general filtrado (sin colores de frameworks)

        // Color extraction consolidated in weighted static analysis
        const allColors: string[] = [];

        // ANÁLISIS WEIGHTED: Usar análisis estático (Microlink weighted DOM desactivado - da 403)
        console.log('🎯 Ejecutando análisis weighted estático...');
        const staticWeighted = analyzeStaticWeightedDOM(htmlAssets.html, htmlAssets.rootColors);
        const weightedFonts: string[] = staticWeighted.weightedFonts.map(f => f.font);
        const weightedColors: string[] = staticWeighted.weightedColors.map(c => c.hex);
        console.log(`✅ Weighted analysis: ${weightedColors.length} colores, ${weightedFonts.length} fuentes`);

        // Aplicar Colores del Weighted DOM
        if (weightedColors.length > 0) {
            console.log(`🎨 Aplicando Colores del Weighted DOM (${weightedColors.length})`);
            weightedColors.forEach((color: string) => {
                if (!allColors.some(c => colorDistance(c, color) < 30)) {
                    allColors.push(color);
                }
            });
        }



        // FUENTE DE ALTA PRIORIDAD: Color del LOGO
        if (htmlAssets.logoCandidates.length > 0) {
            console.log(`🔍 Extrayendo colores del logo prioritario...`);
            try {
                const firstLogo = htmlAssets.logoCandidates[0];
                const logoSource = firstLogo.type === 'inline-svg' ? firstLogo.content! : firstLogo.url!;

                let logoBuffer: Buffer | null = null;

                if (firstLogo.type === 'inline-svg') {
                    logoBuffer = Buffer.from(logoSource);
                } else {
                    const logoRes = await fetch(logoSource, { signal: AbortSignal.timeout(5000) });
                    if (logoRes.ok) {
                        logoBuffer = Buffer.from(await logoRes.arrayBuffer());
                    }
                }

                if (logoBuffer) {
                    const logoColors = await getProminentColors(logoBuffer);
                    console.log(`🎨 Colores del logo: ${logoColors.join(', ')}`);
                    logoColors.forEach(color => {
                        if (!allColors.some(c => colorDistance(c, color) < 25)) {
                            allColors.unshift(color); // Prioridad máxima
                        }
                    });
                }
            } catch (e) {
                console.error('Error extracting colors from logo:', e);
            }
        }

        // 4. CSS: Buscar variables CSS de marca (--primary, --brand, --accent, etc.)
        // Estas suelen contener los colores exactos definidos por el diseñador
        if (htmlAssets.colors.length > 0) {
            console.log(`🔧 Complementando con CSS (${htmlAssets.colors.length} colores disponibles)`);
            const cssColorsFiltered = htmlAssets.colors.filter(color => {
                // Filtrar colores típicos de frameworks (azules de bootstrap, etc)
                const lowerColor = color.toLowerCase();
                const frameworkColors = [
                    '#007bff', '#6c757d', '#28a745', '#dc3545', '#ffc107', '#17a2b8', // Bootstrap
                    '#0d6efd', '#198754', '#0dcaf0', '#fd7e14', // Bootstrap 5
                    '#3b82f6', '#ef4444', '#22c55e', '#f97316', // Tailwind
                    '#2563eb', '#7c3aed', '#db2777', '#059669', // Tailwind
                    '#1e88e5', '#43a047', '#e53935', '#fb8c00', // Material
                    '#0068a0', '#141b38', '#fa9b57', '#f7763f', // Colores de accesibilidad/plugins
                ];
                const isFrameworkColor = frameworkColors.some(fw => fw.toLowerCase() === lowerColor);
                return !isFrameworkColor && isColorful(color);
            });

            cssColorsFiltered.forEach(color => {
                if (allColors.length < 10 && !allColors.some(existing => colorDistance(color, existing) < 40)) {
                    allColors.push(color);
                }
            });
        }

        const finalColors = deduplicateSimilarColors(allColors, 30);

        // 1.5 Descubrimiento y Scraping de páginas internas valiosas
        console.log('🔍 Buscando páginas internas valiosas para mayor contexto...');
        const htmlContent = htmlAssets.html || '';
        const valuablePages = discoverValuablePages(htmlContent, url);

        let fullBrandContext = jinaContent;
        if (valuablePages.length > 0) {
            console.log(`🔗 Scrapeando ${valuablePages.length} páginas adicionales:`, valuablePages);
            const additionalContents = await Promise.all(
                valuablePages.map(pageUrl => fetchJinaContent(pageUrl).catch(err => {
                    console.error(`Error scrapper Jina para ${pageUrl}:`, err);
                    return '';
                }))
            );

            additionalContents.forEach((content, idx) => {
                if (content && content.length > 100) {
                    fullBrandContext += `\n\n--- CONTENIDO ADICIONAL (${valuablePages[idx]}) ---\n${content.slice(0, 15000)}`;
                }
            });
        }

        console.log(`📄 Contexto total: ${fullBrandContext.length} caracteres`);
        const assets = htmlAssets as any;
        console.log(`🎨 Colores finales: ${finalColors.slice(0, 5).join(', ')}`);
        console.log(`🖼️ Logo candidates: ${assets.logoCandidates?.length || 0}`);

        addTrace('Content: Assets', 'success', `Assets procesados: ${finalColors.length} colores, ${allLogoCandidatesScored.length} logos`);


        // 2. Procesar con Gemini Flash Lite
        console.log('🤖 Procesando con Gemini Flash Lite...');
        addTrace('Analysis: Gemini', 'pending', 'Iniciando generación de identidad con Gemini...');

        const systemPrompt = buildBrandAnalysisPrompt({
            detectedFonts: assets.fonts || [],
            weightedFonts,
            detectedColors: finalColors,
            colorFrequency: assets.colorFrequency,
            fullBrandContext
        });

        let brandDNA: any;

        try {
            console.log('🤖 Intentando con Gemini Flash Lite...');
            const { object } = await generateObject({
                model,
                schema: BrandDNASchema,
                prompt: systemPrompt,
            });

            brandDNA = object;
            addTrace('Analysis: Gemini', 'highlight', 'Análisis de Brand DNA completado con éxito');
            console.log('✅ Gemini generated Brand DNA successfully');
            logDebug('✅ Gemini Response:', brandDNA);
        } catch (aiError: any) {
            addTrace('Analysis: Gemini', 'fail', aiError.message);
            console.error('❌ Gemini AI Error:', aiError.message);
            logToFile(`⚠️ Gemini falló. Intentando con Groq (Llama 3.3)...`);

            try {
                const { object } = await generateObject({
                    model: groqModel,
                    schema: BrandDNASchema,
                    prompt: systemPrompt,
                });
                brandDNA = object;
                addTrace('Analysis: Groq', 'highlight', 'Análisis de Brand DNA completado con éxito');
                console.log('✅ Groq generated Brand DNA successfully');
            } catch (groqError: any) {
                addTrace('Analysis: Groq', 'fail', groqError.message);
                console.error('❌ Groq AI Error:', groqError.message);
                logToFile(`❌ Fallo total de IA (Gemini y Groq). Usando heurística.`);

                addTrace('Analysis: Heuristic', 'highlight', 'Generando Brand DNA básico por fallo de IA');
                // Fallback HEURÍSTICO basado en el DOM
                const $ = cheerio.load(htmlAssets.html || '');
                const siteTitle = $('title').text() || $('meta[property="og:title"]').attr('content') || new URL(url).hostname;
                const siteDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || "Análisis centrado en identidad visual y sistemas de color.";

                brandDNA = {
                    brand_name: siteTitle.split('|')[0].split('-')[0].trim() || "Brand Name",
                    tagline: siteDesc.slice(0, 100),
                    business_overview: siteDesc,
                    brand_values: ["Calidad", "Innovación", "Profesionalismo", "Confianza", "Modernidad"],
                    tone_of_voice: ["Profesional", "Moderno", "Directo"],
                    visual_aesthetic: ["Limpio", "Premium", "Funcional"],
                    colors: finalColors.slice(0, 5),
                    fonts: ["Inter", "System Sans-Serif"],
                    text_assets: {
                        marketing_hooks: [siteTitle, "Soluciones innovadoras", "Líderes en el sector"],
                        visual_keywords: ["Moderno", "Profesional", "Limpio"],
                        ctas: ["Comenzar ahora", "Saber más"],
                        brand_context: `Extracción automática por fallo de IA para ${url}.`
                    }
                };
            }
        }

        // MERGE CONTACT INFO: Scraper findings are usually more accurate/complete for this specific data
        if (brandDNA) {
            console.log('🔗 Merging scraped contact info into Brand DNA...');
            brandDNA.emails = Array.from(new Set([...(brandDNA.emails || []), ...htmlAssets.emails]));
            brandDNA.phones = Array.from(new Set([...(brandDNA.phones || []), ...htmlAssets.phones]));
            brandDNA.addresses = Array.from(new Set([...(brandDNA.addresses || []), ...htmlAssets.addresses]));

            // Merge social links avoiding duplicates by URL
            const existingUrls = new Set((brandDNA.social_links || []).map((l: any) => l.url));
            const newLinks = htmlAssets.socialLinks.filter(l => !existingUrls.has(l.url));
            brandDNA.social_links = [...(brandDNA.social_links || []), ...newLinks];
        }

        console.log('✅ Brand DNA ready');

        // 3. Procesar imágenes y subirlas a Supabase
        console.log('🖼️ Procesando imágenes...');
        const galleryImages: string[] = [];

        // Procesar FAVICON en alta resolución (separado del logo)
        let faviconUrl: string | undefined;
        if (htmlAssets.faviconUrl) {
            console.log(`📌 Procesando favicon: ${htmlAssets.faviconUrl}`);
            const processedFavicon = await processAndUploadImage(htmlAssets.faviconUrl, 'favicons', 512);
            if (processedFavicon) {
                faviconUrl = processedFavicon;
                console.log(`✅ Favicon subido: ${faviconUrl}`);
            }
        }

        // Procesar LOGO - PRIORIZAR candidatos HTML (tienen sistema de scoring)
        let primaryLogoUrl: string | undefined;
        let logoSvgContent: string | undefined;
        const logos: { url: string; selected?: boolean }[] = [];

        console.log(`🔍 Probando ${allLogoCandidatesScored.length} candidatos de logo consolidado...`);
        for (const candidate of allLogoCandidatesScored.sort((a, b) => b.score - a.score).slice(0, 10)) {
            const source = candidate.type === 'inline-svg' ? candidate.content! : candidate.url!;
            console.log(`   Probando logo #${allLogoCandidatesScored.indexOf(candidate) + 1}...`);

            const processedLogo = await processAndUploadImage(source, 'logos', 512);
            if (processedLogo) {
                if (!primaryLogoUrl) {
                    primaryLogoUrl = processedLogo;
                    if (candidate.type === 'inline-svg') {
                        logoSvgContent = candidate.content;
                    }
                    addTrace('Content: Assets', 'success', `Logo principal subido: ${processedLogo}`);
                }

                logos.push({ url: processedLogo, selected: logos.length === 0 });
                console.log(`✅ Logo #${logos.length} subido: ${processedLogo}`);

                if (logos.length >= 6) break; // Máximo 6 logos
            }
        }

        if (logos.length === 0) {
            addTrace('Content: Assets', 'fail', 'No se pudo subir ningún logo candidato');
        }

        // Extract logo colors if we have a logo
        let logoPalette: string[] = [];
        if (primaryLogoUrl) {
            console.log(`🎨 Extrayendo paleta oficial del logo...`);
            logoPalette = await extractLogoColors(primaryLogoUrl);
        }

        if (primaryLogoUrl) {
            galleryImages.push(primaryLogoUrl);
            console.log(`✅ Logo añadido a la galería visual`);
        }

        // Procesar imágenes adicionales del sitio (hasta 5)
        console.log(`🖼️ Procesando ${htmlAssets.imageCandidates.length} imágenes candidatas...`);
        for (const imgCandidate of htmlAssets.imageCandidates.slice(0, 5)) {
            if (galleryImages.length >= 5) break;
            const processedImg = await processAndUploadImage(imgCandidate, 'site-images', 1200);
            if (processedImg) {
                galleryImages.push(processedImg);
                console.log(`✅ Imagen del sitio subida (${galleryImages.length}/5)`);
            }
        }

        // Procesar screenshot - SIEMPRE lo subimos para el debug info
        let debugScreenshotUrl: string | undefined;
        let visualPalette: string[] = [];

        // 1. Intentar con cache primero (Máxima prioridad por petición del usuario)
        let screenshotSourceUrl = cachedScreenshotUrl;

        // 2. Si no hay cache, intentar con ApiFlash (PRIMERA OPCIÓN - más confiable)
        if (!screenshotSourceUrl) {
            console.log(`📸 Generando screenshot con ApiFlash...`);
            screenshotSourceUrl = await fetchApiFlashScreenshot(url).then(res => {
                addTrace('Capture: ApiFlash', res ? 'success' : 'fail', res ? 'ApiFlash exitoso' : 'ApiFlash falló');
                return res;
            });
        }

        // 3. Fallback a ScreenshotLayer
        if (!screenshotSourceUrl) {
            console.warn(`⚠️ ApiFlash falló. Intentando con ScreenshotLayer...`);
            screenshotSourceUrl = await fetchScreenshotLayerScreenshot(url).then(res => {
                addTrace('Capture: Layer', res ? 'success' : 'fail', res ? 'ScreenshotLayer exitoso' : 'Layer falló');
                return res;
            });
        }

        // 4. Fallback a Thum.io
        if (!screenshotSourceUrl) {
            console.warn(`⚠️ ScreenshotLayer falló. Intentando con Thum.io...`);
            screenshotSourceUrl = `https://image.thum.io/get/width/1440/noanimate/wait/5/fullpage/${url}`;
            addTrace('Capture: Thum.io', 'highlight', 'Usando fallback Thum.io');
        }


        // All screenshot options exhausted above

        if (screenshotSourceUrl) {
            console.log(`📸 Screenshot obtenido, procesando...`);

            // Si el screenshotSourceUrl ya es una URL de Convex (cache), no necesitamos volver a procesarlo/subirlo
            if (screenshotSourceUrl.includes('/api/storage/')) {
                debugScreenshotUrl = screenshotSourceUrl;
                console.log(`✅ Using already processed Convex screenshot: ${debugScreenshotUrl}`);
            } else {
                console.log(`📸 Subiendo screenshot para debug info...`);
                debugScreenshotUrl = (await processAndUploadImage(screenshotSourceUrl, 'screenshots', 1200)) || undefined;

                if (debugScreenshotUrl) {
                    console.log(`✅ Screenshot subido correctamente: ${debugScreenshotUrl}`);
                } else {
                    console.error(`❌ FALLÓ la subida del screenshot desde: ${screenshotSourceUrl}`);
                }
            }

            if (debugScreenshotUrl) {
                console.log(`🎨 Ejecutando Análisis Visual en captura final...`);
                visualPalette = await extractVisualPalette(debugScreenshotUrl); // Usar la URL final para análisis


                // visualPalette is extracted directly from screenshot via extractVisualPalette

                // También lo añadimos a la galería si hay espacio (y si no estaba ya)
                if (galleryImages.length < 5 && !galleryImages.includes(debugScreenshotUrl)) {
                    galleryImages.push(debugScreenshotUrl);
                }
            } else {
                console.warn(`⚠️ Failed to obtain or process screenshot from: ${screenshotSourceUrl}`);
            }
        } else {
            console.warn(`❌ No screenshot could be fetched from Cache, Microlink OR ApiFlash for ${url}`);
        }


        // OG images already processed in imageCandidates

        if (debugScreenshotUrl) {
            galleryImages.push(debugScreenshotUrl);
            console.log(`✅ Screenshot añadido a la galería visual`);
        }

        console.log(`📷 Total imágenes procesadas: ${galleryImages.length}`);


        // Weights (6 Sources): Visual 60%, Logo 20%, Weighted 8.57%, Design 5.71%, SVG 2.86%, Code 2.86%
        console.log(`🎯 Creando paleta consolidada final (6 fuentes)...`);

        // Consolidar paleta para el consenso final de 6 fuentes
        // weightedPalette debe ser un array de strings (hex)
        const finalWeightedPalette = weightedColors;

        const finalPalette = createFinalPalette(
            visualPalette,
            htmlAssets.codePalette,
            logoPalette,
            finalWeightedPalette,
            htmlAssets.svgPalette,
            htmlAssets.designPalette
        );
        console.log(`✅ Final palette: ${finalPalette.length} colores consolidados`);



        // 4. Construir resultado final
        console.log(`📊 Logo Candidates finales para debug: ${allLogoCandidatesScored.length}`);
        if (allLogoCandidatesScored.length > 0) {
            console.log(`   Top 3:`, allLogoCandidatesScored.sort((a, b) => b.score - a.score).slice(0, 3).map(c => ({ score: c.score, url: c.url?.substring(0, 50), type: c.type })));
        }

        const result: BrandDNA = {
            url: displayUrl,
            brand_name: brandDNA.brand_name,
            tagline: brandDNA.tagline,
            business_overview: brandDNA.business_overview,
            brand_values: brandDNA.brand_values,
            tone_of_voice: brandDNA.tone_of_voice,
            visual_aesthetic: brandDNA.visual_aesthetic,
            target_audience: brandDNA.target_audience,
            colors: finalPalette.length > 0 ? finalPalette : [{ color: "#000000", sources: ['ai'], score: 1 }, { color: "#FFFFFF", sources: ['ai'], score: 1 }],
            fonts: brandDNA.fonts,
            text_assets: brandDNA.text_assets,
            logo_url: primaryLogoUrl,
            logos,
            favicon_url: faviconUrl,
            screenshot_url: debugScreenshotUrl,
            images: (galleryImages || []).map(url => ({ url, selected: true })),
            social_links: htmlAssets.socialLinks,
            emails: htmlAssets.emails,
            phones: htmlAssets.phones,
            addresses: htmlAssets.addresses,
            api_trace: apiTrace,
            debug: {
                css_links: htmlAssets.cssLinks,
                root_colors: htmlAssets.rootColors,
                screenshot_url: debugScreenshotUrl,
                visual_palette: visualPalette.length > 0 ? visualPalette : ["#NO_VISUAL_DATA"],
                code_palette: htmlAssets.codePalette.length > 0 ? htmlAssets.codePalette : ["#NO_CODE_PALETTE"],
                logo_palette: logoPalette.length > 0 ? logoPalette : ["#NO_LOGO_DATA"],
                weighted_palette: (() => {
                    console.log(`🐛 [DEBUG] weightedColors antes de guardar:`, weightedColors);
                    return weightedColors.length > 0 ? weightedColors : ["#NO_WEIGHTED_DATA"];
                })(),
                svg_palette: htmlAssets.svgPalette.length > 0 ? htmlAssets.svgPalette : ["#NO_SVG_DATA"],
                design_palette: htmlAssets.designPalette.length > 0 ? htmlAssets.designPalette : ["#NO_DESIGN_DATA"],
                logo_svg_content: logoSvgContent,
                logo_candidates: allLogoCandidatesScored.sort((a, b) => b.score - a.score).slice(0, 10),
                final_palette: finalPalette,
                code_fonts: Array.from(new Set([...(htmlAssets.fonts || []), ...weightedFonts])),
                // Raw data for deeper debugging
                raw_weighted_total: weightedColors.length,
                raw_visual_total: visualPalette.length,
                raw_allColors_total: allColors.length,
                consensus_weights: {
                    visual: 0.60,
                    logo: 0.20,
                    weighted: 0.0857,
                    design: 0.0571,
                    svg: 0.0286,
                    code: 0.0286
                }
            },
        };

        console.group('🏁 [DEBUG] Brand Analysis Result');
        console.log('URL:', result.url);
        console.log('Brand Name:', result.brand_name);
        console.log('Logo URL:', result.logo_url);
        console.log('Favicon URL:', result.favicon_url);
        console.log('Screenshot URL:', result.screenshot_url);
        console.log('Images Count:', result.images.length);
        console.groupEnd();

        // Detect language from content
        console.log('🌐 Detecting content language...');
        const textForDetection = `${result.brand_name} ${result.tagline} ${result.business_overview} ${result.brand_values.join(' ')} ${result.tone_of_voice.join(' ')}`;
        const detectedLanguage = await detectLanguageWithApi(textForDetection, 'es');
        result.preferred_language = detectedLanguage;
        console.log(`✅ Language detected: ${detectedLanguage}`);

        // 5. Guardar en Convex - Usamos UPSERT para actualizar registros existentes
        console.log('💾 [DEBUG] Guardando en Convex...');
        try {
            const upsertPayload = {
                url: result.url,
                brand_name: result.brand_name,
                tagline: result.tagline,
                business_overview: result.business_overview,
                brand_values: result.brand_values,
                tone_of_voice: result.tone_of_voice,
                visual_aesthetic: result.visual_aesthetic,
                target_audience: result.target_audience,
                colors: result.colors,
                fonts: result.fonts,
                text_assets: result.text_assets,
                logo_url: result.logo_url,
                logos: result.logos,
                favicon_url: result.favicon_url,
                screenshot_url: result.screenshot_url,
                images: result.images,
                social_links: result.social_links,
                emails: result.emails,
                phones: result.phones,
                addresses: result.addresses,
                preferred_language: result.preferred_language,
                api_trace: result.api_trace,
                debug: result.debug,
                clerk_user_id: clerkUserId,
                updated_at: new Date().toISOString()
            };

            console.log('📄 [DEBUG] Upsert Payload Details:', {
                url: upsertPayload.url,
                logo: !!upsertPayload.logo_url,
                screenshot: !!upsertPayload.screenshot_url,
                favicon: !!upsertPayload.favicon_url,
                images: upsertPayload.images?.length
            });

            // Intentar guardar con debug info (requiere columna JSONB 'debug')
            // CONVEX MIGRATION: using fetchMutation
            // We need to cast types or ensure they match what Convex expects
            // upsertBrandDNA expects specific fields

            const resultId = await authedFetchMutation(api.brands.upsertBrandDNA, upsertPayload);
            console.log('✅ [DEBUG] Convex Upsert Success. ID:', resultId);
            (result as any).id = String(resultId);

            /* Supabase Logic Removed
            const { data: dbData, error: dbError } = await supabase.from('brand_dna').upsert(upsertPayload, { onConflict: 'url' }).select();
     
            if (dbError) {
                console.error('❌ [DEBUG] Supabase Upsert Error:', dbError);
                // ... (rest of existing error handling remains same)
            }
             */
        } catch (dbError) {
            console.error('❌ [DEBUG] Convex Upsert Error:', dbError);
        }


        console.log('🎉 [DEBUG] analyzeBrandDNA action finished successfully');
        return { success: true, data: result };

    } catch (error: unknown) {
        console.error('❌ Error en analyzeBrandDNA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, error: errorMessage };
    }
}
