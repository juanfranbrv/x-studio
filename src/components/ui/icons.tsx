/**
 * Centralized icon exports — hugeicons replacements for lucide-react.
 * Import from here instead of lucide-react for a distinctive visual identity.
 *
 * Usage: import { IconHome, IconImage, ... } from '@/components/ui/icons'
 */
'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
    Home01Icon,
    SecondBracketSquareIcon,
    Image02Icon,
    Settings01Icon,
    Briefcase02Icon,
    ContractsIcon,
    CarouselHorizontal02Icon,
    Video02Icon,
    Layout03Icon,
    Setting06Icon,
    PlusSignIcon,
    ArrowRight01Icon,
    ArrowDown01Icon,
    ArrowUp01Icon,
    ArrowUp02Icon,
    ArrowLeft01Icon,
    ArrowLeft05Icon,
    ArrowRight05Icon,
    ArrowUp05Icon,
    SquareArrowUp02Icon,
    Logout02Icon,
    LogoutSquare01Icon,
    User02Icon,
    AccountSetting01Icon,
    ShieldEnergyIcon,
    Wallet02Icon,
    CreditCardAcceptIcon,
    GiftIcon,
    Share01Icon,
    Copy01Icon,
    Clock01Icon,
    ReceiptDollarIcon,
    Mail01Icon,
    Rocket01Icon,
    Calendar03Icon,
    BotIcon,
    Megaphone02Icon,
    PaintBrush01Icon,
    PaintBrush02Icon,
    Menu02Icon,
    Search01Icon,
    SearchAddIcon,
    SearchMinusIcon,
    Delete01Icon,
    Download02Icon,
    Upload02Icon,
    UploadSquare02Icon,
    DownloadSquare02Icon,
    PropertyDeleteIcon,
    Edit02Icon,
    Refresh01Icon,
    CheckmarkCircle01Icon,
    CheckmarkCircle02Icon,
    Link01Icon,
    GridViewIcon,
    DocumentCodeIcon,
    Add01Icon,
    Rotate01Icon,
    ArrowDown05Icon,
    Loading03Icon,
    // ─── New icons for studio/image/carousel migration ───
    AlertCircleIcon,
    MailAtSign01Icon,
    BookmarkAdd01Icon,
    Bug01Icon,
    Eraser01Icon,
    ImageAdd01Icon,
    ImageDownload02Icon,
    InstagramIcon,
    LayerIcon,
    Layout01Icon,
    BulbIcon,
    Linkedin01Icon,
    SquareLock01Icon,
    SquareUnlock01Icon,
    MapPinIcon,
    Maximize01Icon,
    Message01Icon,
    MinusSignIcon,
    MouseLeftClick01Icon,
    MusicNote01Icon,
    ColorPickerIcon,
    PowerIcon,
    Route01Icon,
    SentIcon,
    Zip02Icon,
    TextFontIcon,
    Undo02Icon,
    MagicWand01Icon,
    YoutubeIcon,
    FloppyDiskIcon,
    WorkHistoryIcon,
    FingerPrintIcon,
    Cancel01Icon,
    PaintBrush04Icon,
    SmartPhone01Icon,
    // ─── New icons for admin/auth/legal/onboarding/landing/brand-kit migration ───
    DragDropVerticalIcon,
    File01Icon,
    FilterIcon,
    ShapesIcon,
    EyeIcon,
    InformationCircleIcon,
    Coins01Icon,
    CoinsDollarIcon,
    Activity01Icon,
    LinkSquare01Icon,
    Cash01Icon,
    Sorting05Icon,
    UserGroupIcon,
    Tick02Icon,
    FileImageIcon,
    FolderKanbanIcon,
    ArrowUpRight01Icon,
    Shield01Icon,
    Layout04Icon,
    CalendarCheckIn01Icon,
    GlobeIcon,
    Package01Icon,
    Alert02Icon,
    CheckListIcon,
    // ─── New icons for brand-dna/billing/settings/layout migration ───
    Building02Icon,
    QuoteDownIcon,
    Camera01Icon,
    CpuIcon,
    LanguageCircleIcon,
    ComputerIcon,
    Target01Icon,
    CenterFocusIcon,
    FavouriteIcon,
    CancelCircleIcon,
    Facebook01Icon,
    NewTwitterIcon,
    ArrowDownRight01Icon,
    IdeaIcon,
    DashboardSquare03Icon,
    AtomicPowerIcon,
    AiChat02Icon,
    CircleArrowLeft01Icon,
    CircleArrowRight01Icon,
    Hold03Icon,
} from '@hugeicons/core-free-icons'
import { ComponentProps } from 'react'

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>

// Default stroke width — slightly bolder than default (1.5) for better presence
const DEFAULT_STROKE_WIDTH = 2

// Helper to create icon components from hugeicon definitions
function createIcon(icon: typeof Home01Icon) {
    const IconComponent = ({ strokeWidth = DEFAULT_STROKE_WIDTH, ...props }: IconProps) => (
        <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} {...props} />
    )
    IconComponent.displayName = 'HugeIcon'
    return IconComponent
}

// ─── Navigation ───
export const IconHome = createIcon(Home01Icon)
export const IconImage = createIcon(Image02Icon)
export const IconCarousel = createIcon(CarouselHorizontal02Icon)
export const IconVideo = createIcon(Video02Icon)
export const IconStudio = createIcon(Layout03Icon)
export const IconSettings = createIcon(Settings01Icon)
export const IconBrandKit = createIcon(ContractsIcon)

// ─── Actions ───
export const IconPlus = createIcon(PlusSignIcon)
export const IconAdd = createIcon(Add01Icon)
export const IconEdit = createIcon(Edit02Icon)
export const IconDelete = createIcon(Delete01Icon)
export const IconDownload = createIcon(Download02Icon)
export const IconUpload = createIcon(Upload02Icon)
export const IconUploadSquare = createIcon(UploadSquare02Icon)
export const IconDownloadSquare = createIcon(DownloadSquare02Icon)
export const IconPropertyDelete = createIcon(PropertyDeleteIcon)
export const IconRefresh = createIcon(Refresh01Icon)
export const IconRotate = createIcon(Rotate01Icon)
export const IconCopy = createIcon(Copy01Icon)
export const IconShare = createIcon(Share01Icon)
export const IconLink = createIcon(Link01Icon)
export const IconSearch = createIcon(Search01Icon)
export const IconMenu = createIcon(Menu02Icon)
export const IconSave = createIcon(FloppyDiskIcon)
export const IconUndo = createIcon(Undo02Icon)
export const IconEraser = createIcon(Eraser01Icon)
export const IconSend = createIcon(SentIcon)

// ─── Arrows & Chevrons ───
export const IconArrowRight = createIcon(ArrowRight01Icon)
export const IconArrowDown = createIcon(ArrowDown01Icon)
export const IconArrowUp = createIcon(ArrowUp01Icon)
export const IconArrowUp02 = createIcon(ArrowUp02Icon)
export const IconSquareArrowUp = createIcon(SquareArrowUp02Icon)
export const IconArrowLeft = createIcon(ArrowLeft01Icon)
export const IconChevronDown = createIcon(ArrowDown05Icon)
export const IconChevronUp = createIcon(ArrowUp05Icon)
export const IconChevronLeft = createIcon(ArrowLeft05Icon)
export const IconChevronRight = createIcon(ArrowRight05Icon)
export const IconCircleArrowLeft = createIcon(CircleArrowLeft01Icon)
export const IconCircleArrowRight = createIcon(CircleArrowRight01Icon)

// ─── Status ───
// Legacy alias kept to avoid broad churn in callers. Sparkles are banned in UI;
// route old uses to a calmer idea glyph until callers are migrated.
export const IconSparkles = createIcon(IdeaIcon)
export const IconCheck = createIcon(CheckmarkCircle01Icon)
export const IconCheckCircle = createIcon(CheckmarkCircle02Icon)
export const IconClock = createIcon(Clock01Icon)
export const IconLoading = createIcon(Loading03Icon)
export const IconAlertCircle = createIcon(AlertCircleIcon)
export const IconBug = createIcon(Bug01Icon)
export const IconPower = createIcon(PowerIcon)

// ─── User ───
export const IconUser = createIcon(User02Icon)
export const IconLogout = createIcon(Logout02Icon)
export const IconUserAccount = createIcon(AccountSetting01Icon)
export const IconLogoutSquare = createIcon(LogoutSquare01Icon)
export const IconShield = createIcon(ShieldEnergyIcon)
export const IconFingerprint = createIcon(FingerPrintIcon)

// ─── Billing ───
export const IconWallet = createIcon(Wallet02Icon)
export const IconCreditCard = createIcon(CreditCardAcceptIcon)
export const IconGift = createIcon(GiftIcon)
export const IconReceipt = createIcon(ReceiptDollarIcon)

// ─── Communication ───
export const IconMail = createIcon(Mail01Icon)
export const IconMegaphone = createIcon(Megaphone02Icon)
export const IconBot = createIcon(BotIcon)
export const IconRocket = createIcon(Rocket01Icon)
export const IconMessage = createIcon(Message01Icon)

// ─── Design & Studio ───
export const IconPalette = createIcon(PaintBrush01Icon)
export const IconGrid = createIcon(GridViewIcon)
export const IconCalendar = createIcon(Calendar03Icon)
export const IconWand = createIcon(MagicWand01Icon)
export const IconPaintbrush = createIcon(PaintBrush04Icon)
export const IconPaintbrush02 = createIcon(PaintBrush02Icon)
export const IconColorPicker = createIcon(ColorPickerIcon)
export const IconLayers = createIcon(LayerIcon)
export const IconLayout = createIcon(Layout01Icon)
export const IconImageAdd = createIcon(ImageAdd01Icon)
export const IconImageDownload = createIcon(ImageDownload02Icon)
export const IconSquareArrowDown = createIcon(Zip02Icon)
export const IconTextFont = createIcon(TextFontIcon)
export const IconMouseClick = createIcon(MouseLeftClick01Icon)
export const IconLightbulb = createIcon(BulbIcon)
export const IconIdea = createIcon(IdeaIcon)
export const IconDashboardSquare = createIcon(DashboardSquare03Icon)
export const IconAtomicPower = createIcon(AtomicPowerIcon)
export const IconAiChat = createIcon(AiChat02Icon)
export const IconRoute = createIcon(Route01Icon)

// ─── Media & Social ───
export const IconInstagram = createIcon(InstagramIcon)
export const IconLinkedin = createIcon(Linkedin01Icon)
export const IconYoutube = createIcon(YoutubeIcon)
export const IconMusic = createIcon(MusicNote01Icon)

// ─── Security ───
export const IconLock = createIcon(SquareLock01Icon)
export const IconUnlock = createIcon(SquareUnlock01Icon)

// ─── Map & Location ───
export const IconMapPin = createIcon(MapPinIcon)
export const IconPhone = createIcon(SmartPhone01Icon)
export const IconAtSign = createIcon(MailAtSign01Icon)

// ─── Zoom ───
export const IconZoomIn = createIcon(SearchAddIcon)
export const IconZoomOut = createIcon(SearchMinusIcon)
export const IconMaximize = createIcon(SecondBracketSquareIcon)

// ─── Misc ───
export const IconMinus = createIcon(MinusSignIcon)
export const IconClose = createIcon(Cancel01Icon)
export const IconBookmarkAdd = createIcon(BookmarkAdd01Icon)
export const IconHistory = createIcon(WorkHistoryIcon)
export const IconHold = createIcon(Hold03Icon)

// ─── Admin / Auth / Legal / Onboarding / Landing / Brand-Kit ───
export const IconGripVertical = createIcon(DragDropVerticalIcon)
export const IconFileText = createIcon(File01Icon)
export const IconFilter = createIcon(FilterIcon)
export const IconShapes = createIcon(ShapesIcon)
export const IconEye = createIcon(EyeIcon)
export const IconInfo = createIcon(InformationCircleIcon)
export const IconCoins01 = createIcon(Coins01Icon)
export const IconCoins = createIcon(CoinsDollarIcon)
export const IconActivity = createIcon(Activity01Icon)
export const IconExternalLink = createIcon(LinkSquare01Icon)
export const IconBanknote = createIcon(Cash01Icon)
export const IconArrowUpDown = createIcon(Sorting05Icon)
export const IconUsers = createIcon(UserGroupIcon)
export const IconCheckSimple = createIcon(Tick02Icon)
export const IconFileImage = createIcon(FileImageIcon)
export const IconFolderKanban = createIcon(FolderKanbanIcon)
export const IconArrowUpRight = createIcon(ArrowUpRight01Icon)
export const IconShieldCheck = createIcon(Shield01Icon)
export const IconLayoutTemplate = createIcon(Layout04Icon)
export const IconCalendarCheck = createIcon(CalendarCheckIn01Icon)
export const IconGlobe = createIcon(GlobeIcon)
export const IconPackage = createIcon(Package01Icon)
export const IconTriangleAlert = createIcon(Alert02Icon)
export const IconListChecks = createIcon(CheckListIcon)

// ─── Brand-DNA / Billing / Settings / Layout ───
export const IconBuilding = createIcon(Building02Icon)
export const IconQuote = createIcon(QuoteDownIcon)
export const IconCamera = createIcon(Camera01Icon)
export const IconCpu = createIcon(CpuIcon)
export const IconLanguages = createIcon(LanguageCircleIcon)
export const IconMonitor = createIcon(ComputerIcon)
export const IconTarget = createIcon(Target01Icon)
export const IconCrosshair = createIcon(CenterFocusIcon)
export const IconHeart = createIcon(FavouriteIcon)
export const IconXCircle = createIcon(CancelCircleIcon)
export const IconFacebook = createIcon(Facebook01Icon)
export const IconTwitter = createIcon(NewTwitterIcon)
export const IconArrowDownRight = createIcon(ArrowDownRight01Icon)
