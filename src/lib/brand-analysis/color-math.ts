// Helpers puros extraidos de analyze-brand-dna.ts (saneamiento/troceo Fase B).
// Sin dependencias del modulo origen — testables de forma aislada.

/** Distancia euclidiana en el espacio RGB entre dos colores hex (#RRGGBB). */
export function colorDistance(hex1: string, hex2: string): number {
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

/** Agrupa colores similares eliminando duplicados visuales bajo un umbral de distancia RGB. */
export function deduplicateSimilarColors(colors: string[], threshold = 30): string[] {
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

/** Convierte componentes RGB (0-255) a string hex #rrggbb. */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/** Filtra colores poco saturados: descarta blancos/negros extremos y grises puros. */
export function isColorful(hex: string): boolean {
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
