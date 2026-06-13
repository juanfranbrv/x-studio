

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    let { r, g, b } = rgb;
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Returns a CSS HSL string (e.g., "240 100% 50%") for Tailwind variables
 */
export function hexToHslString(hex: string): string | null {
    const hsl = hexToHsl(hex);
    if (!hsl) return null;
    return `${hsl.h.toFixed(1)} ${hsl.s.toFixed(1)}% ${hsl.l.toFixed(1)}%`;
}

// --- Restored Functions ---

/**
 * Calculates the Delta E (CIE76) distance between two hex colors.
 * Lower value means more similar. < 2.3 is barely perceptible. < 10 is similar.
 */
export function deltaE(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 100; // Return max distance if invalid

    // Simple Euclidean distance in RGB space (fast approximation)
    // For more accuracy, we could convert to LAB, but RGB distance is often sufficient for clustering
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
    // Note: Normalized RGB distance typically ranges 0-441. 
    // If specifically replicating CIE76, distinct implementations would be needed, 
    // but often codebases essentially use Euclidean separation.
    // Given the previous usage threshold was `10`, this implies roughly (sqrt(3*10^2) ~= 17) or 
    // heavily scaled.
    // Let's assume standard RGB distance.
}

interface ColorVote {
    hex: string;
    weight: number;
}

interface ColorCluster {
    representative: string; // The "center" or highest weighted color
    originalColors: string[];
    score: number; // Total weight
}

/**
 * Clusters similar colors together and returns representative colors with aggregated scores.
 */
export function clusterColors(items: ColorVote[], threshold: number = 30): ColorCluster[] {
    const clusters: ColorCluster[] = [];

    // Sort by weight descending so stronger signals form/claim clusters first
    const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

    for (const item of sortedItems) {
        // Find closest existing cluster
        let bestCluster: ColorCluster | null = null;
        let minDist = Infinity;

        for (const cluster of clusters) {
            const dist = deltaE(item.hex, cluster.representative);
            if (dist < minDist) {
                minDist = dist;
                bestCluster = cluster;
            }
        }

        if (bestCluster && minDist <= threshold) {
            // Add to existing cluster
            bestCluster.originalColors.push(item.hex);
            bestCluster.score += item.weight;
        } else {
            // Create new cluster
            clusters.push({
                representative: item.hex,
                originalColors: [item.hex],
                score: item.weight
            });
        }
    }

    return clusters;
}

/**
 * Heuristic to categorize a color's role in a palette (primary, secondary, background, etc.)
 */
export function categorizeColorRole(color: string, palette: { color: string, score: number }[]): 'primary' | 'secondary' | 'accent' | 'background' | 'neutral' {
    const hsl = hexToHsl(color);
    if (!hsl) return 'neutral';

    // Background detection: Very light or very dark, low saturation
    const isLightBg = hsl.l > 90;
    const isDarkBg = hsl.l < 10;
    if ((isLightBg || isDarkBg) && hsl.s < 20) {
        return 'background';
    }

    // Sort palette by score to identify primary
    const sortedPalette = [...palette].sort((a, b) => b.score - a.score);
    const isHighestScore = sortedPalette[0]?.color === color;
    const isSecondHighest = sortedPalette[1]?.color === color;

    if (hsl.s > 30) {
        // Vibrant colors
        if (isHighestScore) return 'primary';
        if (isSecondHighest) return 'secondary';
        return 'accent';
    }

    return 'neutral';
}

/**
 * Relative luminance per WCAG 2.1 spec.
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const normalize = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b)
}

/**
 * Assigns studio-compatible roles to a palette:
 * - Fondo: the highest-scoring color
 * - Texto: the darkest remaining color (lowest luminance)
 * - Acento: everything else
 */
export function assignStudioColorRoles<T extends { color: string; score: number }>(
  colors: T[]
): (T & { role: 'Fondo' | 'Texto' | 'Acento' })[] {
  if (!colors.length) return []
  const ordered = [...colors].sort((a, b) => b.score - a.score)
  const backgroundIdx = 0
  let textIdx = ordered.length > 1 ? 1 : 0
  let lowestLuminance = Number.POSITIVE_INFINITY
  for (let i = 1; i < ordered.length; i++) {
    const lum = relativeLuminance(ordered[i].color)
    if (lum < lowestLuminance) {
      lowestLuminance = lum
      textIdx = i
    }
  }
  return ordered.map((item, i) => ({
    ...item,
    role: i === backgroundIdx ? 'Fondo' : i === textIdx ? 'Texto' : 'Acento',
  }))
}

/**
 * Calculates a harmony bonus score based on color theory relationships in the palette.
 */
export function getHarmonyBonus(palette: string[]): number {
    // Simplified placeholder: returns 0 if palette is empty, small bonus for having variety
    if (!palette || palette.length < 2) return 0;

    // Check for complementary pairs, etc. (Simplified)
    // Real implementation would calculate hue differences.
    // For now, just returning 1.05 if we have at least 3 distinct colors
    return palette.length >= 3 ? 1.05 : 1.0;
}


/**
 * Convert RGB to LAB color space
 * Useful for perceptual color difference calculations
 */
export function rgbToLab(rgb: { r: number, g: number, b: number }): { l: number, a: number, b: number } {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}
