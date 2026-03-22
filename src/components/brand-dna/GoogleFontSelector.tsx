'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { IconSearch, IconPlus, IconInfo, IconCheckSimple } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { loadGoogleFont } from '@/lib/load-google-font'

const FONT_FEELINGS: Array<{ id: string; families: string[] }> = [
  { id: 'business', families: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Work Sans', 'Noto Sans'] },
  { id: 'calm', families: ['Nunito', 'Quicksand', 'Karla', 'Merriweather Sans', 'Manrope', 'Poppins'] },
  { id: 'playful', families: ['Baloo 2', 'Fredoka', 'Bungee', 'Comfortaa', 'Rubik', 'Cabin Sketch'] },
  { id: 'fancy', families: ['Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Prata', 'Marcellus'] },
  { id: 'cute', families: ['Pacifico', 'Amatic SC', 'Chewy', 'Coming Soon', 'Patrick Hand', 'Short Stack'] },
  { id: 'artistic', families: ['Abril Fatface', 'DM Serif Display', 'Bodoni Moda', 'Archivo Black', 'Syne'] },
  { id: 'vintage', families: ['Lora', 'Libre Baskerville', 'Old Standard TT', 'Vollkorn', 'EB Garamond'] },
  { id: 'futuristic', families: ['Orbitron', 'Exo 2', 'Space Grotesk', 'Rajdhani', 'Audiowide'] },
]

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

function weightedPickFeelingId(): string {
  const weighted: Array<{ id: string; weight: number }> = [
    { id: 'business', weight: 38 },
    { id: 'calm', weight: 30 },
    { id: 'playful', weight: 8 },
    { id: 'fancy', weight: 7 },
    { id: 'artistic', weight: 6 },
    { id: 'vintage', weight: 5 },
    { id: 'futuristic', weight: 4 },
    { id: 'cute', weight: 2 },
  ]
  const total = weighted.reduce((acc, item) => acc + item.weight, 0)
  let roll = Math.random() * total
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) return item.id
  }
  return 'business'
}

function buildAutoFeelingMix(): string[] {
  const primary = weightedPickFeelingId()
  const secondary = weightedPickFeelingId()
  return Array.from(new Set(['business', 'calm', primary, secondary]))
}

interface GoogleFontSelectorProps {
  onSelect: (family: string) => void
  selectedFamily?: string
  role: 'heading' | 'body'
  tagline?: string
  placeholder?: string
  className?: string
  variant?: 'brand-kit' | 'wizard'
}

export function GoogleFontSelector({
  onSelect,
  selectedFamily,
  role,
  tagline,
  placeholder,
  className,
  variant = 'brand-kit',
}: GoogleFontSelectorProps) {
  const { t } = useTranslation('brandKit')
  const [fontSearch, setFontSearch] = useState('')
  const [allFonts, setAllFonts] = useState<string[]>([])
  const [loadingFonts, setLoadingFonts] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [visibleCount, setVisibleCount] = useState(24)
  const [autoFeelingMix] = useState<string[]>(buildAutoFeelingMix)

  const fetchGoogleFonts = async () => {
    if (hasFetched || loadingFonts) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY
    if (!apiKey) return

    setLoadingFonts(true)
    try {
      const res = await fetch(
        `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`
      )
      const data = await res.json()
      const fontNames = data.items?.map((f: { family: string }) => f.family) || []
      setAllFonts(fontNames)
      setHasFetched(true)
    } catch (error) {
      console.error('Failed to load Google Fonts:', error)
    } finally {
      setLoadingFonts(false)
    }
  }

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase()
    const base = allFonts
    if (query) return base.filter((family) => family.toLowerCase().includes(query))

    const selectedFeelingFamilies = FONT_FEELINGS.filter((item) => autoFeelingMix.includes(item.id)).flatMap(
      (item) => item.families
    )
    const feelingSet = new Set(selectedFeelingFamilies.map((family) => family.toLowerCase()))
    const prioritized = base.filter((family) => feelingSet.has(family.toLowerCase()))
    const rest = base.filter((family) => !feelingSet.has(family.toLowerCase()))
    return [...shuffleArray(prioritized), ...shuffleArray(rest)]
  }, [allFonts, fontSearch, autoFeelingMix])

  const visibleFonts = useMemo(() => filteredFonts.slice(0, visibleCount), [filteredFonts, visibleCount])

  useEffect(() => {
    setVisibleCount(24)
  }, [fontSearch])

  useEffect(() => {
    visibleFonts.forEach(loadGoogleFont)
  }, [visibleFonts])

  const containerStyles = variant === 'wizard'
    ? 'flex flex-col gap-3 p-0'
    : 'flex flex-col gap-3 p-4 rounded-2xl border border-border/40 bg-surface-alt/40 transition-colors focus-within:border-primary/50'

  const inputStyles = variant === 'wizard'
    ? 'h-11 rounded-xl border-border/60 bg-background px-4 pl-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary/40'
    : 'h-10 rounded-[1.1rem] border-border/60 bg-background px-4 pl-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary/40'

  const scrollAreaStyles = variant === 'wizard'
    ? 'h-[240px] p-2 rounded-xl border border-border/40 bg-background/50'
    : 'h-[260px] p-2 rounded-2xl border border-border/40 bg-background/50 shadow-inner'

  return (
    <div className={cn(containerStyles, className)}>
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
        <Input
          placeholder={placeholder || t('typography.filterPlaceholder', { defaultValue: 'Filter fonts (optional)...' })}
          className={inputStyles}
          value={fontSearch}
          onFocus={() => fetchGoogleFonts()}
          onChange={(e) => setFontSearch(e.target.value)}
        />
        {loadingFonts && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {visibleFonts.length > 0 && (
        <ScrollArea className={scrollAreaStyles}>
          <div className="space-y-1">
            {visibleFonts.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => onSelect(font)}
                className={cn(
                  'group flex w-full items-center justify-between rounded-xl border p-2 px-3 text-left transition-all',
                  selectedFamily === font
                    ? 'bg-primary/10 border-primary/40'
                    : 'border-transparent hover:border-border/70 hover:bg-surface-alt/60'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground">{font}</span>
                  <span
                    className={cn('leading-tight', role === 'heading' ? 'text-lg font-bold' : 'text-base')}
                    style={{ fontFamily: font }}
                  >
                    {tagline || t('typography.sampleLine', { defaultValue: 'Your brand, your visual style' })}
                  </span>
                </div>
                {selectedFamily === font ? (
                  <IconCheckSimple className="w-4 h-4 text-primary" />
                ) : (
                  <IconPlus className="w-4 h-4 opacity-0 group-hover:opacity-100 text-primary" />
                )}
              </button>
            ))}
            {visibleCount < filteredFonts.length && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 border-dashed rounded-xl"
                onClick={() => setVisibleCount((prev) => prev + 24)}
              >
                {t('typography.loadMore', { defaultValue: 'Load more fonts' })}
              </Button>
            )}
          </div>
        </ScrollArea>
      )}

      {fontSearch && visibleFonts.length === 0 && !loadingFonts && (
        <div className="text-center py-8 text-muted-foreground text-xs italic">
          {t('typography.noResults', { defaultValue: 'No fonts found for "{{query}}"', query: fontSearch })}
        </div>
      )}

      {!fontSearch && visibleFonts.length > 0 && (
        <div className="flex items-center gap-2 justify-center py-2 text-muted-foreground">
          <IconInfo className="w-3.5 h-3.5 opacity-50" />
          <span className="text-[10px]">
            {t('typography.showingPopular', { defaultValue: 'Showing popular fonts with preview' })}
          </span>
        </div>
      )}
    </div>
  )
}
