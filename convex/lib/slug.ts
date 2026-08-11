/**
 * Helpers puros para derivar identificadores estables (slugs) a partir de
 * nombres legibles. Se usan en los estilos predefinidos para poder
 * referenciarlos desde fuera (API, manifiestos de campana) sin depender del
 * `_id` de Convex, que es opaco y distinto en cada deployment.
 */

const MAX_SLUG_LENGTH = 60;
const FALLBACK_SLUG = "estilo";

// Rango Unicode de los signos diacriticos combinantes que deja NFD al separar
// las tildes de su letra base. Escapado a proposito para no depender de la
// codificacion del fichero.
const COMBINING_MARKS = new RegExp("[\u0300-\u036f]", "g");

/**
 * Convierte un nombre legible en un slug kebab-case seguro para URLs y APIs.
 * "Editorial Minimal" -> "editorial-minimal"
 * "Pop Art (vibrante)" -> "pop-art-vibrante"
 * "Diseno calido" -> "diseno-calido"
 */
export function slugify(input: unknown): string {
  const raw = typeof input === "string" ? input : "";

  const slug = raw
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // El recorte por longitud puede dejar un guion colgando al final.
    .replace(/-+$/g, "");

  return slug || FALLBACK_SLUG;
}

/**
 * Devuelve un slug que no colisione con los ya existentes, anadiendo un
 * sufijo numerico incremental cuando haga falta ("pop-art" -> "pop-art-2").
 */
export function ensureUniqueSlug(base: string, taken: Iterable<string>): string {
  const normalizedBase = slugify(base);
  const takenSet = new Set<string>();
  for (const value of taken) {
    if (typeof value === "string" && value) takenSet.add(value);
  }

  if (!takenSet.has(normalizedBase)) return normalizedBase;

  for (let suffix = 2; ; suffix += 1) {
    const tail = `-${suffix}`;
    const head = normalizedBase.slice(0, MAX_SLUG_LENGTH - tail.length).replace(/-+$/g, "");
    const candidate = `${head}${tail}`;
    if (!takenSet.has(candidate)) return candidate;
  }
}
