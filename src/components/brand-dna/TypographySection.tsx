'use client'

import { Loader2 } from '@/components/ui/spinner'
;

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { IconTextFont, IconSearch, IconPlus, IconClose, IconInfo, IconCheckSimple, IconEdit } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  BRAND_KIT_CALLOUT_CLASS,
  BRAND_KIT_FIELD_CLASS,
  BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS,
  BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
  BRAND_KIT_PANEL_CLASS,
  BRAND_KIT_PANEL_DESCRIPTION_CLASS,
  BRAND_KIT_PANEL_HEADER_CLASS,
  BRAND_KIT_PANEL_TITLE_CLASS,
} from './brandKitStyles';

const FONT_FEELINGS: Array<{ id: string; families: string[] }> = [
  { id: 'business', families: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Work Sans', 'Noto Sans'] },
  { id: 'calm', families: ['Nunito', 'Quicksand', 'Karla', 'Merriweather Sans', 'Manrope', 'Poppins'] },
  { id: 'playful', families: ['Baloo 2', 'Fredoka', 'Bungee', 'Comfortaa', 'Rubik', 'Cabin Sketch'] },
  { id: 'fancy', families: ['Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Prata', 'Marcellus'] },
  { id: 'cute', families: ['Pacifico', 'Amatic SC', 'Chewy', 'Coming Soon', 'Patrick Hand', 'Short Stack'] },
  { id: 'artistic', families: ['Abril Fatface', 'DM Serif Display', 'Bodoni Moda', 'Archivo Black', 'Syne'] },
  { id: 'vintage', families: ['Lora', 'Libre Baskerville', 'Old Standard TT', 'Vollkorn', 'EB Garamond'] },
  { id: 'futuristic', families: ['Orbitron', 'Exo 2', 'Space Grotesk', 'Rajdhani', 'Audiowide'] },
];

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
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
  ];
  const total = weighted.reduce((acc, item) => acc + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.id;
  }
  return 'business';
}

function buildAutoFeelingMix(): string[] {
  const primary = weightedPickFeelingId();
  const secondary = weightedPickFeelingId();
  return Array.from(new Set(['business', 'calm', primary, secondary]));
}

interface TypographySectionProps {
  fonts: { family: string; role?: 'heading' | 'body' }[];
  tagline?: string;
  onAddFont: (font: string) => void;
  onRemoveFont: (index: number) => void;
  onUpdateRole: (index: number, role?: 'heading' | 'body') => void;
  guidedMode?: boolean;
  hideHeader?: boolean;
  onSelectFontForRole?: (family: string, role: 'heading' | 'body') => void;
}

export function TypographySection({
  fonts,
  tagline,
  onAddFont,
  onRemoveFont,
  onUpdateRole,
  guidedMode = false,
  hideHeader = false,
  onSelectFontForRole,
}: TypographySectionProps) {
  const { t } = useTranslation('brandKit');
  const [fontSearch, setFontSearch] = useState('');
  const [allFonts, setAllFonts] = useState<string[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [guidedRole, setGuidedRole] = useState<'heading' | 'body'>('heading');
  const [editingRole, setEditingRole] = useState<'heading' | 'body' | null>(null);
  const [autoFeelingMix] = useState<string[]>(buildAutoFeelingMix);

  const headingIndex = fonts.findIndex((f) => f.role === 'heading');
  const bodyIndex = fonts.findIndex((f) => f.role === 'body');
  const headingFont = headingIndex >= 0 ? fonts[headingIndex] : undefined;
  const bodyFont = bodyIndex >= 0 ? fonts[bodyIndex] : undefined;
  const bothRolesDefined = Boolean(headingFont && bodyFont);

  const roleToChoose: 'heading' | 'body' = editingRole || (!headingFont ? 'heading' : !bodyFont ? 'body' : guidedRole);
  const showExplorer = !guidedMode || !bothRolesDefined || Boolean(editingRole);
  const currentRoleFamily = roleToChoose === 'heading' ? headingFont?.family : bodyFont?.family;

  const fetchGoogleFonts = async () => {
    if (hasFetched || loadingFonts) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
    if (!apiKey) return;

    setLoadingFonts(true);
    try {
      const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`);
      const data = await res.json();
      const fontNames = data.items?.map((f: { family: string }) => f.family) || [];
      setAllFonts(fontNames);
      setHasFetched(true);
    } catch (error) {
      console.error('Failed to load Google Fonts:', error);
    } finally {
      setLoadingFonts(false);
    }
  };

  const canAddFamily = (family: string) => fonts.filter((f) => f.family === family).length < 2;

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase();
    const base = allFonts.filter((family) => canAddFamily(family));
    if (query) return base.filter((family) => family.toLowerCase().includes(query));

    const selectedFeelingFamilies = FONT_FEELINGS
      .filter((item) => autoFeelingMix.includes(item.id))
      .flatMap((item) => item.families);
    const feelingSet = new Set(selectedFeelingFamilies.map((family) => family.toLowerCase()));
    const prioritized = base.filter((family) => feelingSet.has(family.toLowerCase()));
    const rest = base.filter((family) => !feelingSet.has(family.toLowerCase()));
    return [...shuffleArray(prioritized), ...shuffleArray(rest)];
  }, [allFonts, fontSearch, autoFeelingMix, fonts]);

  const visibleFonts = useMemo(() => filteredFonts.slice(0, visibleCount), [filteredFonts, visibleCount]);

  useEffect(() => {
    setVisibleCount(24);
  }, [fontSearch]);

  useEffect(() => {
    if (!guidedMode) return;
    if (!headingFont) {
      setGuidedRole('heading');
      return;
    }
    if (!bodyFont) setGuidedRole('body');
  }, [guidedMode, headingFont, bodyFont]);

  useEffect(() => {
    if (!guidedMode) return;
    if (!bothRolesDefined) setEditingRole(null);
  }, [guidedMode, bothRolesDefined]);

  const loadGoogleFont = (fontName: string) => {
    if (!fontName) return;
    const id = `font-${fontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  };

  useEffect(() => {
    fonts.forEach((f) => loadGoogleFont(f.family));
  }, [fonts]);

  useEffect(() => {
    visibleFonts.forEach(loadGoogleFont);
  }, [visibleFonts]);

  const handleToggleRole = (index: number) => {
    const currentRole = fonts[index]?.role;
    let nextRole: 'heading' | 'body' | undefined;
    if (!currentRole) nextRole = 'heading';
    else if (currentRole === 'heading') nextRole = 'body';
    else nextRole = undefined;
    onUpdateRole(index, nextRole);
  };

  const renderExplorer = () => (
    <div className={cn(BRAND_KIT_CALLOUT_CLASS, "flex flex-col gap-3 p-4 transition-colors focus-within:border-primary/50")}>
      {guidedMode && (
        <div className={cn(BRAND_KIT_CALLOUT_CLASS, "space-y-2 p-3")}>
          <p className="text-xs font-medium text-foreground">
            {roleToChoose === 'heading'
              ? t('typography.chooseHeadings', { defaultValue: 'Choose typography for headings' })
              : t('typography.chooseBody', { defaultValue: 'Choose typography for paragraphs' })}
          </p>
          {editingRole && (
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRole(null)}>
              {t('typography.cancelChange', { defaultValue: 'Cancel change' })}
            </Button>
          )}
        </div>
      )}

          <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-3.5")}>
        <p className="text-xs font-medium text-foreground">{t('typography.exploreTitle', { defaultValue: 'Browse fonts with live preview' })}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('typography.exploreDescription', { defaultValue: 'You do not need to know font names. Browse examples and pick the one you like.' })}</p>
      </div>

      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
        <Input
          placeholder={t('typography.filterPlaceholder', { defaultValue: 'Filter fonts (optional)...' })}
          className={cn(BRAND_KIT_FIELD_CLASS, "pl-10")}
          value={fontSearch}
          onFocus={() => fetchGoogleFonts()}
          onChange={(e) => setFontSearch(e.target.value)}
        />
        {loadingFonts && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-[var(--accent)]" />
          </div>
        )}
      </div>

      {visibleFonts.length > 0 && (
          <ScrollArea className={cn("h-[260px] p-2 shadow-inner", BRAND_KIT_CALLOUT_CLASS)}>
          <div className="space-y-1">
            {visibleFonts.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => {
                  if (guidedMode && onSelectFontForRole) {
                    onSelectFontForRole(font, roleToChoose);
                    if (editingRole) setEditingRole(null);
                    else if (roleToChoose === 'heading') setGuidedRole('body');
                  } else {
                    onAddFont(font);
                  }
                }}
                className={cn(
                  'group flex w-full items-center justify-between rounded-[1rem] border p-2 px-3 text-left text-sm transition-all',
                  guidedMode && currentRoleFamily === font
                    ? 'bg-primary/10 border-primary/40'
                    : 'border-transparent hover:border-border/70 hover:bg-[hsl(var(--surface-alt))]/68'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-secondary)]">{font}</span>
                  <span className="text-lg leading-tight" style={{ fontFamily: font }}>
                    {t('typography.sampleLine', { defaultValue: 'Your brand, your visual style' })}
                  </span>
                </div>
                {guidedMode && currentRoleFamily === font ? (
                  <IconCheckSimple className="w-4 h-4 text-primary" />
                ) : (
                  <IconPlus className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[var(--accent)]" />
                )}
              </button>
            ))}
            {visibleCount < filteredFonts.length && (
              <Button type="button" variant="outline" className={cn(BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS, "mt-1")} onClick={() => setVisibleCount((prev) => prev + 24)}>
                {t('typography.loadMore', { defaultValue: 'Load more fonts' })}
              </Button>
            )}
          </div>
        </ScrollArea>
      )}

      {fontSearch && visibleFonts.length === 0 && !loadingFonts && (
        <div className="text-center py-4 text-[var(--text-secondary)] text-xs italic">{t('typography.noResults', { defaultValue: 'No fonts found for "{{query}}"', query: fontSearch })}</div>
      )}

      {!fontSearch && visibleFonts.length > 0 && (
        <div className="flex items-center gap-2 justify-center py-2 text-[var(--text-secondary)]">
          <IconInfo className="w-3.5 h-3.5 opacity-50" />
          <span className="text-[10px]">{t('typography.showingPopular', { defaultValue: 'Showing popular fonts with preview' })}</span>
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn(BRAND_KIT_PANEL_CLASS, "overflow-hidden", hideHeader && "bg-transparent backdrop-blur-0 border-none shadow-none")}>
      {!hideHeader && (
        <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
          <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
            <IconTextFont className="w-5 h-5 text-primary" />
            {t('typography.title', { defaultValue: 'Typography' })}
          </CardTitle>
          <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
            {t('typography.description', { defaultValue: 'Elige tipografia para titulares y parrafos con el mismo criterio visual usado en Imagen y Carrusel.' })}
          </p>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-6 px-6 pb-6 pt-0", hideHeader && "p-0")}>
        <div className="grid grid-cols-1 gap-4">
          {(guidedMode ? fonts.filter((f) => f.role === 'heading' || f.role === 'body') : fonts).map((fontObj, idx) => (
            <div key={`${fontObj.family}-${idx}`} className="space-y-4">
              <div
                onClick={() => {
                  if (guidedMode) return;
                  const realIndex = fonts.findIndex((f, i) => i >= idx && f.family === fontObj.family && f.role === fontObj.role);
                  handleToggleRole(realIndex >= 0 ? realIndex : idx);
                }}
                className={cn(
                  'group relative p-4 border rounded-[1.25rem] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                  fontObj.role === 'heading'
                    ? 'bg-primary/6 border-primary/30'
                    : fontObj.role === 'body'
                      ? 'bg-[hsl(var(--surface-alt))]/72 border-border/70'
                      : 'bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.64,white)] border-border/70 hover:border-primary/20'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                        fontObj.role === 'heading'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : fontObj.role === 'body'
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                            : 'bg-[hsl(var(--surface-alt))]/76 text-muted-foreground border-border/70'
                      )}
                    >
                      {fontObj.role === 'heading'
                        ? t('typography.roleHeadings', { defaultValue: 'Headings' })
                        : fontObj.role === 'body'
                          ? t('typography.roleBody', { defaultValue: 'Body' })
                          : t('typography.roleUnassigned', { defaultValue: 'Unassigned' })}
                    </span>
                  </div>
                  {guidedMode && (fontObj.role === 'heading' || fontObj.role === 'body') ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetRole = fontObj.role as 'heading' | 'body';
                        setEditingRole(targetRole);
                        setGuidedRole(targetRole);
                        void fetchGoogleFonts();
                      }}
                    >
                      <IconEdit className="w-3.5 h-3.5 mr-1" />
                      {t('typography.change', { defaultValue: 'Change' })}
                    </Button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const roleMatchIndex = fonts.findIndex((f) => f.family === fontObj.family && f.role === fontObj.role);
                        onRemoveFont(roleMatchIndex >= 0 ? roleMatchIndex : idx);
                      }}
                      className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS}
                    >
                      <IconClose className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 font-mono">{fontObj.family}</p>
                    <p
                      className={cn('leading-tight transition-all', fontObj.role === 'heading' ? 'text-2xl md:text-3xl font-bold' : 'text-lg md:text-xl')}
                      style={{ fontFamily: fontObj.family }}
                    >
                      {tagline || (fontObj.role === 'heading'
                        ? t('typography.headingSample', { defaultValue: 'A strong headline' })
                        : t('typography.bodySample', { defaultValue: 'Body text flows naturally.' }))}
                    </p>
                  </div>
                  <span className="text-2xl opacity-10" style={{ fontFamily: fontObj.family }}>
                    Aa
                  </span>
                </div>
              </div>
              {guidedMode && editingRole && fontObj.role === editingRole && renderExplorer()}
            </div>
          ))}

          {fonts.length < 5 && showExplorer && !(guidedMode && editingRole) && renderExplorer()}
        </div>
      </CardContent>
    </Card>
  );
}


