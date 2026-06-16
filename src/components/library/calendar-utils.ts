// Helpers puros para la vista Calendario de la biblioteca.

/** Normaliza un planned_at ('YYYY-MM-DD' o ISO) a clave de día 'YYYY-MM-DD'. */
export function toDateKey(value?: string): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) return null
    return dateKey(date)
}

/** Clave 'YYYY-MM-DD' en hora local para un Date. */
export function dateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Matriz del mes (6 semanas × 7 días, empezando en lunes), incluyendo días de
 * relleno de los meses adyacentes.
 */
export function buildMonthMatrix(year: number, month: number): Date[][] {
    const first = new Date(year, month, 1)
    const mondayIndex = (first.getDay() + 6) % 7 // 0=Lun ... 6=Dom
    const cursor = new Date(year, month, 1 - mondayIndex)
    const weeks: Date[][] = []
    for (let w = 0; w < 6; w++) {
        const week: Date[] = []
        for (let d = 0; d < 7; d++) {
            week.push(new Date(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

/** Agrupa activos por clave de día según su planned_at (ignora los sin fecha). */
export function groupAssetsByDateKey<T extends { planned_at?: string }>(assets: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const asset of assets) {
        const key = toDateKey(asset.planned_at)
        if (!key) continue
        const list = map.get(key) || []
        list.push(asset)
        map.set(key, list)
    }
    return map
}
