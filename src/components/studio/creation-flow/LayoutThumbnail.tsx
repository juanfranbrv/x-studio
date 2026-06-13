'use client';

import { LayoutOption } from '@/lib/creation-flow-types';
import { cn } from '@/lib/utils';
import * as L from './layout-thumbnails';

interface LayoutThumbnailProps {
    layout: LayoutOption;
    intent?: string;
    className?: string;
    variant?: 'default' | 'ghost';
    renderMode?: 'classic' | 'uniform';
}

/**
 * Renders unique visual thumbnails based on exact layout ID.
 * Each layout has its own distinctive visual representation.
 * Uses theme primary color for consistent branding.
 */
export function LayoutThumbnail({ layout, intent, className, variant = 'default', renderMode = 'classic' }: LayoutThumbnailProps) {
    const { id } = layout;

    return (
        <div className={cn(
            "w-full h-full rounded-md overflow-hidden flex items-center justify-center",
            variant === 'ghost' ? "bg-transparent p-0" : "bg-white p-1.5",
            className
        )}>
            <div className="w-full h-full relative">
                {renderMode === 'uniform' ? getUniformLayoutVisual(id) : getLayoutVisual(id)}
            </div>
        </div>
    );
}

function getUniformLayoutVisual(id: string) {
    const key = id.toLowerCase()

    if (key.includes('grid') || key.includes('mosaic') || key.includes('workshop') || key.includes('catalogo')) {
        return (
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 p-1.5">
                <div className="col-span-2 row-span-2 rounded-md bg-primary/35" />
                <div className="rounded-md bg-primary/22" />
                <div className="rounded-md bg-primary/22" />
                <div className="col-span-2 rounded-md bg-primary/16" />
                <div className="rounded-md bg-primary/28" />
            </div>
        )
    }

    if (key.includes('split') || key.includes('benefit') || key.includes('versus') || key.includes('comparison')) {
        return (
            <div className="w-full h-full p-1.5 flex gap-1">
                <div className="w-[42%] rounded-md bg-primary/20 flex flex-col justify-center gap-1 px-1.5">
                    <div className="h-1 rounded-full bg-primary/42" />
                    <div className="h-1 rounded-full w-[70%] bg-primary/28" />
                </div>
                <div className="w-[58%] rounded-md bg-primary/32" />
            </div>
        )
    }

    if (key.includes('list') || key.includes('check') || key.includes('memo')) {
        return (
            <div className="w-full h-full p-1.5 flex flex-col gap-1.5 justify-center">
                {[0.85, 0.7, 0.75].map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary/50" />
                        <div className="h-1.5 rounded-full bg-primary/24" style={{ width: `${w * 100}%` }} />
                    </div>
                ))}
            </div>
        )
    }

    if (key.includes('process') || key.includes('timeline') || key.includes('pasos')) {
        return (
            <div className="w-full h-full px-2 py-3 flex items-center justify-center">
                <div className="w-full flex items-center">
                    <div className="w-4 h-4 rounded-full bg-primary/45 flex items-center justify-center text-[8px] text-primary-foreground font-bold">1</div>
                    <div className="flex-1 h-1 bg-primary/20 rounded-full" />
                    <div className="w-4 h-4 rounded-full bg-primary/35 flex items-center justify-center text-[8px] text-primary-foreground font-bold">2</div>
                    <div className="flex-1 h-1 bg-primary/20 rounded-full" />
                    <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] text-primary-foreground font-bold">3</div>
                </div>
            </div>
        )
    }

    if (key.includes('spotlight') || key.includes('radial') || key.includes('hero') || key.includes('pricing')) {
        return (
            <div className="w-full h-full flex items-center justify-center p-2 relative">
                <div className="absolute inset-2 rounded-full bg-primary/10" />
                <div className="absolute inset-[28%] rounded-full bg-primary/20" />
                <div className="absolute inset-[40%] rounded-full bg-primary/45" />
            </div>
        )
    }

    if (key.includes('card') || key.includes('frame') || key.includes('tarjeta') || key.includes('clean')) {
        return (
            <div className="w-full h-full p-1.5 relative">
                <div className="absolute inset-[18%] rounded-md bg-primary/16 rotate-[-5deg]" />
                <div className="absolute inset-[12%] rounded-md border-2 border-primary/35 bg-primary/8 rotate-[2deg]" />
                <div className="absolute inset-[8%] rounded-md bg-primary/22">
                    <div className="absolute top-2 left-2 right-3 h-1.5 bg-primary/40 rounded-full" />
                    <div className="absolute top-4 left-2 right-5 h-1.5 bg-primary/28 rounded-full" />
                </div>
            </div>
        )
    }

    if (key.includes('stat') || key.includes('dato') || key.includes('metric') || key.includes('big') || key.includes('dashboard')) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                <div className="text-primary/80 text-3xl font-black leading-none">73%</div>
                <div className="h-1.5 w-[72%] bg-primary/24 rounded-full" />
            </div>
        )
    }

    // Fallback robusto: usar el thumbnail clásico específico del layout
    // para evitar iconos repetidos cuando el ID no cae en una familia uniforme.
    return getLayoutVisual(id)
}

function getLayoutVisual(id: string) {
    // FREE layout (any intent) - Double size question mark
    if (id.endsWith('-free')) return <L.FreeLayout />;
    if (id === 'clean') return <L.CleanLayout />;
    if (id === 'full-bleed') return <L.FullBleedLayout />;
    if (id === 'frame') return <L.FrameLayout />;
    if (id === 'basic-editorial-columns') return <L.BasicEditorialColumnsLayout />;
    if (id === 'basic-mosaic-flow') return <L.BasicMosaicFlowLayout />;
    if (id === 'basic-spotlight-radial') return <L.BasicSpotlightRadialLayout />;
    if (id === 'basic-stacked-cards') return <L.BasicStackedCardsLayout />;
    if (id === 'basic-diagonal-energy') return <L.BasicDiagonalEnergyLayout />;

    // === LAB v6 layouts (image advanced mode) ===
    if (id === 'lab-v6-carril-escenario') return <L.BasicEditorialColumnsLayout />;
    if (id === 'lab-v6-escalera-bisagra') return <L.ProcessLayout />;
    if (id === 'lab-v6-cuadrantes-vacio') return <L.BasicMosaicFlowLayout />;
    if (id === 'lab-v6-diagonal-plegada') return <L.BasicDiagonalEnergyLayout />;
    if (id === 'lab-v6-orbita-lateral') return <L.BasicSpotlightRadialLayout />;
    if (id === 'lab-v6-split-bahia') return <L.SplitLayout />;
    if (id === 'lab-v6-marco-perimetral') return <L.BasicStackedCardsLayout />;
    if (id === 'lab-v6-reticula-ruptura') return <L.BentoGridLayout />;
    if (id === 'lab-v6-ventana-desplazada') return <L.FrameLayout />;
    if (id === 'lab-v6-banda-serpenteante') return <L.PasosZigzagLayout />;
    if (id === 'lab-v6-orbita-concentrica') return <L.CircularLayout />;
    if (id === 'lab-v6-diptico-puente') return <L.ComparisonLayout />;
    if (id === 'lab-v6-islas-contrapeso') return <L.EcosystemLayout />;
    if (id === 'lab-v6-capsulas-ritmo') return <L.ListLayout />;
    if (id === 'lab-v6-umbral-lateral') return <L.ComunicadoCardLayout />;
    if (id === 'lab-v6-rejilla-hub') return <L.DashboardLayout />;
    if (id === 'lab-v6-columna-eco') return <L.PasosVerticalLayout />;
    if (id === 'lab-v6-bisel-esquina') return <L.EscaparateDiagonalLayout />;
    if (id === 'lab-v6-cinta-cascada') return <L.TimelineLayout />;
    if (id === 'lab-v6-anillo-pivot') return <L.EscaparateRadialLayout />;
    if (id === 'lab-v6-rail-pie-editorial') return <L.ComunicadoEditorialLayout />;
    if (id === 'lab-v6-mosaico-hero') return <L.CatalogoGridLayout />;
    if (id === 'lab-v6-puerta-estrecha') return <L.ComunicadoMemoLayout />;
    if (id === 'lab-v6-marco-bisagra') return <L.EscaparateMarcoLayout />;
    if (id === 'lab-v6-offset-perimetral') return <L.EscaparateGridLayout />;
    if (id === 'lab-v6-celda-satelite') return <L.Escaparate360Layout />;
    if (id === 'lab-v6-vacio-esquina') return <L.ComunicadoMinimalLayout />;
    if (id === 'lab-v6-banda-doble') return <L.OfertaBannerLayout />;
    if (id === 'lab-v6-escalon-zeta') return <L.PasosTimelineLayout />;
    if (id === 'lab-v6-ventana-constelacion') return <L.EscaparateGoboLayout />;

    // === DEFINICION layouts ===
    if (id === 'def-classic') return <L.DictionaryLayout />;
    if (id === 'def-minimal') return <L.BigTypoLayout />;
    if (id === 'def-map') return <L.MindMapLayout />;
    if (id === 'def-encyclopedia') return <L.EncyclopediaLayout />;
    if (id === 'def-urban') return <L.StickerLayout />;
    if (id === 'def-tech') return <L.CodeBlockLayout />;
    if (id === 'def-neon') return <L.NeonLayout />;
    if (id === 'def-tarjeta') return <L.FlashcardLayout />;
    if (id === 'def-ilustrado') return <L.IllustratedLayout />;
    if (id === 'def-versus') return <L.ComparisonLayout />;
    if (id === 'def-emoji') return <L.EmojiLayout />;

    // === SERVICIO layouts (check BEFORE generic patterns) ===
    if (id === 'servicio-grid') return <L.BentoGridLayout />;
    if (id === 'servicio-benefit') return <L.SplitLayout />;
    if (id === 'servicio-pricing') return <L.SpotlightLayout />;
    if (id === 'servicio-process') return <L.ProcessLayout />;
    if (id === 'servicio-list') return <L.ListLayout />;
    if (id === 'servicio-workshop') return <L.WorkshopLayout />;
    if (id === 'servicio-ecosystem') return <L.EcosystemLayout />;
    if (id === 'servicio-stat') return <L.BigNumberLayout />;
    if (id === 'servicio-minimal') return <L.ImmersiveLayout />;
    if (id === 'servicio-interaction') return <L.InteractionLayout />;
    if (id === 'servicio-explosion') return <L.ExplosionLayout />;

    // === DATO layouts ===
    if (id === 'dato-big') return <L.BigNumberLayout />;
    if (id === 'dato-comparison' || id.includes('comparison') || id.includes('vs')) return <L.ComparisonLayout />;
    if (id === 'dato-process' || id.includes('process')) return <L.ProcessLayout />;
    if (id === 'dato-infographic' || id.includes('info')) return <L.InfoGridLayout />;
    if (id === 'dato-metric' || id.includes('metric')) return <L.MetricLayout />;
    if (id === 'dato-pie' || id.includes('circular') || id.includes('pie')) return <L.CircularLayout />;
    if (id === 'dato-dashboard' || id.includes('dashboard')) return <L.DashboardLayout />;
    if (id === 'dato-bar' || id.includes('bar')) return <L.BarChartLayout />;
    if (id === 'dato-icon' || id.includes('icon')) return <L.IconLayout />;
    if (id === 'dato-timeline' || id.includes('timeline')) return <L.TimelineLayout />;
    if (id === 'dato-map' || id.includes('map')) return <L.MapLayout />;

    // === CITA layouts ===
    if (id === 'cita-minimal') return <L.CitaMinimalLayout />;
    if (id === 'cita-portrait') return <L.CitaPortraitLayout />;
    if (id === 'cita-typo') return <L.CitaTypoLayout />;
    if (id === 'cita-frame') return <L.CitaStickerLayout />;
    if (id === 'cita-texture') return <L.CitaTextureLayout />;
    if (id === 'cita-split') return <L.SplitLayout />;
    if (id === 'cita-bocadillo') return <L.CitaBocadilloLayout />;
    if (id === 'cita-carousel') return <L.CitaCarouselLayout />;
    if (id === 'cita-neon') return <L.NeonLayout />;
    if (id === 'cita-manuscript') return <L.CitaManuscriptLayout />;
    if (id === 'cita-float') return <L.CitaFloatLayout />;

    // === EQUIPO layouts ===
    if (id === 'equipo-portrait') return <L.EquipoPortraitLayout />;
    if (id === 'equipo-group') return <L.EquipoGroupLayout />;
    if (id === 'equipo-collage') return <L.EquipoCollageLayout />;
    if (id === 'equipo-quote') return <L.EquipoQuoteLayout />;
    if (id === 'equipo-action') return <L.EquipoActionLayout />;
    if (id === 'equipo-minimal') return <L.EquipoCardLayout />;
    if (id === 'equipo-welcome') return <L.EquipoWelcomeLayout />;
    if (id === 'equipo-anniversary') return <L.EquipoAnniversaryLayout />;
    if (id === 'equipo-dept') return <L.EquipoDeptLayout />;
    if (id === 'equipo-lead') return <L.EquipoLeadLayout />;
    if (id === 'equipo-culture') return <L.EquipoCultureLayout />;

    // === LOGRO layouts ===
    if (id === 'logro-number') return <L.BigNumberLayout />;
    if (id === 'logro-trophy') return <L.LogroTrophyLayout />;
    if (id === 'logro-confetti') return <L.LogroConfettiLayout />;
    if (id === 'logro-team') return <L.EquipoGroupLayout />;
    if (id === 'logro-premium') return <L.LogroSealLayout />;
    if (id === 'logro-journey') return <L.TimelineLayout />;
    if (id === 'logro-star') return <L.LogroStarLayout />;
    if (id === 'logro-podium') return <L.LogroPodiumLayout />;
    if (id === 'logro-balloons') return <L.LogroBalloonsLayout />;
    if (id === 'logro-social') return <L.LogroSocialLayout />;
    if (id === 'logro-anniversary') return <L.LogroAnniversaryLayout />;

    // === LANZAMIENTO layouts ===
    if (id === 'lanzamiento-countdown') return <L.LanzamientoCountdownLayout />;
    if (id === 'lanzamiento-reveal') return <L.LanzamientoRevealLayout />;
    if (id === 'lanzamiento-silhouette') return <L.LanzamientoSilhouetteLayout />;
    if (id === 'lanzamiento-glitch') return <L.LanzamientoGlitchLayout />;
    if (id === 'lanzamiento-torn') return <L.LanzamientoTornLayout />;
    if (id === 'lanzamiento-calendar') return <L.LanzamientoCalendarLayout />;
    if (id === 'lanzamiento-apertura') return <L.LanzamientoBoxLayout />;
    if (id === 'lanzamiento-blur') return <L.LanzamientoBlurLayout />;
    if (id === 'lanzamiento-fragmentado') return <L.LanzamientoPuzzleLayout />;
    if (id === 'lanzamiento-espiral') return <L.LanzamientoVortexLayout />;
    if (id === 'lanzamiento-misterio') return <L.LanzamientoMysteryLayout />;

    // === RETO layouts ===
    if (id === 'reto-vs') return <L.RetoVersusLayout />;
    if (id === 'reto-giveaway') return <L.RetoGiveawayLayout />;
    if (id === 'reto-bracket') return <L.RetoBracketLayout />;
    if (id === 'reto-dare') return <L.RetoDareLayout />;
    if (id === 'reto-podium') return <L.LogroPodiumLayout />;
    if (id === 'reto-rules') return <L.RetoRulesLayout />;
    if (id === 'reto-countdown') return <L.LanzamientoCountdownLayout />;
    if (id === 'reto-viral') return <L.RetoViralLayout />;
    if (id === 'reto-quiz') return <L.RetoQuizLayout />;
    if (id === 'reto-winner') return <L.RetoWinnerLayout />;
    if (id === 'reto-participants') return <L.RetoParticipantsLayout />;

    // === TALENTO layouts ===
    if (id === 'talento-hiring') return <L.TalentoHiringLayout />;
    if (id === 'talento-culture') return <L.EquipoCollageLayout />;
    if (id === 'talento-values') return <L.TalentoValuesLayout />;
    if (id === 'talento-benefits') return <L.TalentoBenefitsLayout />;
    if (id === 'talento-spotlight') return <L.TalentoSpotlightLayout />;
    if (id === 'talento-office') return <L.TalentoOfficeLayout />;
    if (id === 'talento-team') return <L.EquipoGroupLayout />;
    if (id === 'talento-remote') return <L.TalentoRemoteLayout />;
    if (id === 'talento-growth') return <L.TalentoGrowthLayout />;
    if (id === 'talento-job-card') return <L.TalentoJobCardLayout />;
    if (id === 'talento-diversity') return <L.TalentoDiversityLayout />;

    // === EFEMERIDE layouts ===
    if (id === 'efemeride-free') return <L.FreeLayout />;
    if (id === 'efemeride-calendar') return <L.LanzamientoCalendarLayout />;
    if (id === 'efemeride-hero') return <L.EfemerideHeroLayout />;
    if (id === 'efemeride-party') return <L.EfemeridePartyLayout />;
    if (id === 'efemeride-history') return <L.EfemerideHistoryLayout />;
    if (id === 'efemeride-flag') return <L.EfemerideFlagLayout />;
    if (id === 'efemeride-ribbon') return <L.EfemerideRibbonLayout />;
    if (id === 'efemeride-vintage') return <L.EfemerideVintageLayout />;
    if (id === 'efemeride-modern') return <L.EfemerideModernLayout />;
    if (id === 'efemeride-collage') return <L.EfemerideCollageLayout />;
    if (id === 'efemeride-stamp') return <L.EfemerideStampLayout />;
    if (id === 'efemeride-neon') return <L.NeonLayout />;
    if (id === 'efemeride-seasonal') return <L.EfemerideSeasonalLayout />;
    if (id === 'efemeride-bandera') return <L.EfemerideBanderaLayout />;
    if (id === 'efemeride-religioso') return <L.EfemerideReligiosoLayout />;
    if (id === 'efemeride-countdown') return <L.EfemerideCountdownLayout />;
    if (id === 'efemeride-mensaje') return <L.EfemerideMensajeLayout />;
    if (id === 'efemeride-timeline') return <L.TimelineLayout />;
    if (id === 'efemeride-portrait') return <L.EquipoPortraitLayout />;
    if (id === 'efemeride-minimal') return <L.EfemerideMinimalLayout />;

    // === PASOS layouts ===
    if (id === 'pasos-free') return <L.FreeLayout />;
    if (id === 'pasos-zigzag') return <L.PasosZigzagLayout />;
    if (id === 'pasos-carousel') return <L.PasosCarouselLayout />;
    if (id === 'pasos-split') return <L.PasosSplitGuideLayout />;
    if (id === 'pasos-floating') return <L.PasosFloating3DLayout />;
    if (id === 'pasos-blueprint') return <L.PasosBlueprintLayout />;
    if (id === 'pasos-timeline') return <L.PasosTimelineLayout />;
    if (id === 'pasos-recipe') return <L.PasosRecipeLayout />;
    if (id === 'pasos-beforeafter') return <L.PasosBeforeAfterLayout />;
    if (id === 'pasos-circles') return <L.PasosCirclesLayout />;
    if (id === 'pasos-hands') return <L.PasosHandsLayout />;
    if (id === 'pasos-quick') return <L.PasosQuickLayout />;
    if (id === 'pasos-vertical') return <L.PasosVerticalLayout />;
    if (id === 'pasos-horizontal') return <L.PasosHorizontalLayout />;
    if (id === 'pasos-circular') return <L.PasosCircularLayout />;
    if (id === 'pasos-cards') return <L.PasosCardsLayout />;
    if (id === 'pasos-infographic') return <L.InfoGridLayout />;
    if (id === 'pasos-checklist') return <L.PasosChecklistLayout />;
    if (id === 'pasos-flowchart') return <L.PasosFlowchartLayout />;
    if (id === 'pasos-icons') return <L.PasosIconsLayout />;
    if (id === 'pasos-numbered') return <L.PasosNumberedLayout />;

    // === BTS layouts ===
    if (id === 'bts-free') return <L.FreeLayout />;
    if (id === 'bts-wip') return <L.BtsWipLayout />;
    if (id === 'bts-desk') return <L.BtsDeskLayout />;
    if (id === 'bts-moodboard') return <L.BtsMoodboardLayout />;
    if (id === 'bts-sketch') return <L.BtsSketchLayout />;
    if (id === 'bts-before') return <L.BtsBeforeLayout />;
    if (id === 'bts-palette') return <L.BtsPaletteLayout />;
    if (id === 'bts-team') return <L.BtsTeamLayout />;
    if (id === 'bts-tools') return <L.BtsToolsLayout />;
    if (id === 'bts-studio') return <L.BtsStudioLayout />;
    if (id === 'bts-makingof') return <L.BtsMakingOfLayout />;
    if (id === 'bts-detail') return <L.BtsDetailLayout />;
    if (id === 'bts-filmstrip') return <L.BtsFilmstripLayout />;
    if (id === 'bts-polaroid') return <L.BtsPolaroidLayout />;
    if (id === 'bts-clapperboard') return <L.BtsClapperboardLayout />;
    if (id === 'bts-grid') return <L.BentoGridLayout />;
    if (id === 'bts-split') return <L.SplitLayout />;
    if (id === 'bts-story') return <L.BtsStoryLayout />;
    if (id === 'bts-focus') return <L.BtsFocusLayout />;
    if (id === 'bts-process') return <L.ProcessLayout />;
    if (id === 'bts-comparison') return <L.ComparisonLayout />;
    if (id === 'bts-quote') return <L.TestimonialLayout />;
    if (id === 'bts-collage') return <L.EquipoCollageLayout />;

    // === CATALOGO layouts ===
    if (id === 'catalogo-free') return <L.FreeLayout />;
    if (id === 'catalogo-grid') return <L.CatalogoGridLayout />;
    if (id === 'catalogo-masonry') return <L.CatalogoMasonryLayout />;
    if (id === 'catalogo-hero') return <L.CatalogoHeroLayout />;
    if (id === 'catalogo-carousel' || id === 'catalogo-carrusel') return <L.CatalogoCarruselLayout />;
    if (id === 'catalogo-lookbook') return <L.CatalogoLookbookLayout />;
    if (id === 'catalogo-minimal') return <L.CatalogoMinimalLayout />;
    if (id === 'catalogo-comparison' || id === 'catalogo-comparativo') return <L.CatalogoComparativoLayout />;
    if (id === 'catalogo-bundle') return <L.CatalogoBundleLayout />;
    if (id === 'catalogo-variants') return <L.CatalogoVariantsLayout />;
    if (id === 'catalogo-detail') return <L.CatalogoDetailLayout />;
    if (id === 'catalogo-flatlay') return <L.CatalogoFlatlayLayout />;
    if (id === 'catalogo-lifestyle') return <L.CatalogoLifestyleLayout />;
    if (id === 'catalogo-mosaic') return <L.EquipoCollageLayout />;
    if (id === 'catalogo-shelf') return <L.CatalogoShelfLayout />;
    if (id === 'catalogo-collection') return <L.CatalogoCollectionLayout />;
    if (id === 'catalogo-new') return <L.CatalogoNewLayout />;

    // === OFERTA layouts ===
    if (id === 'retail-classic' || id === 'oferta-impacto') return <L.OfertaImpactoLayout />;
    if (id === 'flash-sale' || id === 'oferta-flash') return <L.OfertaFlashLayout />;
    if (id === 'minimal-lux' || id === 'oferta-minimal') return <L.OfertaMinimalLayout />;
    if (id === 'bundle-grid' || id === 'oferta-bundle') return <L.OfertaBundleLayout />;
    if (id === 'urgency-time' || id === 'oferta-countdown') return <L.OfertaUrgencyLayout />;
    if (id === 'seasonal-deco' || id === 'oferta-seasonal') return <L.OfertaSeasonalLayout />;
    if (id === 'oferta-price' || id === 'oferta-precio') return <L.OfertaPriceLayout />;
    if (id === 'oferta-banner') return <L.OfertaBannerLayout />;
    if (id === 'oferta-explosion') return <L.OfertaExplosionLayout />;
    if (id === 'oferta-compare' || id === 'oferta-comparativa') return <L.OfertaCompareLayout />;
    if (id === 'oferta-exclusive') return <L.OfertaExclusiveLayout />;
    if (id === 'oferta-cupon') return <L.OfertaCuponLayout />;
    if (id === 'oferta-sticker') return <L.OfertaStickerLayout />;
    if (id === 'oferta-split') return <L.OfertaSplitLayout />;

    // === ESCAPARATE layouts ===
    if (id === 'escaparate-zen') return <L.EscaparateZenLayout />;
    if (id === 'escaparate-marco') return <L.EscaparateMarcoLayout />;
    if (id === 'escaparate-espiral') return <L.EscaparateEspiralLayout />;
    if (id === 'escaparate-diagonal') return <L.EscaparateDiagonalLayout />;
    if (id === 'escaparate-capas') return <L.EscaparateCapasLayout />;
    if (id === 'escaparate-radial') return <L.EscaparateRadialLayout />;
    if (id === 'escaparate-simetria') return <L.EscaparateSimetriaLayout />;
    if (id === 'escaparate-contraste') return <L.EscaparateContrasteLayout />;
    if (id === 'escaparate-gobo') return <L.EscaparateGoboLayout />;
    if (id === 'escaparate-levitacion') return <L.EscaparateLevitacionLayout />;
    if (id === 'escaparate-bodegon') return <L.EscaparateBodegonLayout />;
    if (id === 'escaparate-hero') return <L.EscaparateHeroLayout />;
    if (id === 'escaparate-floating') return <L.EscaparateFloatingLayout />;
    if (id === 'escaparate-lifestyle') return <L.EscaparateLifestyleLayout />;
    if (id === 'escaparate-minimal') return <L.EscaparateMinimalLayout />;
    if (id === 'escaparate-detail') return <L.EscaparateDetailLayout />;
    if (id === 'escaparate-360') return <L.Escaparate360Layout />;
    if (id === 'escaparate-comparison') return <L.EscaparateComparisonLayout />;
    if (id === 'escaparate-context') return <L.EscaparateContextLayout />;
    if (id === 'escaparate-unboxing') return <L.EscaparateUnboxingLayout />;
    if (id === 'escaparate-grid') return <L.EscaparateGridLayout />;
    if (id === 'escaparate-editorial') return <L.EscaparateEditorialLayout />;

    // === COMUNICADO layouts ===
    if (id === 'comunicado-oficial') return <L.ComunicadoOficialLayout />;
    if (id === 'comunicado-urgent' || id === 'comunicado-alerta') return <L.ComunicadoUrgenteLayout />;
    if (id === 'comunicado-modern') return <L.ComunicadoModernoLayout />;
    if (id === 'comunicado-editorial') return <L.ComunicadoEditorialLayout />;
    if (id === 'comunicado-community') return <L.ComunicadoComunidadLayout />;
    if (id === 'comunicado-minimal') return <L.ComunicadoMinimalLayout />;
    if (id === 'comunicado-card') return <L.ComunicadoCardLayout />;
    if (id === 'comunicado-ticker' || id === 'comunicado-banner') return <L.ComunicadoMarquesinaLayout />;
    if (id === 'comunicado-memo') return <L.ComunicadoMemoLayout />;
    if (id === 'comunicado-poster') return <L.ComunicadoCartelLayout />;
    if (id === 'comunicado-timeline') return <L.ComunicadoTimelineLayout />;
    if (id === 'comunicado-icon') return <L.ComunicadoIconLayout />;
    if (id === 'comunicado-quote') return <L.ComunicadoEditorialLayout />;
    if (id === 'comunicado-checklist') return <L.ComunicadoMemoLayout />;
    // === PREGUNTA layouts ===
    if (id === 'pregunta-big') return <L.PreguntaBigLayout />;
    if (id === 'pregunta-versus') return <L.PreguntaVersusLayout />;
    if (id === 'pregunta-conversation') return <L.PreguntaConversationLayout />;
    if (id === 'pregunta-thought') return <L.PreguntaThoughtLayout />;
    if (id === 'pregunta-contro') return <L.PreguntaControLayout />;
    if (id === 'pregunta-bold') return <L.PreguntaBoldLayout />;
    if (id === 'pregunta-poll') return <L.PreguntaPollLayout />;
    if (id === 'pregunta-options') return <L.PreguntaOptionsLayout />;
    if (id === 'pregunta-bubble') return <L.CitaBocadilloLayout />;
    if (id === 'pregunta-quiz') return <L.RetoQuizLayout />;
    if (id === 'pregunta-vs') return <L.PreguntaVersusLayout />;
    if (id === 'pregunta-fill') return <L.PreguntaFillLayout />;
    if (id === 'pregunta-slider') return <L.PreguntaSliderLayout />;
    if (id === 'pregunta-emoji') return <L.PreguntaEmojiLayout />;
    if (id === 'pregunta-mystery') return <L.LanzamientoMysteryLayout />;
    if (id === 'pregunta-debate') return <L.PreguntaDebateLayout />;

    // === EVENTO layouts ===
    if (id === 'evento-free') return <L.FreeLayout />;
    if (id === 'evento-conference') return <L.EventoConferenceLayout />;
    if (id === 'evento-party') return <L.EventoPartyLayout />;
    if (id === 'evento-workshop') return <L.EventoWorkshopLayout />;
    if (id === 'evento-festival') return <L.EventoFestivalLayout />;
    if (id === 'evento-networking') return <L.EventoNetworkingLayout />;
    if (id === 'evento-minimal') return <L.EventoMinimalLayout />;
    if (id === 'evento-virtual') return <L.EventoVirtualLayout />;
    if (id === 'evento-sport') return <L.EventoSportLayout />;
    if (id === 'evento-grand') return <L.EventoGrandLayout />;
    if (id === 'evento-concert') return <L.EventoConcertLayout />;
    if (id === 'evento-agenda') return <L.EventoAgendaLayout />;
    if (id === 'evento-date') return <L.EventoDateLayout />;
    if (id === 'evento-countdown') return <L.LanzamientoCountdownLayout />;
    if (id === 'evento-poster') return <L.EventoPosterLayout />;
    if (id === 'evento-ticket') return <L.EventoTicketLayout />;
    if (id === 'evento-map') return <L.MapLayout />;
    if (id === 'evento-schedule') return <L.EventoScheduleLayout />;
    if (id === 'evento-speaker') return <L.EquipoPortraitLayout />;
    if (id === 'evento-gallery') return <L.EquipoCollageLayout />;
    if (id === 'evento-reminder') return <L.EventoReminderLayout />;
    if (id === 'evento-live') return <L.EventoLiveLayout />;
    if (id === 'evento-recap') return <L.EventoRecapLayout />;

    // === COMPARATIVA layouts ===
    if (id === 'comp-split') return <L.ComparativaSplitLayout />;
    if (id === 'comp-versus') return <L.ComparativaVersusLayout />;
    if (id === 'comp-transformation') return <L.ComparativaTransformLayout />;
    if (id === 'comp-checklist') return <L.ComparativaChecklistLayout />;
    if (id === 'comp-slider') return <L.ComparativaSliderLayout />;
    if (id === 'comp-evolution') return <L.ComparativaEvolutionLayout />;
    if (id === 'comp-myth') return <L.ComparativaMythLayout />;
    if (id === 'comp-expect') return <L.ComparativaExpectLayout />;
    if (id === 'comp-pricing') return <L.ComparativaPricingLayout />;
    if (id === 'comp-horizontal') return <L.ComparativaHorizontalLayout />;
    if (id === 'comp-zoom') return <L.ComparativaZoomLayout />;
    if (id === 'comp-fusion') return <L.ComparativaFusionLayout />;
    if (id === 'comparativa-split') return <L.SplitLayout />;
    if (id === 'comparativa-before-after') return <L.ComparativaBeforeAfterLayout />;
    if (id === 'comparativa-table') return <L.ComparativaTableLayout />;
    if (id === 'comparativa-versus') return <L.RetoVersusLayout />;
    if (id === 'comparativa-slider') return <L.ComparativaSliderLayout />;
    if (id === 'comparativa-specs') return <L.ComparativaSpecsLayout />;
    if (id === 'comparativa-winner') return <L.RetoWinnerLayout />;
    if (id === 'comparativa-evolution') return <L.ComparativaEvolutionLayout />;
    if (id === 'comparativa-radar') return <L.ComparativaRadarLayout />;
    if (id === 'comparativa-price') return <L.OfertaPrecioLayout />;
    if (id === 'comparativa-stack') return <L.ComparativaStackLayout />;

    // === LISTA layouts ===
    if (id === 'checklist') return <L.ListaChecklistLayout />;
    if (id === 'ranking') return <L.ListaRankingLayout />;
    if (id === 'pasos') return <L.ListaPasosLayout />;
    if (id === 'rejilla') return <L.ListaRejillaLayout />;
    if (id === 'timeline') return <L.ListaTimelineLayout />;
    if (id === 'nota') return <L.ListaNotaLayout />;
    if (id === 'bullets') return <L.ListaBulletsLayout />;
    if (id === 'iconos') return <L.ListaIconosLayout />;
    if (id === 'carousel') return <L.ListaCarouselLayout />;
    if (id === 'numerado') return <L.ListaNumeradoLayout />;
    if (id === 'pros_cons') return <L.ListaProsConsLayout />;
    if (id === 'agenda') return <L.ListaAgendaLayout />;
    if (id === 'lista-checklist') return <L.PasosChecklistLayout />;
    if (id === 'lista-numbered') return <L.PasosNumberedLayout />;
    if (id === 'lista-icons') return <L.PasosIconsLayout />;
    if (id === 'lista-cards') return <L.PasosCardsLayout />;
    if (id === 'lista-grid') return <L.InfoGridLayout />;
    if (id === 'lista-timeline') return <L.TimelineLayout />;
    if (id === 'lista-carousel') return <L.CitaCarouselLayout />;
    if (id === 'lista-bullets') return <L.ListaBulletsLayout />;
    if (id === 'lista-ranking') return <L.ListaRankingLayout />;
    if (id === 'lista-comparison') return <L.ComparisonLayout />;
    if (id === 'lista-minimal') return <L.ListaMinimalLayout />;

    // Generic patterns (fallback)
    if (id.includes('grid')) return <L.BentoGridLayout />;
    if (id.includes('benefit') || id.includes('split')) return <L.SplitLayout />;
    if (id.includes('pricing') || id.includes('spotlight')) return <L.SpotlightLayout />;
    if (id.includes('testimonial') || id.includes('quote')) return <L.TestimonialLayout />;

    // Default fallback
    return <L.DefaultLayout />;
}

// === UNIQUE LAYOUT PREVIEWS WITH THEMED COLORS ===

