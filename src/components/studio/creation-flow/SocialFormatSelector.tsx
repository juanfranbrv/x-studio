"use client"

import React from'react'
import { cn } from'@/lib/utils'
import { SOCIAL_FORMATS, SocialPlatform } from'@/lib/creation-flow-types'
import {
 Instagram,
 Facebook,
 Linkedin,
 Video,
 Youtube,
 Square,
 RectangleHorizontal,
 RectangleVertical,
 Twitter
} from'lucide-react'
import type { LucideIcon } from'lucide-react'
import { motion } from'framer-motion'

interface SocialFormatSelectorProps {
 selectedPlatform: SocialPlatform | null
 selectedFormat: string | null
 onSelectPlatform: (platform: SocialPlatform) => void
 onSelectFormat: (formatId: string) => void
 lockedPlatform?: SocialPlatform
}

export type PlatformConfig = { icon: LucideIcon; label: string; color: string }

export const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
 instagram: { icon: Instagram, label:'Instagram', color:'text-pink-500' },
 facebook: { icon: Facebook, label:'Facebook', color:'text-blue-600' },
 tiktok: { icon: Video, label:'TikTok', color:'text-zinc-900' },
 linkedin: { icon: Linkedin, label:'LinkedIn', color:'text-blue-700' },
 x: { icon: Twitter, label:'X (Twitter)', color:'text-slate-900' },
 youtube: { icon: Youtube, label:'YouTube', color:'text-red-600' }
}

export const SocialFormatSelector: React.FC<SocialFormatSelectorProps> = ({
 selectedPlatform,
 selectedFormat,
 onSelectPlatform,
 onSelectFormat,
 lockedPlatform
}) => {
 const effectivePlatform = lockedPlatform ?? selectedPlatform
 const availableFormats = SOCIAL_FORMATS.filter(f => f.platform === effectivePlatform)

 return (
 <div className="space-y-4">
 <div className="grid grid-cols-6 gap-2.5">
 {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, PlatformConfig][]).map(([id, config]) => {
 const Icon = config.icon
 const isSelected = effectivePlatform === id
 const isLocked = Boolean(lockedPlatform)
 return (
 <button
 key={id}
 onClick={() => {
 if (isLocked) return
 onSelectPlatform(id)
 }}
 title={config.label}
 aria-disabled={isLocked}
 className={cn(
 "relative flex h-12 w-full items-center justify-center rounded-[1rem] border transition-all duration-300",
 isSelected
 ?"border-primary/30 bg-primary/[0.07] text-primary shadow-[0_18px_34px_-28px_rgba(120,142,84,0.42)]"
 :"border-border/55 bg-background/55 text-muted-foreground hover:border-border/80 hover:bg-background/88 hover:text-foreground/80",
 isLocked &&"cursor-default"
 )}
 >
 <Icon className={cn(
 "h-[22px] w-[22px] transition-colors",
 isSelected
 ?"text-primary transition-all duration-300"
 :"currentColor"
 )} />
 </button>
 )
 })}
 </div>

 {effectivePlatform && (
 <div className="grid grid-cols-2 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
 {availableFormats.map((format) => {
 const isSelected = selectedFormat === format.id

 // Determine icon based on aspect ratio
 const [w, h] = format.aspectRatio.split(':').map(Number)
 let FormatIcon = RectangleVertical
 if (w > h) FormatIcon = RectangleHorizontal
 else if (w === h) FormatIcon = Square

 return (
 <motion.button
 key={format.id}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => onSelectFormat(format.id)}
 className={cn(
"group relative flex flex-col items-start overflow-hidden rounded-[1rem] p-4 text-left transition-all duration-300",
"border backdrop-blur-md",
 isSelected
 ?"border-primary/32 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]"
 :"border-border/55 bg-background/55 hover:border-border/80 hover:bg-background/92 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-28px_rgba(15,23,42,0.2)]"
 )}
 >
 {/* Glass Reflection Gradient */}
 <div className={cn(
"absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 pointer-events-none transition-opacity duration-300",
 isSelected ?"opacity-35" :"group-hover:opacity-100"
 )} />

 <div className="flex items-center justify-between w-full mb-3 z-10">
 <div className={cn(
"p-2.5 rounded-[0.9rem] transition-colors duration-300",
 isSelected
 ?"bg-primary/[0.08] text-primary/88"
 :"bg-background/78 text-muted-foreground group-hover:bg-background group-hover:text-foreground/78"
 )}>
 <FormatIcon className="h-5 w-5" />
 </div>
 <span className={cn(
"text-[clamp(0.72rem,0.68rem+0.08vw,0.78rem)] font-semibold px-2 py-1 rounded-full border transition-colors",
 isSelected
 ?"border-primary/20 bg-primary/[0.08] text-primary/82"
 :"border-border/55 bg-background/72 text-muted-foreground"
 )}>
 {format.aspectRatio}
 </span>
 </div>

 <div className="space-y-1 z-10">
 <p className={cn(
"text-[clamp(0.95rem,0.91rem+0.1vw,1rem)] font-semibold leading-none transition-colors",
 isSelected
 ?"text-primary/90"
 :"text-foreground/88 group-hover:text-foreground"
 )}>
 {format.name}
 </p>
 <p className={cn(
"text-[clamp(0.8rem,0.76rem+0.08vw,0.86rem)] leading-snug transition-colors",
 isSelected
 ?"text-primary/72"
 :"text-muted-foreground/82 group-hover:text-muted-foreground"
 )}>
 {format.description}
 </p>
 </div>
 </motion.button>
 )
 })}
 </div>
 )}
 </div>
 )
}
